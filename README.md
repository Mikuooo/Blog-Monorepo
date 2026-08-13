# Blog Platform

A pnpm/Turborepo TypeScript monorepo for the public blog, CMS admin, canonical NestJS API, and BullMQ workers.

## Requirements

- Node.js 24 LTS.
- Corepack and pnpm 10.34.5.
- Docker Compose for the local PostgreSQL and Redis services.

## Start locally

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:migrate:test
pnpm api:generate
pnpm dev
```

Default endpoints:

- Public web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`
- OpenAPI: `http://localhost:3001/docs`
- Admin: `http://localhost:3002`

Local infrastructure uses PostgreSQL 18 and Redis 8. The default development database is
`blog_dev`. For a new schema change, run `pnpm db:migrate --name <change-name>`; deployment and CI
must use `pnpm db:migrate:deploy` and must not rewrite existing migration history.

`blog_test` is the isolated integration-test database. New PostgreSQL volumes create it from
`tools/docker/postgres/init-test-database.sql`; existing volumes create it once with
`docker compose exec postgres createdb -U blog -O blog blog_test`. Run the authoritative publication
transaction suite with `pnpm test:integration`. The test configuration rejects database names that
do not end in `_test`.

The Worker executes scheduled publication through the API's private command route; it never imports
API source or writes article business state directly. Configure the same 32-byte-or-longer
`INTERNAL_WORKLOAD_SECRET` for API and Worker, keep the internal route off the public ingress, and
use different secrets outside local development. Workload tokens are HS256, scoped to
`article.publish-scheduled`, and accepted for at most 120 seconds. The generated internal client is
owned by `packages/internal-api-client` and refreshed by `pnpm api:generate`.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Run these commands with Node.js 24. A filtered package test can execute workspace packages from
their built `dist` output; after changing a shared contract/client, build that dependency first or
run the root `pnpm test`, whose Turbo graph performs dependency builds automatically.

Architecture decisions and application-specific rules live under `docs/architecture` and each application's `AGENTS.md`.
