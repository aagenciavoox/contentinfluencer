## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Design system

- Pages compose with Text, Surface, Badge, AppButton only for typography/surfaces/buttons/badges
- Use CSS tokens from src/styles/index.css (--radius-card, --bg-elevated, etc.)
- Never use PowerShell bulk WriteAllText on src/ - use Node with utf8 or editor
- Run npm run lint:design before finishing UI work
- BurstMode teleprompter themes are the only exception for custom hex colors
