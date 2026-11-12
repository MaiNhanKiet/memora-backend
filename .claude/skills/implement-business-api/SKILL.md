---
name: implement-business-api
description: Implement one approved API in Commerce, Operations or Experience (gRPC feature in the owning service plus its Gateway client and HTTP endpoint) using the pre-wired infrastructure, so the result matches how IAM works without drifting from the architecture. Use for any new endpoint whose owner is commerce-service, operations-service or experience-service. For IAM or for planning only, use implement-api or plan-api.
---

# MEMORA — Implement a business-service API

Follow `docs/architecture/business-service-api-recipe.md`. It is the single source for the
steps, the list of already-wired infrastructure, and the IAM reference map. Read it first.
Layer placement rules are in `.claude/rules/13-business-service-structure.md`.

## Before writing code

1. Name the API: id, `METHOD /api/v1/...`, domain, owning service, Main Flow, permission.
   Read `docs/plans/active/<feature>.md` when it exists. If the route, request/response or
   permission is not named by the user or an approved plan, stop and ask.
2. The permission code must already exist in `libs/contracts/src/iam/permissions.ts`.
   A missing code is a blocker. Do not invent or infer one from a role name.
3. Check `git status --short` and the current branch. Do not commit, push, merge or switch
   branches unless the user asks. New branches start from the latest `dev`.
4. State the owner service, files to touch, and which cross-service ids the use case must
   verify through a contract.

## Do not redo what is wired

Do not add a gRPC bootstrap, an internal-auth guard, a Prisma service, a database pool, a
Gateway client helper, env validation for the secret, or a `proto:check` list entry. Use
`<Svc>InternalGrpcAuthGuard`, `PrismaService`, the `<svc>-grpc.registry.ts` entry,
`domainGrpcClientOptions` and `DomainGrpcClient` as the recipe describes.

## Hard rules

- Only the owning service touches its schemas. No Prisma in the Gateway or in another service.
- No foreign keys exist across services. Verify cross-service ids over gRPC in the use case.
- The internal secret authenticates the Gateway, not the user. Derive the actor from the
  verified token and check ownership in the owning use case. Never trust client actor fields.
- Create only the layers the feature needs. No empty folders, modules, providers or RPCs.
- Domain code imports no Nest, Prisma or gRPC. `presentation` never imports `infrastructure`.
- Do not add a Nest app, GHCR image, Compose service, Postgres instance, migration, seed,
  permission or endpoint that is not approved. Do not run DDL against the server.
- Keep the existing success envelope, error filter, versioned routes and Swagger style.

## Verify and report

Run typecheck, eslint on touched files, focused tests, `npm run proto:check`, and
`npx nest build` for the service and `api-gateway`. Report PASS, FAIL or NOT RUN from real
output. After the test command finishes, delete only the test files this task added, as the
core rule requires. Update the plan checkboxes only for checks that passed.

Summarize in concise Vietnamese: changed files, decisions, commands and results, and what
was not verified (for example, the service is not deployed yet).
