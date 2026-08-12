# ADR-0013: Enforce Strict Prisma and Transaction Boundaries

## Status

Accepted

## Context

ADR-0005 states that Prisma access remains inside backend persistence infrastructure and that Services depend on repository contracts. The dependency rules weaken this with an exception that discourages, but does not fully forbid, `Service -> PrismaService`.

The current module documents also assign Article revision behavior to both ArticlesModule and a separate ArticleRevisionsModule, while publication requires Article and Revision changes in one transaction. This makes mutation ownership and cross-module transaction mechanics ambiguous.

The project needs one enforceable rule that keeps Prisma details out of application logic while still supporting short atomic transactions, Outbox writes, idempotency records, and specialized read projections.

## Decision

Prisma is allowed only in persistence/infrastructure adapters. There is no Service-level exception.

Application Services, domain objects, Controllers, Guards, DTOs, Worker processors, event handlers, and generated API contracts must not import:

```text
@prisma/client
PrismaClient
PrismaService
Prisma.TransactionClient
Prisma input/filter/order types
generated Prisma models
```

### Database infrastructure package

Create a private backend-only workspace package such as `packages/database` to own:

- `schema.prisma` and migrations;
- generated Prisma client and lifecycle/factory code;
- low-level transaction adapter primitives;
- database test bootstrap helpers.

It must not contain business repositories, domain services, HTTP DTOs, or generic business helpers.

Allowed consumers are only API/Worker persistence infrastructure paths. Web/Admin and application/domain paths are blocked by workspace and ESLint boundary rules.

### Repository boundary

Repository contracts express business persistence needs and use domain/application types.

```ts
interface ArticleRepository {
  findForPublication(id: ArticleId): Promise<Article | null>
  save(article: Article): Promise<void>
}
```

Prisma repository implementations translate between Prisma records and domain/application models.

Forbidden contract shapes include passing through `Prisma.ArticleWhereInput`, `Prisma.Args`, raw Prisma models, or an unbounded generic ORM wrapper.

Raw SQL is allowed only inside a named persistence adapter when Prisma cannot express the required locking, conditional update, or query efficiently. It requires focused integration tests against real PostgreSQL.

### Domain-specific Unit of Work

Services use a domain-specific Unit of Work whose callback receives transaction-scoped ports, never a Prisma transaction client.

```ts
type ArticlePublicationPorts = {
  articles: ArticleRepository
  revisions: ArticleRevisionRepository
  commandReceipts: CommandReceiptRepository
  outbox: OutboxWriter
  audit: AuditWriter
}

interface ArticlePublicationUnitOfWork {
  execute<T>(
    work: (ports: ArticlePublicationPorts) => Promise<T>,
  ): Promise<T>
}
```

`PrismaArticlePublicationUnitOfWork` lives in Articles persistence infrastructure, calls `prisma.$transaction`, and constructs adapters bound to the transaction client. The Prisma type never crosses the adapter boundary.

The Unit of Work contains no business branching. `ArticlesService` remains the orchestration owner.

### ArticleRevision ownership

ArticleRevision is an immutable child/history entity of the Article lifecycle for V1.

- ArticlesModule owns Article and ArticleRevision mutation semantics.
- Revision creation required by create/update/publish/restore participates in the ArticlesModule Unit of Work.
- Revision query, comparison, and restore entry points remain ArticlesModule application contracts/sub-services.
- Other modules may receive a narrow `ArticleRevisionReader`; no external module receives a mutable Revision repository.
- The independent mutating `ArticleRevisionsModule` is removed from the V1 ownership map.

This resolves the conflict between the system overview and module-boundary document and eliminates a cross-module transaction for publication.

### Cross-module writes

The default rule is one command owner and no direct cross-module repository access.

- Validate/read other domains through exported narrow contracts.
- Mutate another domain through its application command contract.
- Do not pass Prisma transactions across module boundaries.
- Do not inject another module's repository implementation.
- If two independently owned aggregates truly require one atomic write, first reconsider ownership. A remaining exception requires a dedicated ADR and a purpose-specific orchestration contract.

One narrow supporting-ledger exception is accepted by this ADR: an owning command may append an authoritative Audit entry and Outbox/Command receipt through exported, transaction-scoped append-only ports such as `AuditAppender` and `OutboxWriter`.

- The support module owns the port contract, persistence mapping, and append semantics.
- The calling business module does not receive the support module's repository.
- These ports may append records only; they cannot query or mutate another business aggregate.
- Their adapters are bound to the same Unit of Work transaction without exposing the Prisma transaction client.
- This exception does not authorize arbitrary cross-module writes.

### Specialized cross-domain read models

Read models remain an allowed CQRS-lite exception, with these constraints:

- every read model has an owning consumer module;
- it is placed under that module's query/persistence adapter, not a global generic repository;
- it is read-only and returns a bounded projection DTO;
- Prisma remains inside the query adapter;
- it is not injected into command handlers as a mutation shortcut;
- cross-domain tables and indexes used by the query are documented and integration-tested.

### Contract source boundaries

- External HTTP request/response types are generated from external OpenAPI.
- `packages/api-types`, if retained, is generator-owned output from the same OpenAPI source; it is not a second handwritten contract.
- `packages/api-client` consumes/re-exports those generated types.
- Internal HTTP types are generated into `packages/internal-api-client` from internal OpenAPI.
- Versioned event/job envelopes live in a narrow `packages/event-contracts` package with runtime validation and no NestJS/Prisma dependency.
- `packages/schemas` may support UI/shared validation but does not override backend DTO validation or OpenAPI.

## Enforcement

The shared ESLint configuration must apply restricted-import rules by path:

- forbid Prisma imports in Controllers, Services, domain/application folders, DTOs, Web, Admin, and Worker processors;
- allow Prisma imports only in named persistence/infrastructure folders and `packages/database`;
- forbid `apps/worker -> apps/api/**` imports;
- forbid Web/Admin imports of `packages/database`, internal API client, and event infrastructure packages.

Architecture tests must scan the dependency graph/imports and fail CI on violations. Code review convention alone is insufficient.

## Transaction and Concurrency Rules

- Transactions are short and contain only PostgreSQL work.
- Network/provider calls never occur inside a transaction.
- Publication uses a conditional update or optimistic version check so concurrent Workers cannot both publish.
- Required uniqueness includes Article revision sequence/version, command idempotency key, and Outbox event dedupe key.
- Database errors are translated inside persistence/application error boundaries; raw Prisma errors never reach HTTP clients or Worker logs.

## Alternatives Considered

### Allow rare `Service -> PrismaService`

Rejected because an undefined exception becomes the normal escape hatch and makes architecture enforcement impossible.

### Expose `Prisma.TransactionClient` through a generic Unit of Work

Rejected because it leaks the ORM into Services and encourages ad hoc cross-module queries.

### Put all repositories into `packages/database`

Rejected because database infrastructure would become a business/persistence dumping ground and erase module ownership.

### Keep ArticleRevisions as an independently mutating module

Rejected for V1 because publication then requires an undefined cross-module transaction even though revisions are inseparable from Article lifecycle mutations.

### Use distributed locks as the main publication correctness mechanism

Rejected. PostgreSQL conditional writes, constraints, and idempotency are authoritative. Redis locks may reduce contention but are not the correctness boundary.

## Consequences

Benefits:

- a single enforceable Prisma boundary;
- application tests do not require Prisma types;
- transaction context cannot leak across modules;
- Article publication, revision, idempotency, audit, and Outbox are atomically owned;
- specialized read performance remains possible without opening mutation shortcuts.

Costs:

- repository adapters and domain-specific Units of Work require explicit code;
- `packages/database` and import-boundary linting must be maintained;
- current module and package documentation must be updated after acceptance;
- exceptional cross-module atomic operations require deliberate redesign or a new ADR.

## Compatibility

This decision clarifies and strengthens ADR-0005. It does not replace Prisma, PostgreSQL, NestJS, or the modular monolith.

After acceptance, remove the “narrowly documented infrastructure/application cases” exception from `dependency-rules.md` and align `system-overview.md`, `module-boundaries.md`, root/API/Worker instructions, and package lists.

## Acceptance Conditions

- Static architecture checks reject Prisma imports outside approved infrastructure paths.
- Service and Worker processor unit tests compile without Prisma types.
- A real PostgreSQL integration test proves Article, Revision, Audit, CommandReceipt, and Outbox atomicity.
- Transaction rollback persists none of those writes.
- Two concurrent publish commands produce one accepted state transition.
- Read models are demonstrably read-only and return projection DTOs rather than Prisma records.
