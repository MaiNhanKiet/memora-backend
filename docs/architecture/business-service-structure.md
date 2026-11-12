# Business service structure

Target convention for **Commerce**, **Operations**, and **Experience**. IAM already has business code and is not retrofitted by this document. The Catalog example below is a **target layout**, not a description of code that exists today.

Current source for those three services is a foundation: an app module, empty domain modules, health checks, and a service-local PostgreSQL pool. There are no feature folders, business gRPC handlers, or domain policies yet.

## 1. Shape

```text
Service → Domain → Feature → Layer
```

```text
apps/commerce-service/src/
  commerce-service.module.ts          # process composition root
  health/                             # process health, not a business feature
  persistence/prisma/                 # process-wide pool for this service only
  modules/
    catalog/                          # domain module
      catalog.module.ts
      ring-templates/                 # feature
        ring-templates.module.ts
        presentation/
        application/
        domain/
        infrastructure/
```

A **domain** matches one owned PostgreSQL schema boundary inside the service (`catalog`, `pricing`, `personalization`, `memory`, and so on). A **feature** is one use-case group inside that domain, such as ring templates or capture sessions.

Create a layer directory only when that feature has code for it. Do not scaffold empty `presentation/`, `application/`, `domain/`, or `infrastructure/` folders.

## 2. Layer responsibilities

| Layer | Owns | Does not own |
|---|---|---|
| `presentation/` | Inbound adapters: gRPC controllers, RabbitMQ or other event consumers, transport DTO mapping, transport errors | Business decisions, Prisma, transactions |
| `application/` | Use cases. Load state, call domain policy, ask infrastructure to persist, define transaction boundaries | gRPC decorators, Prisma models, HTTP |
| `domain/` | Entities, value objects, policies, invariants, domain errors | Nest modules, Prisma, brokers, clocks from the framework |
| `infrastructure/` | Prisma repositories, object storage, outbound HTTP, outbound gRPC clients, event publishers | Use-case branching and invariants |

Inbound gRPC controllers and event consumers live in the feature `presentation/` folder (`*.grpc.controller.ts`, `*.rmq.controller.ts`). They validate the transport payload, call one application service, and map the result or error.

Application services and use cases live in `application/`. One class per use case is enough when the behavior is separate. A small feature may keep a single application service.

Domain policies and invariants live in `domain/`. Examples: a template code is unique within the catalog, a price snapshot cannot change after a quote is issued. Those rules stay free of persistence so they can be tested without a database.

Prisma repositories and external adapters live in `infrastructure/`. Repositories implement a port declared by `application/` or `domain/`. They are the only place in the feature that imports the generated Prisma client or talks to `pg`.

## 3. Domain module and feature module

The **domain module** (`catalog.module.ts`) is the composition root for that domain. It imports the feature modules that exist and exports only the application ports that another domain **in the same service** is allowed to call.

The **feature module** (`ring-templates.module.ts`) wires one feature: presentation controllers, application services, and infrastructure providers. It does not import another feature's infrastructure.

Split a feature into its own Nest module when it has its own providers or a lifecycle. Keep a single file pair inside the domain module when a feature is one use case and one repository. Do not create a module per class.

## 4. Dependency direction

Allowed imports inside a feature:

```text
presentation → application → domain
infrastructure → application ports and domain types
feature module → all four, for providers only
```

Forbidden:

- `domain` importing Nest, Prisma, gRPC, or another feature.
- `application` importing a Prisma client, a repository class, or a controller.
- `presentation` importing `infrastructure`.
- A feature importing another feature's repository or Prisma model.
- Any business service importing another service's Prisma client, repository, or `apps/<other>/src`.

Cross-feature use inside one service goes through an application port exported by the domain module. Cross-service use goes through gRPC or an event contract in `proto/` and `libs/contracts`. A shared SQL transaction across services is not available.

Circular imports are a design error. If two features need each other, move the shared rule into the owning feature and pass an identifier, or publish a domain event inside the service. Do not import both feature modules from each other.

## 5. Sharing code

| Need | Where |
|---|---|
| Policy used by two features in one domain | That domain's shared folder, for example `modules/catalog/shared/`, with no Prisma |
| Port used by two domains in one service | Application port exported by the owning domain module |
| PostgreSQL pool for the process | `src/persistence/prisma/` of that service. One pool per process, not one global client for the monorepo |
| ENV validation, logging, tracing, gRPC message types | `libs/config`, `libs/logger`, `libs/observability`, `libs/contracts` |
| Business repository or entity | Stays in the owning service. Never `libs/` |

`libs/` is for technical code that has no domain invariant. Do not add a monorepo `PrismaService` or a shared business repository library.

## 6. Ports and dependency injection

The application layer declares the port:

```text
application/ring-template.repository.ts   # interface only
infrastructure/prisma-ring-template.repository.ts
```

The feature module binds the interface token to the Prisma implementation. Tests replace the token. Presentation and application code depend on the token, not on the class that opens the database.

## 7. Errors, logging, transactions, authorization

Domain code throws domain errors (`TemplateCodeTaken`, `PriceImmutable`). Application code decides whether the use case can continue. Presentation maps those errors to gRPC status codes. Infrastructure translates driver errors into domain or application errors and does not leak SQL text to callers.

Use the shared logger and the existing correlation interceptor. Do not log database URLs, passwords, tokens, or raw biometric payloads.

A transaction spans one use case inside this service. Open it in `infrastructure` behind a unit-of-work port that the application calls. Do not start a transaction in a controller, and do not enlist another service's tables.

The API Gateway may enforce a coarse permission. The owning service authorizes the resource: ownership, state, and assignment. Do not trust a client-supplied actor id. Internal callers still have to be verified.

## 8. What not to add until a feature asks for it

Do not create a gRPC method, proto file, event, migration, or seed just to fill this tree. Health routes and the service database pool already exist at the process root. New business behavior starts in a feature under the owning domain, with only the layers that feature uses.
