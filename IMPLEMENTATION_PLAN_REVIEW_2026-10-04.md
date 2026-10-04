# Plano de implementação — correções do code review (Editorial e carregamento)

**Data:** 2026-10-04
**Origem:** code review do working tree feito em 2026-10-03 (152 arquivos alterados; foco em dados e estado, migration de funil e tela Editorial).
**Relação com outros planos:** corrige partes da Fase 1 de [`IMPLEMENTATION_PLAN_2026-10-03.md`](IMPLEMENTATION_PLAN_2026-10-03.md) (status por domínio e pedidos repetidos). Todo texto novo segue [`UX_COPY_REVIEW.md`](UX_COPY_REVIEW.md).

---

## Coordenação

- O working tree continua mudando. `EditorialPage.tsx` e `navConfig.ts` foram editados depois do review. Os números de linha abaixo foram conferidos em 2026-10-04.
- **Item 9 do review já está resolvido** e fica fora deste plano. O menu ficava sem destaque em `/editorial/*`, mas agora o `Sidebar` usa `isNavItemActive`, que cobre `/editorial/*`.
- **Commit:** a Fase 1 corrige código que ainda não foi commitado, então deve entrar antes ou junto do commit do trabalho atual. As Fases 2 a 4 podem ir em commits separados.

---

## Ordem e tamanho

| Fase | Tema | Itens do review | Gravidade | Tamanho | Bloqueia o commit? |
|---|---|---|---|---|---|
| 0 | Migration no banco | nota | 🟠 | XS | Bloqueia o deploy |
| 1 | Integridade de dados | 1, 2, 6 | 🟠 | M | Sim |
| 2 | Leitura do funil | 3 | 🟡 | S | Precisa de decisão |
| 3 | Editorial: hashtags, pilares, frequência, validação | 4, 5, 7, 10 | 🟡 | M | Não |
| 4 | Ritmo sem regex sobre o texto | 8 | 🟢 | M | Não |

---

## Fase 0 — Migration no banco

### Problema
Sem a migration `20261003120000_editorial_funnel.sql`, o código cai no fallback e salva sem os campos novos. Funil e energia padrão parecem salvos e somem ao recarregar.

### Mudança
Aplicar a migration no Supabase antes do deploy e conferir:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('series', 'funil_padrao'),
    ('series', 'energia_padrao'),
    ('contents', 'funil')
  );
```

### Aceite
- A consulta devolve 3 linhas.
- Definir funil e energia numa série, recarregar a página: os valores continuam lá.

---

## Fase 1 — Integridade de dados

### 1.1 Coluna ausente não é o mesmo que valor recusado (review #1)

**Problema.** `isMissingFunnelColumn` (`src/lib/database.ts:555`) trata como "coluna ausente" qualquer erro cuja mensagem contenha `funil` ou `energia_padrao`. As colunas novas têm CHECK, e o Postgres dá às regras os nomes `contents_funil_check`, `series_funil_padrao_check` e `series_energia_padrao_check`. Quando o banco recusa um valor, o código salva de novo sem o campo (`:1700` e `:1914`) e mostra "salvo".

**Mesmo risco nos helpers antigos.** `isMissingWritingNotesColumn` (`:543`) e `isMissingCreationColumn` (`:547`) usam a mesma busca por texto. Hoje essas colunas não têm CHECK, mas qualquer erro de FK, NOT NULL ou de uma regra futura que cite a coluna também faria o campo sumir sem aviso.

**Mudanças**
- Criar `src/lib/supabaseErrors.ts`. Ele não importa o client, então roda no test runner:
  ```ts
  type DbError = { message?: string; code?: string } | null | undefined;

  /** PGRST204: coluna fora do schema cache (escrita). 42703: coluna inexistente (leitura). */
  const MISSING_COLUMN_CODES = new Set(['PGRST204', '42703']);

  export function isMissingColumnError(error: DbError, columns: readonly string[]): boolean {
    if (!error?.message || !error.code || !MISSING_COLUMN_CODES.has(error.code)) return false;
    return columns.some(column => error.message!.includes(column));
  }
  ```
- Em `database.ts`, os três helpers passam a chamar `isMissingColumnError` com as colunas de cada um. A assinatura deles passa a aceitar `code`.
- Criar `src/lib/supabaseErrors.test.ts` e registrar no `src/test-runner.ts`:
  - `PGRST204` + `Could not find the 'funil' column of 'contents' in the schema cache` → `true`
  - `42703` + `column contents.funil does not exist` → `true`
  - `23514` + `violates check constraint "contents_funil_check"` → `false`
  - `23503` (FK) citando `legacy_idea_id` → `false`
  - erro sem `code` → `false`

**Efeito colateral aceito.** Se algum caminho devolver coluna ausente sem `code`, o fallback deixa de agir e o save mostra erro. Um erro visível é melhor que perder o dado sem aviso.

**Aceite**
- Os testes acima passam.
- Com a migration aplicada, funil salvo continua lá depois de recarregar.
- Um valor inválido (forçado pelo devtools) mostra erro, não "salvo".

### 1.2 `force: true` volta a buscar de verdade (review #2)

**Problema.** Em `loadDomains` (`src/context/AppContext.tsx:280`), os domínios que já estão em voo também são descontados nos pedidos forçados. Com isso, um reload forçado aproveita uma busca que começou **antes** da gravação.

**Casos afetados:**
- `PostingTimesEditor.tsx:154`: salva os horários e chama `ensureDataDomains(['schedule'], {force: true})`.
- `refreshFromServer`, chamado pelo realtime.

Com cerca de 6s por requisição (Fase 1.5 do plano de 2026-10-03), a janela para isso acontecer não é pequena.

**Por que esperar, em vez de buscar em paralelo.** Se as duas buscas rodassem juntas, a resposta antiga poderia chegar depois da nova e sobrescrever o estado com dados de antes da gravação.

**Mudanças**
- Em `src/context/domainLoading.ts`, criar a função pura `planDomainLoad(domains, inFlight, { force })`, que devolve `{ toFetch, pending, waitFirst }`:
  - **sem `force`:** igual a hoje (`subtractInFlightDomains`), com `waitFirst = []`.
  - **com `force`:** `toFetch` recebe todos os domínios (sem repetição) e `pending = []`. `waitFirst` recebe as promises em voo de qualquer domínio que se sobreponha a um pedido, **nos dois sentidos** de `getCoveringDomains`.
  - Exemplo do segundo sentido: um `content` forçado precisa esperar um `content-summary` em voo. Senão, a lista limitada chega depois e substitui a lista completa.
- Em `loadDomains`: `if (waitFirst.length) await Promise.allSettled(waitFirst);`. Isso roda antes de calcular `cacheKey` e de registrar o novo voo.
- Testes em `domainLoading.test.ts`:
  - `content` forçado com `content` em voo → `toFetch = ['content']` e `waitFirst = [p]`
  - `content` forçado com `content-summary` em voo → `waitFirst` contém essa promise
  - sem `force` → mesmo resultado de `subtractInFlightDomains`

**Aceite**
- Com o Network em "Slow 4G", abrir `/configuracoes/plataformas` e salvar horários logo em seguida. Depois de "Horários salvos", a tela mostra os horários novos.
- Na aba Network, o GET de `posting_times` começa depois da última gravação.

### 1.3 Não apagar o que não foi lido (review #6)

**Problema.**
- `saveSerie` (`src/lib/database.ts:1694`) sempre envia `funil_padrao: serie.funilPadrao ?? null`.
- A época do cache (`DOMAIN_CACHE_EPOCH`) não mudou. Assim, uma série lida do cache local antigo vem sem o campo, e ativar ou desativar essa série no Editorial apaga o funil definido em outro aparelho.
- O detalhe do roteiro tem o mesmo problema: `ContentDetailShell.tsx:73` e `:329` convertem `funil` ausente em `null`. Isso anula a guarda `funil !== undefined` de `saveContent`.

**Mudanças**
- Em `saveSerie`, seguir o padrão de `saveContent`:
  ```ts
  ...(serie.funilPadrao !== undefined ? { funil_padrao: serie.funilPadrao } : {}),
  ...(serie.energiaPadrao !== undefined ? { energia_padrao: serie.energiaPadrao } : {}),
  ```
- Em `ContentDetailShell.tsx:73` e `:329`, trocar `content.funil ?? null` e `draftNow.funil ?? null` por `content.funil` e `draftNow.funil`. Os selects já tratam `undefined` com `draft.funil ?? ''`.
- Não mudar a época do cache. A guarda resolve sem obrigar todo mundo a abrir o app sem cache.

**Aceite**
- Em devtools → Network, o upsert de uma série sem `funilPadrao` no objeto não leva `funil_padrao`.
- Escolher "Da série" no roteiro continua enviando `funil: null`, porque a escolha é explícita.

---

## Fase 2 — Leitura do funil (review #3)

**Problema.** `computeFunnelReading` (`src/features/editorial/lib/funnel.ts:88`) não confere o status. Todo conteúdo com `publishDate` no passado conta como publicado, e isso vale também para "N dias desde a última" e para o selo "Mais quieto". Um post agendado que nunca saiu esconde o aviso de etapa parada.

### Decisão necessária

| Opção | Contagem no ciclo | "Dias desde a última" e "Mais quieto" | Texto da tela |
|---|---|---|---|
| **A (recomendada)** | publicados + agendados no passado (como hoje) | só status Postado | mantém "Publicados ou agendados no ciclo" |
| B | só Postado | só Postado | trocar por "Publicados no ciclo" |
| C | como hoje | como hoje | nenhum; aceitar o aviso escondido |

Por que A: a contagem mostra o que foi planejado para o ciclo. O "Mais quieto" é um alerta sobre o que de fato saiu, e um post que não saiu não deveria silenciar esse alerta.

### Mudanças (opção A)
- `src/features/recommendations/contentStock.ts:38`: o parâmetro de `isPublishedContent` passa a ser `Pick<Content, 'status' | 'deletedAt'>`, como já foi feito com `getPublicationTimestamp`.
- `funnel.ts`: `FunnelContent` passa a incluir `status`. No laço, `lastDay` só é atualizado quando `isPublishedContent(content)`.
- Testes em `funnel.test.ts`:
  - agendado no passado com status Roteiro → entra em `count`, `daysSinceLast` fica `null` e `quiet = true` (com `quietDays` definido)
  - Postado → atualiza `lastPublishedAt`

Na opção B, também filtrar a contagem e trocar o texto em `EditorialPage.tsx` (~`:351`).

### Aceite
- Os testes acima passam.
- Na aba Funil, uma etapa cujo único post do período não saiu aparece como "Mais quieto".

---

## Fase 3 — Editorial

### 3.1 Hashtags: um salvar para todas as plataformas (review #4)

**Problema.**
- "Salvar" (`EditorialPage.tsx:436`) grava só a plataforma aberta. O que foi editado em outra aba continua aparecendo como se estivesse salvo e se perde ao sair da tela.
- Ao corrigir, não dá para só repetir o salvar por plataforma. Dois `UPDATE_PILAR` feitos a partir do mesmo `pilar` de antes fazem o segundo sobrescrever o primeiro.

**Mudanças**
- Criar `src/features/editorial/lib/hashtagDrafts.ts` (puro) com `applyHashtagDrafts({ pilares, series, platforms, drafts })`:
  - devolve só os pilares e as séries que mudaram, **com as edições de todas as plataformas juntas num único objeto** para cada pilar ou série
  - leva junto a lógica atual: `resolvePlatformUuid`, `createEmptyPilarPlataforma`, `shouldPersistPilarPlataforma` e `platformId = platform.nome` na série
- `HashtagsPanel`:
  - dispara um `UPDATE` por pilar ou série que mudou e depois limpa todos os rascunhos
  - o botão fica ativo quando existe qualquer rascunho
  - a aba de uma plataforma com rascunho ganha uma marca discreta
- Proteção ao sair: `useNavigationBlocker(() => Object.keys(drafts).length > 0)` com `ConfirmModal`, no mesmo padrão de `ContentDetailShell.tsx:676`.
  - Conferir se a troca de aba (`?aba=`, via `setSearchParams`) também é bloqueada. Se não for, avisar antes de trocar.
- Criar `hashtagDrafts.test.ts` e registrar no runner:
  - duas plataformas no mesmo pilar → um pilar com as duas
  - rascunho vazio → a plataforma sai
  - série encontrada por id ou por nome da plataforma

**Aceite**
- Editar Instagram e TikTok, salvar uma vez e recarregar: as duas plataformas mantêm o que foi editado.
- Editar e tentar sair da tela: aparece a confirmação.

### 3.2 Pilar inativo já ligado à série (review #5)

**Problema.** O seletor em `SerieEditForm.tsx:438` mostra só pilares ativos. Um pilar inativo ligado à série fica invisível e não dá para desligar. Além disso, `getSerieOpenItems` conta esse pilar, então a série não aparece como "sem pilar".

**Mudança**
- Trocar o filtro por `pilares.filter(item => item.ativo || linkedPilarIds.includes(item.id))`.
- Mostrar o chip inativo esmaecido e com indicação de inativo (texto conforme o UX review).

**Aceite.** Numa série ligada a um pilar inativo, o chip aparece; clicar desliga o pilar; salvar mantém a mudança.

### 3.3 Frequência vazia não é "Sob demanda" (review #7)

**Problema.** Quatro lugares mostram "Sob demanda" quando a frequência está vazia. Como "Sob demanda" também é uma opção que dá para escolher, não há como distinguir vazio de escolhido.

**Mudança**
- Criar `formatSerieFrequency(value: string | null | undefined): string | null` em `editorialOptions.ts`. Ela faz `trim` e devolve `null` quando o valor está vazio.
- Usar nestes quatro lugares. As linhas de meta já filtram valores vazios, e o `Badge` só aparece quando há valor:
  - `EditorialPage.tsx:220`
  - `SeriesSettingsPage.tsx:35`
  - `SeriesMobileScreen.tsx:140`
  - `SeriesDetailMobileScreen.tsx:170`
- O selo "Em aberto" já avisa quando a frequência falta. Se a tela precisar de texto próprio para isso, ele segue o UX review.

**Aceite.** Uma série sem frequência não mostra "Sob demanda" em nenhum card. Uma série com "Sob demanda" escolhida mostra.

### 3.4 Validação da proporção e dos dias (review #10)

**Problema.**
- `EditorialPage.tsx:271` repete 1 e 90 em vez de usar `FUNNEL_QUIET_DAYS_MIN` e `FUNNEL_QUIET_DAYS_MAX`.
- Um valor decimal mostra "As proporções precisam somar 100%", que não descreve o erro.

**Mudança**
- Criar `parseFunnelTargetsInput(inputs)` em `editorialSettings.ts`. Ela devolve `{ targets, error: 'formato' | 'soma' | null }`.
- Ter uma mensagem para cada erro, com texto conforme o UX review.
- Usar as constantes nos dias.
- Testes: decimal → `'formato'`; soma 90 → `'soma'`; tudo vazio → `targets = null` e sem erro.

**Aceite.** Digitar `33.5` mostra o erro de formato, não o de soma.

---

## Fase 4 — Ritmo sem regex sobre o texto (review #8)

**Problema.** `src/utils/pilarRhythm.ts` relê as próprias mensagens para ordenar e resumir:
- `FREQUENCY_UNDER` (`:340`)
- `FREQUENCY_OVER`, `SERIE_ZERO` e `NEEDS_SCRIPTS` (`:403–405`)
- `noteBucket` (`:407`), que procura "dia fora", "horário fora" e "hashtags"

Esta revisão de textos precisou reescrever quatro dessas regex. A próxima pode quebrar a ordenação e o resumo sem nenhum erro aparecer.

**Mudanças**
- Adicionar ao `Violation` um campo estruturado:
  ```ts
  export type ViolationMeasure =
    | { kind: 'frequency-under' | 'frequency-over'; label: string; count: number; target: number }
    | { kind: 'serie-zero'; label: string }
    | { kind: 'needs-scripts'; label: string; missing: number; scriptsNeeded: number }
    | { kind: 'day' | 'time' | 'tags' };

  export interface Violation {
    // campos atuais…
    measure?: ViolationMeasure;
  }
  ```
- Preencher `measure` nos 7 pontos que criam violações: `:127`, `:147`, `:193`, `:235`, `:265`, `:278` e `:289`.
- `prioritizeViolations` e `summarizeRhythmProgress` passam a ler `measure`. Remover as quatro regex e a busca por texto de `noteBucket`.
- `message` continua existindo só para exibir (`ProgramacaoPage.tsx:611` e `:982`).
- Teste novo: uma violação com mensagem reescrita e o mesmo `measure` gera o mesmo resumo. É ele que protege as próximas revisões de texto.

**Aceite**
- `npm test` passa.
- Mudar qualquer uma dessas mensagens não altera o resultado de `summarizeRhythmProgress`.

---

## Verificação final

- `npm run check`, que roda voice audit, lint de design, `tsc`, testes e build.
- `graphify update .` depois das mudanças de código, como pede o `CLAUDE.md`.
- Conferência manual no desktop e em 375px:
  - Editorial: abas Funil e Hashtags
  - edição de série
  - detalhe do roteiro: campo Funil
  - salvar horários em Plataformas
