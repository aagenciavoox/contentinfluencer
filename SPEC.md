# CORE CREATOR — AI SPEC
> Fonte de verdade condensada. Não editar manualmente — derivado de SYSTEM_GUIDE.md (2026-04-28).
> Legenda: ✅ feito · 🔲 pendente · ⏭ descartado

---

## 1. META

- **App:** Core Creator (rebuild de content-os)
- **Stack:** React + TypeScript + Vite + Supabase + Tailwind CSS
- **Auth:** Supabase Auth — multi-usuário, dados isolados por `user_id` em todas as tabelas
- **Isolamento:** RLS ativo em todas as 26 tabelas — sem exceção
- **PWA/Offline:** não — webapp normal
- **Tema:** dark mode como padrão
- **Supabase project:** `aftffcaychrfffefkeoj`
- **Tipos TS centralizados em:** `src/lib/database.ts`
- **Estado global:** `src/context/AppContext.tsx` + `src/context/reducer.ts`

---

## 2. NAVEGAÇÃO

**Desktop (sidebar):**
```
/conteudos   /calendario   /ideias   /projetos
/biblioteca  /gravacao     /analise  /configuracoes
```

**Mobile (navbar 5 slots):**
```
Calendário | Projetos | FAB | Gravação | Análise
```
FAB abre: Nova ideia · Novo conteúdo · Nova anotação (vinculável à biblioteca)
Conteúdos / Biblioteca / Config → menu superior no mobile

**4 sistemas internos:**
```
ENTRADA      Ideias + Biblioteca
PRODUÇÃO     Conteúdos + Gravação
PLANEJAMENTO Calendário + Projetos
CONTROLE     Análise
```

**Experiencia gentil:** o sistema ajuda a lembrar, organizar e escolher sem cobrar. Sugestoes, contadores, modo pausa e destaques de prazo devem ser configuraveis. Prazos reais ficam separados de datas desejadas. Analise vira aprendizado, nao julgamento. Guia de voz: `PRODUCT_VOICE.md`.

---

## 3. SCHEMA

> Todas as tabelas: `user_id UUID FK → auth.users`. `created_at TIMESTAMPTZ` implícito.

### contents
```
id UUID PK | user_id | title TEXT NN | status TEXT NN
slot_type TEXT          -- ÚNICO | SÉRIE | JANELA
series_id UUID FK       -- opcional
pilar_id UUID FK        -- FK real (não string)
cenario_id UUID FK      -- FK real
look_id UUID FK
formato_visual TEXT     -- Talking Head | Tela Verde | Voiceover | POV Texto | Reação | Vlog | Misto
script TEXT             -- rich text
script_notes JSONB      -- {id, text, selection, comment, color, createdAt}
tags TEXT[]
notes TEXT | references TEXT | link TEXT
energia_necessaria TEXT -- baixa | média | alta
publish_date DATE | recording_date DATE
livro_origem_id UUID FK → biblioteca_items
deleted_at TIMESTAMPTZ  -- soft-delete
```

**Status (7 etapas):** `Ideia → Pronto p/ Gravar → Gravado → A Editar → Editado → Programado → Postado`
Sem transição automática forçada. `Programado → Postado` é ação manual.

### content_plataformas
```
content_id UUID FK | platform_id UUID FK | legenda TEXT
publish_date DATE | hashtags TEXT
```

### ideas
```
id UUID PK | user_id | text TEXT NN
pilar_id UUID FK (opcional) | series_id UUID FK (opcional)
origem_id UUID FK → biblioteca_items (opcional)
promoted_to_content_id UUID FK → contents
archived BOOL DEFAULT false
```
Ao promover: `archived = true`, ideia some da lista.

### pilares
```
id UUID PK | user_id | nome TEXT NN | descricao TEXT
cor TEXT (hex) | ativo BOOL
```
Hashtags → `pilar_plataformas(pilar_id, platform_id, hashtags TEXT)`

### series
```
id UUID PK | user_id | name TEXT NN | template TEXT
slot_padrao TEXT | formato_visual_padrao TEXT
estrutura_roteiro TEXT | bordao TEXT | cor TEXT | ativa BOOL
frequencia_recomendada TEXT  -- Semanal | Quinzenal | Mensal | Sob demanda
notes TEXT
```
Pilares → `serie_pilares(serie_id, pilar_id)` N:N
Hashtags → `serie_plataformas(serie_id, platform_id, hashtags TEXT)`

### platforms
```
id UUID PK | user_id | nome TEXT NN | ativo BOOL
```
4 defaults pré-criados por usuário (Instagram, TikTok, YouTube, Blog). Customizável.

### biblioteca_items
```
id UUID PK | user_id | tipo TEXT  -- livro | filme | série | outro
titulo TEXT NN | autor_diretor TEXT | generos TEXT[]
capa_url TEXT | status TEXT  -- Quero consumir | Consumindo | Pausado | Concluído
data_inicio DATE | data_fim DATE | avaliacao INT (1-5)
notas_gerais TEXT | potencial_conteudo INT (1-3)
total_paginas INT | paginas_lidas INT  -- só livros
```

### biblioteca_generos
```
id UUID PK | user_id | nome TEXT NN | tipo TEXT  -- livro | filme | série | null(global)
```

### anotacoes
```
id UUID PK | user_id | item_id UUID FK → biblioteca_items
texto TEXT NN
tipo TEXT  -- Anotação | Trecho | Reação | Análise | Ideia de conteúdo | Pergunta
capitulo_ref TEXT | content_potential BOOL
deleted_at TIMESTAMPTZ
```

### projetos
```
id UUID PK | user_id | nome TEXT NN
tipo TEXT  -- campanha | publi | producao | outro
status TEXT (calculado pelas etapas)
data_inicio DATE | data_fim DATE
biblioteca_item_id UUID FK (opcional) | meta_conteudos INT
brand TEXT | brand_color TEXT (hex)
value DECIMAL | currency TEXT DEFAULT 'BRL'
notes TEXT | deleted_at TIMESTAMPTZ
```

### projeto_etapas
```
id UUID PK | projeto_id UUID FK | nome TEXT NN
ordem INT | status TEXT  -- pendente | em_andamento | concluída
data_prazo DATE
```

### projeto_conteudos
```
projeto_id UUID FK | content_id UUID FK
```

### recording_blocks
```
id UUID PK | user_id | name TEXT
```

### recording_block_contents
```
block_id UUID FK | content_id UUID FK | ordem INT | gravado BOOL DEFAULT false
```

### templates
```
id UUID PK | user_id | nome TEXT NN
platform_id UUID FK (opcional) | series_id UUID FK (opcional)
estrutura JSONB  -- [{id, tipo: fixo|variavel, label, conteudo_fixo, variavel}]
ativo BOOL
```

### agenda_items
```
id UUID PK | user_id | title TEXT NN | date DATE NN | time TIME
tipo TEXT  -- Reunião | Entrega | Publicação | Outro
projeto_id UUID FK (opcional)
```

### golden_rules
```
id UUID PK | user_id | descricao TEXT
tipo TEXT  -- pilar | série | formato | publi | plataforma
condicao TEXT  -- max | min | recomendado
periodo TEXT   -- dia | semana | mês
valor INT | ativa BOOL
```

### dna_voz
```
id UUID PK | user_id | promessa_central TEXT | publico TEXT
tom TEXT | nao_faco TEXT[] | alertas TEXT[]
```

### content_metrics
```
id UUID PK | user_id | content_id UUID FK | platform_id UUID FK
views INT | likes INT | comments INT | saves INT | shares INT
reposts INT | new_followers INT | accounts_reached INT
watch_time INT | retention_rate DECIMAL | completion_rate DECIMAL
qualitative_notes TEXT | registered_at DATE
```

### user_preferences
```
user_id UUID FK | key TEXT | value TEXT
```

---

## 4. TELAS — SPEC FUNCIONAL

### /conteudos
- Busca em tempo real + filtros (status, pilar, série, plataforma, projeto)
- Toggle grid/lista; ordenação configurável (status + data)
- Card exibe: título, status(cor+ícone), pilar(cor), série, plataformas, datas, ponto de regra, caminho possível, energia
- Menu rápido por item: mudar status · duplicar · adicionar a projeto · adicionar a bloco de gravação
- **Mobile:** 2 colunas estilo Keep | **Desktop:** lista/grid + sidebar filtros

### /conteudos/:id
5 abas: **Roteiro** (editor rich text + scriptNotes) · **Publicação** (legenda+hashtags+datas por plataforma) · **Planejamento** (status, pilar, série, formato, energia, slot, datas) · **Contexto** (biblioteca, projeto, tags) · **Análise** (métricas)
Assistido: template da série disponível ao abrir roteiro · hashtags pilar+série como sugestão editável · pontos de regra em tempo real (aviso, não bloqueio)

### /calendario
- Visão mensal/semanal · sidebar do dia selecionado
- Camadas ativas: conteúdos · gravações · projetos/parcerias · entregas
- Arrastar conteúdo muda data · pontos de conflito visíveis
- **Mobile:** semanal ou lista por dia | **Desktop:** mensal completo

### /ideias
- Input fixo no topo (captura sem fricção — pilar/série opcionais)
- Lista por mais recente
- Ações: promover para conteúdo · arquivar · vincular origem da biblioteca

### /projetos
- Lista por prazo: nome, tipo, status calculado, brand(se publi), data_fim
- Tipos: campanha · publi · producao · outro
- **Mobile:** lista simples | **Desktop:** lista + detalhe lateral

### /projetos/:id
4 abas: **Visão Geral** (nome, tipo, brand, datas, valor, notas) · **Etapas** (CRUD com status individual) · **Conteúdos** (vincular existente ou criar novo) · **Agenda** (agenda_items deste projeto)
Status do projeto calculado automaticamente pelas etapas.

### /biblioteca
- Filtro por tipo (livro/filme/série) · grid de capas
- **Mobile:** grid visual | **Desktop:** grid ou lista configurável

### /biblioteca/:id
3 abas: **Info** · **Anotações** (tipo padrão: Anotação; botões: "Criar ideia" / "Criar conteúdo") · **Conteúdos** gerados

### /gravacao
**Modo Planejamento:** filtros (pilar, série, look, cenário, energia) → lista de conteúdos "Pronto p/ Gravar" → criar bloco com nome → ver blocos existentes
**Modo Execução (/gravacao/:id):** HUD focado — roteiro em destaque · "Marcar gravado" → avança + dispatch UPDATE_CONTENT status=Gravado · barra de progresso · navegar sem sair da tela
- **Mobile:** HUD tela cheia | **Desktop:** HUD + contexto lateral

### /analise
3 abas:
1. **Leitura editorial** — pontos fora dos combinados em state.goldenRules · indicador de harmonia editorial
2. **Mix** — distribuição postados por pilar (30/90 dias) · sugestão "[Pilar X] ficou mais quieto neste periodo"
3. **Resposta do publico** — agregar state.contentMetrics · top 5 por views/saves/comentários · filtro por plataforma

### /configuracoes
**Estratégia:** Pilares · Regras de Ouro · DNA da Voz
**Conteúdo:** Séries · Templates · Plataformas
**Produção:** Looks e Cenários (tags operacionais — não cadastro formal)

---

## 5. AUTOMAÇÕES (sem IA)

1. **"O que gravar hoje"** — input energia → filtra "Pronto p/ Gravar" × energia_necessaria × regras × datas → lista sugerida
2. **Ponto para revisar** — ao salvar conteúdo → cruza regras de ouro → aviso gentil (nunca bloqueia)
3. **Sugestão de mix** — ao abrir Análise/Calendário → distribuicao últimos N postados → "[Pilar X] ficou mais quieto neste periodo"
4. **Pré-preenchimento hashtags** — ao selecionar pilar/série → hashtags pilar + série = campo pré-preenchido editável
5. **Leitura de análise** — % equilíbrio pilares · frequência vs. intenção · pontos fora dos combinados → indicador visual
6. **Caminhos possíveis** — por conteúdo na lista: energia baixa → leves · prontos p/ gravar → separar para gravação · editados com data combinada → lembrar postagem

---

## 6. DESIGN TOKENS

| | Decisão |
|---|---|
| Cards | `rounded-md` ou `rounded-lg` (não `rounded-2xl`) |
| Status | cor + ícone sempre juntos |
| Pilares | sempre com cor associada |
| Modal edição completa | full-screen |
| Confirmação rápida | inline (sem modal) |
| Criação rápida (ideia/anotação) | bottom sheet mobile / inline desktop |
| Tipografia UI | Inter |
| Títulos de página | UPPERCASE sem itálico |
| Cores | sinalizações funcionais (status, pilares, projetos) — sem decoração |

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Banco de dados — ✅ 100% completo
Schema em `schema.sql`, executado no Supabase. 26 tabelas, RLS total, 30 índices, triggers `handle_new_user` e `set_updated_at`.

### Camada de dados — ✅ completo
`src/lib/database.ts` — 17 tipos TS · fetchAllData() · save/delete por entidade · mappers snake_case→camelCase · junction tables explícitas
`src/context/AppContext.tsx` — sem mock data, sem localStorage, auth-driven
`src/context/reducer.ts` — 46 action types, 0 erros TS

### Shell e roteamento — ✅ App.tsx funcional
Redirects legados ativos. 3 rotas são placeholders: `/projetos`, `/gravacao`, `/analise`.

### Páginas prontas ✅
`/ideias` `/biblioteca` `/biblioteca/:id` `/conteudos` `/calendario`
`/configuracoes` `/configuracoes/pilares` `/configuracoes/dna` `/configuracoes/regras` `/configuracoes/looks`
`ContentDetailModal.tsx` (funcional — `LegacyContent = any` é dívida técnica)

### Pendentes 🔲

**Páginas a criar:**
- `src/pages/Projetos.tsx` + `src/pages/ProjetoDetalhe.tsx`
- `src/pages/Gravacao.tsx` + `src/pages/GravacaoBloco.tsx`
- `src/pages/Analise.tsx`
- `src/pages/settings/Series.tsx`
- `src/pages/settings/Templates.tsx`
- `src/pages/settings/Plataformas.tsx`

**Componentes a atualizar:**
- `Sidebar.tsx` — adicionar links: Projetos, Gravação, Análise + sublinks Config (Séries, Templates, Plataformas)
- `MobileNavBar.tsx` — trocar para: Calendário | Projetos | FAB | Gravação | Análise
- `Settings.tsx` — corrigir links `/settings/*` → `/configuracoes/*`

**Limpeza:**
- Remover `schema.new.sql`
- `CommandPalette.tsx` — adicionar Projetos à busca
- `Onboarding.tsx` — verificar se é chamado; se não, remover

**Dívida técnica (não bloqueia):**
- `ContentDetailModal.tsx` — substituir `LegacyContent = any` por tipos corretos
- `CSVUploadModal.tsx` — verificar compatibilidade com novo shape de Content
- `DNAVozDrawer.tsx` — remover campo `pilares` se ainda aparecer na UI

---

## 8. ORDEM DE EXECUÇÃO

```
Fase A (~1h)     Limpeza rápida
  1. Remover schema.new.sql
  2. Corrigir links Settings.tsx (/settings/* → /configuracoes/*)
  3. Atualizar Sidebar.tsx — novos links e sublinks

Fase B (~1h)     MobileNavBar redesign
  Nova ordem: Calendário | Projetos | FAB | Gravação | Análise
  FAB: Nova ideia · Novo conteúdo · Nova anotação

Fase C (~1 dia)  /projetos
  Projetos.tsx: lista filtrada por tipo/status, ordenada por data_fim
  ProjetoDetalhe.tsx: 4 abas (Visão Geral · Etapas · Conteúdos · Agenda)
  Dispatches já existem: ADD_PROJETO · UPDATE_PROJETO · DELETE_PROJETO

Fase D (~1 dia)  /gravacao
  Gravacao.tsx: modo Planejamento + lista de blocos existentes
  GravacaoBloco.tsx: HUD execução com progresso
  Dispatches: ADD_RECORDING_BLOCK · UPDATE_RECORDING_BLOCK · DELETE_RECORDING_BLOCK

Fase E (~1 dia)  /analise
  Analise.tsx: 3 abas — Leitura editorial · Mix · Resposta do publico
  Dados: state.goldenRules · state.contents · state.contentMetrics

Fase F (~0.5 dia cada)  Config faltando
  /configuracoes/series     CRUD com form: nome, template, frequência, cor, bordão
  /configuracoes/plataformas  lista + toggle ativo + adicionar custom
  /configuracoes/templates  CRUD de templates com blocos fixos + variáveis

Fase G  Dívida técnica (quando houver tempo)
  ContentDetailModal.tsx — 29 ocorrências LegacyContent = any
  CSVUploadModal.tsx · Onboarding.tsx · DNAVozDrawer.tsx
```
