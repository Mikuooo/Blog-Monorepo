# ADR-0003: Use NestJS as Business API

## Status

Accepted

## Context

The platform requires a backend responsible for:

```text
authentication
authorization
articles
comments
media
settings
audit
search orchestration
AI orchestration
background jobs
```

The backend must remain structurally understandable as the project grows.

AI coding agents also require predictable conventions.

## Decision

Use NestJS for:

```text
apps/api
```

NestJS owns the canonical business API.

Backend organization follows business modules.

Example:

```text
modules/
├── articles/
├── users/
├── comments/
├── media/
└── settings/
```

The normal dependency flow is:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
```

## Consequences

Benefits:

* explicit module boundaries
* dependency injection
* Guards
* Pipes
* Interceptors
* Swagger integration
* predictable architecture
* good TypeScript support

Costs:

* more structure than lightweight Node frameworks
* repository/service boundaries require discipline
* dependency injection can be overused if unchecked

## Alternatives Considered

### Fastify directly

Rejected because the project values structured modular architecture over minimal framework abstraction.

### Express directly

Rejected for the same reason.

### Next.js Route Handlers

Rejected because they would blur frontend and backend responsibilities.
