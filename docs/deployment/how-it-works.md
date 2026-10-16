# MEMORA Mini PC — cách hoạt động (tuần tự)

Tài liệu này mô tả **cơ chế hiện tại** trong repo. Chi tiết lệnh: `infrastructure-bootstrap.md`, `mini-pc-deployment.md`, `ci-pipeline.md`, `container-registry.md`.

Có **hai máy**, **hai Compose**, **ba workflow**. Mini PC **không** `npm` / `nest build`. App chỉ chạy từ image GHCR.

## 1. Hai máy

| Máy | Việc |
|---|---|
| Laptop (Windows) | Sửa code, `git push`, CI chạy trên GitHub-hosted |
| Mini PC (`optiplex-server`) | Docker: Postgres, Redis, Gateway, IAM. GitHub Actions **runner** (Idle = đang chờ job) |

Tên runner GitHub **không** phải hostname SSH. Termius dùng IP LAN.

Luồng sau khi `git push origin main`:

```text
GitHub-hosted                    Mini PC
Quality + Security
        ↓
Publish 3 image → GHCR
        ↓
Deploy Mini PC  ──────────────►  sudo /opt/memora/bin/memora-deploy
                                 pull image @sha256
                                 migrate (nếu xác nhận)
                                 compose up Gateway + IAM
```

PR **không** deploy. Postgres/Redis **không** tạo lại mỗi lần push.

## 2. Kiến trúc thư mục trong git

```text
memora-backend/
  apps/
    api-gateway/          HTTP công khai (Nest Gateway)
    iam-service/          Domain IAM + Prisma (gRPC)
  libs/                   Auth, config, contracts, cache, queue, …
  proto/                  Hợp đồng gRPC
  docker/                 Dockerfile Gateway, IAM, migrate (Prisma CLI)
  deploy/
    infra/compose.yaml    Postgres + Redis + cloudflared (Arcane / Mini PC)
    infra/compose.local.yaml   Chỉ laptop: publish 127.0.0.1:5432/6379, bỏ tunnel
    infra/.env.example    USER/PASSWORD Postgres + Redis + CLOUDFLARE_TUNNEL_TOKEN
    backend/compose.yaml  Gateway + IAM (image GHCR, không build)
    secrets/*.example     Mẫu ghcr/gateway/iam — không commit mật khẩu
    host/                 Cài helper, sudoers, memora-deploy.sh
    scripts/lib.sh        Logic chung (pull GHCR, compose, backup)
  .github/workflows/
    ci.yml                Test + publish GHCR + Deploy Mini PC (push main)
    bootstrap.yml         Một lần: infra (nếu thiếu) + app lần đầu (không dán digest)
```

Gateway **không** Prisma. IAM sở hữu DB `iam`. Image **migrate** mới chạy `prisma migrate deploy`.

## 3. Thư mục trên Mini PC (sau khi cài helper)

Không phải clone git để chạy app. Helper copy compose vào `/opt/memora`.

```text
/opt/memora/
  bin/memora-deploy       Binary root-owned; runner chỉ được sudo cái này
  lib/lib.sh
  infra/compose.yaml      Project Docker: memora-infra
  backend/compose.yaml    Project Docker: memora-backend
  secrets/                chmod 700; file .env chmod 600, owner root
    infra.env             Password Postgres/Redis (khớp Arcane)
    iam.env               JWT, DB URL host=postgres, Redis host=redis
    gateway.env           TRUST_PROXY, IAM_GRPC_URL=iam-service:50051
    ghcr.env              PAT kéo GHCR (bootstrap tay); job CI có thể dùng GITHUB_TOKEN
  state/
    infra-ready
    bootstrap-complete    Bắt buộc mới Deploy hàng ngày
    current-release
  backups/                pg_dump + Redis RDB trước mỗi deploy
```

Sudoers: user `runner-memora-backend` `NOPASSWD` **chỉ** `/opt/memora/bin/memora-deploy`. Không thêm user này vào group `docker`.

## 4. Setup tuần tự (một lần)

### A. Mini PC — Docker + helper

1. Cài Docker + runner GitHub (label thực tế: `self-hosted`, `Linux`, `X64`).
2. Copy `deploy/` lên máy (SFTP/tar), **không** cần `git clone` nếu repo private khó auth.
3. `sudo bash deploy/host/install-deploy-helper.sh`
4. Cài `/etc/sudoers.d/memora-deploy` từ `deploy/host/sudoers.memora-deploy.example` (user đúng process `Runner.Listener`).

### B. Hạ tầng dữ liệu — Arcane (project `memora-infra`)

Dán `deploy/infra/compose.yaml`. **Không** dán `compose.local.yaml` (file đó mở port ra laptop).

Tạo:

- Network `memora-network` (DNS: `postgres`, `redis`, `cloudflared`; `api-gateway` sau khi backend up)
- Container `memora-postgres`, `memora-redis`, `memora-cloudflared`
- Volume `memora-infra_*`

IAM trên Mini PC vẫn kết nối `postgres` / `redis` (Docker DNS), **không** `127.0.0.1` hay `172.x`.

Host publish (Tailscale `100.78.222.34`): Postgres `5432`, Redis `6379`. Gateway thêm `127.0.0.1:3000` (curl trên Mini PC) + Tailscale `:3000`. Cloudflare Tunnel chạy **trong** `memora-infra` và origin `http://api-gateway:3000` trên Docker DNS — không `0.0.0.0`, không `127.0.0.1` từ trong container. Từ laptop (đã Tailscale): `http://100.78.222.34:3000/health/live`. Swagger `/api/docs` tắt trên production.

### C. Secrets (chỉ trên Mini PC, không GitHub Secrets)

Tạo `/opt/memora/secrets/{gateway,iam,ghcr,infra}.env` từ `.example`.

- `IAM_INTERNAL_GRPC_SECRET` giống nhau trên Gateway và IAM.
- `IAM_DATABASE_URL`: password URL-encode (`!` → `%21`).
- GitHub **Actions Secrets** không được job Deploy đọc.

PAT fine-grained **owner = user** không thấy repo org `M3MORA` → GHCR `denied`. PAT classic `repo` + `read:packages` + SSO, hoặc job Deploy dùng `GITHUB_TOKEN` (cần sudoers `env_keep` + helper mới).

### D. GitHub — publish image

Push `main` → job **Publish GHCR** đẩy:

- `ghcr.io/mainhankiet/memora-api-gateway:<git-sha>`
- `ghcr.io/mainhankiet/memora-iam-service:<git-sha>`
- `ghcr.io/mainhankiet/memora-iam-migrate:<git-sha>`

Tag = SHA commit. Digest `sha256:` + 64 hex = vân tay image (form Bootstrap cần digest, không phải lệnh `docker pull …:tag`).

### E. Bootstrap Mini PC (workflow, **một lần**)

Actions → **Bootstrap Mini PC** → Run workflow:

- `release_sha` = 40 hex
- 3 digest `sha256:…`
- `confirm_bootstrap` = `BOOTSTRAP`
- `confirm_migrate` = `MIGRATE` (DB trống)

Việc job làm: (infra nếu thiếu) → pull image → migrate → (seed/RBAC nếu bật) → `up` Gateway/IAM → `bootstrap-complete`.

Arcane đã có Postgres thì helper `up --no-recreate` nếu container mang label `com.memora.managed=true`. Thiếu label → từ chối, không cướp volume lạ.

**Không** Re-run Deploy khi chưa có `bootstrap-complete`.

### F. Deploy hàng ngày

Sau Bootstrap: mỗi push `main` (Quality + Security + Publish PASS) → **Deploy Mini PC**:

1. Backup Postgres + Redis
2. Pull image theo SHA
3. `prisma migrate deploy` nếu job gửi `--confirm-migrate MIGRATE`
4. `compose up` **chỉ** project `memora-backend`
5. Health `/health/ready`

Không restart Postgres/Redis, không apply lại RBAC.

## 5. Hai project Compose

```text
        memora-network
     ┌────────┴────────┐
     │                 │
 postgres   redis   cloudflared     ← project memora-infra (Arcane)
     │        │          │
     └────────┴────┬─────┘
                   │
     iam-service  ←──gRPC──  api-gateway :3000
                              Cloudflare → http://api-gateway:3000
```

Project `memora-backend` khai báo network `external: true` (mạng đã do infra tạo).

## 6. Dev laptop (không phải Mini PC)

```bash
docker compose -f deploy/infra/compose.yaml -f deploy/infra/compose.local.yaml --env-file .env up -d
npm run prisma:iam:bootstrap
npm run start:iam:dev
npm run start:gateway:dev
```

Volume local `memora_pgdata` **không** phải volume production. Đừng chạy compose local trên Mini PC.

## 7. Workflow GitHub (file nào làm gì)

| File | Khi nào | Việc |
|---|---|---|
| `.github/workflows/ci.yml` | `push`/`PR` `main` | Test trên GitHub-hosted; `push` main thì publish + Deploy |
| `.github/workflows/bootstrap.yml` | Bấm tay | Lần đầu infra+app; chỉ cần SHA + `BOOTSTRAP` |

Job CI **không** chứa mật khẩu DB. Runner Mini PC chỉ gọi binary root.

## 8. Đổi env sau này

Sửa file trong `/opt/memora/secrets/` rồi recreate app (Deploy lại). Đổi password Postgres trong volume đã init thì phải đổi **trong** Postgres/Arcane rồi mới sửa `iam.env`. Đổi `IAM_JWT_SECRET` → session cũ hết hạn.

## 9. Trạng thái điển hình khi “gần xong”

- Infra Arcane healthy
- Secrets đủ
- Bootstrap đã backup / `bootstrap-complete`
- Deploy có thể còn fail nếu helper `/opt/memora/lib/lib.sh` cũ (stdout `docker pull` làm hỏng digest) — cập nhật `lib.sh` rồi Re-run Deploy, **không** bootstrap lại
