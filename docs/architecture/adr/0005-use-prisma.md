# ADR-0005: Use Prisma

## Status

Accepted

## Context

The backend requires:

* TypeScript-safe database access
* migrations
* PostgreSQL support
* understandable schema
* good AI readability

The project also needs strong separation between database models and API contracts.

## Decision

Use Prisma as the ORM and migration tooling.

Prisma access must remain inside backend persistence infrastructure.

Frontend code must never import Prisma models.

Controllers must never access Prisma directly.

Preferred flow:

```text
Service
    ↓
Repository Contract
    ↓
Prisma Repository
    ↓
Prisma Client
```

## Consequences

Benefits:

* strong TypeScript integration
* readable schema
* migration tooling
* generated client
* strong AI/tool familiarity

Costs:

* Prisma-specific behavior exists in persistence implementation
* advanced SQL may require raw queries
* repository abstraction creates additional code

## Alternatives Considered

### TypeORM

Rejected because Prisma offers a simpler schema/client model for this project.

### Drizzle

A strong alternative but not selected for V1.

### Raw SQL only

Rejected because it would increase repetitive persistence code and migration complexity.
