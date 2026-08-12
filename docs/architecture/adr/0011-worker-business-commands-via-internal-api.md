# ADR-0011: Worker Invokes Canonical Business Commands Through a Private HTTP API

## Status

Accepted

## Context

The accepted architecture places all business modules in `apps/api` and background execution in `apps/worker`.

Current rules also require scheduled publishing to execute the canonical article state transition rather than letting Worker set `Article.status` directly.

The current documents do not define how Worker can reuse that behavior without:

- importing implementation code from another deployable app;
- moving business services into a shared dumping-ground package;
- duplicating Prisma repositories and transaction logic in Worker; or
- turning Worker into a second business backend.

Relevant existing decisions:

- `apps/api` is the canonical business backend.
- Business modules run inside `apps/api`.
- Background execution runs inside `apps/worker`.
- REST/OpenAPI is the canonical HTTP contract mechanism.
- Worker jobs must reload canonical state and remain idempotent.

## Decision

Worker will invoke canonical business mutations through a private HTTP command API owned by `apps/api`.

For scheduled publication, the target flow is:

```text
BullMQ scheduled job
  -> apps/worker
  -> packages/internal-api-client
  -> POST /api/v1/internal/articles/{articleId}/publish-scheduled
  -> InternalServiceGuard
  -> ArticlesService.publishScheduled()
  -> ArticlePublicationUnitOfWork
  -> PostgreSQL transaction
```

Worker remains responsible for scheduling, retry, job lifecycle, and observability. API remains the only owner of Article state transitions, authorization policy, revision creation, audit semantics, transaction boundaries, and domain event creation.

### Command contract

```http
POST /api/v1/internal/articles/{articleId}/publish-scheduled
Authorization: Bearer <short-lived workload token>
Idempotency-Key: <deterministic command ID>
X-Correlation-ID: <optional correlation ID>
```

Request body:

```json
{
  "contractVersion": 1,
  "scheduleVersion": 7
}
```

The API must reload PostgreSQL state and use database time. Worker-provided status, current time, user identity, role, permission, title, content, or publication state is never authoritative.

Terminal outcomes:

| Outcome | Meaning | Worker action |
| --- | --- | --- |
| `PUBLISHED` | This command completed the transition. | Complete job. |
| `ALREADY_APPLIED` | The same idempotent command already committed. | Complete job. |
| `STALE` | The article was cancelled, rescheduled, deleted, manually published, or otherwise changed. | Complete job without mutation. |
| `NOT_DUE` | The same schedule version is valid but not yet due. | Reschedule at the API-provided time. |

The command is synchronous with respect to the canonical database transaction. The API does not return `202 Accepted` and defer the same business transition into another queue.

### Service authentication

- The route is not exposed through the public reverse-proxy entry point.
- Network isolation is defense in depth, not the authorization mechanism.
- Transport uses TLS.
- Worker uses a short-lived workload token with a dedicated service identity.
- The API validates issuer, audience, expiry, subject, and scope.
- The minimum scope is `article.publish-scheduled`.
- End-user/Admin tokens are not accepted for this route.
- A fixed system actor such as `article-scheduler` is recorded for audit, without impersonating a human administrator.
- Credentials never appear in BullMQ payloads, failed-job metadata, or logs.

### Contract generation

Internal endpoints are emitted to a separate `openapi.internal.json` document and generate `packages/internal-api-client`.

- `apps/worker` may depend on `packages/internal-api-client`.
- `apps/web` and `apps/admin` must not depend on that package.
- The external `packages/api-client` must not expose internal endpoints.
- Both clients remain generated from NestJS OpenAPI metadata; neither is handwritten.

### Idempotency and concurrency

The deterministic command ID is derived from the command type, article ID, and schedule version. Database correctness does not depend on BullMQ job deduplication.

In one PostgreSQL transaction, API must:

1. claim or load the `CommandReceipt` by idempotency key;
2. reject reuse of the same key with a different request hash;
3. verify `status = SCHEDULED`, matching `scheduleVersion`, `publishAt <= database_now`, and `deletedAt IS NULL`;
4. perform one conditional/optimistic Article transition;
5. append the immutable Article revision required by publication;
6. write authoritative audit data required by the mutation;
7. append the `ArticlePublished` Outbox event and its deliveries;
8. persist the terminal command result.

If the transaction commits but the HTTP response is lost, retrying the same command returns the persisted result and must not create another revision or event.

### Retry classification

| Failure | Classification |
| --- | --- |
| Connection failure, timeout, `429`, transient `5xx`, transient database conflict | Retry with the same idempotency key and bounded backoff. |
| `401` or `403` | Do not blindly retry; alert as a security/deployment fault. |
| Unsupported contract version, invalid DTO, unknown article | Permanent failure; retain inspectable failed job. |
| `STALE` or `ALREADY_APPLIED` | Successful terminal result. |
| Retry budget exhausted | Move to durable failed/dead state and require controlled replay. |

## Explicit Worker Database Boundary

Worker processors must not query or mutate Article, Revision, User, Permission, or other business-owned tables for command execution.

Worker may use PostgreSQL only through infrastructure adapters for infrastructure-owned tables such as Outbox delivery, Inbox receipt, and job/effect ledgers. Canonical business state needed by a job is obtained through an internal API projection/command contract.

## Alternatives Considered

### Import `apps/api` source from `apps/worker`

Rejected. Deployable apps are not libraries. This creates app-to-app implementation coupling, breaks independent build/deployment boundaries, and exposes NestJS/Prisma internals to Worker.

### Move full application/domain services into a shared package

Rejected for V1. It conflicts with the accepted ownership of business modules in `apps/api`, risks a shared business dumping ground, and requires Worker to assemble the same repositories and transaction services, effectively making it a second backend.

Pure event envelopes, job schemas, generated clients, and database infrastructure may still live in narrow shared packages.

### Consume business command queues inside `apps/api`

Rejected for V1. It moves background consumption into the HTTP application lifecycle, conflicts with the current runtime ownership of `apps/worker`, and couples API scaling and shutdown behavior to queue processing.

### Let Worker update business tables directly

Rejected. It duplicates state transition rules, revision/audit behavior, transaction semantics, permissions, and event creation.

## Consequences

Benefits:

- one canonical implementation of business state transitions;
- no cross-app source imports;
- Worker remains independently deployable;
- OpenAPI provides a generated and versioned internal contract;
- HTTP ambiguity is handled by durable idempotency;
- service identity and audit boundaries are explicit.

Costs:

- API availability becomes a dependency for business-command jobs;
- private routing, workload credentials, rotation, and internal OpenAPI generation are required;
- network timeout and response-loss behavior must be tested;
- reconciliation is required to recover scheduled jobs lost from ephemeral Redis.

## Compatibility

This decision extends ADR-0006, ADR-0007, ADR-0008, and ADR-0010. It does not supersede them and does not introduce a microservice or a second canonical backend.

## Acceptance Conditions

- Two Workers racing the same schedule version create one publication, one required revision, and one logical Outbox event.
- A lost HTTP response followed by retry returns `ALREADY_APPLIED`.
- Rescheduling makes the old job `STALE` without mutation.
- Invalid or expired service identity is rejected and logged without exposing credentials.
- Web/Admin builds cannot import the internal client package.
- Worker publication code contains no Prisma or Article repository import.
