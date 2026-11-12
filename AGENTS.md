# Project instructions

## Stack and structure

- Vite + React + TypeScript + React Router + Supabase client.
- Business logic and pages live in `src/features/<domain>/`.
- `src/pages/` contains legacy re-export wrappers. Follow the re-export to find the implementation.
- Global state and persistence live in `src/context/`.
- Shared data access lives in `src/lib/`.
- Desktop and mobile share routes. Check `useIsMobile()` branches and the relevant `src/mobile/screens/` implementation when changing a shared flow.

## Context and file reading

- Start with the files, symbols, and behavior directly related to the task.
- Search for symbols and read relevant sections before opening large files in full.
- Expand to dependencies, callers, and tests as needed to understand the behavior.
- Do not scan the entire repository or repeat the architecture mapping unless requested.
- Avoid reading generated builds, installed dependencies, temporary copies, logs, database dumps, and old audits unless relevant to the task.
- Treat `database.ts`, `BookDetailPage.tsx`, `CreationHubPage.tsx`, and `AppContext.tsx` as large files: locate the relevant sections first.
- Keep command output focused. Avoid dumping entire directories or large search results into the conversation.

## Graphify

- A knowledge graph is available at `graphify-out/`.
- For architecture questions, consult the relevant graph or wiki sections first.
- Read `graphify-out/GRAPH_REPORT.md` when a broad architecture overview is needed.
- If `graphify-out/wiki/index.md` exists, use it to locate relevant documentation.
- For cross-module relationships, prefer targeted commands:
  - `graphify query "<question>"`
  - `graphify path "<A>" "<B>"`
  - `graphify explain "<concept>"`
- Use the graph to locate code. Verify implementation details in the relevant source files before editing.
- After modifying code, run `graphify update .` once before finishing. If unavailable or unsuccessful, report it.
- Use the current graph directly under `graphify-out/`. Ignore dated backup folders unless historical analysis is explicitly requested.
- Query `graph.json` through Graphify commands or targeted scripts. Do not load the entire JSON into the conversation.
- Exclude `graphify-out/` from general source-code searches. Consult its current artifacts separately when needed.

## Design system

- Use `Text`, `Surface`, `Badge`, and `AppButton` for typography, surfaces, badges, and buttons.
- Use CSS tokens from `src/styles/index.css`.
- **Page shell & headers:**
  - Wrap pages in `PageLayout` and use `DesktopPageHeader` for desktop headers (use `titleContent` when custom badges/metadata sit below the title).
  - Never add manual `px-4`, `pt-*`, or `pb-28` inside `PageLayout.mobileHeader` or mobile children of `PageLayout`; `PageLayout` and `MobileAppShell` already own horizontal gutters and bottom safe-area spacing.
- **Toolbars & Law of Proximity:**
  - Use `PageToolbar` with its semantic slots (`leading`, `search`, `chips`, `filters`, `view`, `sort`). Do not mix filter controls inside the `view` slot.
  - Keep search inputs, filters, and section actions ("Editar", "Configurar") visually adjacent to the list or card they control.
- **Button hierarchy & ordering:**
  - Keep a single primary CTA (`AppButton variant="primary"`) per screen context; use `variant="secondary"` or `variant="ghost"` for secondary and empty-state actions when the header already has a primary CTA.
  - In header `actions`, place the primary CTA first and `MoreMenu` last (far right).
  - In form/dialog footers, place `Cancelar` (`variant="secondary"`) on the left and `Salvar`/`Criar` (`variant="primary"`) on the right.
- **Forms, cards & grids:**
  - Style text/number/date/time/url inputs and textareas with `.input` (or `.ds-input`), using `--border-input`, `--radius-input`, and `--control-height`. Always pair form controls with a visible `<label>` (`htmlFor` + `id`).
  - Use `SelectField` or `TagSelect` instead of native `<select>`.
  - Use `SettingsSectionCard` or `Surface` (`outlined`, `interactive`, `info`, `subtle`) instead of ad-hoc card `<div>` wrappers, and avoid nesting `bg-[var(--bg-elevated)]` inside `bg-[var(--bg-elevated)]`.
  - Use the 8px spacing scale (`stack-xs/sm/md/lg/xl/2xl`) and canonical grid classes (`.grid-content`, `.grid-form`, `.grid-editor`, `.grid-metrics`, `.grid-metrics-3`). Never use orphan spacing classes (`p-5`, `gap-5`, `m-5`, `gap-10`, `space-y-*`).
- **Mobile Standard & Desktop Isolation:**
  - Strict desktop isolation: never alter desktop styles, classes or behaviors when improving mobile; keep mobile changes scoped to `isMobile` / `celular` branches or `html.mobile-app-shell`.
  - Single header authority: `MobileAppShell` owns the mobile top bar (`MobileHeaderIOS`). Never render secondary back buttons, title bars or breadcrumbs inside mobile page content.
  - Action hierarchy: maximum of one primary CTA per mobile screen context; never duplicate "+ Novo..." buttons in inner section headers when the screen already has an action button or bottom nav `+`.
  - List row ergonomics: title must retain at least 65% of horizontal space; secondary actions (reorder arrows, full dates) belong in `MoreMenu` or a secondary metadata line.
  - Search & filters: search input must take `flex-1`; filter buttons in the same row must be compact/icon-based, opening in `BottomSheetModal`.
  - Non-invasive editor & clean focus: floating toolbars in `RichTextEditor` must show only on focus/selection, with hidden scrollbars (`scrollbar-none`); mobile focus mode (`isFullscreen`) must never render the 3-row desktop toolbar.
  - Smooth tab scrolling: multi-tab segments with medium/long labels must use `.mobile-h-scroll` / `scrollbar-none` to prevent truncation and squishing.
- BurstMode teleprompter themes are the only exception for custom hex colors.
- Never use PowerShell bulk `WriteAllText` on `src/`. Use an editor or Node with explicit UTF-8 encoding.
- Run `npm run lint:design` before finishing UI work.

## Changes and validation

- Follow existing conventions and keep changes focused on the requested task.
- Check related desktop/mobile behavior and existing tests.
- App and MCP contain duplicated business rules. When changing a rule used by both, check the corresponding implementation in `mcp/src/`.
- Run checks appropriate to the change. Report failures or checks that could not run.
- Finish with a concise summary of changes, validation, and unresolved issues.

## Economia de uso (regra da Anne)

Estas regras valem para todo assistente e têm prioridade sobre a seção Graphify acima:

- Não rode o `graphify` (nem `graphify update .`) e não regenere o `graphify-out/`, a menos que a Anne peça.
- Não leia o repositório inteiro a cada tarefa. Leia só os arquivos da tarefa: localize com `git grep` e abra apenas os trechos relevantes. Aproveite o que já sabe do projeto.
- Rode `npx tsc --noEmit`, `npm test` e `npm run build` uma vez, no fim de cada pacote de mudanças, e não a cada passo.
