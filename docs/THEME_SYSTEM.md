# Admin Theme System

## 1. Scope and authority

This document defines the theme contract for `apps/admin`. It does not define the visual identity of
the public blog in `apps/web`.

For Admin UI work, apply these sources together:

1. `apps/admin/AGENTS.md` for mandatory implementation rules.
2. This document for token ownership and theme integration.
3. `docs/UI_DESIGN_SYSTEM.md` for component and page composition.

The Admin must remain usable when the brand palette changes. Business components therefore consume
semantic Tailwind utilities and must not know literal palette values.

## 2. Current implementation baseline

The active theme is `miku`, anchored by `#39C5BB`. Theme ownership is split intentionally:

```text
apps/admin/src/styles/themes/miku.css  literal light/dark palette and semantic values
apps/admin/src/styles/theme.css        theme stylesheet entry point
apps/admin/src/app/globals.css         Tailwind import and semantic utility mapping
apps/admin/src/app/layout.tsx          initial theme and color-scheme attributes
```

The root layout currently selects `data-theme="miku"` and `data-color-scheme="light"`. The Miku dark
palette is defined and ready for explicit selection, but no user-facing runtime switch or persisted
preference exists yet.

The `:root` selector in `miku.css` supplies a safe light fallback for renderers that do not provide
theme attributes. Do not move literal theme colors back into `globals.css`.

## 3. Canonical runtime tokens

Keep the existing shadcn/Tailwind-compatible token vocabulary. Shared components already consume
these names:

```text
--background
--foreground
--card
--card-foreground
--primary
--primary-hover
--primary-foreground
--primary-soft
--secondary
--secondary-foreground
--muted
--muted-foreground
--destructive
--border
--input
--ring
--success
--warning
--warning-foreground
```

The Miku preset also defines the following extended tokens for new components:

```text
--primary-active / --primary-border
--popover / --popover-foreground
--success-foreground / --success-soft
--destructive-foreground / --destructive-soft
--info / --info-foreground / --info-soft
--warning-strong
--border-strong
--sidebar / --sidebar-foreground / --sidebar-muted
--sidebar-border / --sidebar-hover
--sidebar-active / --sidebar-active-foreground
--sidebar-card / --sidebar-card-border
--chart-primary / --chart-2 / --chart-3 / --chart-4 / --chart-5
```

Sidebar card, hover, and logo shadows are theme-owned CSS values:

```text
--sidebar-card-shadow
--sidebar-card-shadow-hover
--sidebar-logo-shadow
```

Do not create a second parallel vocabulary such as `--color-text-primary` unless a deliberate
migration replaces the existing contract across `apps/admin` and `packages/ui` in one coherent
change.

## 4. How components consume tokens

In TSX, prefer Tailwind semantic utilities:

```tsx
<section className="border-border bg-card text-card-foreground" />
<p className="text-muted-foreground" />
<button className="bg-primary text-primary-foreground hover:bg-primary-hover" />
```

Do not use theme-dependent literals in ordinary components:

```tsx
<button className="bg-[#39c5bb]" />
<div className="border-cyan-200" />
```

CSS may use the canonical variables directly when a utility is insufficient:

```css
outline-color: var(--ring);
```

Literal colors are acceptable inside a centralized theme definition. They may also be used by
isolated canvas, shader, image-processing, or decorative-effect internals where the value is part of
the rendering algorithm rather than the Admin component language. Keep those exceptions localized
and document theme coupling when it exists.

## 5. Token layers

Use three layers without forcing every layer to exist prematurely:

```text
theme palette literal
        ↓
canonical runtime semantic token
        ↓
Tailwind utility or rare component alias
```

Business components use the last two layers. They do not consume palette literals.

Component aliases are justified only when several instances share a stable state model that the
semantic tokens cannot express. Avoid one-off variables that merely rename a literal.

## 6. Brand and state separation

`primary` means brand identity and interaction. It does not mean success.

```text
primary      → primary action, link, active navigation, focus-related accent
success      → completed or healthy state
warning      → attention or pending-risk state
destructive  → deletion, failure, or destructive action
info         → neutral informational state
```

Color must not be the only state carrier. Combine it with text, an icon, or another perceivable
indicator. Every theme must preserve state distinction even when its brand hue resembles a semantic
state hue.

### Approved Miku foreground exception

The Miku preset intentionally uses white for `--primary-foreground` and
`--sidebar-active-foreground` on the exact `#39C5BB` background. The resulting contrast is
approximately `2.13:1`, below the normal WCAG threshold. This is a product-approved visual exception
limited to solid brand buttons, badges, navigation items, logos, avatars, and breadcrumbs.

Do not extend this pairing to body text, metadata, form content, semantic states, or arbitrary
surfaces. Retain text labels and other non-color cues, and reconsider the exception if accessibility
requirements tighten.

## 7. Adding runtime themes

Introduce another theme or runtime switching only as a scoped feature with persistence, hydration,
accessibility, and no-flash behavior defined. The current structure is:

```text
apps/admin/src/styles/
├── theme.css
└── themes/
    ├── miku.css
    └── <new-theme>.css
```

Use one stable theme ID consistently in the filename, selector, persisted value, and DOM attribute.
The existing preset uses:

```html
<html data-theme="miku" data-color-scheme="light">
```

New theme or switching work must:

1. Keep canonical runtime token names stable for components.
2. Import theme definitions from the single `theme.css` entry point.
3. Set initial DOM attributes on the server when possible to prevent a flash.
4. Isolate an interactive switcher in a small Client Component.
5. Define a safe fallback for missing or invalid persisted values.
6. Provide both light and dark token sets when the theme claims both schemes.
7. Verify shared `packages/ui` components before enabling the new preset.

Do not add several speculative palettes before the first runtime theme path works.

## 8. Dark mode

Dark mode is a color-scheme variant of a theme, not a separate component system. The Miku dark
palette is implemented, but the application still starts in light mode and has no switching UI.

When introduced, each supported theme/scheme pair must define the full canonical token contract.
Avoid component-level dark-mode overrides when changing semantic tokens is sufficient.

## 9. Charts and effects

Charts must resolve colors from computed canonical CSS variables at render time. Centralize chart
tokens only when multiple charts need a stable series palette. Literal fallback values may guard
non-browser tests, but the rendered browser path should follow the active theme.

Decorative login effects may own a specialized palette. They must keep text, controls, focus rings,
and status communication accessible, and must honor `prefers-reduced-motion`.

## 10. Theme verification

For a token or theme change, verify:

- shared Button, Badge, Card, Input, and Table states;
- Admin shell navigation, active/hover/disabled states, mobile drawer, and focus behavior;
- login and authentication states;
- article forms and tables;
- category, tag, user, and settings screens;
- dashboard charts and tooltips;
- default, hover, active, focus, disabled, loading, selected, and error states;
- contrast and meaning without color alone;
- mobile, tablet, and desktop layouts;
- reduced-motion behavior for animated surfaces.

Run at least the Admin lint and typecheck after implementation. Theme work with meaningful visual
impact also requires browser review; automated checks alone do not establish visual correctness.
