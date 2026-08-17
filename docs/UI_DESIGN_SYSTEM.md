# Admin UI Design System

## 1. Scope

This document governs `apps/admin`, the authenticated CMS. Public Blog UI follows the server-first,
SEO, accessibility, and performance rules in `apps/web/AGENTS.md` and may have a different visual
identity.

The Admin direction is a clean, restrained, content-focused CMS/SaaS interface. It should remain
comfortable during long editing and operational sessions. Prefer hierarchy, spacing, typography,
and consistency over decoration.

Theme token ownership is defined in `docs/THEME_SYSTEM.md`.

## 2. Project implementation model

Use the existing stack:

```text
Next.js App Router
React Server Components where practical
Tailwind CSS 4
shadcn/ui conventions
@blog/ui shared primitives
lucide-react / the existing Admin icon wrapper
```

Component ownership is explicit:

```text
packages/ui/src/components/             generic reusable primitives
apps/admin/src/components/               Admin-wide compositions
apps/admin/src/features/<feature>/       feature-specific UI and behavior
apps/admin/src/app/                      routes, layouts, and page composition
```

Do not move business-specific forms, tables, or permissions into `packages/ui`. Do not duplicate a
generic primitive inside a feature when `@blog/ui` already owns it.

## 3. Current reusable inventory

Check these before creating a new pattern:

```text
@blog/ui/components/button   Button
@blog/ui/components/badge    Badge
@blog/ui/components/card     Card, CardHeader, CardTitle, CardDescription, CardContent
@blog/ui/components/input    Input
@blog/ui/components/table    Table primitives
@/components/page-header     PageHeader
@/components/admin-shell     Admin navigation and layout shell
```

Select, Dialog, Drawer, EmptyState, Skeleton, FormSection, SearchBar, and FilterBar are not yet shared
primitives. Add one only when a concrete feature requires it, place it according to ownership, and
avoid presenting planned components as already available.

## 4. Visual hierarchy

Neutral surfaces should dominate. Use color mainly for interaction and semantic state.

Recommended hierarchy:

| Role | Weight | Guidance |
|---|---:|---|
| Page title | 600–700 | Strongest page-level text |
| Section title | 600 | Major group boundary |
| Card title | 500–600 | Compact emphasis |
| Body | 400 | Default reading content |
| Metadata | 400 | Muted and secondary |

Avoid making every label, table header, or count bold. Technical IDs and timestamps must not outrank
the content a user is managing.

Use an 8px-oriented spacing rhythm:

```text
4px  micro gap
8px  compact inline gap
12px compact control spacing
16px standard spacing
24px section or card spacing
32px major separation
40px and 48px page-level separation
```

Tailwind scale utilities are preferred. Arbitrary values are acceptable for justified layout
constraints or optical alignment, not as a new local spacing system.

## 5. Surfaces, radius, and shadows

Use `background`, `card`, `muted`, and border tokens to create hierarchy. Avoid assigning a different
colored background to every nested section.

Cards group meaningful information; they are not the default wrapper for every block. Avoid deeply
nested cards when headings and spacing are enough.

Match existing primitives: controls are generally rounded-lg and cards/shell surfaces may use
rounded-xl or rounded-2xl. Pill shapes are mainly for badges, tags, filters, and compact toggles.

Borders and restrained shadows should do most surface separation. Heavy blur, colored glow, and
routine gradients do not belong in normal forms, tables, navigation, or cards. A scoped login effect
or other deliberate brand moment may be more expressive without redefining the business UI.

## 6. Actions

A local action group should have one obvious primary action at most.

```text
Primary      create, save, publish, confirm
Secondary    supporting action
Outline      neutral action needing a boundary
Ghost        low-emphasis toolbar action
Destructive  delete or irreversible operation
```

Do not style a destructive action with the brand primary token. Confirmation UI must state the
object and consequence; visual danger styling does not replace clear wording.

Every control must expose appropriate hover, focus, disabled, and loading behavior. Preserve visible
keyboard focus.

## 7. Forms

Significant forms use React Hook Form and Zod as defined by `apps/admin/AGENTS.md`. Visual composition
must support:

- explicit labels and descriptions;
- field-level validation near the affected control;
- submission and disabled states;
- actionable API errors;
- dirty-state and unsaved-change handling where data loss matters;
- logical keyboard and reading order.

Group fields by user intent. Do not turn an editor into a dense ERP-style grid merely to reduce page
height.

## 8. Tables and lists

Tables prioritize scanning and moderate density:

- subtle row separators;
- semantic hover/selected surfaces;
- compact metadata;
- bounded actions;
- no strong zebra striping or heavily colored headers;
- horizontal scrolling when it preserves a data-heavy table better than card conversion.

Article lists should emphasize:

```text
Title
Slug or relevant metadata
Category
Status
Author
Updated time
Actions
```

The title is strongest. IDs and timestamps stay secondary. Filters and pagination should remain
URL-driven when practical, following the existing Admin rules.

## 9. Status and feedback

Use dedicated semantic treatments:

```text
Published / healthy     success
Draft                   neutral
Scheduled               info
Pending / needs review  warning
Failed / destructive    destructive
```

Do not rely on color alone; include a readable label and, where useful, an icon or shape.

Loading behavior should match scope:

- skeleton or structured placeholder for a content region;
- spinner for a compact local operation;
- button-level progress for a submitted action;
- whole-screen blocking only when the entire screen genuinely cannot proceed.

Empty states contain a short title, one-line explanation, and an optional relevant action. Error
states explain what failed and how to retry or recover without exposing internal details.

## 10. Article editor

The editor is a writing environment first. Keep the primary content column calm and readable; a
target width around 760–860px is reasonable when the surrounding layout permits it.

Use this conceptual order:

```text
Page toolbar
Title and summary
Editor content
Secondary publishing and metadata configuration
```

Publishing, visibility, category, tags, SEO, and other secondary settings may use a side region,
drawer, or clearly separated section. They must not compete visually with the writing surface.

## 11. Dashboard and charts

A useful dashboard favors decisions over decoration:

```text
4–6 important summary metrics
1–2 meaningful charts
recent activity
popular content
pending actions
```

Avoid large grids of low-value metric cards.

ECharts configuration must obtain browser-rendered colors from canonical CSS variables. Use a
restrained centralized series palette, readable tooltips, non-color labels where needed, and a
usable empty state. A rainbow palette requires actual categorical need.

## 12. Navigation and responsive behavior

The existing `AdminShell` owns desktop navigation, mobile navigation, header, breadcrumbs, and the
main content boundary. Extend it instead of adding route-local shells.

The expanded desktop sidebar and the corresponding content offset share the structural token:

```css
--admin-sidebar-expanded-width: clamp(14rem, 11.25vw, 27rem);
```

This starts at 224px on ordinary desktop screens, reaches about 288px at 2560px, and grows to 432px
at 4K. The collapsed sidebar remains 64px. Do not set an independent route-level sidebar width or
content offset; changing one without the other causes overlap or empty space. The mobile drawer
keeps its separate viewport-bounded width.

The navigation interior scales more conservatively than the sidebar width:

```css
--admin-sidebar-inline-padding: clamp(0.75rem, 0.45vw, 1.25rem);
--admin-sidebar-item-gap: clamp(0.5rem, 0.3vw, 0.75rem);
--admin-sidebar-item-height: clamp(3rem, 1.4vw, 3.5rem);
```

Menu items use a medium 12px radius, a theme-owned card background, light border and soft shadow in
both shell layouts, and a short leading accent on the active item. Hover applies the soft Miku
surface, primary border, slightly stronger shadow, and a one-pixel lift. Disabled items remain flat
and low-emphasis.

The logo header remains fixed at 64px high and does not scale with the sidebar. Its 40px Miku mark
uses a 16px radius and a theme-owned brand shadow. The expanded footer user card uses the sidebar
card background, a 16px radius, matching border/shadow, a soft Miku avatar, and a trailing logout
action. Its collapsed treatment stays compact rather than forcing the expanded card proportions.

Admin is desktop-oriented but must remain usable on tablet and mobile:

```text
sidebar       → mobile drawer
wide table    → horizontal scroll or justified compact representation
toolbar       → wrap or overflow menu
side panel    → stacked section or drawer
```

Do not simply scale the desktop interface down. Test common widths and ensure overlays can be closed
with accessible controls.

## 13. Accessibility and motion

Required baseline:

- semantic HTML and native controls;
- labels for inputs;
- visible focus indicators;
- sufficient text and control contrast;
- keyboard-operable navigation, dialogs, drawers, and menus;
- status communication beyond color;
- useful accessible names for icon-only buttons;
- logical heading hierarchy;
- `prefers-reduced-motion` support for nonessential motion.

Decorative canvas and rain effects must not intercept input, obscure required content, or make the
login flow unusable when animation is reduced or unsupported.

## 14. Review checklist

Before accepting a page or major visual change, verify:

- [ ] The owning layer is correct: shared primitive, Admin composition, feature, or route.
- [ ] Existing primitives and patterns were checked first.
- [ ] Business components contain no new theme-dependent literal brand colors.
- [ ] Brand interaction and semantic state colors remain separate.
- [ ] Meaning remains clear without color alone.
- [ ] One primary action is visually dominant where appropriate.
- [ ] Cards, gradients, shadows, and decorative effects are restrained.
- [ ] Typography and spacing establish a clear hierarchy.
- [ ] Hover, focus, disabled, loading, empty, and error states are covered.
- [ ] Mobile, tablet, and desktop behavior is intentional.
- [ ] Keyboard access, contrast, labels, and reduced motion were reviewed.
- [ ] Admin lint and typecheck were run.
- [ ] Material visual changes received browser review.

When several solutions satisfy the requirements, choose the simpler, clearer, more consistent, and
more reusable one.
