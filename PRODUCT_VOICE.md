# Product Voice - Core Creator

Core Creator helps creators remember, organize, and choose. It does not shame, rush, or measure a creator's worth by output.

## North Star

The system offers calm options. It does not issue commands.

Use:
- "Talvez útil hoje"
- "Caminhos possíveis"
- "Disponível para gravação"
- "Data combinada"
- "Para lembrar"
- "Pode ser retomado"
- "Sem pressa"

Avoid:
- "Atrasado"
- "Falhou"
- "Urgente"
- "Pendente" as a visible user-facing label when "Em aberto" works
- "Você precisa"
- "Performance ruim"
- "Meta não batida"

## Product Rules

1. Suggestions are optional.
   Every proactive surface should be dismissible, toggleable, or framed as a possibility.

2. Numbers are useful, not mandatory.
   Counts can help orientation, but users must be able to hide them when they want a lighter dashboard.

3. Real deadlines are separate from wishes.
   Stronger emphasis belongs only to external commitments, brand work, paid work, or explicitly dated agreements.

4. Analytics produce learning, not judgment.
   Prefer "resposta do público", "leitura editorial", and "aprendizados" over language that ranks the creator.

5. The system remembers context.
   It should say what is available and where it lives, not imply that the creator is behind.

## Copy Patterns

Instead of "3 roteiros atrasados":
"3 roteiros podem ser retomados quando fizer sentido."

Instead of "Você precisa postar hoje":
"Há uma data guardada para hoje."

Instead of "Sem posts neste pilar":
"Este pilar ficou mais quieto neste período."

Instead of "Prioridades imediatas":
"Caminhos possíveis."

Instead of "Fila de gravação":
"Itens de gravação" or "disponíveis para gravar."

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

## Copy Rules (R1–R5)

Full review with before/after examples: `UX_COPY_REVIEW.md`.

**R1. One name per thing.**
- **Ideia**: before it becomes a script.
- **Roteiro**: any editorial item after the idea, at any stage (writing, recording, publishing).
- **Criação**: only the area name (Ideias + Roteiros), never an item ("Mover este roteiro para a lixeira", not "esta criação").
- **Vídeo**: only what was already published ("Vídeo publicado"). Never an item in the queue, block or grid.
- **Publicado**: the final stage (since 28/10/2026). Use "publicado / publicação / registrar publicação", not "postado / postagem / já postei". "Horários de postagem" stays.
- **Conteúdo**: only in the abstract sense ("Potencial de conteúdo"). Never an item ("Novo conteúdo", "Objetivo do conteúdo", "Puxar conteúdo").
- **Anotação**: a note on a library work. Do not call the same thing "nota". **Nota** is only the rating ("meia nota").
- **Rascunho**: only the side panel next to the script. The planning card is always **post-it**.
- **Conta de referência**: the account whose date counts in the grade. Not "rede de referência", "conta base" or "destino".
- **Grade**: only the editorial grade. Do not use it for a layout of cards.
- **Template**: use "template" throughout; do not switch to "modelo" in the same screen or sentence.

**R2. One label per action.**

| Action | Label | Do not use |
|---|---|---|
| Ideia → roteiro | Transformar em roteiro | Promover para roteiro, Virar roteiro |
| Obra ou anotação → ideia | Transformar em ideia | Virar ideia |
| Obra ou anotação → roteiro | Criar roteiro | Criar conteúdo, Virar conteúdo |
| Marcar gravação | Marcar como gravado | Marcar gravado, Gravado |
| Abrir teleprompter | Iniciar modo gravação | Abrir modo gravação |
| Começar a gravar a partir de Hoje | Gravar agora | Iniciar sessão |
| Criar bloco de gravação | Criar bloco | Montar bloco |
| Pôr roteiro num bloco | Adicionar ao bloco | Guardar em um bloco, Salvar no bloco |
| Marcar que saiu | Marcar como publicado / Registrar publicação | Marcar como postado, Registrar postagem, Já postei |
| Trazer ideia ou roteiro para o Planejamento | Puxar da Criação | Puxar conteúdo |
| Baixar documento | Baixar em Word | Exportar DOCX |
| Livro em destaque em Hoje | Definir como livro atual | Definir como principal no mobile, Fixar como principal |
| Repetir após erro | Tentar novamente | Tentar de novo |
| Busca | Buscar | Procurar |
| Recuperável | Mover para a lixeira | — |
| Apagar de vez | Excluir / Excluir definitivamente | Remover (para exclusão) |
| Tirar de um lugar sem apagar | Remover de… (Remover do bloco) | — |

**R3. Buttons: verb + object.** "Criar template", not "Criar". The verb alone is fine only when the object is in the title of the same form and there is no other primary button nearby.

**R4. Sentence case.** Only the first letter is uppercase in code ("Novo evento", "Detalhes técnicos", "Looks e cenários"). Use "e", not "&", in labels. If the design wants caps, use CSS `uppercase`.

**R5. Describe the benefit, not the implementation.** Say what the person gets, not how the screen is built. Avoid "modal", "composer", "camada mobile", "catálogo único com tags", IDs, "\n", "entidades", "assets", "thumb". Errors never mention the backend vendor ("Supabase"); say what happened and what to do ("… Tente novamente.").

Raw error text (database, network) never reaches the screen. `getErrorDetail` in `src/lib/saveFeedback.ts` only passes on a `UserFacingError`; throw one when the message was written for the person to read.

**R6. Say it once.** A screen does not repeat what its title, its active tab or a filter already says. No subtitle that restates the title, no count that the tab already shows, no label repeated on every row when the value is empty or the same for all (show "—", hide the field, or say it once above the list). Gentle phrases ("quando fizer sentido") lose their effect when they appear everywhere; keep them to Hoje and the pause mode.

**Typography.** Ellipsis is one character (`…`). Sort labels use an en dash ("Título A–Z"). Example placeholders start with "Ex.:". Plurals are two full strings (singular and plural), not ternaries inside a word.

## Glossary (PT-BR UI)

Prefer these terms in user-facing copy. Shared constants live in `src/lib/uiCopy.ts`.

| Concept | Use | Avoid |
|---|---|---|
| Lista editorial | Roteiros | Pipeline, Conteúdos |
| Item individual | Roteiro | Conteúdo, criação, vídeo (para item) |
| Referências | Biblioteca | Acervo (nav primária) |
| Nota de obra | Anotação | Nota |
| Sessão em lote | Bloco de gravação | — |
| Modo teleprompter | Modo gravação | Modo Explosão, Teleprompter (rótulo) |
| Texto que rola sozinho | Rolagem automática | Teleprompter, leitura estática, rolagem assistida |
| Seções de Configurações | Tom do app | Ritmo (é a capacidade semanal do Editorial) |
| Ideia → roteiro | Transformar em roteiro | Promover para roteiro, Virar roteiro |
| Busca | Buscar | Procurar |
| Primeira tela do dia | Hoje | Home |
| Regras editoriais | Ritmo Editorial | Regras de Ouro (nav primária) |
| Status de etapa | Em aberto | Pendente (rótulo visível) |
| Folga no ciclo do pilar | Espaço no ciclo | Gap, faltam |
| Sem conexão com o backend | Sem conexão com o servidor | Conecte o Supabase |

Confirmations should name the action and consequence (`Excluir pilar` / `Manter pilar`), not generic `Confirmar`.
