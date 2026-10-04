# Plano de Implementação — Fase 1 (MVP de organização)

## Objetivo

Planejar e acompanhar a grade editorial **sem nenhum número de desempenho**, deixando o banco pronto para as métricas das fases 2 a 4.

**O MVP está pronto quando for possível:**
1. planejar uma semana de Instagram com os extras do TikTok;
2. ver o que ainda cabe por pilar e por função;
3. saber quantos vídeos há de reserva;
4. marcar o que foi postado, com data e link.

## Princípios

- **Migrations aditivas.** Nada destrutivo antes de a tela nova funcionar. Cada coluna nova tem tolerância a "coluna ainda não existe" em `src/lib/database.ts`, no padrão de `isMissingWritingNotesColumn`.
- **Regra de negócio em funções puras com teste** (`src/features/editorial/lib/`), antes de mexer nas telas.
- **Camadas:** nenhum número de uma conta específica vira padrão. 14/semana, 5/4/3/2 e estoque 7 aparecem só como exemplo ou placeholder.
- **Voz do produto:** sem "falhou", "atrasado" ou "você precisa". O `npm run voice:audit` lê também o código, então nem valores internos podem usar essas palavras.
- **Paridade mobile:** toda tela nova funciona no celular, conforme `docs/DESKTOP-MOBILE-PARITY.md`.
- Ao fim de cada migration: `notify pgrst, 'reload schema';`. Sem isso, a API do Supabase continua sem enxergar as colunas novas.

---

## Decisões de arquitetura

### D1. A entrada na grade é calculada, não é tabela

A data de publicação do conteúdo é lida em 28 arquivos e gravada em uns 8. Criar uma tabela de entradas obrigaria a mexer em todos eles. Em vez disso, uma função pura monta as entradas a partir do que já existe:

- **Entrada original**:
  - data = data da publicação na **rede de referência**, ou, se ela não tiver data, a data do conteúdo;
  - roteiro que só tem publicações em outras redes é **extra** e não entra na grade;
  - roteiro antigo, sem nenhuma publicação, usa a data do conteúdo (compatibilidade com o legado).
- **Entrada de repost**: cada publicação marcada como repost na rede de referência, com a data dela.
- **Classificação da entrada**: a do conteúdo (pilar, série, função resolvida). Um repost usa a do original.

Resultado:
- conteúdo, entrada e publicação ficam separados **no domínio**;
- as telas que leem `publishDate` continuam funcionando;
- só a contagem e o calendário passam a ler as entradas.

Se um dia um mesmo roteiro precisar ocupar dois espaços sem ser repost, aí sim vale criar uma tabela.

### D2. A publicação por rede é a `content_plataformas` evoluída

A tabela já guarda, por rede: legenda, hashtags, data, hora e se é repost. Ela ganha status, data realizada, código do post e legenda própria.

**Correção obrigatória:** `saveContentPlataformas` hoje **apaga e recria** todas as linhas a cada salvamento, e o cliente cria a publicação com `id: ''`. Para a publicação ter identidade (código do post, métricas na fase 2):
- o cliente gera o ID com `generateUUID`;
- o salvamento faz `upsert` por ID e apaga só os IDs removidos.

### D3. Funções: seis valores fixos, funil calculado

As funções são lógica do produto (camada 1), iguais para todo mundo, então aqui um `CHECK` no banco é adequado.

| Função (`funcao`) | Rótulo | Funil calculado |
|---|---|---|
| `atrair` | Atrair alcance | Topo |
| `converter` | Converter em seguidor | Topo |
| `aprofundar` | Aprofundar | Meio |
| `comunidade` | Gerar comunidade | Meio |
| `acao` | Levar à ação | Fundo |
| `reter` | Reter | fora do funil |

Na **série**, a função padrão pode ser vazia (ainda não escolhida), uma das seis, ou `varia` (varia por conteúdo).

No **conteúdo**, há dois campos:
- `funcao`, o valor;
- `funcao_origem`, que indica de onde ele veio.

| Estado | `funcao` | `funcao_origem` |
|---|---|---|
| Herdar da série | vazio (lê a da série enquanto não congela) | `herdada` |
| Escolher | valor | `escolhida` |
| Nenhuma | vazio | `nenhuma` |
| Ainda não escolhido | vazio | vazio |
| Aplicada depois ("Aplicar aos publicados") | valor | `aplicada` |
| Veio da migração | valor | `migrada` |

### D4. A classificação congela no conteúdo, na primeira publicação

Ao marcar a primeira publicação como publicada:
- se a origem é `herdada`, o valor da série é **copiado** para `funcao`;
- grava-se `classificacao_congelada_em`;
- daí em diante, mudar a série não altera esse post.

Pilar e série já são valores do próprio conteúdo, então não precisam de cópia.

**"Aplicar aos publicados"** é uma ação separada na edição da série. Ela atualiza só os congelados com origem `herdada` e marca a origem como `aplicada`.

### D5. Ajustes ficam nas preferências

Os ajustes vão em `user_preferences`, na chave `editorial_settings`, e as plataformas são guardadas por **ID**, não por nome.

```ts
interface EditorialSettings {
  quickSeriesCreate: boolean;       // já existe
  openInfoNotices: boolean;         // já existe
  redeReferenciaId: string | null;  // UUID da plataforma
  destinosPadrao: string[];         // UUIDs; "Onde você pretende publicar?" já vem marcado
  distribuicaoFuncoes: Record<FuncaoEditorial, number> | null; // %, soma 100
  estoqueDesejado: number | null;   // "7" aparece só como placeholder
  limitesHashtags: Record<string, number>; // por plataforma; ausente = 10
}
```

`funnelTargets` e `funnelQuietDays`, do rascunho atual, saem.

---

## Banco de dados

Rode na ordem, no editor SQL do Supabase.

### M0. Limpar o rascunho do funil

- Se `20261003120000_editorial_funnel.sql` **não** foi aplicada: apague o arquivo.
- Se foi: a M1 remove as colunas `funil` e `funil_padrao`.

### M1. `20261004100000_funcoes_editoriais.sql`

```sql
alter table public.series
  drop column if exists funil_padrao,
  add column if not exists funcao_padrao text
    check (funcao_padrao is null or funcao_padrao in
      ('atrair','converter','aprofundar','comunidade','acao','reter','varia')),
  add column if not exists pilar_principal_id text references public.pilares(id) on delete set null,
  add column if not exists formato_apresentacao text,
  add column if not exists energia_padrao text
    check (energia_padrao is null or energia_padrao in ('baixa','média','alta')),
  add column if not exists motivo_salvar text,
  add column if not exists motivo_enviar text;
-- "Elemento fixo" reaproveita a coluna bordao; "Formato de publicação", a formato_visual_padrao.

alter table public.contents
  drop column if exists funil,
  add column if not exists funcao text
    check (funcao is null or funcao in ('atrair','converter','aprofundar','comunidade','acao','reter')),
  add column if not exists funcao_origem text
    check (funcao_origem is null or funcao_origem in ('herdada','escolhida','nenhuma','aplicada','migrada')),
  add column if not exists classificacao_congelada_em timestamptz,
  add column if not exists conta_na_grade boolean not null default true,
  add column if not exists legenda_base text,
  add column if not exists livro_ids text[] not null default '{}';

create index if not exists contents_livro_ids_gin on public.contents using gin (livro_ids);

-- Pilar principal: um dos pilares já vinculados (revise as séries com mais de um).
update public.series s set pilar_principal_id = (
  select sp.pilar_id from public.serie_pilares sp where sp.serie_id = s.id order by sp.pilar_id limit 1
) where s.pilar_principal_id is null;

-- Vários livros por roteiro: leva o livro atual para a lista.
update public.contents set livro_ids = array[biblioteca_item_id]
where biblioteca_item_id is not null and livro_ids = '{}';

notify pgrst, 'reload schema';
```

Por que `livro_ids` é uma lista no conteúdo e não uma tabela de ligação:
- vem junto com o conteúdo, sem ligação nova com realtime, estado ou cache;
- a consulta "roteiros que citam este livro" usa o índice GIN.

A contrapartida: apagar um livro deixa o ID órfão. O app filtra na leitura e limpa ao excluir o livro.

### M2. `20261004110000_publicacoes.sql`

```sql
alter table public.content_plataformas
  add column if not exists status text not null default 'agendada'
    check (status in ('agendada','publicada','nao_publicada','removida')),
  add column if not exists realizada_manual_em timestamptz,  -- o que a pessoa informou
  add column if not exists realizada_api_em timestamptz,     -- fase 3; nunca apaga a manual
  add column if not exists post_codigo text,
  add column if not exists post_url text,
  add column if not exists legenda_propria boolean not null default false,
  add column if not exists conta_na_grade boolean not null default true,  -- usado em reposts
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists content_plataformas_post_codigo_key
  on public.content_plataformas (platform_id, post_codigo) where post_codigo is not null;

alter table public.projetos
  add column if not exists aviso_dias smallint check (aviso_dias is null or aviso_dias between 0 and 120);

notify pgrst, 'reload schema';
```

- Data realizada efetiva: `realizada_api_em ?? realizada_manual_em`.
- `projetos.tipo` não tem `CHECK` no banco, então `'evento'` entra só no tipo TypeScript.

### M3. `20261004120000_migracao_historico.sql`

Rode **depois** de configurar a função padrão das séries no Editorial (etapa E1). Assim o histórico já congela com a função certa.

```sql
-- 1. Publicações de conteúdos postados viram "publicada", com a data que existia.
update public.content_plataformas cp
set status = 'publicada',
    realizada_manual_em = coalesce(cp.realizada_manual_em, c.posted_at,
      (coalesce(cp.publish_date, left(c.publish_date::text, 10)::date) + time '12:00'))
from public.contents c
where cp.content_id = c.id and c.status = 'Postado' and cp.status = 'agendada';

-- 2. Link antigo do conteúdo vira código do post do Instagram.
update public.content_plataformas cp
set post_url = c.link,
    post_codigo = substring(c.link from 'instagram\.com/(?:reels?|p|tv)/([A-Za-z0-9_-]+)')
from public.contents c, public.platforms p
where cp.content_id = c.id and p.id = cp.platform_id and p.nome ilike 'instagram%'
  and c.link ilike '%instagram.com/%' and cp.post_codigo is null and cp.publication_kind = 'post';

-- 3. Congela a classificação dos postados com a função da série.
update public.contents c
set funcao = s.funcao_padrao, funcao_origem = 'migrada',
    classificacao_congelada_em = coalesce(c.posted_at, now())
from public.series s
where c.series_id = s.id and c.status = 'Postado' and c.funcao is null
  and s.funcao_padrao is not null and s.funcao_padrao <> 'varia';

-- 4. Postados sem série: só congela, sem função (dá para ajustar à mão depois).
update public.contents set classificacao_congelada_em = coalesce(posted_at, now())
where status = 'Postado' and classificacao_congelada_em is null;
```

Consultas de conferência (rode antes e depois):

```sql
select count(*) from public.contents where status = 'Postado' and classificacao_congelada_em is null; -- deve dar 0
select s.name, count(sp.*) from public.series s join public.serie_pilares sp on sp.serie_id = s.id
group by s.name having count(sp.*) > 1;  -- séries para revisar o pilar principal
```

---

## Etapas

Tamanho: **P** = até 1 dia, **M** = 2 a 4 dias, **G** = 1 semana ou mais. Para cada etapa: arquivos, tarefas, testes e quando está pronta.

### E0. Consolidar o rascunho atual (P)

Converter o que está na árvore de trabalho de funil para funções:
- `src/features/editorial/lib/funnel.ts` → `funcoes.ts`;
- `editorialSettings.ts`;
- `serieCompleteness.ts`;
- `EditorialPage.tsx` (aba Funil);
- `SerieEditForm.tsx`;
- os tipos em `src/lib/database.ts`.

Também:
- trocar `FunilStage` por `FuncaoEditorial`;
- remover `isMissingFunnelColumn`, `readFunilStage` e o `'funil'` em `buildContentScheduleSelect`;
- apagar a M0 se não foi aplicada.

**Pronto quando:** `npm run check` passa e não sobra referência a `funil` fora do mapa calculado.

### E1. Funções (M)

Lógica (`src/features/editorial/lib/funcoes.ts`):
- `FUNCOES`, `FUNCAO_LABELS`, `FUNIL_DA_FUNCAO`;
- `resolveFuncao(content, serie)`, que devolve `{ funcao, estado, congelada }`;
- `contaNaGradePadrao(formato, funcao)`: Stories, Live e `reter` ficam fora.

Dados:
- M1;
- tipos `Serie.funcaoPadrao` e `Content.funcao`, `funcaoOrigem`, `classificacaoCongeladaEm`, `contaNaGrade`;
- mapeadores, `saveSerie`, `saveContent`;
- `CONTENT_SCHEDULE_SELECT_COLUMNS` com tolerância a coluna ausente.

Telas:
- série: função padrão com a opção "Varia por conteúdo";
- conteúdo, nos três layouts de `ContentOperationalPanel`:
  - seletor com "Da série (Converter)", as seis funções, "Nenhuma" e "Ainda não escolhida";
  - "Conta na grade".

Criação:
- `SeriesCreateContentForm` e `createContentDraft` criam com origem `herdada` quando a série tem função; sem série, vazio.

Testes: `funcoes.test.ts`, com os seis estados, congelado contra herdado e o mapa do funil.

**Pronto quando:** um roteiro novo de uma série mostra "Da série (X)", e mudar a série muda o roteiro enquanto ele não foi publicado.

### E2. Publicações com identidade e "marcar como postado" (G)

Dados:
- M2;
- `ContentPlataforma` com `status`, `realizadaManualEm`, `realizadaApiEm`, `postCodigo`, `postUrl`, `legendaPropria`, `contaNaGrade`;
- `saveContentPlataformas` reescrito para fazer upsert por ID e apagar só os removidos;
- todo lugar que cria publicação usa `generateUUID()` (incluindo `buildPlatformRecord` em `SeriesCreateContentForm`).

Lógica:
- `src/features/editorial/lib/postCode.ts`, com `parsePostCode(url)`:
  - Instagram `/reel/`, `/reels/`, `/p/`, `/tv/`;
  - TikTok `/@user/video/{id}`;
  - ignora `?igsh=` e `utm`;
  - link curto do TikTok (`vm.tiktok.com`) guarda só a URL, sem código.
- `markPublished(content, publicacoes, entradas)`:
  - define status, data e código;
  - congela a classificação na primeira publicação (D4);
  - status do conteúdo passa a "Postado";
  - `postedAt` = a menor data realizada (compatibilidade).

Tela:
- **`MarkPostedSheet`** (desktop e mobile): para cada destino, data e hora realizada (padrão: agora) e link opcional.
- Todos os caminhos que hoje marcam como postado passam por ela:
  - `onMarkPosted` em `ContentDetailShell`;
  - seleção de "Postado" no `StatusDropdownField`;
  - `PostedVideoComposerSheet`;
  - telas mobile equivalentes.
- No menu da publicação: "Não foi ao ar" (`nao_publicada`) e "Removida".

Testes: `postCode.test.ts`, `markPublished.test.ts` (congela uma vez, não sobrescreve escolhida, data mínima).

**Pronto quando:**
- marcar como postado com link guarda o código;
- recarregar a página não muda o ID da publicação;
- mudar a função da série depois não altera o post.

### E3. Entradas calculadas e migração do histórico (M)

Lógica (`src/features/editorial/lib/gradeEntries.ts`):
- `buildGradeEntries({ contents, series, settings })`, seguindo a D1;
- cada entrada: `{ id, contentId, tipo: 'original'|'repost', data, hora, contaNaGrade, pilarId, serieId, funcao, realizada, realizadaEm }`;
- `realizada` = publicação da rede de referência com status `publicada`; no legado, conteúdo "Postado".

Dados: M3 (depois de configurar as séries na E1).

Testes: `gradeEntries.test.ts`:
- original na rede de referência;
- extra só no TikTok;
- repost com data própria;
- legado sem publicações;
- excluído e arquivado ficam fora.

**Pronto quando:** as consultas de conferência da M3 batem e as entradas de uma semana conhecida aparecem certas num teste com dados reais exportados.

### E4. Destinos, legendas, repost e calendário por rede (G)

- **"Onde você pretende publicar?"**:
  - aparece no `CreationComposer`, no `SeriesCreateContentForm` e no detalhe do conteúdo;
  - chips das plataformas ativas, já marcados com `destinosPadrao`;
  - marcar cria a publicação (`agendada`) e desmarcar remove a que ainda não foi publicada.
- **Legenda compartilhada**:
  - `contents.legenda_base`;
  - cada rede usa a base até a pessoa tocar em "Adaptar para {rede}" (`legenda_propria = true`);
  - na migração: a base vem da legenda da rede de referência, e as redes com texto diferente ficam com `legenda_propria`.
- **Campos por destino** (`src/features/editorial/lib/platformFields.ts`): mapa por rede dos campos visíveis, como título para YouTube e hashtags para Instagram e TikTok. O editor (`PlatformCopyEditor`) mostra só esses.
- **Repost**: ação explícita "Repostar" num conteúdo publicado. Ela cria uma publicação `publication_kind = 'repost'` com data própria, que gera entrada própria (D1).
- **Calendário** (`CalendarHubPage` / `EditorialCalendarPage` / `calendarContentFilters.ts`):
  - "Todas": um item por **entrada**, com ícones das redes;
  - uma rede: um item por **publicação** daquela rede, com a data dela.
- **Rede de referência e destinos padrão**: aba Ajustes do Editorial.

**Pronto quando:** uma semana planejada mostra o Instagram na grade e o TikTok como extra, e cada rede tem a sua data e legenda.

### E5. Metas dos pilares e distribuição por função (M)

- A frequência semanal do pilar (`frequencia_semanal`, já existe) vira **"espaços por semana"**. O total da semana é a soma dos pilares.
- **Distribuição por função** em % na aba Funil:
  - validação de soma 100;
  - prévia em espaços com `distribuirEspacos(total, percentuais)` (maior resto);
  - funil mostrado como agrupamento.
- **Grade pequena**: abaixo de 8 espaços por semana, a prévia e a contagem usam 4 semanas.
- A **meta por ciclo do pilar continua visível** até a E10, porque o Hoje (`recommendDailyAction`) ainda depende dela.

Testes: `distribuirEspacos.test.ts`. Com 14 e 35/30/20/15 dá 5/4/3/2. Com 3 por semana em 4 semanas (12) dá 4/4/2/2. Soma sempre igual ao total.

### E6. Configuração completa da série (M)

- `SerieEditForm` com todos os campos:
  - pilar principal (o conteúdo herda);
  - função padrão;
  - recorrência;
  - formato de publicação;
  - formato de apresentação (com sugestões);
  - esforço de produção (energia padrão);
  - elemento fixo (rótulo novo para o bordão);
  - motivos para salvar e para mandar;
  - templates e hashtags, que já existem.
- Pilares secundários (`serie_pilares`) deixam de aparecer na tela. A tabela fica intacta, e quem lê `pilarIds` (`rankSeriesForPilar`, `pilarRhythm`) passa a usar o pilar principal.
- Conteúdo criado pela série herda pilar, formato, energia e função. Escolher uma série no detalhe do conteúdo preenche o pilar se estiver vazio.
- Concluir o que está em andamento:
  - `/series` focada em criação em massa;
  - criação rápida;
  - "Informações em aberto", com os itens pilar, função, recorrência, formato e esforço;
  - os dois interruptores.
- "**Aplicar aos publicados**": aparece ao salvar uma série com função alterada e existirem congelados com origem `herdada`. Mostra quantos são e pede confirmação.

### E7. Estoque, eventos e livros (M)

- **Estoque desejado** na aba Ajustes. A contagem reutiliza `isPostableStock` (`recommendations/contentStock.ts`), contando só os que entram na grade.
- **Evento**:
  - `Projeto.tipo` aceita `'evento'`;
  - o formulário de projeto ganha "Avisar com quantos dias de antecedência";
  - dentro do evento, cada conteúdo tem a sua função.
- **Vários livros por roteiro**:
  - seletor múltiplo no detalhe do conteúdo (`livro_ids`);
  - a contagem da Biblioteca (`libraryContentCounts.ts`) passa a usar a lista;
  - excluir um livro remove o ID das listas.

### E8. Contagens: planejado e realizado (M)

Lógica (`src/features/editorial/lib/gradeCounts.ts`):
- `countGrade({ entries, pilares, settings, periodo })` devolve, por pilar e por função, o planejado (entradas no período) e o realizado (entradas realizadas no período), contra a meta em espaços;
- só contam entradas com `contaNaGrade`;
- grade pequena usa 4 semanas.

`checkEditorialConfig(...)` aponta incompatibilidades **só na configuração**:
- distribuição que não soma 100;
- séries semanais demais para o pilar (Semanal 1, Quinzenal 0,5, Mensal 0,25);
- função com espaço e nenhuma série que a entregue;
- rede de referência não definida.

Telas:
- a faixa de ritmo da Programação (`WeekRhythmRail`, `buildWeekRhythmQuotas` em `pilarRhythm.ts`) passa a ler as entradas e ganha as cotas por função;
- a soma dos pilares diferente do total aparece como informação ("seus pilares somam 12 de 14").

Testes: `gradeCounts.test.ts`, `checkEditorialConfig.test.ts`; atualizar `pilarRhythm.test.ts`.

**Neste ponto, o critério do MVP é atendido.**

### E9. Hashtags (P)

- `captionHashtags.ts`: `suggestHashtags({ platformId, serie, pilar, limite })`. Faz uma sugestão única, com a série primeiro e depois o pilar, sem repetidas, cortada no limite da rede.
- Substituir os dois conjuntos separados por essa sugestão no `PlatformCopyEditor` e na fila de legendas (`CaptionQuickCard`).
- Limite por rede na aba Hashtags.

### E10. Avisos de organização (M)

Lógica (`src/features/editorial/lib/editorialReadings.ts`): `computeReadings(state, settings, now)` devolve leituras `{ chave, prioridade, mensagem, acao: { rotulo, href } }`, **uma por causa** (deduplicadas pela chave).

| Prioridade | Leitura | Condição |
|---|---|---|
| 1. Data marcada | "Este roteiro tem 'checar' e sai em 2 dias" | etiqueta `checar` e entrada nos próximos 3 dias |
| 1. Data marcada | "Este roteiro cita um livro ainda não lido" | livro da lista com status diferente de Lido (só com o módulo Biblioteca ligado) |
| 2. Semana | "Esta semana ainda cabem 2 de Conversão" | cota de função; a ação abre a Criação filtrada pela função |
| 2. Semana | "Estoque abaixo do que você definiu" | estoque menor que o desejado |
| 2. Semana | "Bienal começa em 12 dias e ainda não tem conteúdo de Ação" | evento na janela de aviso sem entrada `acao` |
| 4. Série | "Esta série tem informações em aberto" | se o aviso estiver ligado |

Regras:
- respeitar `gentleExperience`: o modo pausa silencia, e "esconder números" tira as quantidades;
- no máximo uma frase do tipo "o que destrava a próxima ajuda" por tela.

Telas:
- Hoje: as 3 primeiras leituras;
- Programação: as da semana;
- Editorial: configuração e séries;
- a Criação ganha o filtro por função (`creationFilterOptions.ts`).

**O bloco do Hoje deixa de usar a meta por ciclo.** Aí sim ela pode sair da tela do pilar.

---

## Ordem e cortes

1. **MVP utilizável**: E0 → E1 → E2 → E3 → E4 → E5 → E7 (só estoque) → E8.
2. **Logo depois**: E6, E7 (eventos e livros), E9, E10.

As M1 e M2 podem ir juntas ao banco no início. A M3 vai depois que as séries tiverem função.

## Deixado registrado para as fases seguintes

- `content_metrics` tem `UNIQUE (content_id, platform_id)`. Isso impede fotos datadas e métricas de repost. Na fase 2, as métricas passam a apontar para o **ID da publicação**, com uma linha por coleta.
- Objetivo (ex.: 200 mil até dezembro) vira uma entidade na fase 3 ou 4, quando houver seguidores por dia.
- Modelos (camada 2): o modelo "criadora literária" como arquivo no código, aplicado só por escolha.

## Verificação final

1. `npm run check` (voz, design, tipos, testes, build).
2. No app, em desktop e celular:
   - planejar uma semana com Instagram e extras de TikTok;
   - conferir as cotas por pilar e por função e a prévia em espaços;
   - conferir o estoque contra o desejado;
   - marcar 2 posts como postados, um com link e outro sem, recarregar e ver o código guardado e o ID da publicação mantido;
   - mudar a função de uma série e ver que o post publicado não mudou;
   - usar "Aplicar aos publicados" e ver que mudou;
   - abrir em dois aparelhos e ver a mudança chegar pelo realtime.
3. Consultas de conferência da M3.
4. `graphify update .`
