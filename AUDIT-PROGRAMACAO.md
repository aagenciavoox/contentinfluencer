# Auditoria — Tela "Programação"

> Calendário de agendamento com drag-and-drop para vídeos gravados/editados, com regras de ouro e horários visíveis, vinculado ao calendário editorial oficial.
> Data: 2026-06-12

## 1. Resumo do veredito

**Viável com alto reuso.** ~70% da tela já existe em componentes e lógica prontos. O único bloco realmente novo é o drag-and-drop (não existe DnD em lugar nenhum do app) e a faixa de regras de ouro dentro do calendário (a validação existe, mas só é usada no Dashboard e em Configurações).

O "vínculo com o calendário oficial" é automático: ambos leem `state.contents` (publishDate/publishTime) e `state.agendaItems`. Se a Programação gravar nesses mesmos campos via `UPDATE_CONTENT`, o Calendário Editorial reflete sem nenhuma sincronização extra.

## 2. O que já existe (reuso direto)

| Necessidade | Já existe | Onde |
|---|---|---|
| Vídeos "gravados e editados" | Statuses `Gravado`, `A Editar`, `Editado` | `contentPipeline.ts` (`CONTENT_STATUS`) |
| Status "Programado" automático | `getPostingAutomationStatus()` — vira `Programado` quando publishDate é futura | `contentPipeline.ts` |
| Grade de calendário mês/semana | `MonthlyCalendarView`, `CalendarWeekView`, `buildCalendarEntries()` + `CalendarEntry` | `editorial-calendar/` |
| Horários cadastrados por dia | `getPostingTimes()`, `getTimesForDay()` (até 3 por dia da semana) | `settings/lib/postingTimes.ts` |
| Chips de horário | `PostingTimeSuggestions` | `settings/components/` |
| Regras de ouro + validação semanal | `GoldenRule` + `validateWeeklyContent()` → `Violation[]` (warning/info) | `utils/goldenRules.ts` |
| Visualizar roteiro (read-only) | `MobileScriptReader` (renderiza HTML do script) | `mobile/components/` |
| Legendas por plataforma | `Content.plataformas[]` (legenda, hashtags, publishDate, publishTime) | `database.ts` |
| Preview rápido + trocar data | `ContentQuickPreview` (já tem `onMove(date)`) | `editorial-calendar/modals/` |
| Persistência | `dispatch UPDATE_CONTENT` → `persistAction` → Supabase | `context/` |
| Navegação ao detalhe | `buildContentDetailRoute()` | `contents/lib/` |
| Datas por entrada de calendário | `Content.publishDate` + `publishTime` (e por plataforma) | `database.ts` |

## 3. O que falta (a construir)

1. **Rota e navegação** — `/programacao` em `AppRoutes.tsx` + item no sidebar desktop e (decidir) no mobile nav. Não existe.
2. **Drag-and-drop** — Nenhuma lib de DnD instalada e nenhum uso de HTML5 DnD no código. Recomendação: HTML5 nativo (`draggable` + `onDragOver`/`onDrop` por célula de dia). Evita dependência nova; o caso de uso (card → célula) é simples. Mobile não tem drag confiável → fallback: tocar no card → "Agendar" → escolher dia/horário (bottom sheet, padrão já usado no app).
3. **Painel de backlog ("prontos para programar")** — Lista lateral de conteúdos com status `Gravado`/`Editado` **sem** `publishDate` (ou com data passada), arrastáveis para o calendário. Não existe equivalente.
4. **Faixa de regras de ouro no calendário** — `validateWeeklyContent()` já calcula violações por semana, mas nenhuma view de calendário a consome. Construir: chamada por semana visível + indicador na linha da semana (ex.: badge âmbar com tooltip listando violações). Importante: a validação é **semanal** (`weekStart`), então a visão semanal é o encaixe natural; na mensal, rodar 1x por linha de semana.
5. **Horários no topo** — Na visão semanal, cabeçalho de cada coluna de dia mostra os horários de `getTimesForDay()` como slots. Estado visual: slot preenchido (já tem post naquele horário) vs vazio. É isso que responde "estou seguindo o dia?". Não existe.
6. **Modal de visualização read-only** — Ao clicar num item programado: roteiro (via `MobileScriptReader` ou `htmlToReadableText`) + legendas/hashtags por plataforma, **sem edição** (requisito explícito). O `ContentQuickPreview` atual mostra só um trecho do script e não mostra legendas → criar variante ou estender.
7. **Ação de drop** — Ao soltar: gravar `publishDate` do dia alvo; se o dia tem horário cadastrado livre, sugerir/aplicar o primeiro; status → `getPostingAutomationStatus()` (vira `Programado`); persistir com `UPDATE_CONTENT`. Reagendar = mesmo fluxo a partir de um item já no calendário.

## 4. Regras de negócio propostas

- **Entram no backlog:** status ∈ {`Gravado`, `Editado`} sem data futura. Decidir se `A Editar` aparece como "em produção" (visível mas não arrastável) ou fica de fora.
- **Aparecem no calendário:** status ∈ {`Programado`, `Postado`} + os com publishDate. `Postado` não é arrastável.
- **Drop em dia sem horário cadastrado:** permitido, mas com aviso visual (chip "sem horário definido") — os horários são sugestão, não trava (consistente com o resto do app).
- **Capacidade do dia:** máx. 3 horários/dia em `postingTimes` → se todos ocupados, drop ainda funciona mas o slot fica marcado como "acima do planejado" (vira insumo visual junto das regras de ouro).
- **Regras de ouro:** mostrar `warning` (condicao `impedir`) com destaque forte e `info` discreto. Não bloquear o drop — avisar (o `validateWeeklyContent` atual já diferencia os dois tipos).

## 5. Plano de implementação (fases)

**Fase 1 — Estrutura (sem DnD):** rota `/programacao`, página com visão semanal reutilizando a lógica de `buildCalendarEntries` filtrada (camada `posts` apenas), cabeçalho com horários por dia, painel de backlog estático. Agendar via clique (selecionar conteúdo → clicar no dia). *Já é utilizável e desbloqueia o mobile.*

**Fase 2 — Drag-and-drop:** HTML5 DnD nos cards do backlog e nos itens já programados; drop targets nas células de dia (e nos slots de horário na semanal); feedback visual de hover/válido.

**Fase 3 — Regras de ouro + leitura:** faixa de violações por semana via `validateWeeklyContent`; modal read-only de roteiro + legendas.

**Fase 4 — Polimento:** estados vazios, undo após drop (toast "desfazer"), atalho para o item no Calendário Editorial e vice-versa (link no `CalendarCommandBar` do editorial para `/programacao`).

Estimativa de esforço relativo: Fase 1 ≈ 40%, Fase 2 ≈ 25%, Fase 3 ≈ 20%, Fase 4 ≈ 15%.

## 6. Riscos e pontos de atenção

- **`publishTime` pode não existir no banco:** `database.ts` tem fallback explícito para coluna `publish_time` ausente (`isMissingPublishTimeColumn`). Antes da Fase 1, confirmar que a migração rodou — a tela depende muito de horário.
- **Datas com `T12:00:00.000Z` fixo:** o padrão atual grava meio-dia UTC e o horário vive separado em `publishTime`. A Programação deve seguir o mesmo padrão para não divergir do resto do app.
- **Duas fontes de data:** `Content.publishDate` vs `plataformas[].publishDate`. O calendário editorial prioriza a da plataforma. Decidir: o drop atualiza só a principal, ou propaga para todas as plataformas (como `PublishingSection` já faz)? Recomendado: propagar, mantendo consistência.
- **Validação semanal usa `weekStart` implícito:** garantir que o mesmo `startOfWeek` (locale ptBR, segunda?) seja usado na tela e na validação — hoje o Dashboard usa o default do date-fns (domingo). Conferir antes de exibir.
- **Erros de `tsc` pré-existentes** no repo (ContentsPage, EditorialCalendarPage etc.) podem mascarar erros novos — vale corrigir os do caminho crítico antes.

## 7. Decisões em aberto (para você)

1. Visão padrão: **semanal** (recomendado — horários e regras de ouro são semanais) ou mensal?
2. `A Editar` aparece no backlog (não arrastável) ou fica de fora?
3. Drop atualiza a data de todas as plataformas ou só a principal?
4. A tela substitui a camada "posts" do Calendário Editorial ou convive com ela? (Recomendado: convive — editorial é visão geral, Programação é operação.)
