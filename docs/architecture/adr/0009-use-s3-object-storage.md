# ADR-0009: Use S3-Compatible Object Storage

## Status

Accepted

## Context

The platform stores:

```text
article images
covers
avatars
media attachments
generated image variants
```

Binary media should not be tied to API server local storage.

The system should remain portable across:

```text
AWS S3
Cloudflare R2
MinIO
other S3-compatible storage
```

## Decision

Use S3-compatible object storage through a storage abstraction.

Application code depends on:

```text
StorageProvider
```

rather than specific cloud SDKs.

Large uploads should use signed URLs where appropriate.

The database stores media metadata.

Binary content remains in object storage.

## Consequences

Benefits:

* scalable media storage
* CDN compatibility
* API servers remain stateless
* provider portability
* direct browser uploads possible

Costs:

* storage lifecycle management
* signed URL complexity
* orphan cleanup required
* external storage availability considerations

## Alternatives Considered

### Local filesystem

Rejected for production because it complicates horizontal scaling and deployment.

### PostgreSQL blobs

Rejected because ordinary media objects do not belong in the primary relational database.
