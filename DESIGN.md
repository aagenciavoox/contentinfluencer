# Design System

Content OS uses a token-based design system. Pages compose with shared UI primitives and CSS variables from `src/styles/index.css`.

## Core components

| Component | Path | Use for |
|-----------|------|---------|
| **Text** | `src/components/ui/Text.tsx` | All typography — see hierarchy below |
| **EmptyState** | `src/components/ui/EmptyState.tsx` | Empty lists — use `compact` on mobile |
| **Skeleton** | `src/components/ui/Skeleton.tsx` | Loading placeholders — `SkeletonList`, `SkeletonCard`, `SkeletonRow` |
| **Surface** | `src/components/ui/Surface.tsx` | Cards and panels — `plain`, `outlined`, `interactive`, `elevated` |
| **Badge** | `src/components/ui/Badge.tsx` | Status pills, tags, neutral chips — pass `status` prop with pipeline label for tinted status |
| **AppButton** | `src/components/ui/AppButton.tsx` | Buttons — `variant="primary" \| "secondary" \| "ghost"` |
| **OperationalList** | `src/components/ui/OperationalList.tsx` | Eyebrow + list + “ver tudo” footer (dashboard-style lists) |
| **ContentRow** | `src/components/ui/ContentRow.tsx` | Título + meta + seta para linhas clicáveis em listas operacionais |
| **Section** | `src/components/ui/Section.tsx` | Seção com `sectionTitle`, descrição opcional e ação à direita |
| **PaginationBar** | `src/components/ui/PaginationBar.tsx` | Paginação — `variant="full"` (numerada) ou `simple` (mobile) |
| **ToolbarSearchInput** | `src/components/ui/ToolbarSearchInput.tsx` | Campo de busca em toolbars e `FilterBar` |
| **SegmentTabs** | `src/components/ui/SegmentTabs.tsx` | Tabs segmentadas em toolbars |
| **MediaCard** | `src/components/ui/MediaCard.tsx` | Capa/thumbnail para grids de catálogo |
| **MobileSectionHeader** | `src/mobile/components/MobileSectionHeader.tsx` | Cabeçalho in-card em telas mobile |

### Spacing & layout utilities

Prefer stack/grid classes (backed by `--space-*`) over ad-hoc `gap-5` / `space-y-5`:

| Utility | Gap | Use for |
|---------|-----|---------|
| `stack-sm` … `stack-2xl` | 8–32px | Seções verticais |
| `inline-stack-sm/md` | 8–12px | Linhas de toolbar |
| `grid-content` | 1→4 cols | Cards de conteúdo |
| `grid-catalog` | 3→7 cols | Capas da biblioteca |
| `grid-form` | 1→2 cols | Campos de formulário |
| `grid-metrics` | 2 cols | Métricas do dashboard |

Layout widths via `PageLayout contentWidth`: `narrow` 1440px, `wide` 1600px, `book` 840px, `full` padding only.

Vertical rhythm via `PageLayout contentStack` (auto by variant if omitted):
- `operational` → `stack-2xl` (32px) — default for list/dashboard pages
- `settings` → `stack-xl` (24px) — auto when `variant="settings"`
- `dense` → `stack-lg` (16px) — detail pages (ProjectDetail, BookDetail)
- `none` — full-bleed (Calendar, Programação)

| Utility | Gap / layout | Use for |
|---------|----------------|---------|
| `grid-dashboard` | 3 cols xl | Dashboard operational lists |
| `grid-cards-row` | 2→3 cols | Deadline cards, compact rows |
| `grid-book-hero` | sidebar + content | Book detail hero |
| `grid-metrics-3` | 3 cols | Mobile 3-up metrics |

Control heights: `--control-height` 40px desktop, `--control-height-mobile` 44px.

Do **not** use raw `<h1>`/`<h2>`/`<h3>`, `notion-title`, `button-primary`, or arbitrary Tailwind sizes like `text-[13px]`.

### Typography hierarchy

Use `Text` variants in this order of visual weight (highest → lowest):

| Variant | Use for |
|---------|---------|
| `display` | Hero editorial (ex.: Dashboard “Hoje”) |
| `pageTitle` | Título de página (`DesktopPageHeader`, detalhe de conteúdo) |
| `spotlightTitle` | Destaque em cards (ex.: bloco “Próximo passo”) |
| `sectionTitle` | Cabeçalho de seção dentro da página |
| `itemTitle` | Título de item em listas e cards |
| `body` / `bodyStrong` | Parágrafos e ênfase inline |
| `secondary` / `meta` | Texto auxiliar |
| `eyebrow` | Rótulo de zona (uppercase, 11px) — acima de grupos de conteúdo |
| `label` | Labels de formulário e navegação secundária |

**Regra:** `eyebrow` nomeia a *categoria*; `sectionTitle` nomeia a *seção*; `itemTitle` nomeia cada *item*. Inputs editáveis de título podem usar a classe `t-page-title` diretamente (exceção no lint).

### Interactive affordances

All clickable primitives must include keyboard focus:

```tsx
focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]
```

Applies to `AppButton`, `Surface` (interactive), `ListItem`, `IconButton`, and raw `<button>`/`<a>` in feature code. Never nest `<button>` inside `<button>`.

## Key tokens

### Surfaces & text
- `--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--bg-hover`, `--surface-subtle`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--border-color`, `--border-strong`

### Radius
- `--radius-sm` (8px), `--radius-md` (12px), `--radius-card`, `--radius-input`, `--radius-pill`

### Typography (CSS classes)
- `.t-page-title`, `.t-section-title`, `.t-item-title`, `.t-body`, `.t-meta`, `.t-label`

### Focus & motion
- `--focus-ring` — unified focus shadow (buttons, inputs)
- `prefers-reduced-motion` — CSS transitions disabled globally; `MotionConfig reducedMotion="user"` in `AppProviders`

### Semantic colors
- `--accent`, `--success`, `--warning`, `--danger`, `--info`
- `--accent-blue`, `--accent-purple`, `--accent-pink`, `--accent-orange`, `--accent-green`

### Content pipeline status
- Tokens: `--status-idea`, `--status-writing`, `--status-ready`, `--status-recorded`, `--status-editing`, `--status-edited`, `--status-scheduled`, `--status-posted`
- CSS classes: `.status-pill-{token}`, `.status-calendar-{token}`
- Helpers: `getStatusClassName()`, `getStatusChipClass()` in `src/lib/statusClasses.ts`

## Lint

```bash
npm run lint:design
```

Checks for banned patterns: `font-black`, arbitrary `text-[Npx]`, `button-primary`, hard-coded gray/white surfaces, legacy tracking, `notion-title`, and raw `t-section-title` / `t-page-title` on non-input elements. Exceptions: `Text.tsx`, editable title inputs in `ContentDetailHeader.tsx` / `ContentOperationalPanel.tsx`.

Run before finishing UI work. Full check: `npm run check`.

## Exceptions

**BurstMode** teleprompter themes (`BurstModeExperience`, `BurstModeMobileScreen`) may use custom hex colors for recording UX.
