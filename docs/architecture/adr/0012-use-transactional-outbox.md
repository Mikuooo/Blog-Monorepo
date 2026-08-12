# ADR-0012: Use Transactional Outbox with At-Least-Once Delivery

## Status

Accepted

## Context

Article publication changes canonical PostgreSQL state and then causes derived work such as cache invalidation, search indexing, page revalidation, RSS generation, analytics, and notifications.

An in-memory event emitted only after commit has a loss window: the database may commit and the process may stop before the event reaches BullMQ. Enqueuing before commit has the opposite problem: consumers may observe work for a transaction that later rolls back.

Redis/BullMQ is intentionally not a canonical business datastore, so the durable intent to perform derived work must remain reconstructable from PostgreSQL.

## Decision

Use a PostgreSQL transactional Outbox, durable per-consumer delivery records, and consumer Inbox/effect records.

Delivery semantics are explicitly:

- business state and event intent commit atomically;
- PostgreSQL to BullMQ is at least once;
- BullMQ to Worker is at least once;
- duplicate, delayed, and out-of-order delivery is allowed;
- all consumers must be idempotent or state-convergent;
- the system does not claim end-to-end exactly-once delivery.

### Transaction boundary

The owning application service calls a domain-specific Unit of Work. In the same short PostgreSQL transaction it writes:

```text
Article mutation
ArticleRevision append
authoritative Audit record when required
CommandReceipt
OutboxEvent
OutboxDelivery rows
```

The transaction must not call Redis, BullMQ, HTTP, S3, search, mail, or AI providers.

`OutboxWriter` receives a versioned event envelope. A pure, versioned `IntegrationEventRouter` maps the event to known consumer deliveries; the business Service does not know queue names or provider implementations.

### Event envelope

```ts
type IntegrationEventEnvelopeV1 = {
  envelopeVersion: 1
  eventId: string
  eventName: string
  eventVersion: number
  occurredAt: string
  aggregate: {
    type: string
    id: string
    sequence: number
  }
  data: Record<string, unknown>
  metadata: {
    correlationId?: string
    causationId?: string
    actorId?: string
    traceparent?: string
  }
}
```

Payloads contain only the minimum IDs, versions, and immutable references needed to reload current state. They must not contain credentials, tokens, full Article bodies, or unnecessary personal data.

Event names are past-tense facts, for example `article.published`. Queue jobs are actions, for example `article.search-index`.

## Durable Model

### `outbox_event`

| Field | Purpose |
| --- | --- |
| `id` UUID primary key | Stable event ID. |
| `event_name`, `event_version` | Versioned event contract. |
| `aggregate_type`, `aggregate_id`, `aggregate_sequence` | Aggregate identity and ordering hint. |
| `occurred_at` | Database/UTC occurrence time. |
| `payload` JSONB, `payload_hash` | Immutable minimal envelope and integrity/deduplication check. |
| `correlation_id`, `causation_id`, `actor_id`, `traceparent` | Optional tracing/audit context. |
| `created_at` | Retention and operations. |

Required constraints/indexes:

- primary key on `id`;
- unique event dedupe key, normally aggregate type + ID + sequence + event name;
- index on aggregate type + ID + sequence;
- index on correlation ID and creation time.

The aggregate ID is not cascade-deleted with the business row; historical delivery intent must survive aggregate deletion.

### `outbox_delivery`

One event has one row per consumer so partial fan-out is observable and independently retryable.

| Field | Purpose |
| --- | --- |
| `id` UUID primary key, `event_id` foreign key | Delivery identity and source event. |
| `consumer_key`, `queue_name`, `job_name` | Stable versioned destination. |
| `status` | `PENDING`, `LEASED`, `ENQUEUED`, `ACKED`, or `DEAD`. |
| `dispatch_attempts`, `next_attempt_at` | Bounded dispatcher retry. |
| `lease_owner`, `lease_expires_at` | Multi-instance claim recovery. |
| `bullmq_job_id`, `enqueued_at`, `acknowledged_at` | Queue lifecycle. |
| `last_error_kind`, `last_error_code`, `last_error_summary`, `last_error_at` | Sanitized failure evidence. |
| `replay_count`, `created_at`, `updated_at` | Controlled replay and retention. |

Required constraints/indexes:

- unique `(event_id, consumer_key)`;
- partial claim index for `PENDING` rows ordered by `next_attempt_at`;
- partial lease-expiry index for `LEASED` rows;
- partial unacknowledged index for `ENQUEUED` rows;
- partial dead-letter index for `DEAD` rows.

### `consumer_inbox`

| Field | Purpose |
| --- | --- |
| `consumer_key`, `event_id` composite primary key | Durable idempotency boundary. |
| `delivery_id`, `payload_hash` | Delivery identity and envelope validation. |
| `status` | `PROCESSING`, `RETRYABLE`, `COMPLETED`, or `DEAD`. |
| `attempt_count`, lease fields | Duplicate/concurrent claim control. |
| received/completed timestamps | Operations and retention. |
| aggregate identity/sequence | Optional stale/order checks. |
| sanitized last-error fields | Failure diagnosis without secrets. |

For database effects, the effect, Inbox completion, and Delivery acknowledgement must share one PostgreSQL transaction where possible.

For external effects, the consumer must use the event/delivery ID as a provider idempotency key, deterministic object key, or target upsert key. If the provider is not idempotent, an external call that succeeds immediately before process failure may repeat; this residual risk must be documented rather than hidden behind an exactly-once claim.

## Dispatcher Runtime

The Outbox dispatcher runs as an infrastructure role inside `apps/worker`. This preserves the accepted ownership of background execution while keeping business rules in API.

- It accesses only Outbox/Inbox infrastructure tables through a dedicated persistence adapter.
- It never queries or mutates Article or other module-owned business tables.
- It claims bounded batches with a short PostgreSQL transaction and `SKIP LOCKED`/lease semantics.
- It commits the claim before calling BullMQ.
- It uses a deterministic BullMQ job ID as a duplicate-noise reduction mechanism, not as the correctness boundary.
- A reconciliation loop resets expired leases and re-enqueues PostgreSQL deliveries that remain unacknowledged and are absent from BullMQ.
- PostgreSQL delivery state, not the BullMQ completed/failed set, is the durable operational truth.

The BullMQ payload contains only a version, delivery ID, event ID, and optional correlation ID. Worker reloads the envelope from PostgreSQL through its infrastructure adapter.

## Consumer Rules

- Validate job/envelope version before execution.
- Claim the Inbox/delivery atomically; return success immediately when already completed.
- Reload current canonical business state through a private API projection when correctness requires it.
- Prefer current-state convergence over applying stale event deltas.
- Persist a target `source_version` where useful and skip older aggregate sequences.
- Use bounded retries with error classification and jitter.
- Permanent invalid input, unsupported versions, or invalid configuration move directly to durable `DEAD` state.
- Manual replay requires authorization, operator, reason, timestamp, audit record, and a new replay generation; historical payloads are not edited.

Authoritative security audit records are written in the original business transaction. Outbox is not a substitute for the audit log.

## Failure Semantics

| Failure point | Required result |
| --- | --- |
| Business transaction rolls back | No business change and no event/delivery rows. |
| Commit succeeds but HTTP response is lost | Business state and Outbox remain; command retry is handled by `CommandReceipt`. |
| Redis is unavailable | Business commit remains successful; deliveries stay in PostgreSQL. |
| Dispatcher stops before enqueue | Lease expires and another dispatcher retries. |
| Enqueue succeeds before `ENQUEUED` is persisted | Duplicate enqueue is possible; Inbox/effect idempotency prevents duplicate result. |
| Redis loses an enqueued job | Reconciler rebuilds it from an unacknowledged PostgreSQL delivery. |
| BullMQ redelivers or stalls | Inbox claim/deduplication applies. |
| Worker stops before effect commit | Database effect and Inbox roll back together where applicable. |
| Worker stops after external effect but before ACK | Provider/target idempotency is required; otherwise a documented duplicate risk remains. |
| Event is poison/unsupported | Durable `DEAD`, alert, inspect, repair, controlled replay. |
| Consumer is unavailable | Backlog grows; canonical business state is not rolled back. |

## Ordering

No global total order is promised. Events carry an aggregate sequence.

Most consumers reload the latest state and converge:

- search upserts or removes the current public projection;
- cache/revalidation/RSS regenerates current output;
- stale lower versions are skipped and measured.

Only a consumer that truly requires delta ordering may maintain a per-consumer, per-aggregate cursor and wait for a sequence gap. Global Worker concurrency must not be reduced to one as a substitute for correct ordering.

## Operations

Minimum structured context:

```text
eventId deliveryId eventName eventVersion
aggregateType aggregateId aggregateSequence
consumerKey queue jobName jobId
dispatchAttempt consumeAttempt replayCount
correlationId duration outcome errorClass
```

Minimum metrics/alerts:

- pending count and oldest pending age;
- commit-to-enqueue and commit-to-ACK latency;
- expired leases and re-created Redis jobs;
- Inbox duplicate hits, stale skips, sequence gaps;
- failed/stalled BullMQ jobs;
- new `DEAD` deliveries and replay count;
- Outbox/Inbox table size and cleanup progress.

Retention is configurable. Initial implementation must ensure Inbox retention exceeds the maximum replay window and BullMQ retention. Pending, leased, enqueued, unacknowledged, or unresolved dead rows must never be deleted. Cleanup runs in bounded batches.

## Alternatives Considered

### Emit an in-memory event after commit

Rejected because a process failure can lose the event permanently.

### Enqueue to BullMQ before database commit

Rejected because consumers may observe rolled-back or uncommitted state.

### Commit, then enqueue without Outbox

Rejected because database commit and Redis enqueue are a non-atomic dual write.

### Distributed transaction between PostgreSQL and Redis

Rejected as unnecessary complexity and unsupported by the selected architecture.

### Event sourcing, Kafka, or full CQRS

Rejected for V1. The Outbox records delivery intent; it is not the canonical reconstruction source for aggregates.

## Consequences

Benefits:

- closes the commit-to-event loss window;
- preserves PostgreSQL as durable truth;
- makes fan-out, retry, dead-letter, replay, and lag observable;
- supports Worker and Redis recovery without rolling back canonical data.

Costs:

- adds three infrastructure tables, a dispatcher, reconciliation, retention, and operational tooling;
- every consumer must implement idempotency and version handling;
- external non-idempotent providers retain a documented ambiguity window.

## Acceptance Conditions

- Transaction rollback leaves no Outbox row.
- Redis outage does not make a committed Article publication fail.
- Dispatcher crash before and after enqueue is recovered without duplicate business effect.
- Lost Redis jobs are reconstructed from unacknowledged deliveries.
- Duplicate and out-of-order jobs converge correctly.
- Unsupported versions become inspectable `DEAD` records.
- Manual replay is authorized, audited, and does not edit historical payloads.
