# docs/architecture/dependency-rules.md

# Dependency Rules

This document defines repository-level dependency constraints.

These rules apply to both human contributors and AI coding agents.

---

# 1. Dependency Philosophy

Dependencies should flow from:

```text
high-level business logic
```

toward:

```text
explicit abstractions
```

not directly toward vendor implementation details.

The architecture should minimize:

```text
cycles
hidden coupling
cross-layer imports
framework leakage
```

---

# 2. Repository Dependency Model

```text
apps/
    ↓
packages/

business modules
    ↓
application abstractions
    ↓
infrastructure implementations
    ↓
external SDKs
```

Shared packages must never depend on deployable apps.

---

# 3. Allowed App Dependencies

Allowed:

```text
apps/web
    ↓
packages/api-client
packages/api-types
packages/ui
packages/schemas
packages/shared
packages/constants
```

Allowed:

```text
apps/admin
    ↓
packages/api-client
packages/api-types
packages/ui
packages/schemas
packages/shared
packages/constants
```

Allowed:

```text
apps/api
    ↓
packages/shared
packages/constants
packages/config
packages/event-contracts
packages/database        # persistence/infrastructure paths only
```

as appropriate.

Allowed:

```text
apps/worker
    ↓
packages/internal-api-client
packages/event-contracts
packages/shared
packages/constants
packages/config
packages/database        # Outbox/Inbox infrastructure paths only
```

Worker must not import `apps/api` source or use `packages/database` to access business-owned tables.

---

# 4. Forbidden Reverse Dependencies

Forbidden:

```text
packages/ui
    ↓
apps/admin
```

Forbidden:

```text
packages/shared
    ↓
apps/api
```

Forbidden:

```text
packages/api-types
    ↓
Prisma models
```

Shared packages must remain reusable and independent.

---

# 5. Frontend to Backend Boundary

Frontend applications may depend on:

```text
API contracts
generated API client
shared safe types
```

They must not depend on:

```text
Prisma
NestJS services
backend repositories
backend database entities
backend infrastructure SDKs
```

Forbidden example:

```ts
import { PrismaClient } from '@prisma/client'
```

inside:

```text
apps/web
apps/admin
```

---

# 6. Web vs Admin

`apps/web` and `apps/admin` are independent deployable applications.

They should share reusable code through:

```text
packages/*
```

Do not create imports like:

```text
apps/web
    ↓
apps/admin/components/*
```

or vice versa.

If something is genuinely shared, move the correct generic abstraction to a package.

---

# 7. UI Dependency Direction

Allowed:

```text
feature component
    ↓
packages/ui
```

Forbidden:

```text
packages/ui
    ↓
article feature
```

Generic UI must not know about business domains.

---

# 8. API Client Dependency

Frontend network flow should normally be:

```text
Feature/Page
    ↓
query hook / frontend adapter
    ↓
packages/api-client
    ↓
NestJS API
```

Do not create independent raw API clients per feature without reason.

---

# 9. Backend Layer Direction

Preferred:

```text
Controller
    ↓
Application Service
    ↓
Repository Contract
    ↓
Repository Implementation
    ↓
Prisma
```

Forbidden:

```text
Controller
    ↓
Prisma
```

Forbidden:

```text
Controller
    ↓
Redis SDK
```

Forbidden:

```text
Controller
    ↓
S3 SDK
```

---

# 10. Infrastructure SDK Boundary

Vendor SDKs should stay inside infrastructure adapters.

Examples:

```text
AWS SDK
Meilisearch SDK
OpenAI SDK
Anthropic SDK
SMTP SDK
Redis client
```

Do not allow external SDK APIs to become domain-service APIs.

---

# 11. Prisma Boundary

Prisma belongs to persistence infrastructure.

Allowed:

```text
PrismaArticleRepository
    ↓
PrismaService
```

Forbidden:

```text
ArticlesController
    ↓
PrismaService
```

Forbidden:

```text
ArticlesService
    ↓
PrismaService
```

Direct Prisma imports belong only to `packages/database`. API and Worker persistence adapters may
depend on `packages/database`; Controllers, Services, DTOs, domain/application code, and Worker
processors may not.

---

# 12. Redis Boundary

Redis-specific commands belong inside:

```text
cache infrastructure
queue infrastructure
rate-limit infrastructure
lock infrastructure
analytics infrastructure
```

Business code should consume semantic abstractions.

Prefer:

```ts
await articleCache.invalidate(articleId)
```

over:

```ts
await redis.del(`article:${articleId}`)
```

throughout business services.

---

# 13. Storage Boundary

Allowed:

```text
MediaService
    ↓
StorageProvider
    ↓
R2StorageProvider
    ↓
S3-compatible SDK
```

Forbidden:

```text
ArticleService
    ↓
S3Client
```

---

# 14. AI Boundary

Allowed:

```text
Feature Service
    ↓
AIService
    ↓
AIProvider
    ↓
Provider SDK
```

Forbidden:

```text
ArticleController
    ↓
OpenAI SDK
```

or:

```text
ArticleService
    ↓
Anthropic SDK
```

---

# 15. Search Boundary

Allowed:

```text
SearchService
    ↓
SearchProvider
```

Forbidden:

```text
ArticleService
    ↓
Meilisearch client
```

Indexing consequences should normally happen via events/jobs.

---

# 16. Module Persistence Boundaries

Only module-owned repository implementations access their own persistence concerns.

Avoid:

```text
ArticleRepository
querying User tables extensively
```

If Article needs User data:

```text
ArticlesModule
    ↓
UsersModule contract
```

or purpose-designed query composition where explicitly justified.

---

# 17. Query Composition Exception

Some read-only administrative or analytics queries may legitimately span multiple domains.

Examples:

```text
Dashboard
Analytics
Reporting
Search
```

These may use dedicated query/read models.

Do not force every complex read through dozens of service calls.

However:

```text
cross-domain read model
```

must not become a path for cross-domain mutations.

---

# 18. CQRS-Lite Read Models

V1 does not use full CQRS.

However, specialized read services may exist.

Example:

```text
AdminDashboardQueryService
```

may aggregate:

```text
articles
comments
users
analytics
```

This is acceptable for reads.

Do not introduce:

```text
full command bus
event sourcing
separate write database
```

without ADR.

---

# 19. Package Cycles

Packages must not have cyclic imports.

Forbidden:

```text
packages/shared
    ↓
packages/schemas
    ↓
packages/shared
```

If a cycle appears, identify:

```text
incorrect ownership
overly broad package
shared lower-level primitive
```

Do not solve structural cycles with build hacks.

---

# 20. Feature Cycles

Frontend features should avoid importing each other's internals.

Example:

Forbidden:

```text
features/article/components/*
    ↓
features/category/internal/*
```

Prefer:

```text
shared public feature API
```

or:

```text
packages/ui
shared hooks
shared API types
```

as appropriate.

---

# 21. Public Package APIs

Shared packages should expose intentional public APIs through entrypoints.

Prefer:

```ts
import { Button } from '@blog/ui'
```

rather than deep internal imports such as:

```ts
import { Button } from '@blog/ui/src/components/private/button'
```

Internal package structure should be free to change.

---

# 22. Internal Module APIs

NestJS modules should export only required providers/contracts.

Do not:

```text
exports: [
  every repository,
  every helper,
  every private service
]
```

Keep implementation details private.

---

# 23. Dependency Addition

New dependencies must be installed in the narrowest correct workspace.

Example:

If only Worker needs an image library:

```text
apps/worker
```

should own it.

Do not place every dependency in root `package.json`.

Root dependencies should primarily support:

```text
workspace tooling
lint
format
build
shared development tooling
```

---

# 24. Framework Isolation

Framework-specific code should remain near framework boundaries.

Examples:

```text
NestJS decorators
Next.js route APIs
React hooks
Prisma client
```

Pure business or utility logic should not unnecessarily depend on framework types.

This improves:

```text
testing
reuse
migration
AI comprehension
```

---

# 25. No Shared Business Dumping Ground

Do not create:

```text
packages/business
packages/helpers
packages/common-everything
```

to avoid module ownership decisions.

Shared code must have a specific reason to be shared.

Duplication of two tiny functions may sometimes be preferable to creating a badly owned global abstraction.

---

# 26. Dependency Rule Summary

Allowed direction:

```text
UI Feature
   ↓
UI primitives

Frontend
   ↓
API client

Controller
   ↓
Service

Service
   ↓
Repository contract

Repository implementation
   ↓
Prisma

Business/application service
   ↓
Infrastructure abstraction

Infrastructure implementation
   ↓
Vendor SDK
```

Forbidden direction:

```text
shared package
   ↓
app

frontend
   ↓
Prisma

controller
   ↓
database

domain service
   ↓
vendor SDK

module
   ↓
other module repository implementation
```

---

# 27. AI Agent Rule

Before adding an import across module/package boundaries, coding agents must ask internally:

```text
Does this dependency point in the allowed direction?

Does the target expose a public contract?

Am I importing implementation details?

Would this create a cycle?

Should this behavior be called through a service/provider instead?
```

If uncertain, prefer the narrower abstraction.
