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
- BurstMode teleprompter themes are the only exception for custom hex colors.
- Never use PowerShell bulk `WriteAllText` on `src/`. Use an editor or Node with explicit UTF-8 encoding.
- Run `npm run lint:design` before finishing UI work.

## Changes and validation

- Follow existing conventions and keep changes focused on the requested task.
- Check related desktop/mobile behavior and existing tests.
- App and MCP contain duplicated business rules. When changing a rule used by both, check the corresponding implementation in `mcp/src/`.
- Run checks appropriate to the change. Report failures or checks that could not run.
- Finish with a concise summary of changes, validation, and unresolved issues.