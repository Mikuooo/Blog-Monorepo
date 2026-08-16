# AGENTS.md

# Project Instructions

This file contains repository-wide rules for AI coding agents and contributors.

It applies to the entire repository.

Do not load every document in `docs/` by default.

Read additional documentation only when it is relevant to the current task.

---

## 1. Project

This repository is a TypeScript monorepo for a Blog / CMS platform.

Applications:

```text
apps/
├── web/       # Public Blog
├── admin/     # CMS Admin
├── api/       # NestJS business API
└── worker/    # Background jobs
```

Shared packages:

```text
packages/
├── api-client/
├── api-types/
├── ui/
├── schemas/
├── shared/
├── constants/
├── config/
├── database/
├── event-contracts/
├── internal-api-client/
├── eslint-config/
├── typescript-config/
└── test-utils/
```

---

## 2. Core Stack

```text
Monorepo
pnpm
Turborepo

Frontend
React
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Backend
NestJS
Prisma
PostgreSQL

Infrastructure
Redis
BullMQ
S3-compatible storage

API
REST
OpenAPI
Generated TypeScript client
```

---

## 3. Architecture

The backend is a:

```text
Modular Monolith
```

Do not introduce microservices unless explicitly requested.

Canonical backend:

```text
apps/api
```

Next.js is not the canonical business backend.

Primary flow:

```text
Web / Admin
     ↓
Generated API Client
     ↓
NestJS API
     ↓
Service
     ↓
Repository
     ↓
Prisma
     ↓
PostgreSQL
```

---

## 4. Global Dependency Rules

Allowed:

```text
apps
 ↓
packages
```

Forbidden:

```text
packages
 ↓
apps
```

Frontend must never access:

```text
Prisma
PostgreSQL
NestJS repositories
backend infrastructure
```

Backend Controllers must never access Prisma directly.

Preferred backend flow:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Prisma
```

Vendor SDKs should remain behind infrastructure abstractions.

Examples:

```text
StorageProvider
SearchProvider
AIProvider
MailProvider
```

---

## 5. Source of Truth

Canonical business data:

```text
PostgreSQL
```

Binary media:

```text
S3-compatible object storage
```

Redis is not canonical.

Redis may be used for:

```text
cache
queues
rate limiting
locks
temporary values
counters
```

Search indexes are derived and rebuildable.

---

## 6. API Rules

The project uses REST.

Base API:

```text
/api/v1
```

Groups:

```text
/api/v1/public
/api/v1/admin
/api/v1/auth
```

OpenAPI is the canonical HTTP contract.

Frontend clients should use:

```text
packages/api-client
```

Do not create duplicated handwritten API clients unless there is a clear application-specific wrapper.

Generated files must not be manually edited.

---

## 7. TypeScript Rules

Use strict TypeScript.

Avoid:

```ts
any
```

Prefer:

```ts
unknown
```

with proper narrowing.

Avoid:

```ts
// @ts-ignore
```

Avoid unnecessary:

```ts
value!
value as SomeType
```

Do not duplicate existing types.

Prefer:

```ts
import type { Article } from '@blog/api-types'
```

when importing types only.

---

## 8. Database Rules

Database schema changes require Prisma migrations.

Do not manually change production schema.

Do not rewrite migration history after migrations have been shared or deployed.

Review:

```text
constraints
indexes
nullability
foreign keys
delete behavior
existing data compatibility
```

before completing schema changes.

---

## 9. Security Rules

Never:

```text
hard-code secrets
commit credentials
log passwords
log tokens
trust frontend authorization
render unsanitized HTML
trust uploaded file metadata
```

All external input is untrusted.

Backend authorization is authoritative.

UI permission checks are only for UX.

---

## 10. Frontend Rules

React Server Components are preferred by default.

Use Client Components only when required.

Do not add:

```tsx
'use client'
```

to a large component tree because one nested element needs interaction.

Public Web prioritizes:

```text
SEO
server rendering
accessibility
performance
minimal client JavaScript
```

Admin server state should use TanStack Query.

Do not copy API data into global client state unnecessarily.

---

## 11. Backend Rules

Business modules live under:

```text
apps/api/src/modules/
```

Organize code by business domain.

Do not create global business directories such as:

```text
src/controllers/
src/services/
src/repositories/
```

Controllers stay thin.

Business rules belong in Services.

Persistence belongs in Repositories.

---

## 12. Queue Rules

BullMQ is for asynchronous work.

Examples:

```text
image processing
search indexing
email
analytics aggregation
cleanup
page revalidation
```

Queue payloads should usually contain IDs rather than entire domain objects.

Background jobs should be idempotent where practical.

---

## 13. AI Integration Rules

AI provider SDKs must remain behind:

```text
AIService
AIProvider
```

Do not directly call OpenAI, Anthropic, Gemini, or other provider SDKs from unrelated business services.

AI output is untrusted.

Validate structured AI output before using or persisting it.

Never expose AI API keys to Web or Admin clients.

---

## 14. Testing

Prioritize:

```text
business rules
authentication
permissions
API contracts
database behavior
critical user journeys
regression tests
```

Do not optimize solely for 100% coverage.

Use real PostgreSQL for repository/integration tests when database behavior matters.

Do not depend on real paid AI APIs in the default automated test suite.

---

## 15. Agent Workflow

### Task Execution Approval

Each task that requires commands or file changes must be completed in two phases:

1. **Plan phase**: present the implementation or inspection plan, summarize the command types that
   will be used, list the expected file scope (created, modified, and deleted files), and wait for the
   user's explicit confirmation.
2. **Execution phase**: after the user confirms the plan, execute all commands, edits, generation,
   and validation needed to complete the approved task without requesting approval for each command
   or command batch.

The plan approval applies to the entire execution phase as long as the work remains within the
approved goal, approach, command types, and file scope. A new plan and confirmation are required only
when execution would materially change the approved approach, expand the file scope, or introduce an
unapproved high-risk action such as destructive deletion, database writes, deployment, publishing,
or external side effects.

Pure questions that require no command execution or file changes may be answered directly without a
plan approval phase.

After the execution phase finishes, the agent must list the files that were actually created,
modified, or deleted. If no files changed, state `No files changed` explicitly. The final list must
distinguish planned changes from any unexpected changes.

Before implementing:

1. Understand the requested behavior.
2. Identify the owning app/module.
3. Read the nearest relevant `AGENTS.md`.
4. Inspect similar existing code.
5. Search for reusable types/components/utilities.
6. Identify database/API/security impact.
7. Make the smallest coherent change.
8. Add or update tests.
9. Run relevant checks.
10. Review the final diff.

Do not generate large implementations before inspecting the current repository.

---

## 16. Context Loading

Do not read all repository documentation by default.

For work inside:

```text
apps/api/
```

read:

```text
apps/api/AGENTS.md
```

For work inside:

```text
apps/web/
```

read:

```text
apps/web/AGENTS.md
```

For work inside:

```text
apps/admin/
```

read:

```text
apps/admin/AGENTS.md
```

For work inside:

```text
apps/worker/
```

read:

```text
apps/worker/AGENTS.md
```

Read:

```text
docs/architecture/overview.md
```

only when broader architecture understanding is needed.

Read ADRs only when:

```text
changing architecture
questioning an existing architecture decision
adding a competing framework/infrastructure pattern
```

Do not load all ADRs for ordinary feature work.

---

## 17. Forbidden Architectural Changes

Do not introduce these without explicit architectural approval:

```text
microservices
Kubernetes
Kafka
GraphQL
event sourcing
full CQRS
another ORM
another backend framework
another frontend framework
another primary database
duplicate state-management frameworks
duplicate form frameworks
```

---

## 18. Avoid Overengineering

Prefer:

```text
simple
explicit
typed
testable
predictable
```

over:

```text
generic
magical
prematurely abstract
future-proof for hypothetical requirements
```

Do not add abstraction without a real problem.

Do not create generic dumping-ground packages.

---

## 19. Verification

Run scoped checks first.

Examples:

```bash
pnpm --filter @blog/api typecheck
pnpm --filter @blog/api test
```

Then broader checks when appropriate:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Never claim a command passed unless it actually ran successfully.

If something cannot be verified, state it clearly.

---

## 20. Definition of Done

Before completing meaningful work, verify where applicable:

```text
[ ] Correct ownership
[ ] Correct architecture boundary
[ ] Input validation
[ ] Authorization
[ ] Error handling
[ ] Database migration
[ ] API contract
[ ] OpenAPI/client regeneration
[ ] Cache invalidation
[ ] Queue implications
[ ] Security implications
[ ] Tests
[ ] Typecheck
[ ] Lint
[ ] No debug code
[ ] No unrelated changes
```

The goal is not to generate the most code.

The goal is to make the smallest correct change while preserving the architecture.
