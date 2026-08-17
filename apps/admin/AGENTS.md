# apps/admin/AGENTS.md

# Admin Agent Instructions

These rules apply to:

```text
apps/admin/
```

Also follow the repository root `AGENTS.md`.

---

## 1. Purpose

`apps/admin` is the authenticated CMS administration application.

Primary concerns:

```text
content management
forms
tables
permissions
server state
editing workflows
operational clarity
```

Technology:

```text
Next.js
React
TypeScript
App Router
Tailwind CSS
shadcn/ui
TanStack Query
React Hook Form
Zod
```

---

## 2. Application Responsibilities

Admin owns presentation and interaction for:

```text
login

dashboard

articles
article editor
article revisions

categories
tags

comments

media

users
roles
permissions

pages
menus
links

settings

analytics

audit logs

AI content tools
```

Admin does not own canonical business rules.

NestJS remains authoritative.

---

## 3. Server vs Client Components

Use Server Components when practical.

However, Admin naturally contains more Client Components than the public Web.

Client Components are appropriate for:

```text
forms
tables
dialogs
interactive filters
drag-and-drop
editor
TanStack Query hooks
browser APIs
```

Do not make the entire Admin application client-rendered without reason.

Keep client boundaries intentional.

---

## 4. Data Ownership

API data is server state.

Examples:

```text
articles
categories
tags
comments
users
roles
media
settings
audit logs
```

Use:

```text
TanStack Query
```

for client-side server-state management.

Do not duplicate API results into Zustand or another global state store.

Bad:

```text
TanStack Query
    ↓
copy articles
    ↓
Zustand
```

Use the Query cache directly.

---

## 5. Query Keys

Query keys must be stable and structured.

Example:

```ts
export const articleKeys = {
  all: ['articles'] as const,

  lists: () =>
    [...articleKeys.all, 'list'] as const,

  list: (params: ArticleQuery) =>
    [...articleKeys.lists(), params] as const,

  details: () =>
    [...articleKeys.all, 'detail'] as const,

  detail: (id: string) =>
    [...articleKeys.details(), id] as const,
}
```

Avoid vague keys:

```ts
['data']
['list']
['result']
```

---

## 6. Mutations

Mutations should use TanStack Query mutation patterns.

After mutation:

```text
invalidate or update only affected queries
```

Example:

```text
update article
    ↓
update article detail cache
invalidate affected article lists
```

Do not invalidate the entire application cache by default.

Optimistic updates are allowed only when rollback behavior is clear.

---

## 7. Global Client State

Use Zustand only when genuine application-wide client state exists.

Appropriate examples:

```text
sidebar collapsed
editor layout preference
theme preference
temporary UI workflow state
```

Do not store server resources in Zustand.

---

## 8. Forms

Use:

```text
React Hook Form
+
Zod
```

for significant forms.

Example:

```ts
const articleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  summary: z.string().max(500).optional(),
})
```

Frontend validation improves UX.

Backend validation remains authoritative.

---

## 9. Form State

Important forms should handle:

```text
default values
dirty state
field validation
submission state
API errors
reset behavior
unsaved changes
```

Do not silently discard unsaved content.

Editor screens should consider navigation warnings when dirty.

---

## 10. API Access

Use:

```text
packages/api-client
```

or thin Admin-specific adapters around it.

Do not scatter raw endpoint strings throughout components.

Avoid:

```ts
fetch('/api/v1/admin/articles')
```

inside arbitrary UI components when the shared client already supports the endpoint.

Generated API files must not be manually edited.

---

## 11. Authentication

Authentication state must be based on verified server/session state.

Do not treat:

```text
localStorage user object
localStorage role
localStorage isAdmin
```

as authoritative.

Never store refresh tokens in JavaScript-accessible browser storage.

---

## 12. Authorization UI

Admin should adapt UI according to permissions.

Example:

```tsx
<PermissionGate permission="article.publish">
  <PublishButton />
</PermissionGate>
```

Possible behavior:

```text
hide unavailable action
disable unavailable action
show permission explanation
```

depending on UX.

Backend authorization is still mandatory.

---

## 13. Permission Constants

Do not duplicate raw permission strings everywhere.

Prefer shared constants/types.

Example:

```ts
Permission.ArticlePublish
```

or the project's canonical permission representation.

Permission identifiers must match backend definitions exactly.

---

## 14. Routing

Use App Router conventions.

Suggested high-level structure:

```text
app/
├── (auth)/
│   └── login/
│
└── (dashboard)/
    ├── dashboard/
    ├── articles/
    ├── categories/
    ├── tags/
    ├── comments/
    ├── media/
    ├── users/
    ├── roles/
    ├── pages/
    ├── menus/
    ├── links/
    ├── analytics/
    ├── audit/
    └── settings/
```

Use route groups for meaningful layout boundaries.

---

## 15. Feature Structure

Complex features should remain feature-oriented.

Example:

```text
features/article/
├── components/
├── hooks/
├── schemas/
├── utils/
└── types/
```

Example:

```text
features/article-editor/
├── components/
│   ├── ArticleEditor.tsx
│   ├── EditorToolbar.tsx
│   ├── PublishPanel.tsx
│   ├── SeoPanel.tsx
│   └── Preview.tsx
├── hooks/
├── schemas/
└── utils/
```

Do not put all Admin components into one global `components` directory.

---

## 16. UI Components

Generic reusable primitives come from:

```text
packages/ui
```

Business-specific components remain inside Admin features.

Good:

```text
packages/ui/Button
packages/ui/Dialog
```

Good:

```text
apps/admin/features/article/ArticlePublishDialog
```

Bad:

```text
packages/ui/ArticlePublishDialog
```

---

## 17. Data Tables

Administrative tables should consider:

```text
loading
empty state
error state
server pagination
sorting
filtering
selection
permissions
bulk actions
responsive layout
```

Do not load thousands of records and paginate only in the browser.

---

## 18. Filters

Prefer URL-driven list state when practical.

Example:

```text
/articles?page=2&status=DRAFT&keyword=react
```

Benefits:

```text
refresh safety
shareable URLs
browser navigation
debugging
```

Do not keep all important filters exclusively in transient component state.

---

## 19. Pagination

Use server-side pagination for large resources.

Typical defaults:

```text
page = 1
pageSize = 20
```

Respect API maximum page sizes.

Do not implement client-only pagination over unbounded API responses.

---

## 20. Loading States

Every meaningful async UI should handle loading.

Examples:

```text
table skeleton
button pending state
form submitting state
page skeleton
```

Avoid blocking the whole dashboard when only one small panel is loading.

---

## 21. Empty States

Major collection pages must define intentional empty states.

Examples:

```text
No articles yet
No comments awaiting review
No uploaded media
No matching users
```

When appropriate provide a clear next action.

---

## 22. Error States

Handle API errors intentionally.

Distinguish where useful:

```text
validation error
permission denied
not found
network failure
server failure
```

Admin may show:

```text
requestId
```

for support/debugging.

Do not expose stack traces or sensitive internals.

---

## 23. Confirmation UX

Destructive or high-impact actions should require deliberate confirmation.

Examples:

```text
delete article
purge media
disable user
change role
publish article
bulk delete
```

Do not use confirmation for every trivial edit.

---

## 24. Article Editor

The editor should be feature-isolated.

V1 canonical content:

```text
Markdown
```

Suggested layout:

```text
┌─────────────────────────────────────────────┐
│ Title                                       │
├──────────────────────┬──────────────────────┤
│ Markdown Editor      │ Preview              │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ Category / Tags / SEO / Publish Settings    │
└─────────────────────────────────────────────┘
```

Do not place the entire editor implementation inside a route page file.

---

## 25. Autosave

If autosave exists:

```text
do not save every keystroke
```

Use:

```text
debounce
dirty tracking
request ordering/cancellation
error recovery
```

UI must communicate:

```text
Unsaved
Saving...
Saved
Save failed
```

Do not silently overwrite newer content with an older autosave request.

---

## 26. Revision UX

Article revision UI should support where implemented:

```text
revision list
view revision
compare versions
restore revision
```

Restoring history should not mutate old revisions.

The UI should clearly communicate that restore creates a new current state.

---

## 27. Publish Workflow

Publishing is a significant action.

The UI should account for:

```text
current article status
required permission
validation
schedule time
visibility
SEO readiness
unsaved content
API failure
```

Do not assume button visibility alone ensures valid publication.

---

## 28. Media Management

Media UI should support:

```text
upload
progress
preview
metadata
copy URL/reference
delete
filter
pagination
```

Large files should use the approved signed-upload architecture.

Do not embed cloud storage credentials in frontend code.

---

## 29. Drag and Drop

When implementing drag-and-drop:

```text
provide keyboard-accessible alternative where practical
persist only final intended ordering
handle request failure
```

Do not generate a database request for every pixel of movement.

---

## 30. Search and Command UI

Command palettes or searchable selects may use client-side interaction.

However, remote datasets should use bounded API search.

Do not preload all users/media/articles solely to power a command menu.

---

## 31. Accessibility

Admin is still required to support basic accessibility.

Use:

```text
semantic controls
labels
focus management
keyboard navigation
accessible dialogs
```

Prefer shadcn/Radix behavior over hand-built inaccessible widgets.

---

## 32. Responsive Layout

Admin must support at least:

```text
mobile
tablet
desktop
```

Not every dense table must fully collapse into cards.

Horizontal scrolling is acceptable for data-heavy tables where it preserves clarity.

Do not assume all Admin users have 1920px displays.

---

## 33. Styling

Use:

```text
Tailwind CSS
shadcn/ui
project design tokens
```

Do not introduce another major component/styling framework without approval.

The Admin UI is token-first and theme-independent. Before changing theme tokens, shared primitives,
page layout, charts, or visual states, read:

```text
docs/THEME_SYSTEM.md
docs/UI_DESIGN_SYSTEM.md
```

Use the Tailwind utilities backed by the canonical CSS variables in
`apps/admin/src/app/globals.css`, for example:

```text
bg-background
bg-card
text-foreground
text-muted-foreground
border-border
bg-primary
text-primary-foreground
ring-ring
```

Business components must not hard-code a brand hue or use the primary color to communicate
success, warning, danger, or information. Theme-specific literal values belong only in the active
theme definition. Local literals are allowed for non-theme rendering internals such as canvas,
shaders, and deliberately isolated decorative effects, but they must not leak into ordinary Admin
components.

Generic reusable primitives belong in `packages/ui`; Admin-specific compositions belong in
`apps/admin/src/components` or the owning `apps/admin/src/features/<feature>` directory. Reuse the
existing Button, Badge, Card, Input, Table, PageHeader, and shell patterns before creating variants.

The active runtime baseline is the `miku` preset in
`apps/admin/src/styles/themes/miku.css`. `apps/admin/src/styles/theme.css` is the theme entry point,
`apps/admin/src/app/globals.css` maps its canonical variables into Tailwind utilities, and the root
layout provides the matching `data-theme` and `data-color-scheme` attributes. Runtime switching UI
is not implemented; do not assume users can change the fixed initial scheme yet.

Prefer neutral surfaces, clear typography, an 8px-oriented spacing rhythm, light borders, and
restrained shadows. Primary actions must be scarce, destructive actions must use destructive
styling, status meaning must include text or icons, and focus indicators must remain visible.

The Miku preset has one explicitly approved visual exception: solid `#39C5BB` brand surfaces use
white text through `--primary-foreground` and `--sidebar-active-foreground`. This pair has an
approximate WCAG contrast ratio of `2.13:1` and is not a general accessibility precedent. Do not use
it for body copy, muted text, semantic status text, or controls outside the intentional solid-brand
treatment. Any future palette should restore compliant contrast rather than inherit this exception.

Avoid inconsistent one-off colors, arbitrary spacing, decorative gradients in routine business
components, excessive cards, and subtly different copies of shared primitives.

---

## 34. useEffect

Do not use `useEffect` as a general state synchronization mechanism.

Before using it, consider:

```text
derived render value
event handler
TanStack Query
React Hook Form
router state
```

Use effects for actual external synchronization.

---

## 35. Memoization

Do not automatically add:

```text
useMemo
useCallback
memo
```

to every component.

Use them when:

```text
measured performance requires it
referential identity matters
calculation is meaningfully expensive
```

---

## 36. AI Features

AI UI features may include:

```text
generate title
generate summary
SEO description
suggest tags
suggest category
rewrite
translate
proofread
```

AI-generated changes must remain reviewable by the user.

Do not automatically overwrite article content without explicit user action.

Display pending/error state clearly.

---

## 37. Security

Never place secrets in Admin client bundles.

Never store:

```text
refresh token
AI API key
S3 secret
database credential
```

in browser storage.

Treat rendered AI/user content as untrusted unless sanitized.

---

## 38. Testing

Prioritize tests for:

```text
article form validation
publish flow
permission-dependent actions
editor dirty state
critical table filters
error handling
authentication flow
```

Use Playwright for critical end-to-end Admin workflows.

Primary V1 journey:

```text
login
  ↓
create article
  ↓
save draft
  ↓
publish
  ↓
verify public article
```

---

## 39. Before Completing Admin Work

Check:

```text
[ ] Correct server/client boundary
[ ] Shared API client used
[ ] TanStack Query used for server state
[ ] No API state duplicated into Zustand
[ ] Form schema/validation correct
[ ] Loading state handled
[ ] Empty state handled
[ ] Error state handled
[ ] Permissions reflected in UI
[ ] Backend authorization still assumed mandatory
[ ] URL filters reviewed
[ ] Pagination reviewed
[ ] Responsive behavior checked
[ ] Accessibility checked
[ ] Admin design-system docs read for theme/UI work
[ ] Semantic theme tokens used; no business-component brand literals added
[ ] Brand and semantic status colors remain separate
[ ] Existing shared primitives and feature patterns reused
[ ] No sensitive browser storage
[ ] Tests updated
[ ] Typecheck/lint run
```
