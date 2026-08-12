# apps/worker/AGENTS.md

# Worker Agent Instructions

These rules apply to:

```text
apps/worker/
```

Also follow the repository root `AGENTS.md`.

---

## 1. Purpose

`apps/worker` executes asynchronous and scheduled background work.

Technology:

```text
Node.js
TypeScript
BullMQ
Redis
PostgreSQL where required
shared application/infrastructure packages
```

Workers are not a second independent business backend.

Canonical business rules remain owned by the backend domain/application architecture.

---

## 2. Typical Responsibilities

Worker jobs may include:

```text
image processing

search indexing

email delivery

analytics aggregation

media cleanup

scheduled publishing

feed regeneration

cache/revalidation work

heavy AI processing
```

Do not move normal synchronous request logic into workers merely because it is convenient.

---

## 3. Queue Philosophy

Use queues when work:

```text
can happen asynchronously
may be expensive
may require retries
should not block HTTP responses
can tolerate eventual consistency
```

Do not queue work that must complete successfully before a business transaction is considered successful.

---

## 4. Queue Naming

Use stable namespaced job names.

Examples:

```text
article.search-index
article.cache-revalidate
article.feed-update

image.process

email.send

analytics.aggregate

media.cleanup

article.publish-scheduled
```

Avoid vague names:

```text
process
job
work
task
```

---

## 5. Queue Payloads

Keep payloads small and versionable.

Good:

```ts
{
  articleId: string
}
```

Better for evolving contracts:

```ts
{
  version: 1,
  articleId: string
}
```

Avoid placing complete mutable domain objects into jobs.

Bad:

```ts
{
  article: fullArticleObject
}
```

Workers should reload canonical data when correctness requires current state.

---

## 6. Canonical State

PostgreSQL remains the canonical source for business data.

Redis/BullMQ job payloads are not canonical.

Do not make important state exist only inside job data.

If a job can be retried much later, assume its original payload may be stale.

---

## 7. Idempotency

Jobs should be idempotent where practical.

Retries must not accidentally:

```text
publish twice
send duplicate mail
double-count analytics
create duplicate image variants
create duplicate search records
delete unrelated media
```

Use appropriate mechanisms:

```text
job IDs
database unique constraints
status checks
idempotency keys
atomic operations
```

---

## 8. Retry Behavior

Retries are appropriate for transient failures.

Examples:

```text
network timeout
temporary S3 failure
temporary mail failure
search service unavailable
```

Retries are not appropriate for permanent invalid input.

Examples:

```text
resource not found permanently
invalid MIME
invalid configuration
unsupported job version
```

Classify errors before blindly retrying them.

---

## 9. Backoff

Use bounded retry/backoff strategies.

Avoid:

```text
infinite retry loops
zero-delay retry storms
```

Prefer exponential or appropriately delayed backoff for external infrastructure failures.

---

## 10. Dead-Letter / Failed Jobs

Failed jobs must remain inspectable.

Operational tooling should allow identifying:

```text
job type
job ID
resource ID
attempt count
error
timestamp
request/correlation ID when available
```

Do not include secrets in failed-job metadata.

---

## 11. Logging

Use structured logs.

Include where available:

```text
jobId
queue
jobName
resourceId
attempt
requestId
duration
```

Example:

```ts
logger.info(
  {
    jobId: job.id,
    articleId,
    attempt: job.attemptsMade,
  },
  'Article search indexing completed',
)
```

Avoid uncontrolled `console.log`.

---

## 12. Correlation IDs

When jobs originate from HTTP requests/events, propagate correlation/request IDs when practical.

Example payload metadata:

```ts
{
  articleId,
  requestId,
}
```

Do not make requestId required for correctness.

It is primarily observability context.

---

## 13. Database Access

Worker database access must follow the same persistence principles as API code.

Avoid arbitrary duplicated Prisma query logic.

Worker processors must not access business-owned tables. Canonical business commands go through the
generated `packages/internal-api-client` and the private API defined by ADR-0011.

Only dedicated Outbox/Inbox infrastructure adapters may depend on `packages/database`.

Do not create an entirely separate persistence model inside Worker.

---

## 14. Business Rules

Workers should not independently invent business state transitions.

Example:

Scheduled publishing must use the canonical publication rules.

Do not implement:

```text
Worker directly sets status = PUBLISHED
```

if publication requires additional domain logic.

Use the private API command contract; do not import `apps/api` source or move the full business
service into a shared package.

---

## 15. Scheduled Publishing

Scheduled publishing must be safe under concurrency.

Eligible article condition may include:

```text
status = SCHEDULED
publishedAt <= now
deletedAt IS NULL
```

Before publishing:

```text
Worker invokes the generated private command client
API reloads the canonical article
API verifies state and scheduleVersion
API executes the canonical transition and writes Outbox in one transaction
```

Multiple workers must not publish the same article twice.

Use:

```text
transaction/state guard
lock
atomic update
```

where required.

---

## 16. Image Processing

Image jobs may generate:

```text
thumbnail
small
medium
large
WebP
AVIF
blurhash
metadata
```

Processing should be deterministic where practical.

Variant object keys should be predictable from the media record/version.

Retries must not create uncontrolled duplicate variants.

---

## 17. Image Security

Treat uploaded images/files as untrusted.

Processing should review:

```text
actual file type
size
image dimensions
decompression bomb risk
EXIF metadata
malformed files
```

Do not trust only browser-provided MIME values.

Remove sensitive EXIF metadata from public derivatives when appropriate.

---

## 18. Storage

Use:

```text
StorageProvider
```

or shared storage abstraction.

Do not hard-code one S3 vendor into job business logic.

Worker should not expose storage credentials outside infrastructure code.

---

## 19. Search Indexing

Search indexing is derived behavior.

Flow:

```text
ArticlePublishedEvent
     ↓
queue job
     ↓
reload Article
     ↓
verify public visibility
     ↓
index search document
```

If article is no longer public when job executes:

```text
remove or skip index appropriately
```

Do not index stale job payload content blindly.

---

## 20. Search Rebuild

Search indexes must be rebuildable from PostgreSQL.

A rebuild job/process should be safe to run independently of incremental indexing.

Do not make incremental job history required to recreate the index.

---

## 21. Analytics Aggregation

High-frequency analytics may first accumulate in Redis.

Worker may periodically aggregate:

```text
Redis counters
      ↓
batch
      ↓
PostgreSQL statistics
```

Aggregation must prevent double-counting when retries occur.

Design carefully around:

```text
read
persist
acknowledge/reset
```

semantics.

---

## 22. Email Jobs

Email delivery should occur asynchronously when business semantics permit.

Payload should normally include:

```text
template identifier
recipient reference/address
required template data
idempotency identifier where needed
```

Do not place secrets or unnecessary private records into job payloads.

Retry transient provider failures.

---

## 23. AI Jobs

Heavy AI operations may run in Worker.

Flow:

```text
job
 ↓
reload required data
 ↓
AIService
 ↓
AIProvider
 ↓
validate output
 ↓
persist result only if still applicable
```

Model output must be treated as untrusted.

AI provider errors should use controlled retry policies.

Do not automatically overwrite newer article content using results from an old job.

---

## 24. Stale Job Protection

Workers must consider that data may change after a job is queued.

Examples:

```text
article deleted
article unpublished
article edited
media replaced
user disabled
```

Before destructive or public-facing side effects, reload relevant canonical state.

For version-sensitive work, include:

```text
revision/version/hash
```

and verify it before applying results.

---

## 25. Cancellation Semantics

BullMQ jobs may already be running when underlying data changes.

Do not assume queue removal guarantees cancellation of currently executing work.

Jobs should perform state checks at safe boundaries.

---

## 26. Concurrency

Choose concurrency based on job type.

CPU-heavy:

```text
image processing
```

may require lower concurrency.

I/O-heavy:

```text
mail
search indexing
```

may tolerate higher concurrency.

Do not apply one arbitrary concurrency value to every queue.

---

## 27. CPU-Heavy Work

Avoid blocking the Worker event loop with excessive synchronous CPU work.

Use appropriate:

```text
worker threads
process isolation
native tooling
controlled concurrency
```

when image/media processing becomes CPU-heavy.

Do not prematurely optimize before measuring.

---

## 28. Resource Limits

Jobs should enforce bounds where relevant:

```text
max image size
max processing dimensions
max batch size
max search rebuild chunk size
max email batch
```

Do not load an entire large database table into memory.

Use pagination/batching.

---

## 29. Batch Jobs

Batch jobs should use bounded chunks.

Example:

```text
fetch 500 articles
process
checkpoint
fetch next 500
```

Avoid:

```text
SELECT all articles
load all into memory
```

for growing datasets.

---

## 30. Graceful Shutdown

Worker must support graceful shutdown.

On process termination:

```text
stop accepting new work
allow active jobs to finish within limits
close queue connections
close database connections
flush logs
```

Do not abruptly terminate normal active jobs when avoidable.

---

## 31. Health and Readiness

Worker deployment should expose or otherwise provide health/readiness signals where infrastructure supports it.

Readiness may depend on:

```text
Redis connectivity
required configuration
database connectivity where needed
```

Do not expose secret diagnostics.

---

## 32. Redis Failure

Redis is required for BullMQ.

If Redis becomes unavailable:

```text
fail clearly
retry connection according to infrastructure policy
avoid busy loops
```

Do not pretend jobs are successfully queued when enqueueing actually failed.

---

## 33. External Service Failure

Derived side-effect failures should not corrupt canonical database state.

Example:

```text
article published successfully
search indexing fails
```

Expected result:

```text
article stays published
search job retries/fails visibly
```

Do not roll back already-committed canonical state from a later asynchronous failure.

---

## 34. Poison Jobs

A job that repeatedly fails for deterministic reasons must not retry forever.

After configured attempts:

```text
mark failed
log clearly
surface operationally
```

Allow manual or controlled replay after root cause is fixed.

---

## 35. Job Versioning

Long-lived queues should support payload evolution.

Prefer explicit versioning for jobs likely to change.

Example:

```ts
type SearchIndexArticleJob = {
  version: 1
  articleId: string
}
```

Worker should reject unsupported versions explicitly.

---

## 36. Duplicate Enqueue Prevention

For jobs where duplicate execution is unnecessary, use deterministic job IDs.

Example concept:

```text
search-index:{articleId}:{revision}
```

Do not deduplicate jobs where every event genuinely represents distinct required work.

---

## 37. Queue Priority

Use job priorities sparingly.

Possible case:

```text
user-triggered image processing
```

may have higher priority than:

```text
nightly cleanup
```

Do not build complex priority systems without operational need.

---

## 38. Periodic Jobs

Periodic jobs may handle:

```text
scheduled publishing
analytics aggregation
orphan cleanup
expired session cleanup
search consistency checks
```

They must be safe if triggered more than once.

Assume distributed deployments may have multiple Worker instances.

---

## 39. Cleanup Jobs

Cleanup must be conservative.

Before permanently deleting media:

```text
verify record state
verify retention period
verify no active references where required
```

Do not permanently destroy user content based only on stale queue payloads.

---

## 40. Testing

Worker tests should cover:

```text
successful execution
retryable failure
non-retryable failure
idempotency
stale job behavior
duplicate execution
job payload validation
```

Do not depend on arbitrary sleeps.

Use deterministic test control where possible.

---

## 41. External Providers in Tests

Default tests must not require:

```text
real S3
real paid AI provider
real SMTP provider
production search service
```

Use:

```text
MinIO
fake adapters
mock providers
local infrastructure
```

as appropriate.

---

## 42. Before Completing Worker Work

Check:

```text
[ ] Job belongs in Worker
[ ] Payload is minimal
[ ] Payload is versionable if needed
[ ] Canonical data is reloaded when required
[ ] Stale job behavior considered
[ ] Job is idempotent where practical
[ ] Retry classification correct
[ ] Backoff bounded
[ ] Duplicate execution considered
[ ] Logging includes useful job context
[ ] No secrets logged
[ ] Database transaction boundaries reviewed
[ ] External provider failure reviewed
[ ] Concurrency/resource limits reviewed
[ ] Tests updated
[ ] Typecheck/lint run
```
