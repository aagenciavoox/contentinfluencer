# Plano de implementação — crítica de design das telas (Criaki)

**Data:** 2026-10-03
**Origem:** crítica de design feita com o app rodando (desktop 1366px e celular 375px, tema claro, modo escuro conferido em Criação).
**Fora deste plano:** tudo o que está em [`UX_COPY_REVIEW.md`](UX_COPY_REVIEW.md) — acentos, nomes (roteiro/conteúdo/vídeo), rótulos de botão, tom, erros, inglês, maiúsculas, atalhos de teclado no celular e pontuação. Quando um item daqui encosta num texto, o texto segue o que o review decidir.

---

## Coordenação com o trabalho em andamento

Há alterações não commitadas em ~44 arquivos (revisão de textos e categorização de séries/pilares). Estes arquivos aparecem nos dois lados. Mexa neles **depois** que o review for commitado, para não gerar conflito:

| Arquivo | Itens deste plano que tocam nele |
|---|---|
| `src/features/library/pages/BookDetailPage.tsx` | 3.2, 5.2, 6.4 |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx` | 6.8 |
| `src/features/settings/pages/SettingsPage.tsx` | 3.2, 6.6 |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx` | 2.3 |
| `src/features/settings/components/PilarEditForm.tsx` · `SerieEditForm.tsx` | 5.4, 6.5 |
| `src/features/projects/pages/ProjectDetailPage.tsx` · `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx` | 6.3 (o review troca textos nas mesmas linhas) |
| `src/lib/database.ts` | nenhum (só leitura) |

As fases 1, 2 (menos 2.3), 3.1, 3.3 e 4 não tocam nesses arquivos e podem começar já.

Os números de linha abaixo foram conferidos hoje, mas podem andar com as edições em curso.

---

## Status de execução (2026-10-03)

Além da revisão de textos, está em andamento o plano **Editorial** (tela `/editorial` com abas Pilares, Séries, Funil, Hashtags e Ajustes; "Pilares" sai do menu; Séries vira criação em massa; funil e energia padrão na série; campos de Funil, Formato e Energia no painel do roteiro; migration `20261003120000_editorial_funnel.sql`).

| Situação | Itens |
|---|---|
| Feito (não commitado) | 1.1–1.4 · 2.1, 2.2, 2.4 · 3.1 (só `--text-tertiary`), 3.3, 3.4 · 4.4 · 5.3 · 5.4 (só o `⋯` dos cards de Criação e do kanban) · 6.1, 6.2 · 7.1, 7.2 · 8.1, 8.2 · sobras: 0 no carregamento (Hoje / Gravação) · contagem da Biblioteca a partir de `state.contents` · `platformDisplayName` em Legendas e Plataformas · uma etiqueta no card (série; `#tag` só sem série) |
| Sobras do que foi feito | rótulo visível no botão central do celular (depende da decisão 3) |
| Esperar o plano Editorial | 4.1 (o menu troca "Pilares" por "Editorial"; o mapa de rotas ativas muda para `/editorial/*`) · 5.2 na Série · 5.4 no card de Pilar (vira o painel do Editorial: levar o card clicável para lá) · 6.5 (formulários de pilar e série mudam; a barra fixa de salvar pode entrar junto) · 2.3 (o painel de propriedades ganha Funil, Formato e Energia) |
| Esperar a revisão de textos | 3.2 · 4.3 · 6.3 · 6.4 · 6.6 · 6.8 · 6.9 · 6.10 · 6.12 · 6.13 |
| Esperar decisão | 3.1 (rosa do botão) · 4.5 · 5.1 · 7.3 |

### Fechamento (2026-10-04)

As dependências acima foram resolvidas e os itens de implementação 1.1–8.2 foram integrados. As decisões de cor, rota inicial, FAB, paridade móvel e lâmpada estão aplicadas e documentadas. A conferência final também corrigiu a toolbar do Editorial no celular, que não aparecia porque o scaffold encaminhava `toolbar` apenas ao desktop.

No item 1.5, a auditoria local confirmou índices parciais para conteúdo ativo (`user_id` + status/datas, com `deleted_at is null`), índice da lixeira e índice da Biblioteca por usuário/tipo/status. A busca principal de conteúdos já usa uma lista explícita de colunas; a carga agregada da Biblioteca ainda inclui relações e anotações. Região, `EXPLAIN ANALYZE` e latência do projeto remoto não foram alterados nesta implementação.

---

## Ordem e tamanho

| Fase | Tema | Gravidade | Tamanho | Depende do review? |
|---|---|---|---|---|
| 1 | Carregando ≠ vazio | 🔴 | M | Não |
| 2 | Roteiro no celular | 🔴 | S | Só 2.3 |
| 3 | Contraste e estados desabilitados | 🔴/🟡 | M | 3.2 sim |
| 4 | Navegação | 🟡 | S | Não |
| 5 | Sistema visual (cor, abas, ícones, controles) | 🟡 | M | 5.2 e 5.4 sim |
| 6 | Ajustes por tela | 🟡 | L | Parcial |
| 7 | Celular: toque e barra inferior | 🟡/🟢 | S | Não |
| 8 | Proteções (lint e testes) | 🟢 | S | Não |

---

## Fase 1 — Carregando ≠ vazio

### Problema
Várias telas mostram "vazio" ou zero enquanto os dados ainda estão chegando, e afirmam coisas falsas:

- **Hoje:** "Nenhum livro em leitura" + botão "Abrir biblioteca", com 6 livros "Lendo" (`src/features/dashboard/components/TodayHome.tsx:133`).
- **Biblioteca → Análise:** tudo zerado e "Sem dados no período". Uns 9s depois aparecem 13 itens, 272 páginas e 45 anotações.
- **Gravação:** "Blocos montados 0", depois 3.
- **Biblioteca:** cabeçalho "0 itens" com skeleton por 6–8s a cada abertura, enquanto o menu diz 13.

### Causa (verificada)
1. `AppContext` guarda os domínios carregados num `useRef` (`src/context/AppContext.tsx:151`), e nenhuma tela consegue saber se um domínio está carregando. As telas leem `state.bibliotecaItems = []` como se fosse dado real.
2. `usePaginatedQuery` (`src/hooks/usePaginatedQuery.ts`) guarda o cache só na memória, então cada abertura do app começa sem nada.
3. As requisições repetidas só são evitadas para conjuntos **idênticos** de domínios (`AppContext.tsx:266`, chave = domínios ordenados). `['production','content']` e `['bootstrap','production','content']` disparam o mesmo `select` de `contents` duas vezes. Na abertura de `/biblioteca` medi 4–5 requisições paralelas a `contents` e 2 a `biblioteca_items`, cada uma levando ~6s.

### Mudanças
**1.1 Status por domínio no contexto** (`src/context/AppContext.tsx`)
- Manter o `useRef` para a lógica interna e espelhar num estado: `domainStatus: Partial<Record<AppDataDomain, 'loading' | 'ready' | 'error'>>`.
- Expor `isDomainReady(domain)` no valor do contexto e criar o hook `useDomainsReady(domains: AppDataDomain[]): boolean` em `src/hooks/`.
- Respeitar os apelidos que `isDomainAlreadyLoaded` já trata (`content` cobre `content-summary` etc.).
- Um domínio servido pelo cache persistido conta como `ready`, mesmo que esteja sendo revalidado.

**1.2 Telas usam o status**
| Tela | Arquivo | Enquanto não está pronto |
|---|---|---|
| Hoje — Livro atual | `TodayHome.tsx` / `DashboardPage.tsx` | Skeleton do card (capa + 2 linhas), sem texto nem botão |
| Hoje — Para gravar | idem | Skeleton de lista |
| Análise | `src/features/analytics/pages/AnalyticsPage.tsx` | Números em skeleton; esconder "Sem dados no período" |
| Gravação — métricas | `src/features/recording/pages/RecordingPage.tsx` | Números em skeleton até `recording` ficar pronto |
| Biblioteca — cabeçalho | `src/features/library/pages/LibraryPage.tsx` | Esconder "N itens" enquanto `libraryLoading`, ou usar `state.bibliotecaItems.length` quando o domínio `library` estiver pronto |

Regra geral: **estado vazio só depois de `ready`**. Até lá, skeleton com o mesmo formato do conteúdo.

**1.3 Primeira página da Biblioteca instantânea** (`src/hooks/usePaginatedQuery.ts`)
- Adicionar a opção `persistKey?: string`. Com ela, a página 1 da consulta padrão é lida e gravada com `readPersistedDomain`/`writePersistedDomain` (`src/lib/persistentDataCache.ts`), como os domínios já fazem.
- Usar em `LibraryPage` com `persistKey: 'library:page1'`. O cache mostra a página na hora e revalida por trás, que é o fluxo de stale-while-revalidate que o hook já tem.

**1.4 Evitar requisições repetidas por domínio** (`AppContext.tsx`, `loadDomains`)
- Trocar o mapa "conjunto → promise" por um mapa "domínio → promise". Antes de buscar, retirar da lista os domínios que já estão em voo e aguardar as promises deles.
- Extrair a subtração como função pura (`subtractInFlightDomains`) para poder testar.
- `fetchBibliotecaContentCounts` (`LibraryPage.tsx:262`) roda de novo a cada mudança em `state.contents.length`. Ela pode virar derivação local de `state.contents` (contar `bibliotecaItemId`) quando o domínio `content` estiver pronto.

**1.5 Investigar a latência de ~6s por requisição** (sem código ainda)
- Conferir no Supabase a região do projeto, os índices de `contents(user_id, deleted_at)` e de `biblioteca_items(user_id)`, e o tamanho do `select=*`.

### Aceite
- Ao abrir `/hoje`, `/biblioteca/analise` e `/gravacao` com o cache vazio (aba anônima), nenhuma tela mostra texto de vazio ou "0" antes de os dados chegarem.
- Ao abrir `/biblioteca` pela segunda vez (recarregando a página), as capas aparecem em menos de 300ms.
- Na abertura fria de `/biblioteca`, há no máximo 1 requisição por tabela (aba Network).
- Testes de `subtractInFlightDomains` e da transição de `domainStatus`, registrados em `src/test-runner.ts`.

---

## Fase 2 — Roteiro no celular

### Problema
O roteiro "pov: brandon sanderson…" abre **em branco** no celular. O texto está no painel de notas (`writingNotes`), e esse painel **não existe no celular**. O editor também não mostra placeholder, nem no celular nem no desktop.

### Causa (verificada)
- No desktop, `WritingNotesPane` só aparece quando `notesOpen` (`src/features/contents/components/detail/sections/RoteiroSection.tsx:216`). No celular, as abas são só `Roteiro | Legendas` (`RoteiroSection.tsx:~298`).
- `RichTextEditor` recebe `placeholder` (`src/components/editors/RichTextEditor.tsx:146`), mas não registra a extensão `Placeholder`. O CSS de `src/styles/editor.css:10` espera `.is-editor-empty` + `data-placeholder`, que só essa extensão cria.
- Existem dois campos chamados "Notas": `writingNotes` (painel ao lado do roteiro) e `notes` (seção "Notas" do painel de propriedades, `ContentOperationalPanel.tsx:426` e `:633`). No celular, a pessoa abre o `⋯` e encontra "Notas", mas é o campo errado.

### Mudanças
**2.1 Notas no celular** (`RoteiroSection.tsx`, bloco mobile)
- Abas `Roteiro | Notas | Legendas`. "Notas" usa `WritingNotesPane` em altura cheia.
- A tela abre em "Notas" quando `script` está vazio e `writingNotes` tem texto. Nos outros casos, abre em "Roteiro".

**2.2 Placeholder do editor** (`RichTextEditor.tsx`)
- Importar `Placeholder` de `@tiptap/extensions` (já instalado na 3.x como dependência do starter-kit) e adicionar ao `package.json` como dependência direta.
- `Placeholder.configure({ placeholder })` usando a prop que já existe.

**2.3 Um nome por campo** (`ContentOperationalPanel.tsx`, depois do review)
- A seção do campo `notes` passa a se chamar "Observações". Isso segue a R1 do review, "Notas = painel lateral do roteiro".

**2.4 Ordem no desktop** (`RoteiroSection.tsx:217-225`)
- Hoje as notas ficam à esquerda e o roteiro à direita. Inverter: roteiro à esquerda (conteúdo principal) e notas à direita, como diz a descrição do "Modo de escrita" ("área de notas ao lado do texto").

### Aceite
- A 375px, o texto de "pov: brandon sanderson…" fica visível em no máximo 1 toque depois de abrir o roteiro.
- Um roteiro vazio mostra "Escreva o roteiro…" no editor, no desktop e no celular.
- Nenhuma tela tem dois campos diferentes com o rótulo "Notas".

---

## Fase 3 — Contraste e estados desabilitados

### Medições
| Par | Contraste | Mínimo |
|---|---|---|
| Branco sobre `--brand-accent` `#FF2D6F` (botão principal, 13px) | 3,6:1 | 4,5:1 |
| `--text-tertiary` `#8B8B85` sobre `--bg-primary` | 3,1:1 | 4,5:1 |
| `--text-tertiary` `#8B8B85` sobre branco | 3,4:1 | 4,5:1 |
| `--text-tertiary` escuro `#7D7D74` sobre `--bg-elevated` `#1B1B19` | ~4,1:1 | 4,5:1 |
| Rótulos com `opacity-30` (livro: "IDENTIFICAÇÃO", "DETALHES TÉCNICOS"…) | ~1,3:1 | 4,5:1 |
| "Remover item" com `opacity-50` | ~1,8:1 | 4,5:1 |

### Mudanças
**3.1 Tokens** (`src/styles/index.css`)
| Token | Hoje | Proposta | Resultado |
|---|---|---|---|
| `--text-tertiary` (claro, linha 117) | `#8B8B85` | `#6F6F69` | 4,6:1 no fundo, 5,0:1 no branco |
| `--text-tertiary` (escuro) | `#7D7D74` | `#8A8A81` | ~5,0:1 em `--bg-elevated` |
| Novo `--brand-accent-strong` | — | `#E0185A` | 4,7:1 com texto branco |

- `AppButton` primário (`src/components/ui/AppButton.tsx:35`) passa a usar `--brand-accent-strong` no fundo e na borda.
- `--brand-accent` continua `#FF2D6F` para usos decorativos: marcação do menu, login, barra de progresso.

**3.2 Sem opacidade em texto** (depois do review nos arquivos marcados)
- 91 ocorrências de `opacity-30/40/50` em `.tsx`, fora `disabled:` e `hover:`. Começar por: `BookDetailPage.tsx` (22), `ProjectDetailPage.tsx` (15), `LooksSettingsPage.tsx` (7), `TemplatesSettingsPage.tsx` (5), `SettingsPage.tsx` (rótulos e descrições com `opacity-60`, linhas 212–305).
- Regra: texto usa só `--text-primary/secondary/tertiary`. Opacidade fica para estado desabilitado e ícone decorativo.

**3.3 Botão desabilitado diz o motivo** (`AppButton.tsx`)
- Nova prop `disabledReason?: string`. Quando o botão está desabilitado, ela vira `title` e `aria-describedby`, e opcionalmente uma linha `meta` abaixo do botão.
- Aplicar em: "Avançar para gravação" (cabeçalho do roteiro, `primaryAction.disabled`), "Salvar" da Ideia rápida (`src/features/ideas/components/IdeaQuickCapture.tsx`), "Atualizar e-mail" (`ProfileSettingsPage.tsx`). Os textos de motivo seguem o review.

**3.4 Contador na aba ativa**
- Em `SegmentTabs` e `MobileSegmentTabs`, o contador da aba ativa (cinza sobre preto: "Todos 22", "Blocos 3") passa a usar `--bg-primary` sobre `color-mix` do fundo ativo, com contraste ≥ 4,5:1.

### Aceite
- O teste de contraste dos tokens (fase 8) passa nos dois temas.
- `rg "opacity-(30|40|50|60)" src --glob "*.tsx"` não encontra texto (só ícones e `disabled:`).
- Ao passar o mouse ou focar um botão desabilitado, o motivo aparece.

---

## Fase 4 — Navegação

**4.1 Menu marca a página em detalhe** (`src/layouts/navigation/Sidebar.tsx:233`, `navConfig.ts`)
- Hoje o `NavLink` usa `end = true` por padrão, então `/conteudos/:id`, `/projetos/:id`, `/biblioteca/:id`, `/biblioteca/analise`, `/gravacao/:id` e `/configuracoes/pilares/:id/editar` ficam sem item marcado.
- Generalizar `isBottomNavItemActive` (`navConfig.ts:72`) para `isNavItemActive(to, pathname)` e usar no menu lateral pela prop `className` do `NavLink`, ignorando o `isActive` dele.
- Mapa: `/conteudos/*` → Criação · `/criacao/legendas` → Legendas (e não Criação) · `/biblioteca/*` → Biblioteca · `/projetos/*` → Projetos · `/gravacao/*` → Gravação · `/configuracoes/pilares/*` → Pilares · `/configuracoes` e demais subrotas → Configurações, excluindo pilares.
- Testes em `navConfig.test.ts`.

**4.2 Link de volta com cara de link** (`src/layouts/page/DesktopPageHeader.tsx:46`)
- Quando há `backTo`, o rótulo de cima vira "← {seção}", com ícone `ChevronLeft`, sublinhado no hover e área de toque de 44px no celular.
- Roteiro: o rótulo "Roteiros" vira "Criação", apontando para `/criacao` ou para o `detailBack` preservado.
- Quando o rótulo de seção é igual ao título (página Criação: "Criação" sobre "Criação"), esconder o rótulo.

**4.3 Gaveta do celular mostra tudo** (`src/mobile/components/MobileSidebarDrawer.tsx`)
- "Projetos" fica abaixo da dobra a 812px. Levar o botão de tema e o "Sair" para um menu na linha do perfil, para os 9 itens caberem sem rolagem.

**4.4 Busca (Ctrl K)** (`src/components/overlays/CommandPalette.tsx`)
- Incluir `state.bibliotecaItems` (categoria "Biblioteca", caminho `/biblioteca/{id}`). Hoje "kaigen" encontra os roteiros, mas não o livro.
- Projetos abrem `/projetos/{id}`. Hoje vão para `/projetos` (linha 48).

**4.5 Botão de lâmpada no desktop** (`src/layouts/app/AppShell.tsx:209`)
- É o terceiro caminho para "Nova ideia" (além de Criar ▾ e da Ideia rápida do Hoje), não tem texto e cobre o canto dos cards. Esconder em `md+`, ou mostrar só onde não há botão "Criar".

### Aceite
- Em qualquer rota autenticada, exatamente um item do menu está marcado.
- A busca encontra livros e abre o detalhe certo de projetos.

---

## Fase 5 — Sistema visual

**5.1 Regra da cor de destaque** (decisão + docs)
Proposta:
- **Rosa (`--brand-accent-strong`)** = a ação principal, no máximo 1 por tela.
- **Preto/branco (`--accent`)** = seleção: aba ativa, toggle ligado, dia atual.
- **Azul** = só o anel de foco.

Mudanças:
- Calendário: o dia atual passa de azul (`CalendarGrid.tsx:227` e o círculo do mês) para `--accent`, igual ao celular.
- Detalhe de projeto: o botão preto de criar roteiro vira `secondary` (já entra em 6.3).
- Atualizar `BUTTON_SYSTEM.md` (diz que o primário é "fundo escuro"), `DESIGN.md` ("Monochrome accent") e o comentário de `index.css:127` ("mobile shell / nav").

**5.2 Um componente de abas**
- `BookDetailPage.tsx:725`: abas sublinhadas em maiúsculas → `SegmentTabs` com contador.
- `SeriesScriptsPage.tsx`: abas "Roteiros 3 · Ideias 0 · Todos 3" → `SegmentTabs`.
- Biblioteca e Análise: o seletor Acervo/Análise fica no mesmo lugar nas duas (`LibrarySectionTabs`). Hoje fica à direita da busca numa tela e embaixo do título na outra.

**5.3 Ícone de plataforma único**
- Criar `src/components/ui/PlatformIcon.tsx` com `platformKey()` e `PlatformGlyph` (tirados de `src/features/captions/components/CaptionQuickCard.tsx:36-53`), mais `platformDisplayName()` ("TikTok", "YouTube").
- Usar em `PlatformCopyEditor.tsx:52`. Hoje ela compara `'TikTok'` e `'YouTube'` exatos, mas as plataformas estão salvas como "Tiktok" e "Youtube", e por isso aparecem "Ti" e "Yo" no lugar dos ícones.
- Usar `platformDisplayName` em `PlatformsSettingsPage` e nos cabeçalhos de Legendas.

**5.4 Cards seguem o DESIGN.md**
- `CreationGridCard.tsx`: o `⋯` aparece só em `:hover`/`:focus-within` no desktop (`.card-actions`). No toque, continua visível.
- Pilares (`src/features/settings/pages/PillarsSettingsPage.tsx`): o card inteiro abre a edição, como o de Série. Hoje só o "Editar" que aparece no hover abre.
- `PilarEditForm.tsx`: esconder o "ID: humor-meme-topo" (depois do review).

**5.5 Controles nativos → componentes do sistema**
- `<select>` nativo: "Vincular existente" (`ProjectDetailPage.tsx`) e "Status" do livro → `TagSelect`.
- Datas do livro (`dd/mm/aaaa`) → `PropertyDatePicker`.
- `window.prompt('Nova hashtag')` (`PlatformCopyEditor.tsx:435`) → campo inline que confirma com Enter.

### Aceite
- `rg "<select" src/features --glob "*.tsx"` só encontra exceções documentadas.
- Instagram, TikTok e YouTube mostram o ícone real em Gestão e em Legendas.

---

## Fase 6 — Ajustes por tela

**6.1 Criação — cards** (`src/features/creation/components/CreationGridCard.tsx`, `CreationEntityMarks.tsx`)
- O rodapé mostra "03 de out." igual em todos os 22 cards (data de criação). Trocar pela data mais útil: próxima gravação ou publicação, ou senão "editado {formatLastEdit}" (`contentCardMeta.ts:23`).
- Marcas de pilar e série: mostrar o **nome** da série como etiqueta (1 visível + "+N", regra do DESIGN.md), em vez de ícones pastel sem texto que somem no escuro.
- Celular: tirar a altura mínima fixa do card. Hoje cabem 3,5 cards por tela, com espaço vazio em títulos de uma linha.

**6.2 Criação — Lista** (`src/features/creation/components/CreationListView.tsx:184`)
- Bug: o cabeçalho começa com `<span className="sr-only">Seleção</span>`. `sr-only` é `position:absolute` e não ocupa célula da grid, então "Título" cai na coluna de 28px e tudo se desloca. Trocar por `<span aria-hidden="true" />` com o texto `sr-only` dentro.
- Esconder as colunas "Categoria" e "Formato" quando todas as linhas estão vazias.

**6.3 Detalhe de projeto** (`src/features/projects/pages/ProjectDetailPage.tsx`, depois do review)
- Cabeçalho: marca + status + `⋯` (Editar, Excluir). "Excluir projeto" sai do card de resumo.
- Métricas numa linha de 3 (Eventos · Roteiros · Valor). Hoje é uma grade 2+1 com um card sobrando, e "Darkside" aparece 3 vezes.
- Sem `tracking` largo nem maiúsculas espaçadas ("EDITAR", "MARCA", "COR"): usar `Text variant="label"`.
- Um primário ("Novo evento") e o resto `secondary`.
- "Próximo evento": filtrar `date >= hoje` (`ProjectDetailPage.tsx:113` usa `agendaItems[0]`). Sem futuros, mostrar "Último: dd/mm". Corrigir o mesmo cálculo em `ProjectDetailMobileScreen.tsx:179`.
- A bolinha vermelha da cor do projeto, na lista, parece alerta. Usar a cor só como faixa lateral fina ou na inicial da marca.

**6.4 Detalhe do livro** (`BookDetailPage.tsx`, depois do review)
- Rótulos de seção visíveis (3.2).
- Salvamento: barra fixa no rodapé com "Salvar", ou salvamento automático com o mesmo indicador "Salvo" do roteiro. Hoje o "Salvar" fica no fim de um formulário longo.
- A capa aparece duas vezes (à esquerda e no campo "Capa"). Manter a grande e deixar só os botões "Trocar" e "Remover" no campo.
- Status e datas com os componentes do sistema (5.5).

**6.5 Edição de pilar e série** (`PilarEditForm.tsx`, `SerieEditForm.tsx`, depois do review)
- O cabeçalho com "Cancelar" e "Salvar alterações" some ao rolar. Usar uma variante `sticky` do `DesktopPageHeader`, ou repetir as ações numa barra fixa no rodapé quando o cabeçalho sai da tela.

**6.6 Configurações** (`SettingsPage.tsx:212-305`, depois do review)
- Card do toggle com o mesmo fundo e as mesmas cores de texto ligado ou desligado. Só o toggle muda. Hoje o card desligado parece desabilitado.
- Descrições sem `line-clamp` e sem `opacity-60`. Hoje "…compromissos externos e entrega…" fica cortado.

**6.7 Hoje no desktop** (`src/features/dashboard/pages/DashboardPage.tsx`, `TodayHome.tsx`)
- O conteúdo ocupa ~530px à esquerda e metade da tela fica vazia. Usar a largura da página: Ideia rápida em largura total e, abaixo, uma grade de 3 colunas (Livro atual · Para gravar · Agenda do dia).
- Título com `pageTitle` (24px) ou `display` alinhado ao conteúdo, para não dominar a tela.

**6.8 Calendário** (`EditorialCalendarPage.tsx`, depois do review)
- De 3 para 2 linhas de controles:
  - Linha 1: título · Ver/Agendar · "Novo evento ▾" (com "Vídeo postado" dentro).
  - Linha 2: Mês/Semana/Agenda/Linha do tempo · Hoje · navegação do mês · busca dentro do popover de filtros · "Horários" no `⋯`.
- Cabeçalho dos dias: "DOMINGO. 27" → "Dom 27" (desktop) e "D" (celular).

**6.9 Gravação — status do bloco**
- Bloco sem roteiros aparece como "Finalizado · 0 vídeos · 0%". Com `total === 0`, o status é "Vazio". Corrigir em `src/features/recording/components/desktop/RecordingQueueTab.tsx:118` e `src/mobile/screens/recording/RecordingMobileScreen.tsx:442`.

**6.10 Legendas** (`src/features/captions/pages/CaptionsPage.tsx`, `CaptionQuickCard.tsx`)
- A tabela passa da largura da tela e a coluna YouTube fica cortada a 1366px. Fixar a coluna "Vídeo" com `sticky left-0`, deixar a rolagem horizontal visível (sombra na borda) e reduzir a largura mínima das colunas de plataforma.
- "Carregando…" em cada linha: carregar os roteiros em lote (uma requisição para a página), não um por linha.

**6.11 Roteiro → Gestão** (`PlatformCopyEditor.tsx`)
- Os chips Instagram/TikTok/YouTube são liga/desliga, mas parecem botões. Dar estado visual (check + fundo quando ligado).
- Num roteiro novo, deixar ligadas as plataformas ativas em Configurações. Hoje aparece "Ative pelo menos uma plataforma" com TikTok e YouTube ativos.

**6.12 Plataformas** (`PlatformsSettingsPage.tsx`)
- O quadro "Leitura histórica" (explicação técnica) ocupa o topo. Mover para uma linha `meta` abaixo da lista de plataformas.
- O toggle do Instagram (plataforma padrão) aparece cinza. Mostrar como ligado e bloqueado, com cadeado e o motivo no `title`.

**6.13 Perfil** (`ProfileSettingsPage.tsx`)
- Três botões rosa na mesma tela. Como cada card é um formulário separado, usar `secondary` nos botões e deixar o primário só no card em edição (o que tem alteração).

---

## Fase 7 — Celular

**7.1 Áreas de toque ≥ 44px**
- `AppButton` (`AppButton.tsx:20`): `sm`/`md` passam a usar `h-[var(--control-height-mobile)] md:h-[var(--control-height)]`. Hoje é `h-10` (40px) nos dois tamanhos de tela.
- Ideia rápida (`IdeaQuickCapture.tsx`): os chips Pilar/Série/Origem têm 26px e "Observações" tem 28px → `min-h-11` no celular.
- Linha "nada na agenda" do cabeçalho do Hoje (15px de altura e clicável): aumentar a área de toque com padding.

**7.2 Barra inferior com rótulo** (`src/mobile/components/MobileBottomNav.tsx`)
- Rótulo visível de 11px sob cada ícone (o token `--font-size-nav-mobile` já existe para isso). O texto "Hoje" no lugar de "Home" está no review.

**7.3 Decisões de paridade** (ver `docs/DESKTOP-MOBILE-PARITY.md`)
- A Biblioteca do celular tem abas "Agora/Fila" e botões "Principal/Fixar" que o desktop não tem.
- As abas do roteiro se chamam "Roteiro/Legendas" no celular e "Escrita/Gestão" no desktop.
- O cabeçalho rosa aparece só no Hoje do celular.
- Decidir cada uma (manter ou alinhar) e registrar no documento de paridade.

---

## Fase 8 — Proteções

**8.1 `scripts/lint-design.mjs`**
- Avisar quando um `className` tem `text-[var(--text-…)]` junto com `opacity-[1-6]0`.
- Ampliar a regra "legacy uppercase tracking" para `tracking-widest` e `tracking-[0.2em+]`.
- Avisar sobre `<select` e `window.prompt|confirm` em `src/features/**` e `src/mobile/**`, com lista de exceções.

**8.2 Teste de contraste dos tokens** (`src/styles/tokenContrast.test.ts`, registrar em `src/test-runner.ts`)
- Ler `index.css`, separar os blocos `:root` e `[data-theme='dark']` e checar:
  - `--text-primary/secondary/tertiary` sobre `--bg-primary`, `--bg-secondary` e `--bg-elevated` ≥ 4,5.
  - `--brand-on-accent` sobre `--brand-accent-strong` ≥ 4,5.

**8.3 Roteiro de conferência visual**
- Depois de cada fase, abrir no navegador embutido (`.claude/launch.json` já existe) a 1366px e a 375px: Hoje, Criação (grade, lista, kanban), roteiro, Legendas, Séries, Pilares, Biblioteca, livro, Análise, Gravação, Calendário, Projetos, projeto, Configurações, Perfil, Plataformas.

---

## Decisões que são suas

Fechadas em 2026-10-03 para aplicar o restante do plano:

1. **Regra da cor (5.1):** rosa (`--brand-accent-strong` `#E0185A`) = ação principal, no máximo 1 por tela, só no botão primário. `--brand-accent` `#FF2D6F` fica na marca decorativa (menu, login, progresso). Preto/branco (`--accent`) = seleção. Azul = só o anel de foco.
2. **Rota inicial:** `/` continua em `/criacao`.
3. **Botão central do celular:** rosa (`--brand-accent-strong`), com rótulo visível.
4. **Paridade (7.3):** de propósito no celular: abas Agora/Fila e Principal/Fixar da Biblioteca; cabeçalho rosa só no Hoje; abas do roteiro `Roteiro | Notas | Legendas` (desktop continua Escrita/Gestão). Registrar em `docs/DESKTOP-MOBILE-PARITY.md`.
5. **Lâmpada no desktop (4.5):** esconder em `md+`.

---

## Checklist de fechamento de cada fase
- [ ] `npm run check` (voice, lint de design, tipos, testes, build)
- [ ] Conferência visual (8.3) nas telas da fase
- [ ] `graphify update .`
- [ ] Commit por fase, com mensagem em português no estilo dos commits recentes
