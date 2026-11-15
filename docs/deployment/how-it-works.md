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
Publish 6 image → GHCR (Gateway, IAM, IAM migrate, Commerce, Operations, Experience)
        ↓
Deploy Mini PC  ──────────────►  sudo /opt/memora/bin/memora-deploy
                                 pull image @sha256
                                 migrate IAM nếu xác nhận
                                 compose up chỉ Gateway + IAM
```

PR **không** deploy. Postgres/Redis **không** tạo lại mỗi lần push.

## 2. Kiến trúc thư mục trong git

```text
memora-backend/
  apps/
    api-gateway/          HTTP công khai (Nest Gateway)
    iam-service/          Domain IAM + Prisma (gRPC, business đã có)
    commerce-service/     Foundation + Prisma schema; chưa business RPC
    operations-service/   Foundation + Prisma schema; chưa business RPC
    experience-service/   Foundation + Prisma schema; chưa business RPC
  libs/                   Auth, config, contracts, cache, queue, …
  proto/                  Hợp đồng gRPC
  docker/                 Dockerfile Gateway, IAM, migrate, Commerce, Operations, Experience
  deploy/
    infra/compose.yaml    Postgres + Redis + Garage (S3) + Mosquitto (MQTT) + cloudflared (Arcane / Mini PC)
    infra/compose.local.yaml   Chỉ laptop: publish 127.0.0.1:5432/6379/3900/1883, bỏ tunnel
    infra/.env.example    Postgres + Redis + Garage + Mosquitto + CLOUDFLARE_TUNNEL_TOKEN
    backend/compose.yaml  Mặc định Gateway + IAM. Profile domain-services bị helper chặn
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

- Network `memora-network` (DNS: `postgres`, `redis`, `garage`, `mosquitto`, `cloudflared`; `api-gateway` sau khi backend up)
- Container `memora-postgres`, `memora-redis`, `memora-garage`, `memora-mosquitto`, `memora-cloudflared`
- Volume `memora-infra_*`

IAM trên Mini PC vẫn kết nối `postgres` / `redis` (Docker DNS), **không** `127.0.0.1` hay `172.x`.

Host publish (Tailscale `100.78.222.34`): Postgres `5432`, Redis `6379`. Gateway thêm `127.0.0.1:3000` (curl trên Mini PC) + Tailscale `:3000`. Cloudflare Tunnel chạy **trong** `memora-infra` và origin `http://api-gateway:3000` trên Docker DNS — không `0.0.0.0`, không `127.0.0.1` từ trong container. Từ laptop (đã Tailscale): `http://100.78.222.34:3000/health/live`. Swagger `/api/docs` tắt trên production.

#### Garage (object storage, D-P-08)

- Image `dxflrs/garage:v2.5.0`. Container dùng `http://garage:3900`. Chỉ cổng S3 3900 publish trên IP Tailscale (`100.78.222.34:3900`) cho backend dev trên laptop; RPC 3901 và admin 3903 không publish. Cấu hình `garage.toml` nằm inline trong `compose.yaml` (`configs.garage_toml`), không cần file riêng.
- Khởi động bằng `--single-node --default-bucket`: tự tạo layout 1 node, access key `GARAGE_ACCESS_KEY_ID` / `GARAGE_SECRET_ACCESS_KEY` và bucket `GARAGE_BUCKET` (chạy lại không tạo trùng). Bucket private: truy cập ẩn danh bị 403, chỉ key này hoặc URL ký sẵn đọc được.
- Thêm vào Arcane: dán `compose.yaml` mới, thêm 5 biến `GARAGE_*` vào `.env` của project (sinh bằng `openssl rand -hex 32`; access key id = `GK` + `openssl rand -hex 12`), rồi Redeploy. Compose chỉ tạo `memora-garage`; Postgres, Redis, cloudflared không đổi cấu hình nên không bị tạo lại.
- Volume `memora-infra_garagemeta` và `memora-infra_garagedata` chứa dữ liệu vân tay/âm thanh: không xóa, chưa nằm trong backup trước deploy (cần bổ sung khi có dữ liệu thật).
- Operations dùng key này qua biến env riêng khi API upload/capture đầu tiên được làm; chưa thêm vào `operations.env`.
- Operations đọc `OPERATIONS_OBJECT_STORAGE_*` (endpoint, region, bucket, key) khi có code S3; mẫu trong `.env.example` và `deploy/secrets/operations.env.example`.
- Web UI: project Arcane riêng `memora-garage-webui` từ `deploy/infra/garage-webui.compose.yaml` (`khairul169/garage-webui:1.1.0`, `100.78.222.34:3909`, bắt buộc `AUTH_USER_PASS`). Nút Share chỉ tạo link cho bucket bật website access (public); không bật cho `memora-personalization`, dùng URL ký sẵn.
- Domain công khai qua Cloudflare Tunnel: route trỏ Docker DNS (`http://garage:3900`, `http://api-gateway:3000`), không trỏ IP container. Web UI public phải đứng sau Cloudflare Access.

#### Mosquitto (MQTT broker, D-P-07)

- Image `eclipse-mosquitto:2.0.21` (biến `MOSQUITTO_IMAGE`). Thiết bị lấy vân tay (ESP32-S3 + AS608) nói MQTT với broker này; operations-service subscribe/publish. Trong Docker dùng `mqtt://mosquitto:1883`, user `memora-operations`, mật khẩu `OPERATIONS_MQTT_PASSWORD` trong `operations.env`.
- Cổng `1883` chỉ publish trên IP Tailscale (`100.78.222.34:1883`), giống Garage; bản local publish `127.0.0.1:1883`. Chưa có TLS công khai (hoãn), không route qua Cloudflare Tunnel.
- `mosquitto.conf` và ACL nằm inline trong `compose.yaml` (`configs.mosquitto_conf`, `configs.mosquitto_acl`): `allow_anonymous false`, giới hạn gói 262144 byte, log ra stdout không kèm payload, persistence trong volume `memora-infra_mosquittodata`.
- ACL: `memora-operations` có `readwrite memora/capture/#`. Thiết bị (username = `deviceCode`): ghi `memora/capture/<user>/attempts` và `/hello`, đọc `/commands` và `/results` của chính mình.
- User broker lấy từ `.env` của project infra (Arcane), không có file passwd trên host:
  - `MQTT_OPERATIONS_PASSWORD`: mật khẩu user `memora-operations` (≥16 ký tự), trùng `OPERATIONS_MQTT_PASSWORD` trong `operations.env`.
  - `MQTT_DEVICE_USERS`: `deviceCode:mật-khẩu` cách nhau bằng dấu phẩy, ví dụ `esp32-store-01:xxxx,esp32-store-02:yyyy` (mật khẩu ≥16 ký tự, không chứa `,` hoặc khoảng trắng). Username = `deviceCode`, phải có trong `OPERATIONS_CAPTURE_DEVICE_CODES`.
  - Mỗi lần container khởi động, entrypoint băm các user vào `/mosquitto/passwd` (mode 600, owner `mosquitto`) rồi chạy broker. Thiếu hoặc sai định dạng thì container dừng với lỗi rõ ràng.
- Thêm/đổi thiết bị: sửa `MQTT_DEVICE_USERS` trong Arcane rồi deploy lại riêng `mosquitto` (vài giây; thiết bị và Operations tự kết nối lại).
- `memora-deploy provision-secrets` (khi tạo infra.env mới) sinh `MQTT_OPERATIONS_PASSWORD` ngẫu nhiên và để `MQTT_DEVICE_USERS` trống. Healthcheck chỉ kiểm tra TCP `nc -z 127.0.0.1 1883` (không cần secret).
- Local (laptop): thêm `MQTT_OPERATIONS_PASSWORD` (và `MQTT_DEVICE_USERS` nếu cần) vào `.env` gốc rồi:
  `docker compose -f deploy/infra/compose.yaml -f deploy/infra/compose.local.yaml --env-file .env up -d mosquitto`

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
- `ghcr.io/mainhankiet/memora-commerce-service:<git-sha>`
- `ghcr.io/mainhankiet/memora-operations-service:<git-sha>`
- `ghcr.io/mainhankiet/memora-experience-service:<git-sha>`

Ba image sau có trong workflow. Deploy mặc định không start chúng. `--enable-domain-services` vẫn dừng vì quyền PostgreSQL chưa được xác minh. SQL trong `deploy/postgres/proposals/` chưa được chạy.

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
| `.github/workflows/ci.yml` | PR mọi nhánh; `push` `dev`; `push` `main` | PR và `dev`: Quality + Security. `main`: thêm publish GHCR và Deploy Gateway/IAM |
| `.github/workflows/bootstrap.yml` | Bấm tay | Lần đầu infra+app; chỉ cần SHA + `BOOTSTRAP` |

Job CI **không** chứa mật khẩu DB. Runner Mini PC chỉ gọi binary root.

## 8. Đổi env sau này

Sửa file trong `/opt/memora/secrets/` rồi recreate app (Deploy lại). Đổi password Postgres trong volume đã init thì phải đổi **trong** Postgres/Arcane rồi mới sửa `iam.env`. Đổi `IAM_JWT_SECRET` → session cũ hết hạn.

## 9. Trạng thái điển hình khi “gần xong”

- Infra Arcane healthy
- Secrets đủ
- Bootstrap đã backup / `bootstrap-complete`
- Deploy có thể còn fail nếu helper `/opt/memora/lib/lib.sh` cũ (stdout `docker pull` làm hỏng digest) — cập nhật `lib.sh` rồi Re-run Deploy, **không** bootstrap lại
