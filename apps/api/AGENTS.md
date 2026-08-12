# apps/api/AGENTS.md

# API Agent Instructions

These rules apply to:

```text
apps/api/
```

Also follow the repository root `AGENTS.md`.

---

## 1. Stack

```text
NestJS
TypeScript
Prisma
PostgreSQL
Redis
OpenAPI
Pino
```

Architecture:

```text
Modular Monolith
```

---

## 2. Module Organization

Business code belongs under:

```text
src/modules/
```

Example:

```text
src/modules/articles/
├── controllers/
├── dto/
├── repositories/
├── services/
├── events/
├── mappers/
└── articles.module.ts
```

Organize by domain.

Do not organize all application code globally by technical layer.

---

## 3. Standard Dependency Flow

Use:

```text
Controller
   ↓
Service
   ↓
Repository Contract
   ↓
Prisma Repository
   ↓
Prisma
   ↓
PostgreSQL
```

Never:

```text
Controller → Prisma
```

Avoid:

```text
Service → Prisma
```

Business Services should depend on repositories or application abstractions.

---

## 4. Controllers

Controllers may handle:

```text
routing
DTO input
route/query parameters
auth metadata
permission metadata
service invocation
HTTP response semantics
```

Controllers must not contain:

```text
database queries
complex business rules
transactions
Redis logic
BullMQ logic
S3 SDK calls
AI SDK calls
search SDK calls
```

Keep Controllers thin.

---

## 5. Services

Services own business/application behavior.

Examples:

```text
createArticle
updateArticle
publishArticle
scheduleArticle
archiveArticle
approveComment
```

Services may coordinate:

```text
repositories
other exported module contracts
transactions
domain events
infrastructure abstractions
```

Use business-oriented method names.

Avoid leaking Prisma query objects into Services.

---

## 6. Repositories

Repositories own persistence operations.

Preferred:

```ts
findById()
findBySlug()
findPublished()
create()
update()
softDelete()
```

Avoid generic ORM wrappers such as:

```ts
findMany(args: PrismaArgs)
```

throughout business code.

Repository APIs should express domain needs.

---

## 7. Cross-Module Access

A module must not directly inject another module's Prisma repository.

Bad:

```text
ArticlesService
   ↓
PrismaCategoryRepository
```

Prefer:

```text
ArticlesService
   ↓
CategoriesService
```

or a narrow exported reader/contract.

Only an owning module should mutate its domain data.

---

## 8. DTOs

Every external HTTP input must be validated.

Use explicit DTOs for:

```text
body
query
path parameters
```

DTOs are transport contracts.

Do not implement Prisma input types directly.

Do not expose Prisma models as HTTP response contracts.

---

## 9. Response Contracts

Use stable response structures.

Do not make clients branch on human-readable error messages.

Application errors use stable codes such as:

```text
ARTICLE_NOT_FOUND
ARTICLE_SLUG_EXISTS
ARTICLE_ALREADY_PUBLISHED
PERMISSION_DENIED
```

Expected Prisma/database errors must be translated where appropriate.

Never expose raw database errors to clients.

---

## 10. OpenAPI

Every production API endpoint must be represented correctly in OpenAPI.

When changing an endpoint:

```text
DTO
OpenAPI metadata
response contract
error contract
```

must remain consistent.

If API contract changes require client regeneration, regenerate:

```text
packages/api-client
```

Do not patch generated client output manually.

---

## 11. Authentication and Authorization

Admin mutations require server-side authorization.

Use Guards/decorators.

Prefer:

```ts
@RequirePermissions('article.publish')
```

Never authorize with:

```text
username === admin
userId === 1
```

Do not trust client-provided roles or permissions.

---

## 12. Prisma

Use Prisma only in persistence/infrastructure layers.

Direct Prisma client imports and generated Prisma types belong only to `packages/database`.

API persistence adapters may depend on `@blog/database`. Controllers, Services, Guards, DTOs,
domain/application code, and repository contracts must not import it or expose Prisma types.

Use deliberate:

```text
select
include
```

Avoid loading large relation graphs unnecessarily.

Avoid N+1 queries.

Article list APIs generally should not fetch:

```text
full content
all revisions
all comments
```

unless explicitly required.

---

## 13. Transactions

Use transactions when multiple database mutations must be atomic.

Examples:

```text
create Article + initial Revision
publish Article + publication state changes
role update + permission assignments
```

Keep transactions short.

Do not perform:

```text
S3 uploads
AI requests
mail
search indexing
```

inside long-running DB transactions.

---

## 14. Events

Use events for meaningful facts:

```text
ArticleCreatedEvent
ArticleUpdatedEvent
ArticlePublishedEvent
MediaUploadedEvent
```

Use past-tense naming.

Do not use events for validation that must complete synchronously.

---

## 15. Redis

Do not scatter raw Redis commands through Services.

Use semantic infrastructure abstractions where practical.

Every cached value needs:

```text
key
TTL
invalidation
fallback
source of truth
```

PostgreSQL remains canonical.

---

## 16. Storage

Media storage must use:

```text
StorageProvider
```

Do not import S3/R2 SDKs throughout business modules.

Storage implementation belongs under infrastructure.

---

## 17. Search

Search integration must use:

```text
SearchService / SearchProvider
```

ArticlesService must not directly depend on Meilisearch-specific APIs.

Search indexes are derived.

---

## 18. AI

AI integrations must flow through:

```text
AIService
   ↓
AIProvider
```

Never call provider SDKs directly from Article/Comment/etc. controllers.

Validate AI structured output.

Provider failure must not corrupt existing canonical content.

---

## 19. Soft Delete

Normal reads should generally exclude:

```text
deletedAt != null
```

where the model uses soft deletion.

Use explicit operations for:

```text
restore
trash query
purge
```

Do not accidentally expose deleted content through public endpoints.

---

## 20. Pagination

Potentially large lists require bounded pagination.

Typical defaults:

```text
page = 1
pageSize = 20
```

Maximum page size must be enforced.

Do not return unlimited rows.

---

## 21. Security

Review security whenever modifying:

```text
auth
permissions
uploads
Markdown
AI
URLs
private content
sessions
settings
```

Never log:

```text
password
access token
refresh token
Authorization header
secret keys
```

---

## 22. Logging

Use structured logging.

Prefer:

```ts
logger.info(
  {
    articleId,
    userId,
    requestId,
  },
  'Article published',
)
```

Remove temporary `console.log` calls before completion.

---

## 23. Tests

Use:

```text
unit tests
    for business logic

integration tests
    for repository/database behavior

API E2E
    for HTTP contracts/auth/permissions
```

Important domains:

```text
Auth
Permissions
Articles
Revisions
Comments
Media
```

Bug fixes should add regression tests when practical.

---

## 24. Before Completing API Work

Check:

```text
[ ] Correct module owns behavior
[ ] Controller is thin
[ ] DTO validation exists
[ ] Service owns business logic
[ ] Repository owns persistence
[ ] No cross-module repository violation
[ ] Permission checked
[ ] Transactions reviewed
[ ] Database constraints reviewed
[ ] Cache invalidation reviewed
[ ] Queue/event implications reviewed
[ ] OpenAPI correct
[ ] API client regenerated if required
[ ] Tests updated
[ ] Typecheck/lint run
```
