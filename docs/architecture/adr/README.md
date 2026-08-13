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
