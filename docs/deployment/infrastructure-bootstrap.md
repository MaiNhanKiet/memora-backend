# Mini PC infrastructure bootstrap

One-time path. **Not** tied to `push` on `main`. Live bootstrap is **not** claimed until the self-hosted runner has run `bootstrap.yml` successfully.

## Before / after

**Before:** local Postgres/Redis used root compose files. Those are replaced by `deploy/infra/`.

**Arcane (Mini PC):** Create project `memora-infra`, paste `deploy/infra/compose.yaml`, paste env from `deploy/infra/.env.example` (real passwords + `CLOUDFLARE_TUNNEL_TOKEN`). Do **not** include `compose.local.yaml` (that file publishes `127.0.0.1` ports for laptops only and skips cloudflared). Postgres, Redis, and cloudflared stay on `memora-network`; IAM uses Docker DNS `postgres` / `redis`. Cloudflare public hostname origin must be `http://api-gateway:3000` (not `127.0.0.1:3000`). Connector may start before Gateway; origin is 502 until `memora-backend` is up.

**After (intended):** two Compose **projects** on the Mini PC:

| Project | File on host | Containers | Volumes |
|---|---|---|---|
| `memora-infra` | `/opt/memora/infra/compose.yaml` | `memora-postgres`, `memora-redis`, `memora-cloudflared` | `memora-infra_pgdata`, `memora-infra_redisdata` |
| `memora-backend` | `/opt/memora/backend/compose.yaml` | `memora-api-gateway`, `memora-iam-service` | none |

Shared network: `memora-network` (created by project `memora-infra`; Docker DNS: `postgres`, `redis`, `iam-service`, `api-gateway`). Backend compose marks that network `external`.

Developer machines use `deploy/infra/compose.yaml` + `compose.local.yaml`. If Mini PC already has unlabeled `memora-postgres` / `memora_pgdata`, bootstrap **fails** instead of taking over.

## Host (administrator, once)

1. Ubuntu x86_64, NTP, disk/RAM, outbound GitHub/GHCR.
2. `sudo bash deploy/host/install-host-prerequisites.sh`
3. If Docker missing: `sudo bash deploy/host/install-docker.sh`
4. Create user `runner-memora-backend` for the GitHub runner. **Do not** add it to group `docker` (that is root-equivalent).
5. Install runner with label `memora-cd` as that user. Do not use it for CI.
6. `sudo bash deploy/host/install-deploy-helper.sh` from a known Git SHA.
7. Install sudoers: `deploy/host/sudoers.memora-deploy.example` → `/etc/sudoers.d/memora-deploy` (`visudo -c`).
8. Copy examples to live env files and edit:

   - `/opt/memora/secrets/gateway.env`
   - `/opt/memora/secrets/iam.env` (`IAM_DATABASE_URL` host **`postgres`**, Redis host **`redis`**, `IAM_EMAIL_ACTION_BASE_URL` real frontend origin)
   - `/opt/memora/secrets/ghcr.env` (`read:packages` only)
   - Optional: let `memora-deploy provision-secrets` generate `/opt/memora/secrets/infra.env` once

9. Put `CLOUDFLARE_TUNNEL_TOKEN` in Arcane/infra env. Zero Trust hostname → `http://api-gateway:3000`. Stop host `cloudflared` if it used the same token.
10. Set `TRUST_PROXY=1` on Gateway. `SWAGGER_ENABLED=false`.

## GitHub Actions

`.github/workflows/bootstrap.yml` — `workflow_dispatch` only, runner `[self-hosted, Linux, X64]`.

No checkout, no `npm`, no image build. The job calls:

`sudo -n /opt/memora/bin/memora-deploy bootstrap --release-sha … --from-sha-tags --confirm-bootstrap BOOTSTRAP`

### Inputs

- `release_sha` (40 hex) whose GHCR tags already exist
- `confirm_bootstrap` = `BOOTSTRAP`
- `confirm_migrate` = `MIGRATE` to run Prisma deploy
- `run_seed` / `run_rbac` + `confirm_rbac` = `MEMORA_RBAC_V1_2026_10_15`

Idempotent: existing managed containers are not recreated; volumes are never `-v` removed; secrets files are not overwritten; Prisma migrate deploy is additive; RBAC apply is insert-only with marker.

## Prisma / RBAC

Runtime Gateway/IAM images **do not** include Prisma CLI. Migrations run in `ghcr.io/m3mora/memora-iam-migrate@digest`.

RBAC apply on Mini PC requires `MEMORA_RBAC_PRODUCTION_CONFIRM=MEMORA_RBAC_V1_2026_10_15` (same marker) so `NODE_ENV=production` and host `postgres` are allowed. Grants/checksums are unchanged.

## GHCR

Images may **not** exist until the **Publish GHCR** job on `main` has pushed gateway, iam, **and** migrate. Bootstrap pulls `:<release_sha>` then pins digests — fail-safe if the tag is missing.
