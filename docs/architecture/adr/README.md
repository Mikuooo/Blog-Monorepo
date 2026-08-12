# docs/architecture/adr/README.md

# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for significant technical and architectural decisions.

ADRs exist to prevent architectural drift and to preserve the reasoning behind important decisions.

AI coding agents must read relevant ADRs before proposing architectural changes.

---

## ADR Status

Each ADR must use one of:

```text
Proposed
Accepted
Deprecated
Superseded
Rejected
```

---

## Rules

Do not silently reverse an Accepted ADR.

If a decision changes:

1. create a new ADR
2. explain why the previous decision no longer applies
3. mark the previous ADR as Superseded
4. reference the new ADR

---

## Current ADRs

```text
0001-use-monorepo.md
0002-use-nextjs.md
0003-use-nestjs.md
0004-use-postgresql.md
0005-use-prisma.md
0006-use-rest-api.md
0007-use-modular-monolith.md
0008-use-redis.md
0009-use-s3-object-storage.md
0010-use-openapi-generated-client.md
0011-worker-business-commands-via-internal-api.md
0012-use-transactional-outbox.md
0013-enforce-strict-prisma-boundary.md
```

ADR-0001 through ADR-0013 are `Accepted` and establish the V1 architecture baseline.

---


---


---


---


---


---


---


---


---


---

# ADR-0010: Generate API Client from OpenAPI

## Status

Accepted

## Context

The project contains multiple frontend consumers.

Without generated contracts, developers or AI agents may duplicate:

```text
request functions
response interfaces
error assumptions
endpoint paths
```

This creates contract drift.

## Decision

NestJS OpenAPI output is the canonical HTTP contract.

Flow:

```text
NestJS DTOs
    ↓
Swagger/OpenAPI
    ↓
openapi.json
    ↓
API client generator
    ↓
packages/api-client
```

Generated files must not be manually modified.

Frontend applications consume the shared generated client or a thin application wrapper around it.

## Consequences

Benefits:

* strong contract consistency
* compile-time client errors after backend changes
* reduced duplicated API code
* easier AI-assisted development
* easier API discovery

Costs:

* generation step required
* poor OpenAPI annotations produce poor generated types
* some generated APIs may require ergonomic wrappers

## Alternatives Considered

### Handwritten clients

Rejected because they create duplicate contracts.

### Share NestJS DTO classes directly with frontend

Rejected because transport documentation, runtime backend concerns, and frontend package boundaries should remain separate.

---

# ADR Change Policy

These ADRs establish the V1 baseline architecture.

The following changes require a new ADR before implementation:

```text
REST → GraphQL

NestJS → another backend framework

Prisma → another ORM

PostgreSQL → another primary database

Modular Monolith → microservices

Next.js → another frontend framework

S3-compatible storage → another canonical media architecture

OpenAPI client generation → handwritten API contracts

Redis → another distributed cache/queue architecture

Monorepo → multi-repository architecture
```

Coding agents must not make these changes as incidental refactors.
