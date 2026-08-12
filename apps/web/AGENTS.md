# apps/web/AGENTS.md

# Public Web Agent Instructions

These rules apply to:

```text
apps/web/
```

Also follow the repository root `AGENTS.md`.

---

## 1. Purpose

`apps/web` is the public Blog.

Primary concerns:

```text
SEO
performance
accessibility
server rendering
cacheability
minimal client JavaScript
```

Technology:

```text
Next.js
React
TypeScript
App Router
Tailwind CSS
shadcn/ui
```

---

## 2. Server First

Use React Server Components by default.

Do not add:

```tsx
'use client'
```

unless browser-side interactivity requires it.

Keep Client Component boundaries as small as practical.

Example:

```text
ArticlePage              Server
├── ArticleHeader        Server
├── ArticleContent       Server
├── TableOfContents      Server when possible
├── RelatedArticles      Server
└── LikeButton           Client
```

Do not turn the entire page into a Client Component because one nested component needs state.

---

## 3. Data Fetching

Public content should normally be fetched server-side.

Examples:

```text
articles
categories
tags
archives
SEO metadata
static pages
```

Do not introduce TanStack Query for ordinary server-rendered public content without a real client-side requirement.

---

## 4. API Access

Use the shared API client or project-standard server API adapter.

Do not duplicate API definitions.

Do not directly import:

```text
Prisma
NestJS services
backend repositories
```

Frontend depends only on public API contracts.

---

## 5. Next.js vs NestJS

Next.js handles:

```text
routing
rendering
metadata
layouts
loading
errors
404
cache/revalidation
```

NestJS handles:

```text
business rules
database access
authorization
content lifecycle
```

Do not duplicate backend business logic in:

```text
Route Handlers
Server Actions
```

Server Actions, if used, must remain thin frontend orchestration.

---

## 6. Page Structure

Typical routes:

```text
/
 /posts
 /posts/[slug]
 /categories/[slug]
 /tags/[slug]
 /archive
 /search
 /about
```

Use Next.js App Router conventions.

Prefer meaningful route groups/layout boundaries.

---

## 7. Article Pages

Article pages should support where applicable:

```text
title
summary
cover
author
category
tags
published time
reading time
content
table of contents
related articles
previous/next
comments
```

Do not fetch Admin-only Article fields unnecessarily.

---

## 8. SEO

Dynamic public content must review:

```text
title
description
canonical URL
Open Graph
Twitter metadata
structured data
```

Use:

```ts
generateMetadata()
```

when appropriate.

Do not manipulate critical SEO metadata through client-side effects.

---

## 9. Public Visibility

Never expose content that is:

```text
DRAFT
PENDING
SCHEDULED but not yet published
PRIVATE
deleted
```

unless the API explicitly provides an authorized preview mechanism.

Restricted content must not leak through:

```text
sitemap
RSS
search
cache
static generation
```

---

## 10. Cache

Caching must account for publication and updates.

For cached content, know:

```text
cache key/scope
revalidation behavior
stale behavior
invalidation source
```

Never cache private/user-specific data as public shared content.

---

## 11. Client State

Use local React state for local UI interaction.

Examples:

```text
dialog state
theme menu
temporary search UI
expanded section
```

Do not add global state for server-rendered content unnecessarily.

---

## 12. useEffect

Do not use `useEffect` as a default data fetching or derived-state mechanism.

Before adding an effect, consider whether the logic belongs in:

```text
Server Component
render calculation
event handler
router
```

Use effects only for actual external synchronization.

---

## 13. Performance

Avoid unnecessary browser JavaScript.

Before adding a client dependency ask:

```text
Can this run on the server?
Can native browser/platform functionality solve it?
Can it be dynamically loaded?
```

Do not ship Admin-only dependencies into the public Web bundle.

---

## 14. Images

Use appropriate Next.js image handling.

Provide meaningful:

```text
alt
dimensions/aspect ratio
responsive sizing
```

Avoid layout shifts.

Decorative images may use empty alt text.

---

## 15. Markdown

Article HTML must come from the trusted/sanitized Markdown rendering pipeline.

Never render unsanitized user content with:

```tsx
dangerouslySetInnerHTML
```

If using pre-rendered HTML from the API, the sanitization contract must be known.

---

## 16. Semantic HTML

Prefer:

```html
<header>
<nav>
<main>
<article>
<section>
<aside>
<footer>
```

where appropriate.

Article pages should maintain logical heading structure.

Avoid meaningless nested `div`s when semantic elements exist.

---

## 17. Accessibility

Interactive controls must be keyboard accessible.

Use proper native controls.

Avoid:

```html
<div onClick={...}>
```

when a button is intended.

Inputs require labels.

Maintain visible focus behavior.

---

## 18. Responsive Design

Every new page should work at:

```text
mobile
tablet
desktop
```

Do not design only for desktop.

Avoid fixed dimensions unless justified.

---

## 19. Styling

Use:

```text
Tailwind CSS
shadcn/ui
project design tokens
```

Do not introduce another styling system without approval.

Avoid excessive arbitrary values when theme/spacing tokens are suitable.

---

## 20. Search

Public search state should be URL-driven when practical.

Example:

```text
/search?q=react&page=2
```

This improves:

```text
shareability
refresh
browser navigation
SEO where applicable
```

---

## 21. Error Handling

Public pages should intentionally handle:

```text
loading
not found
API failure
empty result
```

Do not expose internal stack traces or infrastructure errors.

Use `not-found.tsx`, `error.tsx`, and route-level handling where appropriate.

---

## 22. Testing

Focus frontend tests on meaningful behavior.

Critical public behaviors include:

```text
article renders correctly
published article is accessible
missing article returns 404
search works
private content is not exposed
metadata is correct
```

Use Playwright for critical user journeys.

---

## 23. Before Completing Web Work

Check:

```text
[ ] Server Component used by default
[ ] Client boundary is minimal
[ ] Shared API client used
[ ] No backend implementation imports
[ ] SEO reviewed
[ ] Public visibility reviewed
[ ] Cache/revalidation reviewed
[ ] Loading state reviewed
[ ] Error/404 state reviewed
[ ] Accessibility reviewed
[ ] Responsive layout reviewed
[ ] Client bundle impact reviewed
[ ] Tests updated where appropriate
[ ] Typecheck/lint run
```
