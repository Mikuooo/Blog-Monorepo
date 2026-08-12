# docs/architecture/system-overview.md

# System Overview

This document describes the high-level architecture of the Blog / CMS platform.

Read:

```text
AGENTS.md
docs/architecture/adr/*
```

before making architectural changes.

---

# 1. System Goals

The platform is designed as a maintainable Blog / CMS system with:

```text
Public Blog

Admin CMS

REST API

Background Worker

PostgreSQL

Redis

Object Storage

Search

AI integrations
```

The architecture prioritizes:

```text
clear boundaries
strong typing
simple deployment
AI-assisted development
incremental scalability
security
testability
```

The project intentionally avoids premature distributed architecture.

---

# 2. Deployable Applications

The system contains four deployable applications:

```text
apps/
├── web/
├── admin/
├── api/
└── worker/
```

Each application has a distinct responsibility.

---

# 3. apps/web

`apps/web` is the public Blog application.

Technology:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

Responsibilities:

```text
homepage

article pages

category pages

tag pages

archives

public search

public comments

static pages

SEO metadata

sitemap

robots.txt

RSS
```

Primary priorities:

```text
SEO
performance
accessibility
server rendering
cacheability
minimal browser JavaScript
```

`apps/web` must not contain canonical business logic.

It consumes the NestJS API.

---

# 4. apps/admin

`apps/admin` is the administration application.

Technology:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui

TanStack Query
React Hook Form
Zod
```

Responsibilities:

```text
login

dashboard

article management

article editor

category management

tag management

comment moderation

media management

user management

roles and permissions

site settings

analytics

audit log

AI-assisted content tools
```

Admin UI may provide permission-aware UX.

However:

```text
frontend permission checks
```

never replace:

```text
API authorization checks
```

---

# 5. apps/api

`apps/api` is the canonical business API.

Technology:

```text
NestJS
Prisma
PostgreSQL
Redis
OpenAPI
Pino
```

Responsibilities:

```text
authentication

authorization

business rules

database access

transactions

content lifecycle

media metadata

settings

audit

cache coordination

search orchestration

AI orchestration

queue production
```

The API is implemented as a Modular Monolith.

---

# 6. apps/worker

`apps/worker` performs asynchronous work.

Technology:

```text
Node.js
TypeScript
BullMQ
Redis
```

Responsibilities may include:

```text
image processing

search indexing

mail delivery

analytics aggregation

cache/revalidation tasks

scheduled publishing

media cleanup

feed regeneration

AI background jobs
```

Workers must not become a second independent business backend.

Business rules should remain shared with or coordinated by canonical application/domain code where appropriate.

---

# 7. High-Level Architecture

```text
                         Internet
                            │
                            ▼
                   ┌─────────────────┐
                   │ CDN / Cloudflare│
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Reverse Proxy   │
                   │ Caddy / Nginx   │
                   └────────┬────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼

             Web         Admin         API
           Next.js      Next.js       NestJS
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
                     Application Layer
                            │
          ┌─────────────────┼────────────────┐
          │                 │                │
          ▼                 ▼                ▼

     PostgreSQL           Redis         Object Storage
                                             │
                                             ▼
                                           CDN

                            │
                            ▼
                          BullMQ
                            │
                            ▼
                          Worker

                            │
                            ▼
                      Search Provider
```

---

# 8. Request Flow

Typical public article request:

```text
Browser
   ↓
Next.js Web
   ↓
NestJS Public API
   ↓
Article Service
   ↓
Article Repository
   ↓
PostgreSQL
```

Potential cache path:

```text
NestJS
  ↓
Redis Cache
  │
  ├── hit → response
  │
  └── miss
        ↓
    PostgreSQL
        ↓
      cache
        ↓
     response
```

---

# 9. Admin Mutation Flow

Example article update:

```text
Admin Browser
     ↓
Admin Next.js
     ↓
Generated API Client
     ↓
NestJS
     ↓
Auth Guard
     ↓
Permission Guard
     ↓
DTO Validation
     ↓
ArticlesService
     ↓
Transaction
     ↓
ArticleRepository
     ↓
PostgreSQL
     ↓
ArticleUpdatedEvent
```

Then asynchronous consequences may occur:

```text
ArticleUpdatedEvent
       │
       ├── cache invalidation
       ├── search index job
       ├── revalidation job
       └── audit behavior
```

---

# 10. Publication Flow

Article publication is a major domain operation.

```text
Admin
  ↓
POST /api/v1/admin/articles/:id/publish
  ↓
authentication
  ↓
article.publish permission
  ↓
ArticlesService.publish()
  ↓
validate state transition
  ↓
database transaction
  ├── update Article
  └── create ArticleRevision when required
  ↓
commit
  ↓
ArticlePublishedEvent
```

After commit:

```text
ArticlePublishedEvent
      │
      ├── invalidate cache
      │
      ├── enqueue search indexing
      │
      ├── enqueue page revalidation
      │
      ├── enqueue RSS update
      │
      └── analytics/audit hooks
```

External side effects must not block or corrupt the database transaction unnecessarily.

---

# 11. Data Ownership

Each domain module owns its business data access.

Examples:

```text
ArticlesModule
    owns Article
    owns ArticleRevision behavior

CategoriesModule
    owns Category

TagsModule
    owns Tag

CommentsModule
    owns Comment

MediaModule
    owns Media metadata

UsersModule
    owns User profile/domain state

AuthModule
    owns authentication/session workflow
```

Ownership does not necessarily mean every database relation belongs exclusively to one physical schema file.

It means:

```text
business rules
persistence access
mutation semantics
```

must have a clearly defined owner.

---

# 12. Canonical Sources of Truth

## PostgreSQL

Canonical for:

```text
users
articles
categories
tags
comments
permissions
settings
audit metadata
media metadata
sessions
```

## Object Storage

Canonical for:

```text
binary media objects
```

Database stores their metadata and references.

## Redis

Not canonical.

Used for:

```text
cache
rate limits
queues
temporary state
counters
locks
```

## Search Engine

Not canonical.

Search indexes are derived and rebuildable.

---

# 13. Shared Packages

Shared packages exist to reduce duplication.

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

Shared packages must not become dumping grounds.

Every shared package must have narrow ownership.

---

# 14. packages/api-client

Contains:

```text
generated API client
HTTP client configuration
shared transport handling
```

Source:

```text
NestJS OpenAPI
```

Do not manually duplicate endpoint clients in Web and Admin.

---

# 15. packages/api-types

Contains transport-level shared TypeScript types when required.

Do not place:

```text
Prisma types
database entities
NestJS implementation classes
```

inside frontend-facing contracts.

---

# 16. packages/schemas

Contains reusable validation definitions where cross-application sharing provides real value.

Possible examples:

```text
slug schema
email schema
shared enum schema
simple article form rules
```

Do not force backend validation architecture to depend entirely on frontend Zod schemas.

Backend remains independently authoritative.

---

# 17. packages/ui

Contains reusable generic presentation primitives.

Examples:

```text
Button
Input
Dialog
Card
Table primitives
Form controls
```

Business-specific UI belongs to applications/features.

---

# 18. packages/shared

Contains framework-independent utilities.

Examples:

```text
string utilities
date helpers
pure transformations
```

Do not place:

```text
database queries
React hooks
NestJS services
business modules
```

inside `packages/shared`.

---

# 19. Infrastructure Adapters

External infrastructure must normally sit behind explicit abstractions.

Examples:

```text
StorageProvider

SearchProvider

AIProvider

MailProvider
```

Application logic should not be tightly coupled to vendor SDKs.

---

# 20. Object Storage Boundary

Business logic:

```text
MediaService
     ↓
StorageProvider
```

Implementation:

```text
StorageProvider
     ├── S3StorageProvider
     ├── R2StorageProvider
     └── MinioStorageProvider
```

Do not spread AWS SDK calls across domain services.

---

# 21. Search Boundary

Business/application logic:

```text
SearchService
     ↓
SearchProvider
```

Potential implementations:

```text
PostgresSearchProvider
MeilisearchProvider
```

Search implementation may change without rewriting Article domain logic.

---

# 22. AI Boundary

AI functionality follows:

```text
Feature Service
      ↓
AIService
      ↓
AIProvider
      ↓
Provider SDK
```

Potential providers:

```text
OpenAI
Anthropic
Gemini
```

AI providers are infrastructure.

AI output is always untrusted.

---

# 23. Cache Boundary

Business code should not manually implement raw Redis behavior everywhere.

Preferred:

```text
ArticleService
     ↓
ArticleCache / CacheService
     ↓
Redis
```

Cache ownership and invalidation must remain explicit.

---

# 24. Event Model

Events communicate meaningful business facts.

Examples:

```text
ArticleCreatedEvent
ArticleUpdatedEvent
ArticlePublishedEvent
ArticleArchivedEvent
CommentCreatedEvent
MediaUploadedEvent
```

Events should normally represent something that has already happened.

Events must not become an invisible replacement for normal application calls.

---

# 25. Asynchronous Boundary

Use asynchronous processing for:

```text
image variants
email
search indexing
analytics aggregation
heavy AI jobs
cleanup
feed regeneration
```

Do not queue operations that must be completed transactionally before an API success response.

---

# 26. Failure Model

The system assumes infrastructure may fail independently.

Examples:

```text
Redis unavailable
S3 unavailable
search unavailable
AI provider unavailable
mail provider unavailable
```

The architecture should distinguish:

```text
core transaction failure
```

from:

```text
derived side-effect failure
```

Example:

If an article is successfully published in PostgreSQL but search indexing fails:

```text
article remains published
search job retries
```

Do not roll back canonical content merely because a derived index failed after commit.

---

# 27. Security Boundary

The backend is the authority for:

```text
identity
permissions
private content visibility
mutation authorization
```

Never trust frontend-only restrictions.

Sensitive operations require server authorization.

---

# 28. Public Content Boundary

Only content meeting public publication requirements may appear in:

```text
public API
Blog pages
RSS
sitemap
public search index
public CDN cache
```

Draft/private content must remain excluded.

---

# 29. Scalability Model

V1 is designed to scale vertically first.

Then horizontally:

```text
multiple Web instances

multiple Admin instances if needed

multiple API instances

multiple Workers
```

Shared services:

```text
PostgreSQL
Redis
Object Storage
```

Applications should remain stateless where practical.

---

# 30. Future Extraction

A module may become a separate service only when clear evidence exists.

Possible candidates eventually:

```text
Media Processing

Search

Analytics

AI Processing
```

Extraction is not automatic.

It requires an ADR.

---

# 31. Architecture Principles Summary

The system follows:

```text
Server-first frontend

NestJS as canonical backend

Modular Monolith

Explicit domain ownership

Repository-based persistence boundary

PostgreSQL source of truth

Redis for ephemeral infrastructure

Object storage for binaries

Derived search indexes

Queue-based asynchronous work

Infrastructure provider abstractions

OpenAPI-generated client

Strong module boundaries
```

All new implementation should preserve these principles.
