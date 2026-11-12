# shellcheck shell=bash
# Shared helpers. Never enable set -x (secrets).

MEMORA_ROOT="${MEMORA_ROOT:-/opt/memora}"
MEMORA_SECRETS_DIR="${MEMORA_SECRETS_DIR:-${MEMORA_ROOT}/secrets}"
MEMORA_STATE_DIR="${MEMORA_STATE_DIR:-${MEMORA_ROOT}/state}"
MEMORA_BACKUP_DIR="${MEMORA_BACKUP_DIR:-${MEMORA_ROOT}/backups}"
MEMORA_RELEASES_DIR="${MEMORA_RELEASES_DIR:-${MEMORA_ROOT}/releases}"
MEMORA_NETWORK="${MEMORA_NETWORK:-memora-network}"
INFRA_COMPOSE="${INFRA_COMPOSE:-${MEMORA_ROOT}/infra/compose.yaml}"
BACKEND_COMPOSE="${BACKEND_COMPOSE:-${MEMORA_ROOT}/backend/compose.yaml}"
RELEASE_ENV="${RELEASE_ENV:-${MEMORA_ROOT}/backend/release.env}"
BACKUP_RETAIN_DAYS="${MEMORA_BACKUP_RETAIN_DAYS:-7}"

RESERVED_CONTAINERS=(memora-postgres memora-redis memora-api-gateway memora-iam-service)
DOMAIN_CONTAINERS=(memora-commerce-service memora-operations-service memora-experience-service)
RESERVED_VOLUMES=(memora-infra_pgdata memora-infra_redisdata)
LEGACY_VOLUMES=(memora_pgdata memora_redisdata)

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
err() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
die() { err "FAIL: $*"; exit 1; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "memora-deploy must run as root (sudo -n /opt/memora/bin/memora-deploy ...)"
  fi
}

validate_sha() {
  local sha="$1"
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die "release SHA must be 40 lowercase hex chars"
}

validate_digest() {
  local digest="$1"
  local name="$2"
  [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || die "${name} digest must be sha256:<64 hex>"
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || die "missing env file ${file}"
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

compose_infra() {
  docker compose --project-name memora-infra \
    --env-file "${MEMORA_SECRETS_DIR}/infra.env" \
    -f "${INFRA_COMPOSE}" \
    "$@"
}

compose_backend() {
  local -a profile=()
  if [[ "${MEMORA_DOMAIN_SERVICES:-0}" == "1" ]]; then
    profile=(--profile domain-services)
  fi
  docker compose --project-name memora-backend \
    --env-file "${RELEASE_ENV}" \
    -f "${BACKEND_COMPOSE}" \
    "${profile[@]}" \
    "$@"
}

ensure_dirs() {
  mkdir -p "${MEMORA_SECRETS_DIR}" "${MEMORA_STATE_DIR}" "${MEMORA_BACKUP_DIR}/postgres" \
    "${MEMORA_BACKUP_DIR}/redis" "${MEMORA_RELEASES_DIR}" "${MEMORA_ROOT}/logs" \
    "${MEMORA_ROOT}/infra" "${MEMORA_ROOT}/backend"
  chmod 700 "${MEMORA_SECRETS_DIR}" "${MEMORA_BACKUP_DIR}"
}

container_label() {
  local name="$1"
  local key="$2"
  docker inspect -f "{{index .Config.Labels \"${key}\"}}" "$name" 2>/dev/null || true
}

container_exists() {
  docker inspect "$1" >/dev/null 2>&1
}

assert_managed_or_absent() {
  local name="$1"
  local stack="$2"
  if ! container_exists "$name"; then
    return 0
  fi
  local managed
  managed="$(container_label "$name" com.memora.managed)"
  local have_stack
  have_stack="$(container_label "$name" com.memora.stack)"
  if [[ "$managed" == "true" && "$have_stack" == "$stack" ]]; then
    return 0
  fi
  die "container ${name} exists but is not MEMORA-managed (${stack}); refusing to replace"
}

legacy_volume_collision() {
  local vol
  for vol in "${LEGACY_VOLUMES[@]}"; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      err "WARN: legacy volume ${vol} exists (local compose). Production uses memora-infra_* names and will not adopt it automatically."
    fi
  done
}

ensure_network() {
  if docker network inspect "${MEMORA_NETWORK}" >/dev/null 2>&1; then
    log "network ${MEMORA_NETWORK} already exists"
    return 0
  fi
  docker network create --label com.memora.managed=true --label com.memora.stack=infra "${MEMORA_NETWORK}"
  log "created network ${MEMORA_NETWORK}"
}

wait_healthy() {
  local name="$1"
  local attempts="${2:-36}"
  local i
  for i in $(seq 1 "$attempts"); do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      log "${name} healthy"
      return 0
    fi
    sleep 5
  done
  docker logs --tail 80 "$name" >&2 || true
  die "${name} did not become healthy"
}

image_digest_after_pull() {
  local ref="$1"
  local label="$2"
  [[ "$ref" == ghcr.io/mainhankiet/memora-* ]] || die "ref ${label} is not a MEMORA GHCR image"
  if ! docker pull "${ref}" >/dev/null; then
    die "docker pull ${label} failed (${ref}); GHCR login cannot read ghcr.io/mainhankiet"
  fi
  local raw digest=""
  raw="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "${ref}")"
  while IFS= read -r line; do
    line="${line##*@}"
    line="$(printf '%s' "$line" | tr -d '\r')"
    if [[ "$line" =~ ^sha256:[0-9a-f]{64}$ ]]; then
      digest="$line"
      break
    fi
  done <<<"$raw"
  if [[ -z "$digest" ]]; then
    raw="$(docker image inspect --format '{{index .RepoDigests 0}}' "${ref}" 2>/dev/null || true)"
    digest="$(printf '%s' "${raw##*@}" | tr -d '\r')"
  fi
  validate_digest "${digest}" "${label}"
  printf '%s\n' "${digest}"
}

ghcr_login() {
  local user=""
  local token=""
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    user="${GITHUB_ACTOR:-}"
    token="$(printf '%s' "${GITHUB_TOKEN}" | tr -d '\r\n')"
    [[ -n "$user" && -n "$token" ]] || die "GITHUB_TOKEN is set but GITHUB_ACTOR is empty"
    log "ghcr login via GITHUB_TOKEN actor=${user}"
  else
    [[ -f "${MEMORA_SECRETS_DIR}/ghcr.env" ]] || die "missing ${MEMORA_SECRETS_DIR}/ghcr.env"
    # shellcheck disable=SC1091
    source "${MEMORA_SECRETS_DIR}/ghcr.env"
    user="${GHCR_USERNAME:-}"
    token="$(printf '%s' "${GHCR_TOKEN:-}" | tr -d '\r\n')"
    [[ -n "$user" && -n "$token" ]] || die "GHCR_USERNAME/GHCR_TOKEN required"
    log "ghcr login via ghcr.env user=${user}"
  fi
  if ! printf '%s' "$token" | docker login ghcr.io -u "$user" --password-stdin >/dev/null; then
    die "docker login ghcr.io failed for user ${user}"
  fi
}

assert_domain_database_url() {
  local url="$1"
  local expected_user="$2"
  local label="$3"
  [[ "$url" == postgresql://* || "$url" == postgres://* ]] || die "${label} URL must be a PostgreSQL URL"
  local rest="${url#*://}"
  local userpass="${rest%%@*}"
  local hostpath="${rest#*@}"
  [[ "$rest" == *"@"* && "$userpass" == *:* ]] || die "${label} URL must include a user and password"
  local user="${userpass%%:*}"
  local password="${userpass#*:}"
  [[ -n "$password" ]] || die "${label} password is empty"
  [[ "$password" != replace-with-* ]] || die "${label} password is still a placeholder"
  [[ "$user" != "postgres" && "$user" != "memora" ]] || die "${label} runtime user must not be the bootstrap superuser"
  [[ "$user" == "$expected_user" ]] || die "${label} runtime user must be ${expected_user}"
  local hostport="${hostpath%%/*}"
  local database="${hostpath#*/}"
  database="${database%%\?*}"
  [[ "$hostport" == "postgres:5432" ]] || die "${label} host must be postgres:5432"
  [[ "$database" == "memora" ]] || die "${label} database must be memora"
}

write_release_env() {
  local sha="$1"
  local gateway="$2"
  local iam="$3"
  local migrate="$4"
  local commerce="${5:-}"
  local operations="${6:-}"
  local experience="${7:-}"
  validate_digest "$gateway" gateway
  validate_digest "$iam" iam
  validate_digest "$migrate" migrate
  local domain_services=0
  if [[ -n "$commerce" || -n "$operations" || -n "$experience" ]]; then
    [[ -n "$commerce" && -n "$operations" && -n "$experience" ]] || die "domain release requires commerce, operations, and experience digests"
    validate_digest "$commerce" commerce
    validate_digest "$operations" operations
    validate_digest "$experience" experience
    domain_services=1
  fi
  umask 077
  cat > "${RELEASE_ENV}" <<EOF
MEMORA_RELEASE_SHA=${sha}
GATEWAY_IMAGE=ghcr.io/mainhankiet/memora-api-gateway@${gateway}
IAM_IMAGE=ghcr.io/mainhankiet/memora-iam-service@${iam}
MIGRATE_IMAGE=ghcr.io/mainhankiet/memora-iam-migrate@${migrate}
EOF
  if [[ "$domain_services" == "1" ]]; then
    cat >> "${RELEASE_ENV}" <<EOF
COMMERCE_IMAGE=ghcr.io/mainhankiet/memora-commerce-service@${commerce}
OPERATIONS_IMAGE=ghcr.io/mainhankiet/memora-operations-service@${operations}
EXPERIENCE_IMAGE=ghcr.io/mainhankiet/memora-experience-service@${experience}
EOF
  fi
  cat >> "${RELEASE_ENV}" <<EOF
MEMORA_SECRETS_DIR=${MEMORA_SECRETS_DIR}
TAILSCALE_IPV4=${TAILSCALE_IPV4:-100.78.222.34}
EOF
  chmod 600 "${RELEASE_ENV}"
}

record_release() {
  local sha="$1"
  local gateway="$2"
  local iam="$3"
  local migrate="$4"
  local kind="$5"
  local commerce="${6:-}"
  local operations="${7:-}"
  local experience="${8:-}"
  local domain_services=0
  if [[ -n "$commerce" || -n "$operations" || -n "$experience" ]]; then
    [[ -n "$commerce" && -n "$operations" && -n "$experience" ]] || die "domain release requires commerce, operations, and experience digests"
    validate_digest "$commerce" commerce
    validate_digest "$operations" operations
    validate_digest "$experience" experience
    domain_services=1
  fi
  mkdir -p "${MEMORA_STATE_DIR}"
  umask 077
  if [[ -f "${MEMORA_STATE_DIR}/current-release" ]]; then
    cp -a "${MEMORA_STATE_DIR}/current-release" "${MEMORA_STATE_DIR}/previous-release"
  fi
  cat > "${MEMORA_STATE_DIR}/current-release" <<EOF
kind=${kind}
sha=${sha}
gateway=${gateway}
iam=${iam}
migrate=${migrate}
domain_services=${domain_services}
recorded_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  if [[ "$domain_services" == "1" ]]; then
    cat >> "${MEMORA_STATE_DIR}/current-release" <<EOF
commerce=${commerce}
operations=${operations}
experience=${experience}
EOF
  fi
}

random_secret() {
  openssl rand -base64 48 | tr -d '\n'
}
