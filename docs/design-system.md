# Duka design system

Duka's interface is **simple because it is precisely designed**: solid surfaces, hairline borders, one quiet shadow, generous whitespace, a strong type scale, and small purposeful motion. No glassmorphism, no blur, no translucent panels, no decorative gradients.

Everything below lives in code: tokens in `frontend/src/index.css` and `frontend/tailwind.config.js`, motion in `frontend/src/config/motion.ts`, primitives in `frontend/src/components/ui/`.

## Principles

1. **Solid, not glassy.** Every surface is opaque. Never use `backdrop-filter`, `bg-white/60`-style translucency for panels, or gradient backgrounds. (`surface-deep` and the auth stage are the only strong colour fields.)
2. **Tokens, never hex.** Colours go through the CSS variables so the 16 accents and dark mode keep working. `text-brand-green`, not `#137A4C`.
3. **One container.** `Card` is the container. Do not nest cards in cards; use `surface-2` wells or borders inside a card instead.
4. **Hierarchy through type and space**, not through borders and shadows. Prefer whitespace over dividers.
5. **Every state is designed**: loading (content-shaped skeleton), empty (what, why, what next), error (plain words plus a next action), success (a quiet confirmation).
6. **Mobile first.** Design the phone layout, then let `sm`/`md`/`lg` add columns. Tap targets are at least 44px.
7. **Motion is short and physical.** Hover 120ms, state changes 200ms, arrivals 240–320ms with the emphasized curve. Springs only for the nav indicator and the auth surface. Always honour `prefers-reduced-motion` (the global rule handles CSS; check `prefersReducedMotion()` before JS-driven sequences).

## Colour

| Token (Tailwind) | Use |
|---|---|
| `brand-green` | Primary actions, active states, links |
| `brand-green-deep` | Headings, strong text on light surfaces; flips light in dark mode |
| `brand-green-fresh` | Success, positive accents, the nav indicator glow |
| `brand-green-mist` | Selected/tinted backgrounds, icon wells |
| `brand-yellow` / `warning` / `warning-soft` | Needs attention, "your turn" |
| `brand-red` / `danger` / `danger-soft` | Destructive actions, errors, disputes |
| `info` / `info-soft` | Neutral informational notices |
| `page` | Page background (`bg-page`) |
| `surface` / `surface-2` | Cards and bars / inset wells |
| `line` / `line-strong` | Borders / hover borders |
| `ink` / `ink-2` / `ink-3` | Primary / secondary / muted text |

Accents (`[data-accent]`) only remap the `brand-green*` triplets and `--app-bg`; dark mode remaps surfaces and text.

## Typography

Fraunces for display and headings (`font-display`), Inter for everything else.

| Class | Size / leading | Use |
|---|---|---|
| `text-display` | 36px / 1.1 | Marketing hero only |
| `text-h1` | 28px / 1.15 | Page title (one per page) |
| `text-h2` | 22px / 1.2 | Big section titles |
| `text-h3` | 18px / 1.3 | Card and section headings |
| `text-body` | 15px / 1.5 | Body (also the `body` default) |
| `text-small` | 13px / 1.45 | Secondary copy, metadata |
| `text-caption` | 12px / 1.4 | Hints, timestamps |
| `text-label` | 11px, tracked, uppercase | Eyebrows and stat labels (`font-semibold uppercase text-ink-3`) |

Headings are `font-display font-medium text-brand-green-deep`. Body text is `text-ink`; secondary `text-ink-2`; muted `text-ink-3`.

## Spacing

Tailwind's 4px scale. Page gutters `px-4 sm:px-5 lg:px-8`; vertical page padding `py-5 lg:py-8`. Section gap `gap-6` (24px); inside a card `gap-4`; between list rows `gap-3`. Content max widths: forms and detail pages `max-w-3xl`, lists `max-w-5xl`, dashboards `max-w-6xl`.

## Radius

`rounded-sm` 6 · `rounded` 8 · `rounded-md` 10 · `rounded-lg` 12 (fields, buttons) · `rounded-xl` 14 · `rounded-2xl` 16 (cards, modals) · `rounded-3xl` 20 (nav capsule, sheets) · `rounded-full` (pills, avatars). Nothing else.

## Shadows

`shadow-card` (cards at rest) · `shadow-raised` (menus, hover lift, toasts) · `shadow-modal` (dialogs) · `shadow-focus` (focus ring). No other shadows.

## Motion

From `config/motion.ts`: `DURATION.fast|base|slow|page` and `EASE.standard|emphasized|exit`. Tailwind animations: `animate-fade-in`, `animate-fade-up`, `animate-scale-in`, `animate-sheet-up`, `animate-shimmer`. Route changes use `.page-enter`. Press feedback is `active:scale-[0.98]`.

## Components (`components/ui`)

- `Button` — `variant` primary | secondary | tertiary | destructive | link; `size` sm | md | lg; `fullWidth`; `loading`. Icons go inside as children (lucide, 16–18px).
- `Card` — `padding` none | sm | md | lg; `tone` default | brand | success | warning | danger; `hover`; `elevated`; `deep`.
- `Input`, `Select`, `Textarea`, `PasswordInput` — `label`, `hint`, `error`, `icon` (Input), always 44px tall.
- `Modal` — bottom sheet on phones, dialog from `sm`. `title`, `description`.
- `PageHeader` — `title`, `subtitle`, `eyebrow`, `actions`, `back`. `SectionHeader` for in-page sections.
- `Tabs` — segmented control with optional counts.
- `ListRow` — tappable rows for menus and settings (`Card padding="none"` around a stack of rows).
- `Avatar`, `StatusBadge`, `EmptyState`, `Toast` (`useToast().push`), `Skeleton` (`Bone*`, `Skeleton*`, `SkeletonRegion`).

Domain components (`components/domain`) compose these; they never define their own colours.

## Page anatomy

```
<PageHeader title subtitle actions />
<ActionNeededBanner … />           // only on order/request screens
<section>…cards / lists…</section>
```

Lists: `Card hover onClick` rows in a `flex flex-col gap-3`. Grids: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`. Tables (admin): wrap in `overflow-x-auto`, header `text-label`, rows `border-b border-line`, hover `bg-surface-2`.

## Accessibility

Semantic elements, labels tied to fields (`Input` generates ids), `role="alert"` on errors, `aria-busy` skeleton regions, visible focus (`focus-visible:shadow-focus`), 4.5:1 text contrast on surfaces, hidden panels made `inert`.
