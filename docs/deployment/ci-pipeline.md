# MEMORA CI pipeline

GitHub Actions workflow: `.github/workflows/ci.yml`. CI plus **GHCR publish** and **Deploy Mini PC** on trusted `push` to `main` (not PRs). First Mini PC bring-up is `.github/workflows/bootstrap.yml`. See `docs/deployment/how-it-works.md` and `container-registry.md`.

## Triggers

- Pull requests (all branches).
- Push to `dev`: Quality gates and Security only.
- Push to `main` or `master`: Quality gates, Security, GHCR publish, and Mini PC deploy. Deploy still starts Gateway and IAM.
- `workflow_dispatch` (Actions → CI → Run workflow). Publish and deploy still require `main`.

Permissions are `contents: read`. Fork PRs do not receive production secrets. Redis/Postgres in CI are ephemeral service containers with CI-only credentials in the workflow file.

Concurrency cancels superseded runs on the same PR or branch.

## Jobs

| Job | What it proves |
|---|---|
| **Quality gates** | Kit, boundaries, proto load, Prisma validate/generate for IAM, Commerce, Operations, and Experience, IAM migrate on CI Postgres, ESLint, `tsc`, Nest builds for Gateway and the four business services, image smoke for the three newer services, Jest unit + IAM refresh mocks, then live Redis cache/queue tests |
| **Security** | No tracked `.env` / key material; production `npm audit` with allowlisted Prisma transitive highs only; **critical always fails** |
| **Publish GHCR** | After both jobs PASS, **push to `main` only** (not PRs, not `dev`): build `linux/amd64` images, Trivy CRITICAL, push Gateway, IAM, IAM migrate, Commerce, Operations, and Experience at `ghcr.io/mainhankiet/memora-<name>:<sha>`. This document does not claim a registry publish has succeeded. |

Required checks to enable after the workflow has run once on GitHub:

1. `Quality gates`
2. `Security`

Use a branch ruleset or classic branch protection on `main`/`master`: require those two checks, require a PR, do not allow bypassing for administrators unless you have a break-glass policy.

## Test services (CI)

- PostgreSQL 17 (`memora_ci` / `memora_ci_pg` / `memora_ci`) — `prisma migrate deploy` only, **no seed, no RBAC apply**.
- Redis 7 with CI password, `noeviction`. Live tests use `MEMORA_REDIS_TEST=1`, namespaces `phase311*`, isolated BullMQ queues. No `FLUSHDB`/`FLUSHALL`.

`GOOGLE_OAUTH_ENABLED` is unset so OAuth credentials are not required.

## Local reproduction

```bash
npm ci
npm run kit:validate
npm run boundaries
npm run proto:check
npm run prisma:iam:validate
npm run prisma:iam:generate
npm run lint:check
npm run typecheck
npx nest build api-gateway
npm run build:iam
npx jest --runInBand --testPathIgnorePatterns=live.spec.ts
npm run ci:secrets
npm run ci:audit
```

Live Redis (local Docker Redis, never production):

```bash
export MEMORA_REDIS_TEST=1
export REDIS_PASSWORD='your-local-dev-redis-password'
npx jest --runInBand --testPathPatterns=live.spec.ts
```

Prisma migrate against a **local throwaway** database only:

```bash
export IAM_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/memora?schema=iam'
npm run prisma:iam:migrate:deploy
```

Do not run `iam:rbac-v1:apply` or `prisma:iam:seed` as part of CI.

## Connect this folder to GitHub (if there is no remote yet)

This workspace may not be a Git repository yet. Do **not** invent a GitHub repo from CI files. When you are ready:

1. `git init` (if needed) and commit, including `.github/workflows/ci.yml`.
2. Create an empty GitHub repository in the org/account you control.
3. `git remote add origin git@github.com:<org>/<repo>.git`
4. `git push -u origin main` (or `master`).
5. Open Actions, run **CI** once (`workflow_dispatch` or a PR).
6. Copy the run URL; only then treat GitHub CI as verified.
7. Turn on the required checks above.

## Security assumptions

- CI Redis/Postgres passwords are **not** production secrets.
- `.env` is gitignored; `.env.example` is placeholders only.
- High advisories in Prisma’s unused `mysql2` / `deepmerge-ts` chain are allowlisted in `scripts/ci/npm-audit-gate.cjs` and emitted as GitHub warnings. New high/critical IDs fail the Security job.
- Handwritten gRPC TypeScript (`libs/contracts`) is not code-generated; CI loads `.proto` files with `@grpc/proto-loader` to catch parse errors.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Live Redis tests skipped | `MEMORA_REDIS_TEST` must be `1` and Redis password length ≥ 16 |
| Prisma migrate fails | CI Postgres health, `citext` in the image, `IAM_DATABASE_URL` points at the service container |
| Lint needs generated Prisma | `prisma:iam:generate` must run before `lint:check` / `typecheck` |
| `iam:rbac-v1:validate` missing | That script is referenced in `package.json` but the file is not in the tree; CI does not call it |
| Audit gate fails | New GHSA not in the allowlist — inspect `npm audit --omit=dev` and fix or explicitly allowlist with review |

## Status of live IAM refresh Redis tests

Unit regression (rotate / stale replay / mismatch revoke / 503) runs in Quality gates. **Live** Lua rotation against Redis is **SKIPPED** (no extra IAM Redis integration spec; store tests remain mocked so rotation logic is not changed to please CI).
