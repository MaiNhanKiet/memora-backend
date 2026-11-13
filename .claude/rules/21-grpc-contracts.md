---
description: gRPC protocol contracts, handlers and Gateway client adapters; backward-compatible protobuf evolution.
paths:
  - "proto/**/*.proto"
  - "libs/contracts/src/**/*.ts"
  - "apps/iam-service/src/presentation/grpc/**/*.ts"
  - "apps/*-service/src/modules/**/presentation/**/*.ts"
  - "apps/*-service/src/grpc/**/*.ts"
  - "apps/api-gateway/src/modules/**/clients/**/*.ts"
  - "apps/api-gateway/src/common/grpc/**/*.ts"
---
# gRPC contracts

- `.proto` is wire source of truth; currently mirror TypeScript contracts in `libs/contracts` where the repo uses handwritten types. Compare **existing** implementation before changing proto. No domain/business logic inside contracts.
- Preserve proto `package`, service/method, field numbers, name/type semantics. Never reuse deleted field numbers; `reserved` removed fields. Breaking changes require explicit approval and migration strategy.
- Proto snake_case maps to TypeScript camelCase with loader `keepCase: false` if configured. Never assume JS int64 precision; honor loader long/enum settings of the actual service.
- gRPC handler validates and maps input, delegates to application; no duplicated domain logic. Unary vs streaming must remain distinct. Respect deadline/timeout and map transport-specific errors.
- Internal authentication is not authorization: sensitive RPCs must derive the actor from verified credentials/service context, not a client-chosen user ID.
- Commerce, Operations and Experience: a user-scoped RPC request carries `memora.common.v1.VerifiedActor actor = 1` from `proto/common/v1/actor.proto`, mirrored in `libs/contracts/src/common/actor.ts`. Reuse it; do not define a per-domain actor message or send an access token. Details: `docs/architecture/business-service-api-recipe.md` section 5.
- Tests should cover serialization/contract drift and invalid caller credentials where applicable. Use `create-grpc-rpc` skill for a new RPC.
