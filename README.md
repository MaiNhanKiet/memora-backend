# MEMORA backend

NestJS 11 native monorepo. Live apps: **API Gateway** (`apps/api-gateway`) and **IAM** (`apps/iam-service`). Shared code lives in `libs/`. Wire contracts are in `proto/`.

## Local development

```bash
npm ci
cp .env.example .env
docker compose -f deploy/infra/compose.yaml -f deploy/infra/compose.local.yaml --env-file .env up -d
npm run prisma:iam:bootstrap
npm run start:iam:dev
npm run start:gateway:dev
```

Gateway HTTP: `http://127.0.0.1:3000` — Swagger `/api/docs`. Mini PC: Arcane project `memora-infra` from `deploy/infra/compose.yaml` (Postgres, Redis, cloudflared; no `compose.local.yaml`). Cloudflare origin `http://api-gateway:3000`.

## Checks

```bash
npm run lint:check
npm run typecheck
npm test
npm run iam:rbac-v1:validate
```
