# ADR-0001: Use Monorepo

## Status

Accepted

## Context

The Blog platform contains multiple applications:

```text
apps/web
apps/admin
apps/api
apps/worker
```

These applications share:

```text
TypeScript configuration
ESLint configuration
API contracts
validation schemas
UI components
constants
utilities
generated API clients
```

Maintaining separate repositories would increase synchronization cost and create duplicated definitions.

The project is also expected to use AI coding agents extensively.

AI agents perform better when related applications and contracts are visible within one repository.

## Decision

Use a TypeScript monorepo.

Workspace tooling:

```text
pnpm workspaces
Turborepo
```

Repository structure:

```text
apps/
packages/
docs/
```

Applications remain independently deployable.

Shared libraries live under:

```text
packages/
```

## Consequences

Benefits:

* shared types
* shared tooling
* atomic cross-application changes
* easier API client regeneration
* simplified AI repository understanding
* centralized CI
* consistent dependency versions

Costs:

* larger repository
* CI must support scoped builds
* package boundaries must be maintained
* careless shared packages may create coupling

## Alternatives Considered

### Multiple repositories

Rejected because it increases:

```text
contract synchronization
dependency duplication
AI context fragmentation
cross-project change complexity
```

### Single Next.js application

Rejected because Web, Admin, API, and Worker have separate deployment and architectural responsibilities.
