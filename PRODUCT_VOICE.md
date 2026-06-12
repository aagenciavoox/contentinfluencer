# Product Voice - Core Creator

Core Creator helps creators remember, organize, and choose. It does not shame, rush, or measure a creator's worth by output.

## North Star

The system offers calm options. It does not issue commands.

Use:
- "Talvez util hoje"
- "Caminhos possiveis"
- "Disponivel para gravacao"
- "Data combinada"
- "Para lembrar"
- "Pode ser retomado"
- "Sem pressa"

Avoid:
- "Atrasado"
- "Falhou"
- "Urgente"
- "Pendente" as a visible user-facing label when "Em aberto" works
- "Voce precisa"
- "Performance ruim"
- "Meta nao batida"

## Product Rules

1. Suggestions are optional.
   Every proactive surface should be dismissible, toggleable, or framed as a possibility.

2. Numbers are useful, not mandatory.
   Counts can help orientation, but users must be able to hide them when they want a lighter dashboard.

3. Real deadlines are separate from wishes.
   Stronger emphasis belongs only to external commitments, brand work, paid work, or explicitly dated agreements.

4. Analytics produce learning, not judgment.
   Prefer "resposta do publico", "leitura editorial", and "aprendizados" over language that ranks the creator.

5. The system remembers context.
   It should say what is available and where it lives, not imply that the creator is behind.

## Copy Patterns

Instead of "3 conteudos atrasados":
"3 conteudos podem ser retomados quando fizer sentido."

Instead of "Voce precisa postar hoje":
"Ha uma data guardada para hoje."

Instead of "Sem posts neste pilar":
"Este pilar ficou mais quieto neste periodo."

Instead of "Prioridades imediatas":
"Caminhos possiveis."

Instead of "Fila de gravacao":
"Itens de gravacao" or "disponiveis para gravar."

## Implementation Notes

The default experience is gentle and lives in `src/features/settings/lib/gentleExperience.ts`.

When adding a new dashboard, alert, empty state, metric, or proactive suggestion, check whether it should respect:
- `enabled`
- `calmSuggestions`
- `pauseMode`
- `dashboardCounts`
- `realDeadlineHighlights`

Preference readers should be tolerant of old or malformed saved values. If a setting is missing or not a boolean,
fall back to the gentle default instead of letting a broken preference make the interface harsher.
