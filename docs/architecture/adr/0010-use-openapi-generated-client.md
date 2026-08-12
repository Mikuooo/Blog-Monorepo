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
