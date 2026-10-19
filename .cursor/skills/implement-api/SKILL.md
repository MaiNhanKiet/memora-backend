---
name: implement-api
description: Implement one approved MEMORA backend API end-to-end across the Gateway HTTP endpoint and the owning gRPC service. Use when asked to add, update, continue, or complete one REST endpoint, including DTO, Swagger, RBAC, proto, and handwritten contracts.
---

# MEMORA — Implement API

Implement **one approved API at a time**. Match existing code. Do not invent a contract when the user has not named the API and no approved plan names it.

## Ownership

ADR-001 approves four business services plus the API Gateway. **Deployed apps today are only `api-gateway` and `iam-service`.** Do not create `commerce-service`, `operations-service`, or `experience-service` unless the user asks for a new service.

| Service | Owned domains | In `apps/` today |
| --- | --- | --- |
| `iam-service` | `iam` | yes |
| `commerce-service` | `catalog`, `pricing`, `inventory`, `design`, `ordering` | no |
| `operations-service` | `personalization`, `production`, `fulfillment`, `after_sales` | no |
| `experience-service` | `memory`, `platform` | no |

The Gateway owns public HTTP, validation, Swagger, and the gRPC client call. **Only the owning service implements business rules and writes its database.** No Prisma in the Gateway.

Repository code is the source for current behavior. Approved specs are the source for intended behavior. Report conflicts before changing a public contract.

## When to use

- The user names one API, or asks to continue the next approved unchecked API.
- **Plan only:** read or update the plan. Do not change implementation code.
- A plan file at `docs/plans/active/<feature>.md` is the checklist **when that file exists**. Read its API ID, method, path, domain, owner service, Main Flow, permission, request/response, and acceptance criteria. Update `[x]` only for checks that actually passed.
- If that file does not exist, implement the API the user named. Do not create a plan file unless asked, and do not block only because the plan file is missing.
- If neither a named API nor an approved plan identifies the route, request/response, and permission, stop and ask. Do not invent a contract.
- Read `docs/ai/context-map.md`, `docs/api/<domain>/`, and `docs/architecture/` when those files exist. Do not claim an external sheet was reviewed if it was not opened.

## Workflow

### 1. Confirm scope

Check `git status --short`. Do not discard user changes or switch branch without permission.

State briefly: API ID and `METHOD /api/v1/...`, domain, owner service, Main Flow if any, what already exists, auth policy, and files to touch. Auth policy is one of: public, JWT, approved role or permission, resource ownership in the owning service. Use guest only when this API's existing code already has a guest mechanism.

If the selected plan item is still awaiting approval, do not implement.

### 2. Contract

Reuse the current RPC and DTOs when they can support this API. Do not add a duplicate RPC.

A new or extended RPC follows `create-grpc-rpc`: change `proto/<domain>/v1/*.proto` first, then hand-edit the matching types in `libs/contracts`. These contracts are handwritten. There is no contract generator and no `ts-proto`. Do not look for generated files to avoid editing.

HTTP request, query, params, response, errors, pagination, and validation stay in Gateway DTO classes. Keep the existing success envelope and versioned routes.

Add a schema migration only when this API needs a schema change. Inspect existing migrations first. Never run a production migration without explicit authorization.

### 3. Owning service

Put business behavior in the owning service's application layer. Persistence goes through its repositories: status transitions, transactions, uniqueness, idempotency, and audit or business history when this action requires them.

The gRPC controller validates the typed request, checks the existing internal caller secret, delegates to the application service, and maps errors with the existing pattern. No Prisma in the gRPC controller.

Do not trust `userId`, `role`, `actorId`, or `x-actor-*` supplied by the client. Authorization uses the verified access token and the existing internal caller mechanism. A UUID format check alone is not trust.

Do not read or write another service's tables. Use an approved RPC or event.

### 4. Gateway

Add or update `apps/api-gateway/src/modules/<domain>/<feature>/`: `controllers/`, `dto/request`, `dto/response`, `mappers`, and `docs` only as needed. Add `http/`, `sse/`, or `websocket/` only when the feature has more than one transport.

Register the controller in the domain `<domain>.module.ts` unless a feature module is justified by real DI or lifecycle needs. Do not duplicate the domain gRPC client.

Validate with DTO classes, map to the RPC, call the owning service, and map the typed response. Preserve `ResponseTransformInterceptor`, the HTTP exception filter, and existing `@SkipResponseTransform()` behavior. Map gRPC failures to HTTP in the Gateway client.

Routes are authenticated by default. `@Public()` only for an approved public API. `@RequirePermissions` only with a permission code that already exists in the approved catalog. Missing approval is a blocker. Do not infer admin authority from a frontend screen.

Document Swagger success and error responses with the real status codes. Keep `x-request-id`, verified Actor Context, and redacted structured logs. Do not log passwords, tokens, cookies, OTPs, or request and response bodies.

### 5. Verify

Cover the cases this API actually has: success status and body, DTO validation, 401, 403, owner mismatch, inactive or locked account, gRPC failure mapping, and idempotency or pagination when the API defines them.

Run the repository commands that match the touched scope: typecheck, lint, focused tests, `proto:check`, and build when feasible. Record PASS, FAIL, or NOT RUN from the command output. Do not claim a live call succeeded unless it ran.

### 6. Report

After verification, update the selected API in an existing `docs/plans/active/<feature>.md`. Leave unverified boxes unchecked. Update feature API docs when that doc already exists.

A remaining blocker is `BLOCKED` or `PARTIAL`. Name what is unresolved. Do not mark the API done.

Summarize with the template below and name the next unchecked API when a plan lists one. Do not implement that next API until asked.

## Stop and ask

Pause before a breaking HTTP or proto change, a new service, unknown data ownership, an unapproved permission or migration, or an unresolved payment, biometric, or data-rights rule.

## Definition of done

- Approved method, path, request, response, and permission are confirmed.
- No duplicate route, RPC, DTO, migration, or repository method.
- The owning service enforces business rules and data ownership.
- Gateway DTO, auth, error mapping, and Swagger match the contract.
- Applicable checks ran and their results are recorded.
- An existing plan or API doc is updated. No blocker is hidden.

## Safety

- Do not add a Nest app, permission, endpoint, or table that was not approved.
- Do not log or commit `.env`, access tokens, passwords, cookies, OTPs, or Google tokens.
- Do not run production migrations, change server secrets, deploy, merge, commit, or push unless the user asks.
- Feature work stays on the current task branch. New branches start from latest `dev`. Do not switch branches automatically.

## Output

```text
API: <ID> — <METHOD> <PATH>
Domain / Service: <domain> / <service>
Permission / Flow: <permission or policy> / <MFxx or N/A>
Implemented: <Gateway, RPC, Service, DB, Swagger, Tests>
Checks: <commands and PASS/FAIL/NOT RUN>
Plan: <updated checkbox, or no plan file>
Remaining: <blockers, next unchecked API>
```
