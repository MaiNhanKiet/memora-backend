---
name: review-api
description: Review one MEMORA API or a feature release against its approved plan, API spec, RBAC, and implementation. Use when the user asks to review, re-review, or sign off an API or feature after implement-api. Reports findings and does not change application code by default.
---

# MEMORA — Review API

Review the implementation against the approved plan and API spec. Default output is a report. Do not edit application code, commit, push, merge, migrate, or deploy.

The sequence is `plan-api`, then `implement-api`, then this skill, then fix the findings, then run this skill again, then the next API.

## Modes

- `SINGLE_API`: one API ID. Use this when the user names an ID.
- `FEATURE_RELEASE`: every in-scope API in `docs/plans/active/<feature>.md`. Skip `DEFERRED` APIs. Use this when the user asks to review the feature or the release.

If the user names neither an API ID nor a feature review, stop and ask which mode to run.

## Read first

Confirm `git status --short` and the current branch. Do not switch branches. Open only the files this API touches.

- `docs/plans/active/<feature>.md` and `docs/api/<domain>/` for that feature.
- `docs/architecture/memora-backend-4-service.md` and `docs/architecture/iam-permission-matrix.md` when IAM or RBAC is involved.
- The approved permission catalog. For IAM, include `libs/contracts/src/iam/permissions.ts`.
- Gateway controller, DTO, Swagger, and gRPC client.
- `proto/<domain>/v1/`, the handwritten types in `libs/contracts`, the owning service application and repository, and the Prisma model.
- Tests and the check results already recorded in the plan. A command is `NOT RUN` unless its output is in the plan or you run it because the user asked.

`PROPOSED` and `NEEDS_REVIEW` are not approval. Review an API whose plan status is `APPROVED` or whose implementation the user explicitly points at. Do not treat `DEFERRED` work as required.

## What to compare

The approved method, path, request, response, error status, permission, and business rules win. Code that adds a field, route, permission, or table outside that contract is a finding.

Check only the relevant code:

- Gateway: DTO validation, Swagger, auth, error mapping, and the success envelope `{ statusCode, message, data, meta? }`. No Prisma in the Gateway.
- gRPC: proto field numbers stay compatible. `libs/contracts` is handwritten and matches the proto. The internal caller secret is checked. The controller does not own business rules.
- Owning service: invariants, transactions, uniqueness, and repository writes stay in that service.
- Permission: the route uses a code from the approved catalog. `CheckPermissions` means all listed codes. A route that allows either of two codes must not send both in one all-of check.
- Logging and audit: `x-request-id` and the verified actor are present. Passwords, tokens, cookies, OTPs, and `googleSub` are not logged. Audit metadata follows the existing redaction. The actor id comes from the verified token.

## Security

Look for these in the changed path:

- Authentication bypass, including a new `@Public()` route or a missing guard.
- Privilege escalation, including a permission the catalog does not grant and an ADMIN wildcard.
- IDOR: a target id is authorized, not merely formatted as a UUID.
- Actor spoofing: body or client `userId`, `actorId`, or `x-actor-*` is not the actor.
- Race conditions on unique assignments, status changes, and check-then-write updates.
- Sensitive data in responses, logs, or audit metadata. A one-time secret may appear only where the approved spec allows it.

## Verdict

| Result | When |
| --- | --- |
| `PASS` | No findings, and every acceptance box for this API has recorded test evidence. |
| `PASS_WITH_NOTES` | Only `MEDIUM` or `LOW` findings, and acceptance evidence exists. |
| `CHANGES_REQUIRED` | Any `CRITICAL` or `HIGH` finding, or acceptance tests are missing or failing. |

`FEATURE_RELEASE` is `CHANGES_REQUIRED` when any reviewed API is. It is `PASS_WITH_NOTES` when every reviewed API is `PASS` or `PASS_WITH_NOTES` and at least one note exists. It is `PASS` only when every reviewed API is `PASS`.

## Findings

Each finding has a severity, file, line, cause, and fix. Do not refactor unrelated code.

| Severity | Use for |
| --- | --- |
| `CRITICAL` | Auth bypass, privilege escalation, actor spoofing, or credential leakage. |
| `HIGH` | IDOR, a broken approved business rule, a race that can duplicate or drop a grant, or missing acceptance evidence. |
| `MEDIUM` | Wrong error status, contract drift that is not a security break, or a missing audit field required by the spec. |
| `LOW` | Naming, docs, or test clarity that does not change behavior. |

## Plan update

On the reviewed API, set `Review:` to the verdict. Append one row to the Implementation Progress Log with the date, API ID, verdict, and finding counts.

Do not check an `implement-api` box or an acceptance box that has no test evidence. Do not change `Status` to done. `BLOCKED` and `PARTIAL` stay in place. A `PASS` review does not by itself mean the API is complete.

## Report

```text
Mode: SINGLE_API | FEATURE_RELEASE
API: <ID or feature>
Verdict: PASS | PASS_WITH_NOTES | CHANGES_REQUIRED
Findings: <critical>/<high>/<medium>/<low>
Acceptance: <met | gaps>
Plan: <review line updated | not updated and why>
Next: <fix findings and re-review | next API ID | none>
```

List findings first, highest severity first. After `CHANGES_REQUIRED`, stop. Do not start the next API and do not apply the fixes unless the user asks.
