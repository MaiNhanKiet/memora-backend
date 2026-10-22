#!/usr/bin/env bash
# Administrator-only. Copies root-owned helper + compose templates to /opt/memora.
set -euo pipefail
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST=/opt/memora
install -d -m 0755 "${DEST}/bin" "${DEST}/lib" "${DEST}/infra" "${DEST}/backend" \
  "${DEST}/state" "${DEST}/logs" "${DEST}/releases"
install -d -m 0700 "${DEST}/secrets" "${DEST}/backups" "${DEST}/backups/postgres" "${DEST}/backups/redis"

install -m 0755 -o root -g root "${REPO_ROOT}/deploy/host/memora-deploy.sh" "${DEST}/bin/memora-deploy"
install -m 0644 -o root -g root "${REPO_ROOT}/deploy/scripts/lib.sh" "${DEST}/lib/lib.sh"
install -m 0644 -o root -g root "${REPO_ROOT}/deploy/infra/compose.yaml" "${DEST}/infra/compose.yaml"
install -m 0644 -o root -g root "${REPO_ROOT}/deploy/backend/compose.yaml" "${DEST}/backend/compose.yaml"

copy_example() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$dest" ]]; then
    install -m 0600 -o root -g root "$src" "$dest"
    echo "wrote $dest (edit before bootstrap)"
  else
    echo "keep existing $dest"
  fi
}

copy_example "${REPO_ROOT}/deploy/infra/.env.example" "${DEST}/secrets/infra.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/gateway.env.example" "${DEST}/secrets/gateway.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/iam.env.example" "${DEST}/secrets/iam.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/commerce.env.example" "${DEST}/secrets/commerce.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/operations.env.example" "${DEST}/secrets/operations.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/experience.env.example" "${DEST}/secrets/experience.env.example"
copy_example "${REPO_ROOT}/deploy/secrets/ghcr.env.example" "${DEST}/secrets/ghcr.env.example"

if [[ ! -f /etc/sudoers.d/memora-deploy ]]; then
  echo "Install sudoers from ${REPO_ROOT}/deploy/host/sudoers.memora-deploy.example"
fi

echo "Helper installed. Create gateway.env, iam.env, ghcr.env from the examples. commerce.env, operations.env, and experience.env stay unused until domain services are explicitly enabled."
echo "Never chown these files to the runner user."
