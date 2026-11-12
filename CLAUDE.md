# MEMORA Backend

NestJS 11 monorepo: 4 microservices (`iam`, `commerce`, `operations`, `experience`) + 1 API Gateway. Converted from the former `.cursor/` kit.

## Where the guidance lives
- `.claude/rules/00-memora-core.md` — always-on core rules (scope, security, verification, Vietnamese summaries). Other files in `.claude/rules/` load automatically when you touch matching paths (Gateway, business services, proto/gRPC, IAM auth, Prisma/RBAC, ops/deploy, HTTP contracts, TypeScript quality).
- `.claude/skills/` — task workflows: `plan-api`, `implement-api`, `review-api`, `create-grpc-rpc`, `prisma-migration-seed`, `auth-change-review`, `debug-and-fix`, `refactor-structure`, `review-and-verify`, `memora-backend-architecture`, `git-branching`, `commit-messages`.
- `.claude/settings.json` — hooks: block reads of credential files (`.env`, keys); advisory architecture-boundary check after edits.
- Docs: `docs/architecture/`, `docs/ai/context-map.md`.

## Commands
- `node .claude/scripts/check-boundaries.cjs --all` — architecture boundary scan
- `node --test .claude/tests/guardrails.test.cjs` — hook/boundary guardrail tests

## Reminders
- Create new branches from latest `dev`; never git commit/push/merge without explicit user authorization.
- Conventional Commits (`type(scope): summary`), scope = owning domain.

## Commit messages (from `.cursorrules`)
When generating Git commit messages:
- Follow Conventional Commits. Format: `<type>(<scope>): <summary>`.
- Types: feat, fix, refactor, test, docs, ci, infra, chore.
- Use the owning MEMORA domain as scope.
- Write in English, with lowercase imperative summaries.
- Keep the subject within 72 characters.
- Do not generate long paragraphs by default; add a short body only for complex changes.
- Generate messages based on staged changes.
- Never include credentials or secrets.
- Full detail (scopes, breaking changes, body rules): skill `commit-messages`.
