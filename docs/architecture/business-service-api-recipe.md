# Adding an API to Commerce, Operations or Experience

This is the step-by-step recipe for one new API in a business service. The shared
infrastructure is already wired, so a new API touches **feature files only**.
IAM is the reference implementation for behavior and wire format. It is **not**
the folder template for these three services (see `business-service-structure.md`).

Read `docs/plans/active/<feature>.md` first when it exists. Use the
`implement-business-api` skill to run this recipe.

## 1. What is already wired (do not redo)

| Concern | Where | Notes |
|---|---|---|
| gRPC server per service | `apps/<svc>-service/src/main.ts` | Hosts every proto listed in the registry below |
| Proto registry | `apps/<svc>-service/src/grpc/<svc>-grpc.registry.ts` | Add one entry per business proto. No `main.ts` edit |
| Caller authentication | `apps/<svc>-service/src/grpc/<svc>-internal-grpc-auth.guard.ts` | `@UseGuards(<Svc>InternalGrpcAuthGuard)` on each gRPC controller. Built on `createInternalGrpcAuthGuard` in `libs/common` |
| Internal secret env | `<SVC>_INTERNAL_GRPC_SECRET` (required, 32+ chars) | Validated in `libs/config/src/env/<svc>.env.ts`. Read as `<svc>.internalGrpcSecret` |
| Database access | `PrismaService` in `apps/<svc>-service/src/persistence/prisma/` | Global provider. One pool per process, shared with the health probe. Connects on first query |
| Prisma schema | `apps/<svc>-service/prisma/schema.prisma` | Models match the BM04 baseline in `db/`. Cross-service ids are plain UUID columns |
| Gateway target config | `<SVC>_GRPC_URL` + `<SVC>_INTERNAL_GRPC_SECRET` | Optional until used, set together. Config keys `apiGateway.<svc>GrpcUrl` and `apiGateway.<svc>InternalGrpcSecret` |
| Gateway client helpers | `apps/api-gateway/src/common/grpc/domain-grpc.ts` | `domainGrpcClientOptions(...)` and the `DomainGrpcClient` base class (secret, correlation metadata, timeout, error mapping) |
| Proto validation | `npm run proto:check` | Loads every `proto/**/*.proto`. No list to edit |
| Health, logging, observability, error filter | each service's `main.ts` and module | Already registered |
| CI, image, deploy | `.github/workflows/ci.yml`, `docker/<svc>-service.Dockerfile` | Build, smoke and publish already include all three services |

## 2. IAM reference map

Copy the **behavior**, not the folders.

| You need | Look at in IAM |
|---|---|
| Proto shape, request and response messages | `proto/iam/v1/iam.proto` |
| Handwritten contract types | `libs/contracts/src/iam/iam.grpc.ts` |
| gRPC controller, request validation helpers | `apps/iam-service/src/presentation/grpc/*.grpc.controller.ts`, `grpc-request.ts` |
| Use case with transaction and audit | `apps/iam-service/src/application/admin/` |
| Gateway client module and client class | `apps/api-gateway/src/modules/iam/clients/` |
| Gateway controller, DTOs, Swagger docs | `apps/api-gateway/src/modules/iam/permission-management/` (small), `user-management/` |
| RBAC on a route | `@RequirePermissions(PERMISSIONS.X)` from `@app/auth` |

## 3. Steps for one API

Stop and ask before any step marked **ASK**.

1. **Confirm the contract.** API id, `METHOD /api/v1/...`, domain, owning service,
   request and response, error cases, and the permission code. **ASK** if the
   permission is not in `libs/contracts/src/iam/permissions.ts`. Never invent a code.
2. **Proto.** Add or extend `proto/<domain>/v1/<domain>.proto`. Package
   `memora.<domain>.v1`. Snake_case fields, never reuse a field number. Run
   `npm run proto:check`.
3. **Contracts.** Add the matching handwritten types under
   `libs/contracts/src/<domain>/` and export them from `libs/contracts/src/index.ts`.
4. **Register the proto** in `apps/<svc>-service/src/grpc/<svc>-grpc.registry.ts`
   (first API of a proto only).
5. **Service feature** at `apps/<svc>-service/src/modules/<domain>/<feature>/`.
   Create only the layers that have code:
   - `presentation/<feature>.grpc.controller.ts`: `@Controller()`, `@UseGuards(<Svc>InternalGrpcAuthGuard)`,
     `@GrpcMethod('<ProtoService>', '<Method>')`. Validate the typed request, call one use case, map the result.
   - `application/`: the use case. Transactions and idempotency live here.
   - `domain/`: invariants and policies. No Nest, Prisma or gRPC imports.
   - `infrastructure/`: repository that implements an application port and uses `PrismaService`.
   - `<feature>.module.ts` wires the four. Import it in `modules/<domain>/<domain>.module.ts`.
6. **Gateway client.** Under `apps/api-gateway/src/modules/<domain>/clients/`:
   a `<Domain>ClientsModule` using `ClientsModule.registerAsync([domainGrpcClientOptions({...})])`
   with `urlConfigKey: 'apiGateway.<svc>GrpcUrl'`, and a `<Domain>GrpcClient extends DomainGrpcClient`
   passing `'apiGateway.<svc>InternalGrpcSecret'`. Resolve the service in `onModuleInit`
   and wrap each RPC with `this.unary(...)`. One client per domain, never duplicated.
7. **Gateway HTTP.** Under `apps/api-gateway/src/modules/<domain>/<feature>/`: `controllers/`,
   `dto/request`, `dto/response`, `docs/` (Swagger). Create `<domain>.module.ts` the first
   time and add it to `app.module.ts`. DTOs are classes with `class-validator` and Swagger
   decorators. Routes are authenticated by default. `@Public()` only for an approved
   anonymous API.
8. **Configuration.** Set `<SVC>_GRPC_URL` and `<SVC>_INTERNAL_GRPC_SECRET` in the Gateway env,
   and the same secret as `<SVC>_INTERNAL_GRPC_SECRET` in the service env. Examples are in
   `.env.example` and `deploy/secrets/*.env.example`. Live secrets stay on the Mini PC.
9. **Verify.** `npm run typecheck`, `npx eslint` on touched files, focused tests,
   `npm run proto:check`, `npx nest build <svc>-service` and `api-gateway`.
   Record PASS, FAIL or NOT RUN from real output.

## 4. Rules that keep the architecture intact

- Only the owning service reads and writes its schemas. No Prisma in the Gateway, no other
  service's Prisma client, model or repository, no SQL against another service's schema.
- **There are no database foreign keys across services.** A column such as
  `ordering.orders.owner_customer_identity_id` is a plain UUID. The owning use case checks
  that the id exists by calling the other service over its contract (gRPC). PostgreSQL will
  not do it.
- The internal secret proves the caller is the Gateway. It does not authorize a user. The
  actor reaches the service only as `VerifiedActor` (section 5). Check ownership, assignment
  and state in the owning use case. Never trust `userId`, `role` or `x-actor-*` sent by a client.
- No new endpoint, proto field, permission, migration or seed without an approved plan.
  `PROPOSED`, `To Review` and `Decision Required` items are not permission to implement.
- Schema changes follow the `db/` baseline. Do not run migrations or DDL against the server
  without explicit authorization and a backup.
- Do not add a Nest app, Postgres instance, GHCR image or Compose service.
- Do not log secrets, tokens, OTPs or full request bodies.

## 5. Actor context: Gateway to business service (decided 2026-11-13)

Decision D-P-03 applies to every RPC that acts for a signed-in user in Commerce,
Operations and Experience. The Gateway authenticates the user, then passes the verified
identity as a typed field in the gRPC request. The service does not receive or validate
the access token.

**Who does what**

| Step | Owner | How |
|---|---|---|
| Authenticate the bearer token | Gateway | Existing `JwtAuthGuard` calls IAM `ValidateAccessToken` |
| Check the permission code of the route | Gateway | `@RequirePermissions(PERMISSIONS.X)`, which calls IAM `CheckPermissions` |
| Prove the caller is the Gateway | Service | `<Svc>InternalGrpcAuthGuard` with `<SVC>_INTERNAL_GRPC_SECRET` |
| Authorize the resource (owner, store, order, state) | Service use case | Compare `VerifiedActor` with the stored record |

**Wire contract.** Defined once and imported by every domain proto:

```proto
// proto/common/v1/actor.proto
syntax = "proto3";
package memora.common.v1;

message VerifiedActor {
  string user_id = 1;               // IAM user id (UUID), always set
  string customer_identity_id = 2;  // empty when the user has no customer identity
}
```

Each request message of a user-scoped RPC has `memora.common.v1.VerifiedActor actor = 1;`
(`import "common/v1/actor.proto";`). The TypeScript mirror lives in
`libs/contracts/src/common/actor.ts` and is exported from `libs/contracts/src/index.ts`.
Both files exist. Reuse them; nobody defines a per-domain actor message.

| Side | Helper | Use |
|---|---|---|
| Gateway | `toVerifiedActor(principal)` in `apps/api-gateway/src/common/grpc/verified-actor.ts` | `actor: toVerifiedActor(principal)` where `principal` comes from `@CurrentUser()`. A missing principal throws 401 |
| Service | `parseVerifiedActor(request.actor)` from `@app/common` | In the gRPC controller. Returns `{ userId, customerIdentityId \| undefined }`, or `INVALID_ARGUMENT` |
| Service | `requireCustomerActor(actor)` from `@app/common` | For customer-only RPCs. Missing customer identity gives `INVALID_ARGUMENT` |

**Gateway rules**

- Build `actor` only from the authenticated principal (`@CurrentUser()`, `request.user`).
  Never copy it from the body, query, path or a header.
- Do not forward the access token to Commerce, Operations or Experience.
- An `@Public()` route has no actor. Its RPC does not take `VerifiedActor`, and it needs an
  approved anonymous flow.

**Service rules**

- The gRPC controller parses `actor` once. A missing or non-UUID `user_id`, or a non-UUID
  `customer_identity_id`, returns `INVALID_ARGUMENT`. Pass a typed actor to the use case.
- The use case authorizes the resource. It returns `NOT_FOUND` for a customer-owned record
  that does not belong to the actor, so ids cannot be probed. It returns `PERMISSION_DENIED`
  for a known record when the actor is not allowed to act on it. It returns
  `FAILED_PRECONDITION` for a state that blocks the action.
- Do not re-check the route's permission code in the service, and do not send role or
  permission lists in `VerifiedActor`. When customers and staff can both reach a resource,
  add one RPC per access scope (for example `GetMyConsent` and `GetConsent`). Gateway routes
  each one behind its own permission. Do not use a role flag in the request.
- Need more facts about the actor, such as a staff member's store? Call the owning service
  (IAM) by `user_id` over an approved contract. Never use a token.
- Persist actor ids as plain UUID columns (`created_by_user_id`, and so on). There is no
  foreign key to `iam`.
- Background jobs carry the actor ids recorded when the job was queued, not a token.

**Not this contract**

- The `x-actor-type`, `x-actor-id` and `x-customer-identity-id` metadata (set by `libs/observability`)
  is correlation data for logs. It is not verified and must not be used for authorization.
- Devices (for example ESP32/AS608) and service-to-service jobs without a user need their own
  approved credential. Do not fake a `VerifiedActor` for them.

**Accepted trade-off.** Anyone who holds a service's internal secret can claim any actor.
This is mitigated by one secret per service (32+ chars), gRPC ports that are not published,
and the internal Docker network. Never log the secret or the full request.

**Tests per user-scoped RPC.** Missing actor gives `INVALID_ARGUMENT`. Another user's record
gives `NOT_FOUND` or `PERMISSION_DENIED`. A wrong internal secret gives `UNAUTHENTICATED`.
The Gateway test shows that a client-supplied actor field is ignored.

## 6. Definition of done

- Contract matches the approved plan or the named API.
- Proto, contract types and registry entry are consistent. `proto:check` passes.
- gRPC controller is guarded. A user-scoped RPC takes `VerifiedActor` (section 5). The use
  case enforces ownership and invariants.
- Gateway client, DTOs, Swagger, error mapping and RBAC match the contract.
- Typecheck, lint, tests and builds ran, with results recorded.
- Plan checkboxes updated only for checks that passed.

## 7. Not yet available (blockers to raise, not to work around)

- The service must be deployed before the API is reachable on the server: database
  grants for `<svc>_app`, secret files and the `domain-services` profile are separate
  operations steps.
- RBAC permission codes for Commerce, Operations and Experience come from the approved
  catalog. If one is missing, ask for approval.
