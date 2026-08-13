# Toolchain baseline

Date: 2026-08-12

This file fixes the initial implementation baseline. The accepted technology ADRs remain authoritative; the versions below are compatibility choices, not new architecture.

| Area | Baseline | Rationale |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | The complete locked dependency graph and CI are validated on Node 24; older runtimes are not part of the support contract. |
| Package manager | pnpm 10.34.5 | Pinned package-manager behavior and lockfile format for reproducible installs. |
| Language | TypeScript 5.9.3 | Supported by the selected ESLint and OpenAPI generation toolchain. |
| Monorepo | Turborepo 2.10 | Matches ADR-0001 and provides task ordering/cache boundaries. |
| Frontend | Next.js 16.3, React 19.2, Tailwind CSS 4.3 | Current compatible App Router baseline. |
| Backend | NestJS 11.1, Prisma 7.9, PostgreSQL 18 | Matches ADR-0003 through ADR-0005. Prisma uses the PostgreSQL driver adapter and PostgreSQL-native UUID v7 IDs. |
| Async | BullMQ 6, Redis 8 | Matches ADR-0008 and keeps Redis non-canonical. |
| Contract | Nest Swagger, OpenAPI, openapi-typescript/openapi-fetch | Generated transport contracts; no shared Prisma or Nest DTO imports. |
| Validation | ESLint 9.39, Prettier 3, Vitest 4 | Current Next.js plugins do not yet declare ESLint 10 compatibility; strict peer validation stays enabled. |

Still intentionally deferred because it needs product or deployment input rather than framework selection:

- end-user authentication/session provider;
- workload identity issuer and private routing implementation;
- production S3-compatible provider;
- search provider and deployment topology.

None of these items blocks repository initialization or feature development behind explicit ports.
