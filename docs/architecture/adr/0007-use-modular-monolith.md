# ADR-0007: Use Modular Monolith

## Status

Accepted

## Context

The application has multiple business domains, but current scale does not justify distributed services.

Premature microservices would introduce:

```text
service discovery
distributed tracing
network failures
deployment coordination
message contracts
eventual consistency
operational overhead
```

The project needs modularity without distributed complexity.

## Decision

Build the backend as a Modular Monolith.

All business modules run inside:

```text
apps/api
```

Background execution runs inside:

```text
apps/worker
```

Modules must maintain explicit boundaries.

Examples:

```text
ArticlesModule
UsersModule
AuthModule
MediaModule
CommentsModule
```

A module must not directly access another module's persistence implementation.

## Consequences

Benefits:

* simple deployment
* strong consistency
* easier transactions
* easier debugging
* lower operational cost
* clear path to later extraction

Costs:

* module discipline is required
* poor boundaries can still produce a "big ball of mud"

## Extraction Rule

A module may only become a separate service after evidence of a real need, such as:

```text
independent scaling
independent release ownership
different runtime requirements
fault isolation
substantially different infrastructure needs
```

A new ADR is required before service extraction.

## Alternatives Considered

### Microservices

Rejected for V1.

### Serverless-per-function architecture

Rejected because it fragments business boundaries and increases platform coupling.
