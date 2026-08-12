# ADR-0006: Use REST API

## Status

Accepted

## Context

The primary API consumers are:

```text
apps/web
apps/admin
```

The domain mostly consists of resource-oriented operations:

```text
articles
comments
categories
tags
users
media
settings
```

The project values simplicity and generated client support.

## Decision

Use REST.

Base path:

```text
/api/v1
```

Logical groups:

```text
/api/v1/public
/api/v1/admin
/api/v1/auth
```

Use OpenAPI to document the contract.

Do not introduce GraphQL alongside REST without a new ADR.

## Consequences

Benefits:

* simple infrastructure
* predictable caching
* easy debugging
* OpenAPI support
* straightforward generated clients
* familiar authorization boundaries

Costs:

* some complex views may require multiple requests
* API shape requires deliberate endpoint design

## Alternatives Considered

### GraphQL

Rejected for V1 because its flexibility does not justify additional schema/runtime/client complexity.

### tRPC

Rejected because the project wants a formal HTTP API contract that can support non-TypeScript clients in the future.
