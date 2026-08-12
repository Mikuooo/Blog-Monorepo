# ADR-0004: Use PostgreSQL

## Status

Accepted

## Context

The Blog/CMS domain contains strongly relational data:

```text
users
roles
permissions
articles
categories
tags
comments
media
revisions
audit records
```

The platform requires:

* transactions
* constraints
* relational integrity
* full-text search
* JSON support
* indexes
* mature operational tooling

## Decision

Use PostgreSQL as the primary canonical datastore.

All core business state must ultimately be persisted in PostgreSQL unless another storage system is explicitly designated as canonical for a specific data class.

Examples of derived infrastructure:

```text
Redis cache
Meilisearch index
analytics aggregation cache
```

must remain rebuildable where applicable.

## Consequences

Benefits:

* mature relational database
* strong consistency
* transactions
* indexing
* JSONB
* full-text search
* broad hosting support

Costs:

* schema migrations require discipline
* high-scale analytics may eventually require specialized storage

## Alternatives Considered

### MySQL

Technically viable but not selected.

### MongoDB

Rejected because core data is relational and strongly constrained.

### SQLite

Useful for small/local applications but not selected as the primary production database.
