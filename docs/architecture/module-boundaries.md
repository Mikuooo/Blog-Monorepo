# docs/architecture/module-boundaries.md

# Module Boundaries

This document defines domain ownership and allowed communication between backend modules.

The objective is to prevent architectural drift as the codebase grows.

---

# 1. Core Rule

Every business behavior must have a clear owning module.

Do not create:

```text
common business service
misc service
helper module
shared business logic
```

as dumping grounds.

Cross-module communication must use explicit exported contracts.

---

# 2. V1 Module Map

```text
Auth
Users
Roles
Permissions

Articles
ArticleRevisions
Categories
Tags

Comments
Media

Pages
Menus
Links

Search
Analytics
Settings
Audit
Notifications

AI
System
```

Some infrastructure capabilities may live outside business modules.

---

# 3. AuthModule

Owns:

```text
login
logout
token issuance
token refresh
session verification
session revocation
password verification orchestration
```

May depend on:

```text
UsersModule
PermissionsModule
AuditModule
```

Uses:

```text
LoginSession persistence
token infrastructure
password hashing
```

Must not own:

```text
user profile editing
role management
article permissions
```

---

# 4. UsersModule

Owns:

```text
user profile
user status
nickname
avatar reference
bio
account administrative state
```

May depend on:

```text
MediaModule
AuditModule
```

Should not own:

```text
authentication token generation
role permission definitions
article business logic
```

---

# 5. RolesModule

Owns:

```text
roles
role creation
role update
role deletion constraints
role-permission assignment
```

May depend on:

```text
PermissionsModule
AuditModule
```

Does not authenticate users.

---

# 6. PermissionsModule

Owns:

```text
permission definitions
permission resolution
permission checks/support contracts
```

Examples:

```text
article.read
article.create
article.update
article.publish
article.delete
```

Permission codes are stable domain identifiers.

Do not duplicate permission string definitions across modules.

---

# 7. ArticlesModule

Owns:

```text
Article lifecycle

create
update
publish
schedule
archive
restore
soft delete

article visibility
article slug behavior
article SEO metadata
article content
article counters semantics
```

May depend on:

```text
UsersModule
CategoriesModule
TagsModule
MediaModule
AuditModule
```

May emit:

```text
ArticleCreatedEvent
ArticleUpdatedEvent
ArticlePublishedEvent
ArticleArchivedEvent
ArticleDeletedEvent
```

Must not directly own:

```text
search engine implementation
image processing
mail delivery
Redis implementation
AI provider SDK
```

---

# 8. Article Revision Capability (within ArticlesModule)

Owns:

```text
article revision history
revision versioning
revision retrieval
revision comparison support
revision restore behavior
```

Primary relationship:

```text
Article
  ↓
ArticleRevision
```

Old revisions are immutable.

ArticlesModule owns revision mutation semantics. Revision creation required by create, update,
publish, and restore participates in the ArticlesModule transaction.

Revision query, comparison, and restore entry points remain narrow ArticlesModule application
contracts. Other modules may receive a read-only revision reader but never a mutable revision
repository.

Avoid exposing mutable repository operations for historical revisions.

---

# 9. CategoriesModule

Owns:

```text
categories
category hierarchy
category slug
ordering
parent-child validation
cycle prevention
category metadata
```

May emit category update events if cache/search systems require them.

Articles reference categories but do not own category lifecycle.

---

# 10. TagsModule

Owns:

```text
tag creation
tag update
tag slug
tag metadata
tag lookup
```

Article-tag association may be coordinated by ArticlesModule using TagsModule contracts.

Tag deletion rules must consider associated Articles.

---

# 11. CommentsModule

Owns:

```text
comment creation
comment replies
comment moderation
comment status
comment deletion
comment anti-abuse business rules
```

May depend on:

```text
ArticlesModule
UsersModule
AuditModule
NotificationsModule
```

Must verify that target Article allows comments.

Must not independently modify Article content.

---

# 12. MediaModule

Owns:

```text
Media database metadata
media lifecycle
upload confirmation
media permissions
media soft delete
media references
```

Uses:

```text
StorageProvider
```

May enqueue:

```text
image.process
media.cleanup
```

Does not own image binary provider implementation directly.

---

# 13. PagesModule

Owns independent CMS pages such as:

```text
About
Contact
custom static content
```

Pages are not Articles.

Do not reuse Article simply because both contain content unless product requirements explicitly unify them.

---

# 14. MenusModule

Owns:

```text
navigation structures
menu items
ordering
nested navigation
```

May reference:

```text
Pages
Categories
custom URLs
```

Must not own the referenced resource lifecycle.

---

# 15. LinksModule

Owns:

```text
friend links
external resource links
link status
link ordering
```

External URLs require validation.

---

# 16. SearchModule

Owns search application behavior.

Responsibilities:

```text
search public content
index documents
remove documents
rebuild index
query abstraction
```

Uses:

```text
SearchProvider
```

May depend on read contracts from:

```text
ArticlesModule
CategoriesModule
TagsModule
```

Search is derived infrastructure.

It must not become the canonical source of Article data.

---

# 17. AnalyticsModule

Owns:

```text
page-view collection semantics
aggregation
daily statistics
popular content calculations
```

Uses:

```text
Redis counters
PostgreSQL aggregates
```

Analytics data may be eventually consistent.

Analytics must not modify Article lifecycle state.

---

# 18. SettingsModule

Owns application-configurable site settings.

Examples:

```text
site.title
site.description
seo.defaultTitle
comment.enabled
```

Does not own environment secrets.

Infrastructure credentials belong to deployment/configuration infrastructure.

---

# 19. AuditModule

Owns append-oriented audit history.

Receives audit events/instructions from sensitive operations.

Audit should cover:

```text
article publish/delete
role changes
permission changes
user status changes
settings changes
session/security operations
```

Audit data should remain difficult to mutate accidentally.

---

# 20. NotificationsModule

Owns application notification orchestration.

Potential responsibilities:

```text
email notifications
internal notifications
notification templates
delivery status
```

Uses provider abstractions such as:

```text
MailProvider
```

Other modules should request notification behavior rather than importing provider SDKs.

---

# 21. AIModule

Owns AI application integration.

Responsibilities:

```text
AI feature orchestration
provider selection
prompt templates
structured output validation
usage tracking
provider errors
```

Uses:

```text
AIProvider
```

Other modules may call high-level AI capabilities.

Example:

```text
ArticlesModule
    ↓
AIService.generateArticleSummary()
```

ArticlesModule must not directly call OpenAI/Anthropic/Gemini SDKs.

---

# 22. SystemModule

Owns technical application/system endpoints such as:

```text
health
version information
runtime diagnostics safe for exposure
```

SystemModule must not become a miscellaneous business module.

---

# 23. Allowed Dependency Direction

Conceptually:

```text
         Auth
          │
          ▼
        Users
          │
          ▼
 Permissions / Roles


 Articles ─────→ Users
    │
    ├──────────→ Categories
    ├──────────→ Tags
    ├──────────→ Media
    ├──────────→ Revisions
    └──────────→ Audit


 Comments ─────→ Articles
    │
    ├──────────→ Users
    └──────────→ Notifications


 Search ───────→ Article Read Contracts

 Analytics ────→ Article identifiers/read metadata

 AI ───────────→ Provider abstraction
```

This diagram expresses logical direction, not necessarily every NestJS import.

---

# 24. Repository Ownership

Each module owns its persistence access.

Example:

```text
ArticlesModule
    owns ArticleRepository

CategoriesModule
    owns CategoryRepository

UsersModule
    owns UserRepository
```

Forbidden:

```text
ArticlesService
    ↓
PrismaCategoryRepository
```

Allowed:

```text
ArticlesService
    ↓
CategoriesService
```

or:

```text
ArticlesService
    ↓
CategoryReader
```

if a narrow exported contract is more appropriate.

---

# 25. Read Contracts

Not every cross-module call needs the full service.

A module may export narrow read contracts.

Example:

```ts
export abstract class CategoryReader {
  abstract findById(id: string): Promise<CategorySummary | null>
}
```

This may be preferable to exposing an entire large service.

Use when it improves boundary clarity.

Do not create interfaces for every trivial method by default.

---

# 26. Mutation Ownership

Only the owning module should mutate its entities.

Example:

Forbidden:

```text
ArticlesModule
    directly updates Category
```

Allowed:

```text
ArticlesModule
    calls CategoriesService
```

Similarly:

```text
CommentsModule
```

must not directly change:

```text
Article.status
```

---

# 27. Shared Transactions

When one business transaction spans module-owned data, determine a clear orchestration owner.

Example:

Publishing Article may require:

```text
update Article
create ArticleRevision
```

Since Article publication is owned by ArticlesModule:

```text
ArticlesService
```

owns the transaction orchestration.

Do not create a generic global transaction service containing business rules.

---

# 28. Domain Events

Modules may expose meaningful events.

Example:

```text
ArticlesModule
    emits ArticlePublishedEvent
```

Consumers:

```text
SearchModule
Cache listener
NotificationsModule
AnalyticsModule
```

Consumers must not assume synchronous execution unless explicitly designed.

---

# 29. Avoid Event Abuse

Do not use events for required synchronous validation.

Bad:

```text
ArticleService emits ValidateCategoryEvent
and hopes someone rejects it
```

Required validation should use direct application contracts.

Events represent consequences after meaningful business actions.

---

# 30. Infrastructure Ownership

Infrastructure implementations live under:

```text
apps/api/src/infrastructure/
```

Examples:

```text
storage/
search/
cache/
mail/
ai/
```

Business modules depend on abstractions.

Vendor implementations depend on SDKs.

---

# 31. Circular Dependencies

Circular dependencies indicate questionable ownership.

Before using:

```text
forwardRef()
```

review whether:

```text
responsibility is misplaced
a read contract is needed
events can invert dependency
a new orchestration service is justified
```

Do not normalize circular NestJS modules.

---

# 32. Shared Domain Concepts

If multiple modules need the same simple immutable concept:

```text
ArticleStatus
PermissionCode
MediaType
```

it may live in an appropriate shared domain/types package.

Do not move entire business services to shared packages.

---

# 33. Public vs Internal APIs

A module may expose:

```text
public application contract
```

while keeping internal helpers private.

Avoid exporting every provider/service from NestJS modules.

Export only what other modules genuinely require.

---

# 34. Module Definition of Done

A new module must answer:

```text
What does this module own?

What does it not own?

Which entities does it mutate?

Which contracts does it export?

Which modules may it depend on?

Which events does it emit?

Which infrastructure does it consume?

Which permissions protect it?
```

If those answers are unclear, module boundaries are not ready.
