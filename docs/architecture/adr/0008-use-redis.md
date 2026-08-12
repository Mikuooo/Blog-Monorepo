# ADR-0008: Use Redis for Ephemeral Infrastructure

## Status

Accepted

## Context

The application requires infrastructure for:

```text
caching
rate limiting
queue backing
distributed locks
temporary tokens
view counters
```

These values have different persistence requirements from canonical relational data.

## Decision

Use Redis for ephemeral/distributed infrastructure.

Approved use cases include:

```text
cache
BullMQ
rate limiting
temporary values
distributed locks
eventually consistent counters
session auxiliary state
```

PostgreSQL remains the canonical database.

Redis must not be the sole storage for important business data.

## Consequences

Benefits:

* fast access
* TTL support
* atomic counters
* distributed coordination
* BullMQ integration

Costs:

* additional infrastructure
* cache invalidation complexity
* availability must be considered

## Rules

Every cache entry requires:

```text
key
TTL
invalidation
fallback
source of truth
```

## Alternatives Considered

### In-memory cache

Rejected because API instances may scale horizontally.

### PostgreSQL for everything

Possible, but inefficient for queues, transient cache, and distributed counters.
