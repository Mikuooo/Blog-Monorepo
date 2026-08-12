# ADR-0002: Use Next.js for Web and Admin

## Status

Accepted

## Context

The platform contains:

```text
Public Blog
Admin Dashboard
```

The public Blog requires:

* SEO
* server rendering
* metadata
* caching
* static generation/revalidation
* low client JavaScript

The Admin requires:

* React
* routing
* forms
* server state
* authentication
* rich interactions

Using different frontend frameworks would increase architectural inconsistency.

## Decision

Use Next.js App Router for:

```text
apps/web
apps/admin
```

Both use:

```text
React
TypeScript
Tailwind CSS
shadcn/ui
```

Public Web follows a Server Component first approach.

Admin may use more Client Components where interactive application behavior requires them.

Next.js remains a presentation/application delivery layer.

It is not the canonical business backend.

## Consequences

Benefits:

* unified frontend framework
* consistent routing
* shared React knowledge
* Server Components
* SEO support
* shared UI packages
* easier AI-assisted development

Costs:

* developers must understand server/client boundaries
* Next.js caching requires deliberate design
* accidental business logic duplication must be prevented

## Alternatives Considered

### React + Vite Admin

Valid technically, but rejected to reduce the number of frontend architectures.

### Vue / Nuxt

Rejected because the project explicitly standardized on React.

### Next.js as the only backend

Rejected because the project requires a dedicated business API and worker architecture.
