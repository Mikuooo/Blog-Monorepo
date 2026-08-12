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
pnpm db:generate
pnpm api:generate
pnpm dev
```

Default endpoints:

- Public web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`
- OpenAPI: `http://localhost:3001/docs`
- Admin: `http://localhost:3002`

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Architecture decisions and application-specific rules live under `docs/architecture` and each application's `AGENTS.md`.
