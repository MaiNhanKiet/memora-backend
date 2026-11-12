---
name: git-workflow
description: MEMORA Git workflow - branch naming from dev, Conventional Commit messages with domain scopes, pull requests, and safe Git and secret handling. Use when creating a branch, writing a commit message, preparing a PR, or running any Git operation.
---

# MEMORA — Git workflow (branches, commits, PRs)

## 1. Required format

Every Git commit MUST use Conventional Commits:

```text
<type>(<scope>): <summary>

[optional body]

[optional footer(s)]
```

For a breaking change:

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <what breaks, impact, and migration path>
```

- `type` and `scope` are REQUIRED.
- Use lowercase ASCII for `type` and `scope`; do not use spaces or Vietnamese accents.
- Write the summary in English, in imperative form (e.g., `add`, `fix`, `prevent`, `remove`, `update`).
- Summary begins with a lowercase verb; no period, emoji, or trailing whitespace.
- Keep the entire first line at most 72 characters where practical; shorten rather than use vague wording.
- State the actual behavior/change, not an activity like `update code`, `fix bug`, `done`, or `wip`.
- One commit = one cohesive change; separate unrelated changes.
- Preserve a blank line between subject, body, and footer.

## 2. Allowed types

| Type | Use |
| --- | --- |
| `feat` | New business feature, endpoint, or user-facing capability |
| `fix` | Correct a defect |
| `refactor` | Internal restructuring without changing external behavior |
| `perf` | Performance improvement |
| `test` | Add or improve tests |
| `docs` | Documentation only |
| `build` | Build tooling, packaging, dependencies, Docker image build |
| `ci` | GitHub Actions and CI/CD pipeline definitions |
| `infra` | Docker Compose, host deployment, Cloudflare, server infrastructure |
| `chore` | Non-feature maintenance |
| `revert` | Explicitly revert a prior commit |

Do not use arbitrary new types without user approval.

## 3. Scope selection (MEMORA ownership)

Use the PRIMARY owning business domain whenever possible:

| Service | Allowed domain scopes |
| --- | --- |
| `iam-service` | `iam` |
| `commerce-service` | `catalog`, `pricing`, `inventory`, `design`, `ordering` |
| `operations-service` | `personalization`, `production`, `fulfillment`, `after-sales` |
| `experience-service` | `memory`, `platform` |

Technical or cross-cutting scopes:

`gateway`, `contracts`, `grpc`, `db`, `cache`, `queue`, `security`, `observability`, `architecture`, `docs`, `deps`, `ci`, `deploy`, `infra`, `monorepo`.

- Use `after-sales` as a Git commit scope even though the SQL schema is `after_sales`.
- If one feature changes Gateway + proto + one or more services, use the PRIMARY business domain; explain secondary impacts in the body.
- For an infrastructure-only or repository-wide change, use the closest technical scope.
- Do not use service names as scopes when a more specific owning domain exists.

## 4. When a commit body is required

Add a body explaining **what and why**, and operational implications, when the change includes any of:

- Database schema or Prisma migration; include rollout/backward-compatibility notes.
- Changes to HTTP/gRPC/event contracts, authentication, authorization, or ownership checks.
- Behavior spanning multiple MEMORA services or multiple main flows (MF01–MF06).
- Production deployment, bootstrap, secret-handling behavior, or CI/CD release changes.
- Changes that are not obvious from the summary alone.

When applicable, include relevant flow references (`MF01`–`MF06`), impacted services, and related GitHub issues (`Refs #123`) in the body/footer. Do not invent issue numbers.

## 5. Breaking changes

A breaking change MUST be explicitly marked with `!` immediately before `:` and include a `BREAKING CHANGE:` footer describing:

- Which API, gRPC message, event, schema, or consumer is affected.
- Compatibility impact and required migration/rollout order.
- How existing clients or records should be handled.

Never label a change as backward compatible unless verified.

## 6. Valid examples

```text
feat(catalog): add ring template listing endpoint
feat(design): persist guest cart after add to cart
feat(ordering): create orders from selected drafts
feat(personalization): validate fingerprint capture attempts
feat(production): assign work orders by jeweler skill
feat(memory): add memory card PIN verification
fix(iam): prevent refresh token replay
fix(ordering): reject duplicate payment webhook events
refactor(gateway): centralize grpc error mapping
test(fulfillment): cover recipient verification failures
docs(architecture): document four service boundaries
ci(deploy): publish images only from main
infra(deploy): validate Mini PC secrets before bootstrap
build(deps): update NestJS dependencies
```

Breaking example:

```text
feat(ordering)!: require verified identity for guest checkout

Ensure guest order ownership is verified before creating an order.
Affects commerce-service and Gateway; MF02.

BREAKING CHANGE: Guest checkout requests without verified ownership
proof are rejected. Update clients before rollout.
```

## 7. Rejected examples

```text
update code
fix bug
WIP
feat: add cart
feat(Commerce): Added cart.
feat(ordering): 🔥 done
```

Reasons: missing type/scope, vague summary, wrong casing/tense, trailing period, or emoji.

## 8. Safe commit workflow / Claude behavior

- MEMORA currently uses `dev` for development integration and `main` for release; the release CI/CD pipeline runs when `main` is updated.
- Following these rules is not permission to change branches, commit, push, merge, or deploy. Do those only when the user asks.
- Before suggesting a commit, inspect `git status`, current branch, and staged diff; check for unrelated files.
- Never stage/commit `.env`, credentials, tokens, secrets, private keys, raw biometric data, or production data.
- Propose a precise commit message based on the REAL staged diff, not on the initial user request or presumed implementation.
- Do not execute `git add`, `git commit`, `git push`, `git merge`, `git rebase`, or force-push unless expressly authorized by the user.
- When squash-merging a PR into `dev` or releasing `dev` to `main`, use a Conventional Commit-style squash subject reflecting the actual changes.

# Branches, pull requests and safety

## Branching Model
- `dev` is the integration branch and `main` is the release branch. Work happens on short-lived task branches cut from `dev`. Pushing to `main` publishes images and deploys to the Mini PC.
- Branch format: `<type>/<domain>-<feature>`.
- Allowed branch types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `infra`, `chore`.
- Use lowercase ASCII kebab-case; no spaces or Vietnamese accents.
- Name the branch for the **owning business domain**, not for the technical service.
- For service-wide foundation tasks, the service name is acceptable (for example, `feat/commerce-foundation`).
- For cross-service features, use the primary owning domain. A single cohesive feature may change multiple apps, libraries, contracts, and migrations in one branch.
- Do **not** use permanent branches per service or create extra long-lived branches such as `develop` or `release`.
- Do not directly develop on `main`.
- Create every new branch from the latest `dev`. Do not use `main` or another task branch as the source unless the user explicitly names a different base.

### Examples
- `feat/iam-customer-identity`
- `feat/catalog-ring-templates`
- `feat/pricing-price-versions`
- `feat/design-guest-cart`
- `feat/ordering-create-order`
- `feat/personalization-fingerprint-capture`
- `feat/production-work-orders`
- `feat/memory-digital-card`
- `feat/commerce-foundation`
- `fix/iam-refresh-rotation`
- `refactor/gateway-grpc-client`
- `test/ordering-payments`
- `docs/service-architecture`
- `ci/ghcr-publish`
- `infra/mini-pc-deploy`
- `chore/upgrade-nestjs`

## Safe Worktree and Branch Operations
Before proposing code changes:
1. Inspect the current repository and branch (`git rev-parse --show-toplevel`, `git branch --show-current`, `git status`).
2. Inspect existing remote (`git remote -v`) before assuming it is configured.
3. Propose an appropriate branch name using the rules above.
4. Only switch branches, create a branch, commit, push, merge, or rebase **when the user explicitly authorizes it**.
5. Create every new branch from an up-to-date `dev`: `git fetch origin` and `git switch -c <branch> origin/dev`. Do not branch from `main` unless the user explicitly names another base.
6. Preserve uncommitted changes. Never reset, discard, force-push, or overwrite local commits without explicit authorization.
7. Never run `git init` or replace `.git` without explicit authorization. A missing `.git` in the current folder is not proof that the GitHub repository does not exist.

## Pull Request Rules
- Task branches target `dev`. A release PR merges `dev` into `main` after CI on `dev` is green.
- Use a descriptive title consistent with Conventional Commits where practical.
- PR description must cover:
  - Owning domain and relevant Main Flow (`MF01`–`MF06`, when applicable).
  - User-visible behavior and affected apps/services.
  - HTTP/gRPC/event-contract changes and compatibility.
  - Database schema/migration changes, including rollback considerations.
  - Tests executed, CI results, and operational risks.
- Require applicable lint, type-check, tests, build, and security checks before merge.
- Prefer squash merge for short-lived feature branches; delete the feature branch after merge.
- Do not claim branch protection or mandatory reviews are enforced unless GitHub settings actually confirm it.

## Secrets and Production Safety
- Never commit `.env`, `.env.*` containing secrets, keys, credentials, tokens, or production configuration values.
- Commit only sanitized templates such as `.env.example` and `deploy/secrets/*.env.example`.
- Review `git status` and staged diffs before commit; verify no secrets are staged.
- Keep production secrets on the Mini PC under its protected secret directory; do not embed them in images or GitHub workflows.
- Do not run migrations, bootstrap, deploy, rollback, delete Docker volumes, or modify production databases without explicit authorization.
- Feature branches must not deploy to production.
- Production images should be traceable to an approved commit SHA and immutable image digest; follow the repository's configured approval and deployment process.
