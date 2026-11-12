---
name: plan-api
description: Plan one MEMORA feature's API inventory and write docs/plans/active/<feature>.md for implement-api. Use when the user asks to plan, design, list, or sequence APIs for a feature or domain before implementation. Does not write application code.
---

# MEMORA — Plan API

Plan **one feature** so `implement-api` can build one approved API at a time. This skill writes the plan only. It does not add DTOs, controllers, services, proto, contracts, migrations, or a new microservice.

## Before planning

Read and compare the sources that exist. Record every missing or conflicting source as `NEEDS_REVIEW`. Do not claim a file or external sheet was reviewed if it was not opened.

- `docs/architecture/`, including `memora-backend-4-service.md` (four business services, API Gateway, MF01–MF06) and `iam-permission-matrix.md`.
- A local `MEMORA — API MASTER SPECIFICATION`, if the workspace contains it. Search before concluding it is absent.
- The Main Flow section for MF01–MF06 and the Prisma schema plus migrations of the owning service.
- Approved RBAC codes in the permission matrix and the owning service's permission catalog. For IAM, include `apps/iam-service/prisma/approved-permissions.ts` when that file exists.
- Current Gateway feature code, owning-service handlers, DTOs, `proto/<domain>/v1/`, handwritten `libs/contracts`, and Swagger.
- `.cursor/rules/` and `.cursor/skills/implement-api/SKILL.md`.

ADR-001 owns the service map. These applications already exist under `apps/`:

- API Gateway.
- IAM Service, with implemented business APIs.
- Commerce Service: domains `catalog`, `pricing`, `inventory`, `design`, `ordering`. Foundation only. No business RPC yet.
- Operations Service: domains `personalization`, `production`, `fulfillment`, `after_sales`. Foundation only. No business RPC yet.
- Experience Service: domains `memory`, `platform`. Foundation only. No business RPC yet.

Plan an API on Commerce, Operations, or Experience inside the existing Nest app. Do not ask for a new Nest application. A plan is not permission to implement, deploy, or enable the Compose `domain-services` profile.

Separate four states. **In source** means the app directory exists. **Business API implemented** means a handler and contract exist; today that is IAM, not the three foundation services. **CI/CD configured** means the publish matrix includes the image. **Production deployed** means the default Mini PC release starts it; that is Gateway and IAM only. Do not describe a foundation module or a configured image as a finished business API.

Repository code is current behavior. An approved spec is intended behavior. A conflict is reported in Pending Decisions. `PROPOSED` and `NEEDS_REVIEW` are not approval to implement.

## Workflow

### 1. Analyze

Confirm `git status --short` and the current branch. Do not switch branches.

Name the domain, feature, owning service, and Main Flow. Inventory routes, RPCs, DTOs, and permission codes already in code. Mark what can be reused. List API dependencies. An API or permission with no approved source is `NEEDS_REVIEW`, not a new approved contract.

### 2. Design the API list

Give every API these fields:

- API ID
- HTTP method and endpoint
- Domain, feature, and service
- Main Flow
- Business purpose
- Actor and RBAC permission
- Request params, query, and body
- Success response and errors
- Validation and business rules
- Database tables
- gRPC method
- Status: `EXISTING`, `PROPOSED`, or `NEEDS_REVIEW`

`EXISTING` requires a source path. `PROPOSED` is a candidate in this plan. `NEEDS_REVIEW` means a source, permission, schema, or ownership decision is missing. Do not set `APPROVED`. Only the user can approve an API after reading the plan.

### 3. Write the plan

Write or update `docs/plans/active/<feature-name>.md`. `<feature-name>` is the feature slug for the current branch. One feature branch has one plan. If that file exists, update it. Do not create a second plan for the same feature.

Use the template below. Checklists are `- [ ]`. Leave every `implement-api` box unchecked. `EXISTING` is recorded in the status field and the source path, not by checking implementation boxes.

### 4. Review

Order APIs from foundation calls to calls that depend on them. Keep `EXISTING` APIs in the inventory so they are not built again. List every `NEEDS_REVIEW` item under Pending Decisions. Set the plan status to `AWAITING_APPROVAL` and stop. Do not implement, commit, push, merge, or deploy.

## Handoff to implement-api

`implement-api` reads `docs/plans/active/<feature>.md` and implements **one** API whose status the user has set to `APPROVED`. It leaves `PROPOSED`, `NEEDS_REVIEW`, and `EXISTING` untouched.

After a verified implementation, `implement-api` checks only the boxes it has evidence for, leaves the rest unchecked, and appends one row to the Implementation Progress Log. A blocker stays `BLOCKED` or `PARTIAL`. This skill does not check those boxes in advance.

## Template

```markdown
# <Feature> API plan

## 1. Metadata

- Branch: `<branch>`
- Domain: `<domain>`
- Service: `<owning-service>`
- Feature: `<feature>`
- Plan status: AWAITING_APPROVAL
- Updated: <date>

## 2. Scope and references

- In scope:
- Out of scope:
- Read:
- Not found (NEEDS_REVIEW):

## 3. API inventory

| API ID | Method | Endpoint | Flow | Permission | gRPC | Status |
| --- | --- | --- | --- | --- | --- | --- |
| <ID> | <METHOD> | </api/v1/...> | <MFxx or N/A> | <CODE or NEEDS_REVIEW> | <method or reuse> | <EXISTING, PROPOSED, or NEEDS_REVIEW> |

## 4. Dependencies and order

1. <API ID> — <why it is first>
2. <API ID> — <depends on>

## 5. API checklists

### <API ID> — <METHOD> </api/v1/...>

- Status: <EXISTING | PROPOSED | NEEDS_REVIEW>
- Domain / Feature / Service:
- Main Flow:
- Purpose:
- Actor:
- Permission:
- Request:
  - Params:
  - Query:
  - Body:
- Response:
  - Success:
  - Errors:
- Validation and business rules:
- Tables:
- gRPC method:
- Existing code:
- Dependencies:

#### implement-api checklist

- [ ] Approved method, path, request, response, and permission confirmed
- [ ] No duplicate route, RPC, DTO, or migration
- [ ] Owning service enforces rules and data ownership
- [ ] Gateway DTO, auth, error mapping, and Swagger match the contract
- [ ] Checks recorded with PASS/FAIL/NOT RUN

## 6. Acceptance criteria and test cases

### <API ID>

- [ ] <success, validation, 401, 403, owner mismatch, or gRPC failure — only cases this API has>

## 7. Pending decisions

- [ ] NEEDS_REVIEW: <missing document, permission, ownership, or conflict>

## 8. Implementation progress log

| Date | API ID | Result | Evidence |
| --- | --- | --- | --- |
```

## Rules

- Do not change RBAC or database schema while planning.
- Do not invent an endpoint, permission, table, or service to fill a gap.
- Do not mark an API complete without implementation and test evidence.
- Permission codes must already exist in the approved catalog, or the field stays `NEEDS_REVIEW`.
- Gateway endpoints stay on the Gateway. Database writes stay with the owning service.
- Summarize the plan path, API count by status, implementation order, and pending decisions. Wait for the user to approve specific API IDs.
