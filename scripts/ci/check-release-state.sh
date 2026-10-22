#!/usr/bin/env bash
# Dry-run release and rollback checks. Does not deploy or contact GHCR.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

SHA_OLD="$(printf '1%.0s' {1..40})"
SHA_NEW="$(printf '2%.0s' {1..40})"
DIGEST_GATEWAY="sha256:$(printf 'a%.0s' {1..64})"
DIGEST_IAM="sha256:$(printf 'b%.0s' {1..64})"
DIGEST_MIGRATE="sha256:$(printf 'c%.0s' {1..64})"
DIGEST_COMMERCE="sha256:$(printf 'd%.0s' {1..64})"
DIGEST_OPERATIONS="sha256:$(printf 'e%.0s' {1..64})"
DIGEST_EXPERIENCE="sha256:$(printf 'f%.0s' {1..64})"
DIGEST_GATEWAY_NEW="sha256:$(printf '1%.0s' {1..64})"
DIGEST_IAM_NEW="sha256:$(printf '2%.0s' {1..64})"
DIGEST_MIGRATE_NEW="sha256:$(printf '3%.0s' {1..64})"

mkdir -p "$TMP/secrets" "$TMP/state" "$TMP/backend"
if command -v cygpath >/dev/null 2>&1; then
  COMPOSE_SECRETS="$(cygpath -w "$TMP/secrets")"
else
  COMPOSE_SECRETS="$TMP/secrets"
fi
printf 'NODE_ENV=production\n' > "$TMP/secrets/gateway.env"
printf 'NODE_ENV=production\n' > "$TMP/secrets/iam.env"
cat > "$TMP/secrets/commerce.env" <<'EOF'
NODE_ENV=production
COMMERCE_DATABASE_URL=postgresql://commerce_app:not-a-real-password@postgres:5432/memora
EOF
cat > "$TMP/secrets/operations.env" <<'EOF'
NODE_ENV=production
OPERATIONS_DATABASE_URL=postgresql://operations_app:not-a-real-password@postgres:5432/memora
EOF
cat > "$TMP/secrets/experience.env" <<'EOF'
NODE_ENV=production
EXPERIENCE_DATABASE_URL=postgresql://experience_app:not-a-real-password@postgres:5432/memora
EOF

cat > "$TMP/backend/release.env" <<EOF
MEMORA_RELEASE_SHA=${SHA_OLD}
GATEWAY_IMAGE=ghcr.io/mainhankiet/memora-api-gateway@${DIGEST_GATEWAY}
IAM_IMAGE=ghcr.io/mainhankiet/memora-iam-service@${DIGEST_IAM}
MIGRATE_IMAGE=ghcr.io/mainhankiet/memora-iam-migrate@${DIGEST_MIGRATE}
MEMORA_SECRETS_DIR=${COMPOSE_SECRETS}
TAILSCALE_IPV4=127.0.0.1
EOF

default_services="$(
  docker compose --env-file "$TMP/backend/release.env" \
    -f "$ROOT/deploy/backend/compose.yaml" config --services | sort
)"
printf '%s\n' "$default_services" | grep -qx 'api-gateway'
printf '%s\n' "$default_services" | grep -qx 'iam-service'
if printf '%s\n' "$default_services" | grep -Eq 'commerce-service|operations-service|experience-service'; then
  echo "FAIL default compose enables a domain service" >&2
  exit 1
fi

cat >> "$TMP/backend/release.env" <<EOF
COMMERCE_IMAGE=ghcr.io/mainhankiet/memora-commerce-service@${DIGEST_COMMERCE}
OPERATIONS_IMAGE=ghcr.io/mainhankiet/memora-operations-service@${DIGEST_OPERATIONS}
EXPERIENCE_IMAGE=ghcr.io/mainhankiet/memora-experience-service@${DIGEST_EXPERIENCE}
EOF
opt_in_services="$(
  docker compose --env-file "$TMP/backend/release.env" --profile domain-services \
    -f "$ROOT/deploy/backend/compose.yaml" config --services | sort
)"
for service in api-gateway iam-service commerce-service operations-service experience-service; do
  printf '%s\n' "$opt_in_services" | grep -qx "$service"
done
opt_in_config="$(
  docker compose --env-file "$TMP/backend/release.env" --profile domain-services \
    -f "$ROOT/deploy/backend/compose.yaml" config
)"
if printf '%s\n' "$opt_in_config" | grep -Eq '50052:50052|50053:50053|50054:50054|5052:5052|5053:5053|5054:5054'; then
  echo "FAIL domain compose publishes an internal port" >&2
  exit 1
fi

export MEMORA_ROOT="$TMP"
export MEMORA_SECRETS_DIR="$TMP/secrets"
export MEMORA_STATE_DIR="$TMP/state"
export MEMORA_RELEASES_DIR="$TMP/releases"
export RELEASE_ENV="$TMP/backend/release.env"
export BACKEND_COMPOSE="$ROOT/deploy/backend/compose.yaml"
export MEMORA_DEPLOY_SOURCE_ONLY=1
# shellcheck disable=SC1091
source "$ROOT/deploy/host/memora-deploy.sh"
unset MEMORA_DEPLOY_SOURCE_ONLY

expect_fail() {
  local label="$1"
  shift
  local err_file="$TMP/stderr"
  if ( "$@" ) >"$TMP/stdout" 2>"$err_file"; then
    echo "FAIL ${label} unexpectedly succeeded" >&2
    exit 1
  fi
  cat "$err_file"
}

expect_fail "invalid digest" validate_digest "sha256:short" commerce | grep -q 'digest must be sha256'

rm -f "$TMP/secrets/commerce.env"
expect_fail "missing secret" preflight_domain_services | grep -q 'missing'
cat > "$TMP/secrets/commerce.env" <<'EOF'
NODE_ENV=production
COMMERCE_DATABASE_URL=postgresql://commerce_app:replace-with-commerce-app-password@postgres:5432/memora
EOF
expect_fail "placeholder password" preflight_domain_services | grep -q 'placeholder'
cat > "$TMP/secrets/commerce.env" <<'EOF'
NODE_ENV=production
COMMERCE_DATABASE_URL=postgresql://postgres:not-a-real-password@postgres:5432/memora
EOF
expect_fail "superuser name" preflight_domain_services | grep -q 'bootstrap superuser'
cat > "$TMP/secrets/commerce.env" <<'EOF'
NODE_ENV=production
COMMERCE_DATABASE_URL=postgresql://commerce_app:not-a-real-password@postgres:5432/memora
EOF
expect_fail "unverified grants" preflight_domain_services | grep -q 'BLOCKER: domain services stay disabled'

write_release_env "$SHA_OLD" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE"
if grep -q '^COMMERCE_IMAGE=' "$RELEASE_ENV"; then
  echo "FAIL legacy release.env includes a domain image" >&2
  exit 1
fi
grep -q "^MEMORA_RELEASE_SHA=${SHA_OLD}$" "$RELEASE_ENV"
grep -q "^GATEWAY_IMAGE=ghcr.io/mainhankiet/memora-api-gateway@${DIGEST_GATEWAY}$" "$RELEASE_ENV"
grep -q "^IAM_IMAGE=ghcr.io/mainhankiet/memora-iam-service@${DIGEST_IAM}$" "$RELEASE_ENV"
grep -q "^MIGRATE_IMAGE=ghcr.io/mainhankiet/memora-iam-migrate@${DIGEST_MIGRATE}$" "$RELEASE_ENV"

write_release_env "$SHA_NEW" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" \
  "$DIGEST_COMMERCE" "$DIGEST_OPERATIONS" "$DIGEST_EXPERIENCE"
for image in \
  "COMMERCE_IMAGE=ghcr.io/mainhankiet/memora-commerce-service@${DIGEST_COMMERCE}" \
  "OPERATIONS_IMAGE=ghcr.io/mainhankiet/memora-operations-service@${DIGEST_OPERATIONS}" \
  "EXPERIENCE_IMAGE=ghcr.io/mainhankiet/memora-experience-service@${DIGEST_EXPERIENCE}"
do
  grep -qx "$image" "$RELEASE_ENV"
done

record_release "$SHA_OLD" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" deploy
if grep -q '^commerce=' "$MEMORA_STATE_DIR/current-release"; then
  echo "FAIL legacy current-release stores a domain digest" >&2
  exit 1
fi
grep -q '^domain_services=0$' "$MEMORA_STATE_DIR/current-release"

touch "$TMP/state/infra-ready"
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
echo 0 > "$TMP/health-fails"
ghcr_login() { :; }
docker() {
  if [[ "$1" == "compose" ]]; then
    printf '%s\n' "$*" >> "$TMP/compose.log"
    return 0
  fi
  if [[ "$1" == "pull" ]]; then
    case "$2" in
      *"@${DIGEST_GATEWAY_NEW}"*|*"@${DIGEST_IAM_NEW}"*|*"@${DIGEST_MIGRATE_NEW}"*)
        echo "pull failed" >&2
        return 1
        ;;
    esac
    return 0
  fi
  if [[ "$1" == "image" ]]; then
    return 0
  fi
  return 1
}
wait_healthy() {
  local remaining
  remaining="$(cat "$TMP/health-fails")"
  if [[ "$remaining" -gt 0 ]]; then
    echo $((remaining - 1)) > "$TMP/health-fails"
    die "did not become healthy"
  fi
}
cmd_health_check() { :; }

run_restore_attempt() {
  local label="$1"
  set +e
  ( deploy_backend_or_restore ) >"$TMP/stdout" 2>"$TMP/stderr"
  local status=$?
  set -e
  if [[ "$status" -eq 0 ]]; then
    echo "FAIL ${label} unexpectedly succeeded" >&2
    exit 1
  fi
}

run_restore_attempt "failed pull"
grep -q 'restored the last recorded release' "$TMP/stderr"
grep -q "^MEMORA_RELEASE_SHA=${SHA_OLD}$" "$RELEASE_ENV"
if grep -q '^COMMERCE_IMAGE=' "$RELEASE_ENV"; then
  echo "FAIL restored release.env still points at domain images" >&2
  exit 1
fi

write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
echo 1 > "$TMP/health-fails"
docker() {
  if [[ "$1" == "compose" ]]; then
    printf '%s\n' "$*" >> "$TMP/compose.log"
    return 0
  fi
  if [[ "$1" == "pull" || "$1" == "image" ]]; then
    return 0
  fi
  return 1
}
run_restore_attempt "failed health"
grep -q 'restored the last recorded release' "$TMP/stderr"
grep -q "^MEMORA_RELEASE_SHA=${SHA_OLD}$" "$RELEASE_ENV"

record_release "$SHA_NEW" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" deploy \
  "$DIGEST_COMMERCE" "$DIGEST_OPERATIONS" "$DIGEST_EXPERIENCE"
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" \
  "$DIGEST_COMMERCE" "$DIGEST_OPERATIONS" "$DIGEST_EXPERIENCE"
echo 0 > "$TMP/health-fails"
: > "$TMP/compose.log"
docker() {
  if [[ "$1" == "compose" ]]; then
    printf '%s\n' "$*" >> "$TMP/compose.log"
    return 0
  fi
  if [[ "$1" == "pull" || "$1" == "image" ]]; then
    return 0
  fi
  return 1
}
restore_recorded_release "$MEMORA_STATE_DIR/previous-release"
grep -q "^MEMORA_RELEASE_SHA=${SHA_OLD}$" "$RELEASE_ENV"
if grep -q '^COMMERCE_IMAGE=' "$RELEASE_ENV"; then
  echo "FAIL rollback to legacy release kept domain images" >&2
  exit 1
fi
if grep -q -- '--profile' "$TMP/compose.log"; then
  echo "FAIL rollback to legacy release enabled the domain profile" >&2
  exit 1
fi

cat > "$TMP/legacy-without-flag" <<EOF
kind=deploy
sha=${SHA_OLD}
gateway=${DIGEST_GATEWAY}
iam=${DIGEST_IAM}
migrate=${DIGEST_MIGRATE}
EOF
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" \
  "$DIGEST_COMMERCE" "$DIGEST_OPERATIONS" "$DIGEST_EXPERIENCE"
: > "$TMP/compose.log"
restore_recorded_release "$TMP/legacy-without-flag"
if grep -q '^COMMERCE_IMAGE=' "$RELEASE_ENV"; then
  echo "FAIL legacy release without domain_services kept domain images" >&2
  exit 1
fi
if grep -q -- '--profile' "$TMP/compose.log"; then
  echo "FAIL legacy release without domain_services enabled the domain profile" >&2
  exit 1
fi

: > "$TMP/compose.log"
restore_recorded_release "$MEMORA_STATE_DIR/current-release"
grep -q "^COMMERCE_IMAGE=ghcr.io/mainhankiet/memora-commerce-service@${DIGEST_COMMERCE}$" "$RELEASE_ENV"
grep -q "^OPERATIONS_IMAGE=ghcr.io/mainhankiet/memora-operations-service@${DIGEST_OPERATIONS}$" "$RELEASE_ENV"
grep -q "^EXPERIENCE_IMAGE=ghcr.io/mainhankiet/memora-experience-service@${DIGEST_EXPERIENCE}$" "$RELEASE_ENV"
grep -q -- '--profile domain-services' "$TMP/compose.log"

# Deploy compose failure still restores when the previous release can start.
export MEMORA_DOMAIN_SERVICES=0
record_release "$SHA_OLD" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" deploy
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
echo 1 > "$TMP/compose-fails"
echo 0 > "$TMP/health-fails"
docker() {
  if [[ "$1" == "compose" ]]; then
    local remaining
    remaining="$(cat "$TMP/compose-fails")"
    if [[ "$remaining" -gt 0 ]]; then
      echo $((remaining - 1)) > "$TMP/compose-fails"
      echo "compose up failed" >&2
      return 1
    fi
    printf '%s\n' "$*" >> "$TMP/compose.log"
    return 0
  fi
  if [[ "$1" == "pull" || "$1" == "image" ]]; then
    return 0
  fi
  return 1
}
run_restore_attempt "failed compose startup"
if ! grep -q 'restored the last recorded release' "$TMP/stderr"; then
  echo "FAIL compose restore stderr:" >&2
  cat "$TMP/stderr" >&2
  exit 1
fi
grep -q "^MEMORA_RELEASE_SHA=${SHA_OLD}$" "$RELEASE_ENV"

# Restore pull failure must not leave release.env on the target or claim recovery.
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
cp "$RELEASE_ENV" "$TMP/before-failed-restore"
docker() {
  if [[ "$1" == "pull" ]]; then
    echo "restore pull failed" >&2
    return 1
  fi
  return 0
}
if ( restore_recorded_release "$MEMORA_STATE_DIR/current-release" ) >"$TMP/stdout" 2>"$TMP/stderr"; then
  echo "FAIL restore pull failure unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'restore did not finish' "$TMP/stderr"
if grep -q 'restored sha=' "$TMP/stderr"; then
  echo "FAIL restore pull failure claimed the release was restored" >&2
  exit 1
fi
cmp -s "$TMP/before-failed-restore" "$RELEASE_ENV"

# Invalid recorded state is rejected before release.env changes.
cp "$RELEASE_ENV" "$TMP/before-invalid"
cat > "$TMP/invalid-release" <<EOF
kind=deploy
sha=not-a-sha
gateway=${DIGEST_GATEWAY}
iam=${DIGEST_IAM}
migrate=${DIGEST_MIGRATE}
EOF
if ( restore_recorded_release "$TMP/invalid-release" ) >"$TMP/stdout" 2>"$TMP/stderr"; then
  echo "FAIL invalid release unexpectedly restored" >&2
  exit 1
fi
grep -q 'release SHA must be 40 lowercase hex chars' "$TMP/stderr"
cmp -s "$TMP/before-invalid" "$RELEASE_ENV"

# No recorded success means the failed attempt cannot be rolled back.
rm -f "$MEMORA_STATE_DIR/current-release"
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
cp "$RELEASE_ENV" "$TMP/before-missing"
if ( deploy_backend_or_restore ) >"$TMP/stdout" 2>"$TMP/stderr"; then
  echo "FAIL missing current release unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'no recorded release to restore' "$TMP/stderr"
cmp -s "$TMP/before-missing" "$RELEASE_ENV"

# An unmanaged domain container blocks legacy restore and reverts release.env.
record_release "$SHA_OLD" "$DIGEST_GATEWAY" "$DIGEST_IAM" "$DIGEST_MIGRATE" deploy
write_release_env "$SHA_NEW" "$DIGEST_GATEWAY_NEW" "$DIGEST_IAM_NEW" "$DIGEST_MIGRATE_NEW"
cp "$RELEASE_ENV" "$TMP/before-unmanaged"
docker() {
  if [[ "$1" == "pull" || "$1" == "image" || "$1" == "compose" ]]; then
    return 0
  fi
  if [[ "$1" == "inspect" && "$2" == "-f" ]]; then
    printf '%s\n' ""
    return 0
  fi
  if [[ "$1" == "inspect" ]]; then
    return 0
  fi
  if [[ "$1" == "stop" || "$1" == "rm" ]]; then
    echo "FAIL unmanaged container was stopped" >&2
    return 1
  fi
  return 1
}
if ( restore_recorded_release "$MEMORA_STATE_DIR/current-release" ) >"$TMP/stdout" 2>"$TMP/stderr"; then
  echo "FAIL unmanaged container unexpectedly restored" >&2
  exit 1
fi
grep -q 'is not MEMORA-managed' "$TMP/stderr"
grep -q 'restore did not finish' "$TMP/stderr"
if grep -q 'restored sha=' "$TMP/stderr"; then
  echo "FAIL unmanaged container claimed the release was restored" >&2
  exit 1
fi
cmp -s "$TMP/before-unmanaged" "$RELEASE_ENV"

echo "release state checks ok"
