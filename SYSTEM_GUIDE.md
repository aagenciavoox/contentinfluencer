# SYSTEM_GUIDE.md — Core Creator
> Documento de referência para a reconstrução  
> Gerado em: 2026-04-27  
> Fonte: AUDIT.md + RESPOSTAS QUESTIONNAIRE.md + specs de telas

Este é o documento que substitui o AUDIT.md como referência de trabalho.  
Cada decisão aqui tem origem em resposta explícita. Sem ambiguidade.

---

## 1. VISÃO GERAL

| Atributo | Decisão |
|----------|---------|
| **Nome** | Core Creator |
| **Quem usa** | Multi-usuário — cada criadora tem conta isolada |
| **Isolamento de dados** | Total — `user_id` em todas as tabelas sem exceção |
| **PWA / Offline** | Não — webapp normal, sem suporte offline |
| **Autenticação** | Supabase Auth (mantém) |

---

## 2. ARQUITETURA DE INFORMAÇÃO

### Menu principal (desktop — sidebar)
```
1. Conteúdos      /conteudos
2. Calendário     /calendario
3. Ideias         /ideias
4. Projetos       /projetos        ← inclui parcerias
5. Biblioteca     /biblioteca
6. Gravação       /gravacao
7. Análise        /analise
8. Configurações  /configuracoes
```

### Barra inferior (mobile)
```
1. Calendário
2. Projetos
3. ➕  (FAB central — ação rápida)
4. Gravação
5. Análise
```
O FAB abre menu rápido com: Nova ideia / Novo conteúdo / Nova anotação (com opção de vincular à biblioteca).  
Outras telas (Conteúdos, Biblioteca, Configurações) ficam acessíveis via menu superior no mobile.

### 4 sistemas que organizam o produto
```
ENTRADA      → Ideias + Biblioteca
PRODUÇÃO     → Conteúdos + Gravação
PLANEJAMENTO → Calendário + Projetos
CONTROLE     → Análise
```

### Filosofia de produto: experiencia gentil

Core Creator ajuda a lembrar, organizar e escolher. O sistema nao deve envergonhar, cobrar ou medir valor pessoal por volume de producao.

Regras:
- Sugestoes sao opcionais e podem ser desligadas.
- Modo pausa oculta sugestoes proativas e preserva contexto sem empurrar proximos movimentos.
- Numeros no dashboard podem ser ocultados.
- Prazos reais devem ser separados de datas desejadas.
- Destaque forte deve ficar restrito a compromissos externos, publis, entregas combinadas ou trabalho pago.
- Analise deve gerar aprendizado, nao julgamento.
- Textos devem preferir "em aberto", "disponivel", "data combinada", "para lembrar", "pode ser retomado" e "talvez util".
- Evitar linguagem de cobranca ou julgamento; a lista de frases bloqueadas fica em `PRODUCT_VOICE.md`.

Implementacao: configuracao em `src/features/settings/lib/gentleExperience.ts`; guia de voz em `PRODUCT_VOICE.md`.

---

## 3. ENTIDADES E SCHEMA

### Regra global
**Todas as tabelas têm `user_id` FK → `auth.users`.** Sem exceção. Isolamento via RLS no Supabase.

---

### `contents` (Conteúdos)
Campos obrigatórios na criação: apenas `title`.  
Status ao criar: `Ideia` (pré-roteiro) ou direto para o roteiro se já houver texto.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT NOT NULL | |
| status | TEXT NOT NULL | enum abaixo |
| slot_type | TEXT | renomear: `ÚNICO \| SÉRIE \| JANELA` |
| series_id | UUID FK → series | opcional |
| pilar_id | UUID FK → pilares | FK real — não mais string solta |
| cenario_id | UUID FK → cenarios | FK real — não mais string solta |
| look_id | UUID FK → looks | |
| formato_visual | TEXT | `Talking Head \| Tela Verde \| Voiceover \| POV Texto \| Reação \| Vlog \| Misto` — opcional |
| script | TEXT | editor rich text |
| script_notes | JSONB | comentários por trecho (estrutura: `{id, text, selection, comment, color, createdAt}`) |
| tags | TEXT[] | array nativo — não mais CSV string |
| notes | TEXT | |
| references | TEXT | |
| energia_necessaria | TEXT | `baixa \| média \| alta` — substitui energy_logs por dia |
| publish_date | DATE | |
| recording_date | DATE | |
| link | TEXT | |
| livro_origem_id | UUID FK → biblioteca_items | origem da biblioteca (livro, filme, série) |
| created_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft-delete |

**Campos removidos:** `caption` (substituído por legendas), `format` (substituído por formato_visual), `estimated_duration`, `plataformas` (vai para `content_plataformas`)

#### Tabela relacionada: `content_plataformas`
Um conteúdo pode ir para múltiplas plataformas, cada uma com data própria:
```
content_id   UUID FK → contents
platform_id  UUID FK → platforms
legenda      TEXT
publish_date DATE          ← data específica por plataforma
hashtags     TEXT          ← geradas automaticamente (base do pilar/série + editáveis)
```

#### Status do conteúdo (7 etapas, todas necessárias)
```
Ideia           → pré-roteiro, anotação inicial
Pronto p/ Gravar → roteiro revisado, aprovado para gravação
Gravado         → filmagem concluída
A Editar        → aguardando edição
Editado         → edição concluída, pronto para publicar
Programado      → agendado na plataforma
Postado         → publicado (vira asset de análise)
```

**Automação de status:**  
- Sem transição automática forçada  
- Se conteúdo está `Editado` e tem `publish_date` hoje → aviso de postagem (não muda status)  
- `Programado` → `Postado` é ação manual do usuário

---

### `ideas` (Ideias)
Entidade separada de `contents`. Ideias são captura livre — viram conteúdo ao ser promovidas.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| text | TEXT NOT NULL | |
| pilar_id | UUID FK → pilares | opcional — classificação posterior |
| series_id | UUID FK → series | opcional |
| origem_id | UUID FK → biblioteca_items | opcional — qualquer item da biblioteca |
| promoted_to_content_id | UUID FK → contents | preenchido ao promover |
| archived | BOOL DEFAULT false | |
| created_at | TIMESTAMPTZ | |

**Ao promover:** ideia desaparece automaticamente da lista (archived = true).  
**Da anotação** pode ir direto para ideia OU direto para conteúdo — ambos os caminhos têm botão.

---

### `pilares`
Por usuário. CRUD completo.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| nome | TEXT NOT NULL | |
| descricao | TEXT | |
| cor | TEXT | hex |
| ativo | BOOL | |

**Hashtags por plataforma:** movidas para tabela `pilar_plataformas(pilar_id, platform_id, hashtags TEXT)`.

---

### `series` (Séries)
Por usuário. Uma série pode cruzar múltiplos pilares.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| name | TEXT NOT NULL | |
| template | TEXT | estrutura base do roteiro |
| notes | TEXT | |
| slot_padrao | TEXT | `ÚNICO \| SÉRIE \| JANELA` |
| formato_visual_padrao | TEXT | |
| estrutura_roteiro | TEXT | |
| bordao | TEXT | |
| cor | TEXT | |
| ativa | BOOL | |
| frequencia_recomendada | TEXT | `Semanal \| Quinzenal \| Mensal \| Sob demanda` |

**Relacionamento com pilares:** tabela `serie_pilares(serie_id, pilar_id)` — N:N.  
**Hashtags:** tabela `serie_plataformas(serie_id, platform_id, hashtags TEXT)` — somam às do pilar.

---

### `platforms` (Plataformas)
Plataformas são por usuário — as 4 padrão são pré-criadas, mas o usuário pode adicionar.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| nome | TEXT NOT NULL | Instagram, TikTok, YouTube, Blog, ou custom |
| ativo | BOOL | |

---

### `biblioteca_items` (Biblioteca — livros, filmes, séries)
Entidade unificada. `tipo` distingue livro/filme/série.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| tipo | TEXT | `livro \| filme \| série \| outro` |
| titulo | TEXT NOT NULL | |
| autor_diretor | TEXT | |
| generos | TEXT[] | array — gêneros customizáveis por usuário |
| capa_url | TEXT | |
| status | TEXT | `Quero consumir \| Consumindo \| Pausado \| Concluído` |
| data_inicio | DATE | |
| data_fim | DATE | |
| avaliacao | INT | 1-5 |
| notas_gerais | TEXT | |
| potencial_conteudo | INT | 1-3 — avaliação macro do item como fonte de conteúdo |
| total_paginas | INT | livros |
| paginas_lidas | INT | livros |
| created_at | TIMESTAMPTZ | |

**Campos removidos de `books`:** isbn, editora, idioma, traducao, serie_colecao, quem_indicou, motivo_escolha, capitulos_cobertos.

---

### `biblioteca_generos`
Gêneros são por usuário — não enum fixo.

```
id       UUID PK
user_id  UUID FK
nome     TEXT NOT NULL
tipo     TEXT    ← 'livro' | 'filme' | 'série' | null (global)
```

---

### `anotacoes` (antes `book_annotations`)
Vinculadas a qualquer item da biblioteca.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| item_id | UUID FK → biblioteca_items | |
| texto | TEXT NOT NULL | |
| tipo | TEXT | `Anotação \| Trecho \| Reação \| Análise \| Ideia de conteúdo \| Pergunta` |
| capitulo_ref | TEXT | |
| content_potential | BOOL | essa anotação específica pode virar conteúdo agora? |
| deleted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Campo removido:** `destilada` — absorvido por `tipo` e `content_potential`.  
**Tipo novo:** `Anotação` (genérico, sem fricção de classificação).

---

### `projetos` (substitui `campaigns` + absorve `partnerships`)
Projetos unificam campanhas de livro, publis e qualquer iniciativa com etapas.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| nome | TEXT NOT NULL | |
| tipo | TEXT | `campanha \| publi \| producao \| outro` |
| status | TEXT | calculado a partir das etapas |
| data_inicio | DATE | |
| data_fim | DATE | prazo |
| biblioteca_item_id | UUID FK → biblioteca_items | opcional — origem do conteúdo |
| meta_conteudos | INT | opcional |
| brand | TEXT | para publis/parcerias |
| brand_color | TEXT | hex — para publis |
| value | DECIMAL | valor financeiro |
| currency | TEXT DEFAULT 'BRL' | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

#### Tabela relacionada: `projeto_etapas`
Etapas customizáveis por projeto:
```
id          UUID PK
projeto_id  UUID FK
nome        TEXT NOT NULL
ordem       INT
status      TEXT    'pendente' | 'em_andamento' | 'concluída'
data_prazo  DATE
```

#### Tabela relacionada: `projeto_conteudos`
Um projeto pode ter múltiplos conteúdos:
```
projeto_id  UUID FK
content_id  UUID FK
```

---

### `recording_blocks` (Blocos de Gravação)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| name | TEXT | |
| created_at | TIMESTAMPTZ | |

#### Tabela relacionada: `recording_block_contents`
Substitui o array JSON `content_ids`:
```
block_id    UUID FK
content_id  UUID FK
ordem       INT
gravado     BOOL DEFAULT false
```

---

### `templates`
Nova entidade. Templates de roteiro/publicação por plataforma/série.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| nome | TEXT NOT NULL | |
| platform_id | UUID FK → platforms | opcional |
| series_id | UUID FK → series | opcional |
| estrutura | JSONB | blocos editáveis: `{id, tipo, label, conteudo_fixo, variavel}` |
| ativo | BOOL | |
| created_at | TIMESTAMPTZ | |

---

### `agenda_items`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT NOT NULL | |
| date | DATE NOT NULL | |
| time | TIME | horário — reuniões e entregas têm hora |
| tipo | TEXT | `Reunião \| Entrega \| Publicação \| Outro` |
| projeto_id | UUID FK → projetos | opcional |
| created_at | TIMESTAMPTZ | |

---

### `golden_rules` (Regras de Ouro)
Por usuário. Configuráveis com parâmetros numéricos.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| descricao | TEXT | |
| tipo | TEXT | `pilar \| série \| formato \| publi \| plataforma` |
| condicao | TEXT | `max \| min \| recomendado` |
| periodo | TEXT | `dia \| semana \| mês` |
| valor | INT | parâmetro numérico |
| ativa | BOOL | |

---

### `dna_voz`
Por usuário. Editável com baixa frequência.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| promessa_central | TEXT | |
| publico | TEXT | |
| tom | TEXT | |
| nao_faco | TEXT[] | |
| alertas | TEXT[] | |

**Removido:** campo `pilares` JSON (os pilares vivem na tabela `pilares`).

---

### Tabelas removidas
- `app_config` → configurações por usuário entram em `user_preferences(user_id, key, value)`
- `energy_logs` → substituído por `contents.energia_necessaria`
- `results` → métricas por plataforma entram em `content_metrics` (ver abaixo)

---

### `content_metrics` (substitui `results`)
Métricas estruturadas por conteúdo e plataforma.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| content_id | UUID FK → contents | |
| platform_id | UUID FK → platforms | |
| views | INT | |
| likes | INT | |
| comments | INT | |
| saves | INT | |
| shares | INT | |
| reposts | INT | |
| new_followers | INT | |
| accounts_reached | INT | |
| watch_time | INT | minutos — YouTube |
| retention_rate | DECIMAL | % — YouTube |
| completion_rate | DECIMAL | % — TikTok |
| qualitative_notes | TEXT | |
| registered_at | DATE | |

**Campos removidos de `results`:** `worth_it`, `creative_satisfaction`, `learning_by_series`, `metrics` (TEXT blob).  
Preenchimento é opcional — o usuário decide se quer registrar métricas.

---

## 4. TELAS

### `/conteudos` — Conteúdos
**O que faz:** Centro operacional de todos os conteúdos.

**O que aparece:**
- Campo de busca (filtra em tempo real)
- Filtros: status, pilar, série, plataforma, projeto
- Toggle: grid / lista
- Lista/grid de itens
- Botão "Novo conteúdo" sempre acessível
- Estado vazio com CTA

**Cada item exibe:**
- Título
- Status (cor + ícone)
- Pilar (cor do pilar)
- Série (nome)
- Plataformas
- Datas (se houver)
- Indicador de ponto fora do combinado (regra de ouro)
- Caminho sugerido baseado no status
- Indicador de energia necessária

**Menu do item (ação rápida):**
- Mudar status
- Duplicar
- Adicionar a projeto
- Adicionar a bloco de gravação

**Ordenação padrão:** leitura assistida por status + data

**Mobile:** cards 2 colunas estilo Keep  
**Desktop:** lista ou grid maior + sidebar de filtros

---

### `/conteudos/:id` — Detalhe do Conteúdo
**O que faz:** Edição completa do conteúdo.

**Abas:**
1. **Roteiro** — editor de texto + comentários por trecho (scriptNotes)
2. **Publicação** — legenda por plataforma + hashtags automáticas (editáveis) + datas por plataforma
3. **Planejamento** — status, pilar, série, formato visual, energia, slot_type, datas
4. **Contexto** — origem (biblioteca), projeto, tags
5. **Análise** — métricas por plataforma

**O que é automático:**
- Aplicação de template ao abrir roteiro (se série tiver template)
- Hashtags pré-preenchidas do pilar + série (editáveis)
- Alertas de regras de ouro em tempo real (aviso, não bloqueio)

**Mobile:** abas simplificadas + header reduzido + editor de roteiro otimizado (modo foco)  
**Desktop:** mais campos visíveis simultaneamente

---

### `/calendario` — Calendário
**O que faz:** Fonte de verdade da agenda do criador. Visão unificada de tudo.

**O que aparece:**
- Visão mensal / semanal
- Itens: conteúdos, etapas de projetos, gravações, eventos de agenda
- Sidebar do dia selecionado (detalhe dos itens do dia)
- Toggle de camadas

**Camadas ativas por padrão:**
- Conteúdos (publicações)
- Gravações
- Parcerias/Projetos
- Entregas

**Camadas disponíveis mas inativas por padrão:**
- Eventos de agenda externos

**Não entra no calendário:** Regras de ouro (ficam na Análise)

**Interações:**
- Arrastar conteúdos para mudar data
- Clicar abre detalhe
- Alertas de conflito visíveis (ex: dois posts no mesmo dia, mesmo pilar em sequência)

**Mobile:** visão semanal ou lista por dia  
**Desktop:** visão mensal completa

---

### `/ideias` — Ideias
**O que faz:** Hub de captura rápida. Ideias são promovidas para conteúdo.

**O que aparece:**
- Campo de criação rápida no topo (input fixo no mobile)
- Lista de ideias (ordenado por mais recente)
- Cada item: texto, tags opcionais, origem opcional

**Ações por item:**
- Promover para conteúdo (desaparece da lista)
- Promover para ideia mais elaborada (abre detalhe)
- Arquivar
- Vincular a origem da biblioteca

**Não obrigatório:** pilar e série — captura rápida sem fricção.

**Mobile:** input fixo no topo + lista vertical  
**Desktop:** input + lista lado a lado

---

### `/projetos` — Projetos
**O que faz:** Gestão de iniciativas com prazo e etapas — campanhas, publis, produções.

**O que aparece:**
- Lista: nome, tipo, status (calculado pelas etapas), prazo
- Botão "Novo projeto"

**Tipos de projeto:** campanha, publi/parceria, produção interna, outro  
**Ordenação:** por prazo

**Mobile:** lista simples  
**Desktop:** lista + detalhes ao lado

---

### `/projetos/:id` — Detalhe do Projeto
**O que faz:** Controle de etapas, conteúdos vinculados e cronograma.

**Abas:**
1. **Visão geral** — status, prazos, financeiro (se publi)
2. **Etapas** — criar, editar, reordenar etapas customizáveis + status de cada uma
3. **Conteúdos** — vincular existentes ou criar novo
4. **Timeline** — visualização das etapas no tempo

**O que é automático:**
- Status do projeto calculado pelas etapas
- Datas das etapas refletidas no calendário

**Mobile:** abas empilhadas  
**Desktop:** abas com contexto lateral

---

### `/biblioteca` — Biblioteca
**O que faz:** Repertório de fontes (livros, filmes, séries).

**O que aparece:**
- Filtro por tipo (livro / filme / série)
- Lista/grid de itens: título, tipo, status de consumo
- Botão "Adicionar"

**Layout:**
- Mobile: grid de capas (visual)
- Desktop: grid ou lista configurável

---

### `/biblioteca/:id` — Item da Biblioteca
**O que faz:** Detalhe com anotações e conteúdos gerados.

**Abas:**
1. **Info** — dados do item
2. **Anotações** — criar, editar, marcar como potencial de conteúdo
   - Tipo padrão ao criar: `Anotação` (sem fricção)
   - Botão direto: "Criar ideia a partir desta anotação"
   - Botão direto: "Criar conteúdo a partir desta anotação" (pula a etapa de ideia)
3. **Conteúdos** — conteúdos gerados a partir deste item

**Mobile:** foco em anotação rápida  
**Desktop:** visão mais completa com todas as abas

---

### `/gravacao` — Gravação
**O que faz:** Ferramenta de execução — planejar e executar sessões de gravação em lote.

**2 modos:**

**Modo Planejamento:**
- Filtros: pilar, série, look, cenário, energia necessária
- Lista de conteúdos prontos para gravar
- Seleção manual de conteúdos
- Botão "Criar bloco" com nome
- Visualização de blocos existentes

**Modo Execução (Burst Mode):**
- HUD focado — roteiro em destaque
- Botão "Próximo" e "Marcar como gravado"
- Progresso (x de y gravados)
- Possibilidade de pausar e retomar
- Navegação contínua sem sair da tela

**Looks e cenários como tags operacionais:**  
O objetivo não é cadastrar looks, mas usá-los como filtros para agrupar conteúdos que podem ser gravados no mesmo setup visual — garantindo variedade na timeline de publicação.

**Mobile:** modo execução como HUD em tela cheia  
**Desktop:** modo execução com contexto lateral (notas, lista do bloco)

---

### `/gravacao/:id` — Bloco de Gravação
**O que faz:** Execução de um bloco específico.

- Lista dos conteúdos do bloco com ordem
- Progresso atual (x/y gravados)
- Modo foco: um conteúdo por vez com roteiro em destaque
- Botão "Marcar como gravado" avança para o próximo
- Pode pausar e retomar

---

### `/analise` -- Analise
**O que faz:** Leitura estrategica do conteudo sem julgamento. Substitui `results` como tela.

**Abas:**
1. **Leitura editorial** -- combinados ativos, pontos fora do padrao esperado e contexto para revisar
2. **Mix de Conteudo** -- distribuicao por pilar, serie e plataforma como mapa de presenca
3. **Resposta do publico** -- metricas agregadas dos conteudos postados para aprendizado

**O que e automatico:**
- Indicador de harmonia editorial da semana/mes
- Deteccao de pontos que talvez merecam revisao
- Sugestao de mix ("Humor ou Opiniao ficaram mais quietos neste periodo")
- Leitura entre intencao e realidade publicada (pilares, frequencia)

**Mobile:** visual simplificado (cards + blocos)  
**Desktop:** mais dados simultâneos

---

### `/configuracoes` — Configurações
**O que faz:** Gerenciamento de entidades de configuração.

**Organização por lógica:**

**Estratégia:**
- Pilares (CRUD completo, com cor e hashtags por plataforma)
- Regras de Ouro (configuráveis com parâmetros — tipo, condição, período, valor)
- DNA da Voz

**Conteúdo:**
- Séries (CRUD completo)
- Templates (nova entidade — estrutura de roteiros e publicações)
- Plataformas (as 4 padrão + personalizáveis)

**Produção:**
- Looks e Cenários (como tags operacionais para agrupamento, não cadastro formal)

**Mobile:** navegação por lista de seções  
**Desktop:** sidebar de seções + conteúdo lateral

---

## 5. AUTOMAÇÕES (sem IA — baseadas em dados internos)

### 5.1 — Sugestão "O que gravar hoje"
**Trigger:** usuário informa energia disponível (baixa / média / alta)  
**Lógica:**
1. Filtrar conteúdos com status "Pronto para Gravar"
2. Cruzar com `energia_necessaria` do conteúdo
3. Verificar regras de ouro (evitar violações)
4. Verificar planejamento (datas e distribuição)  
**Output:** "Você pode gravar 3 conteúdos hoje" + lista sugerida

### 5.2 -- Ponto para revisar
**Trigger:** ao salvar/planejar conteúdo  
**Lógica:** cruzar contra regras de ouro ativas  
**Output:** avisos gentis em tempo real -- nunca bloqueiam ação

### 5.3 -- Sugestao de Mix
**Trigger:** ao abrir Analise ou Calendario  
**Logica:** analisar ultimos N conteudos postados -> distribuicao por pilar  
**Output:** "[Pilar X] ficou mais quieto neste periodo" quando houver assimetria de presenca

### 5.4 — Pré-preenchimento de Hashtags
**Trigger:** ao criar conteúdo / selecionar pilar ou série  
**Lógica:** hashtags do pilar (base) + hashtags da série (adicionais) = sugestão editável  
**Output:** campo de hashtags pré-preenchido, editável manualmente

### 5.5 -- Leitura de Analise
**Trigger:** automatico, calculado sobre os dados existentes  
**Logica:**
- % de equilibrio de pilares vs. intencao configurada
- Frequencia de publicacao vs. ritmo desejado
- Pontos fora dos combinados ativos  
**Output:** indicador visual de harmonia editorial na tela de Analise

### 5.6 -- Caminhos possiveis
**Trigger:** ao abrir a tela de Conteúdos ou o Dashboard  
**Lógica baseada em regras simples:**
- energia baixa + conteúdos disponíveis → sugerir conteúdos leves
- agenda aberta + prontos para gravar → sugerir separar gravação
- muitos editados + datas combinadas chegando → sugerir revisar publicação  
**Output:** indicador visual "Caminho possível" por conteúdo

---

## 6. TEMPLATES (nova entidade)

Templates são estruturas reutilizáveis para roteiros e publicações.

**Podem ser:**
- Por plataforma (YouTube longo, YouTube Short, Reel, etc.)
- Por série (herda configuração da série)
- Por tipo de conteúdo

**Estrutura de um template:**
```json
{
  "blocos": [
    { "id": "1", "tipo": "fixo",    "label": "Gancho",  "conteudo": "texto fixo aqui" },
    { "id": "2", "tipo": "variavel", "label": "Corpo",   "placeholder": "[descreva aqui]" },
    { "id": "3", "tipo": "fixo",    "label": "CTA",     "conteudo": "Deixa nos comentários..." }
  ]
}
```

**Quando criar conteúdo:**
1. Usuário escolhe série ou plataforma
2. Sistema detecta template vinculado
3. Renderiza os blocos no editor
4. Campos editáveis disponíveis, blocos fixos pré-preenchidos

**Integração com o ecossistema:**
- Biblioteca → puxa referência do item de origem
- Pilares → hashtags base
- Séries → hashtags adicionais + identidade
- Conteúdo → dados dinâmicos (título, datas)

---

## 7. DECISÕES DE DESIGN

### Identidade visual
| Atributo | Decisão |
|----------|---------|
| **Nome** | Core Creator |
| **Tom** | Minimal, informacional, técnico, leve personalidade |
| **Objetivo** | Eficiência e leitura — não estética decorativa |
| **Referências** | Notion (clareza), Linear (eficiência), Raycast (ações rápidas) |

### Cores
- Manter base neutra e limpa (backgrounds quase-branco / escuro)
- Reduzir uso excessivo de cores fortes
- Cores como sinalização funcional: status, pilares, projetos
- Sem saturação visual desnecessária

### Tipografia
- UI geral: Inter (mantém)
- Títulos de página: fonte com mais identidade (a definir na implementação)
- Títulos: UPPERCASE **sem itálico**

### Componentes
- Cards: menos arredondados (quase reto — `rounded-md` ou `rounded-lg`, não `rounded-2xl`)
- Status: cor + ícone juntos
- Pilares: sempre com cor associada
- Modais:
  - Edição completa de conteúdo → full-screen
  - Confirmações rápidas → inline (sem modal)
  - Criação rápida (ideia, anotação) → bottom sheet (mobile) / inline (desktop)
- Dark mode: sim — uso principal em dark

### Mobile
- Sistema usado igualmente no celular e no computador
- Ações mais frequentes no celular: ver o que gravar, capturar ideia, consultar calendário, burst mode
- Editor de roteiro no mobile: modo foco (header reduzido, campo expandido)
- Layout por tela:
  - Conteúdos → grade 2 colunas
  - Ideias → lista vertical
  - Biblioteca → grid visual (capas)
  - Projetos/Parcerias → lista estruturada
  - Análise → cards + blocos

---

## 8. PÁGINAS ÓRFÃS — DECISÃO FINAL

| Página | Decisão |
|--------|---------|
| `Partnerships` | Conceito absorvido por `/projetos` (tipo: publi) |
| `ProjectCalendar` | Descartar — parcerias aparecem no `/calendario` |
| `Harvest` | Descartar — duplicação do `/calendario` |
| `ShootingDays` | Conceito evolui para `/gravacao` (modo execução) |
| `Agenda` | Mesclar com `/calendario` (eventos aparecem no calendário) |

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

> **Última atualização:** 2026-04-28  
> **Legenda:** ✅ Concluído · 🔲 Pendente · 🔄 Em progresso (tem erros TS) · ⏭ Descartado (decisão de design)  
> **Status geral:** 0 erros TypeScript — migração de `src/types.ts` → `src/lib/database.ts` concluída e `src/types.ts` deletado.

---

### 9.1 — Banco de dados
> Schema completo criado em `schema.sql` e executado no Supabase (projeto `aftffcaychrfffefkeoj`).

- ✅ Adicionar `user_id` em todas as tabelas + RLS total
- ✅ Criar tabela `platforms` (4 defaults + customizável por usuário)
- ✅ Criar tabela `pilar_plataformas` (substituir colunas fixas de hashtag)
- ✅ Criar tabela `serie_pilares` (N:N — série pode ter múltiplos pilares)
- ✅ Criar tabela `serie_plataformas` (hashtags por série e plataforma)
- ✅ Criar tabela `content_plataformas` (conteúdo → plataforma com data e legenda)
- ✅ Criar tabela `recording_block_contents` (substituir content_ids JSON)
- ✅ Criar tabela `projeto_etapas` (etapas customizáveis por projeto)
- ✅ Criar tabela `projeto_conteudos` (N:N projeto ↔ conteúdo)
- ✅ Criar tabela `content_metrics` (substituir results)
- ✅ Criar tabela `templates` (nova entidade)
- ✅ Criar tabela `biblioteca_generos` (gêneros customizáveis por usuário)
- ✅ `biblioteca_items` — unifica livros, filmes, séries com campo `tipo`
- ✅ `anotacoes` — FK para `biblioteca_items` (substituiu `book_annotations`)
- ✅ `projetos` — unifica campaigns + partnerships com campo `tipo`
- ✅ `energia_necessaria` em `contents`
- ✅ `script_notes` JSONB em `contents`
- ✅ Campo `time` em `agenda_items`
- ✅ `currency` em `projetos` (BRL padrão)
- ✅ `tags` como TEXT[] em `contents`
- ✅ Remover `caption`, `format`, `plataformas` JSON de `contents`
- ✅ Remover campo `destilada` de `anotacoes`
- ✅ Remover tabela `energy_logs`
- ✅ `user_preferences` (substituiu `app_config`)
- ✅ RLS em todas as 26 tabelas (políticas USING + WITH CHECK)
- ✅ 30 índices (partial indexes com `WHERE deleted_at IS NULL`)
- ✅ Trigger `handle_new_user()` — onboarding automático ao criar conta
- ✅ Trigger `set_updated_at()` — 7 tabelas

---

### 9.2 — Camada de dados (TypeScript + Supabase client)

- ✅ `src/lib/supabase.ts` — client configurado para o novo projeto
- ✅ `src/lib/database.ts` — 17 tipos TypeScript + `fetchAllData()` + save/delete por entidade
  - Todos os mappers DB snake_case → app camelCase
  - Junction tables gerenciadas explicitamente (pilar_plataformas, serie_pilares, content_plataformas, recording_block_contents, item_generos, projeto_conteudos)
- ✅ `src/context/AppContext.tsx` — reconstruído sem mock data, sem localStorage, auth-driven
- ✅ `src/context/reducer.ts` — 46 action types alinhados, 0 erros
- ✅ `.env.local` — credenciais do novo projeto Supabase

---

### 9.3 — Roteamento e shell

#### `src/App.tsx` ✅
Rotas corretas e funcionais. Redirects legados ativos (`/contents`, `/ideas`, `/editorial`, `/settings/*`). Três rotas são placeholders (`/projetos`, `/gravacao`, `/analise`). Onboarding desativado — trigger do Supabase cobre o básico.

#### `src/components/Sidebar.tsx` — pendente
- 🔲 Adicionar links: Projetos (`/projetos`), Gravação (`/gravacao`), Análise (`/analise`)
- 🔲 Adicionar sublinks em Configurações: Séries, Templates, Plataformas
- `state.books` na linha 154 funciona via alias — não bloqueia, mas atualizar para `state.bibliotecaItems`

#### `src/components/MobileNavBar.tsx` ✅ funcional
Usa `lib/database`, `state.bibliotecaItems`, Content shape correto, 0 erros TS.  
- 🔲 Atualizar itens de navegação para o novo design: Calendário | Projetos | FAB | Gravação | Análise (atualmente: Início | Calendário | FAB | Ideias | Conteúdos)

#### `src/pages/Settings.tsx` — pendente
- 🔲 Corrigir links internos: `/settings/dna` → `/configuracoes/dna`, etc. (App.tsx tem redirect mas melhor corrigir na fonte)

---

### 9.4 — Páginas

**ENTRADA**
- ✅ `/ideias` — `Ideas.tsx` — 0 erros, funcional
- ✅ `/biblioteca` — `Biblioteca.tsx` — 0 erros, funcional
- ✅ `/biblioteca/:id` — `BookDetail.tsx` — 0 erros, funcional

**PRODUÇÃO**
- ✅ `/conteudos` — `Contents.tsx` + `src/features/contents/` — 0 erros, funcional
- ✅ `ContentDetailModal.tsx` — 0 erros, funcional (usa `LegacyContent = any` internamente — dívida técnica, não bloqueia)
- 🔲 `/gravacao` — placeholder → criar `src/pages/Gravacao.tsx`
- 🔲 `/gravacao/:id` — não existe → criar `src/pages/GravacaoBloco.tsx`

**PLANEJAMENTO**
- ✅ `/calendario` — `EditorialCalendar.tsx` + `src/features/editorial-calendar/` — 0 erros, funcional
- 🔲 `/projetos` — placeholder → criar `src/pages/Projetos.tsx`
- 🔲 `/projetos/:id` — não existe → criar `src/pages/ProjetoDetalhe.tsx`

**CONTROLE**
- 🔲 `/analise` — placeholder → criar `src/pages/Analise.tsx`

**CONFIGURAÇÕES**
- ✅ `/configuracoes` — `Settings.tsx` — funcional (links internos apontam para `/settings/*` via redirect)
- ✅ `/configuracoes/pilares` — `settings/Pilares.tsx` — 0 erros, funcional
- ✅ `/configuracoes/dna` — `settings/DNAVoz.tsx` — 0 erros, funcional
- ✅ `/configuracoes/regras` — `settings/RegrasDeOuro.tsx` — 0 erros, funcional
- ✅ `/configuracoes/looks` — `settings/LooksScenarios.tsx` — 0 erros, funcional
- 🔲 `/configuracoes/series` — não existe → criar subpágina de CRUD de séries
- 🔲 `/configuracoes/templates` — não existe → criar subpágina
- 🔲 `/configuracoes/plataformas` — não existe → criar subpágina

**AUTH**
- ✅ `/login` — `Login.tsx` — funcional

---

### 9.5 — Componentes compartilhados

**✅ Completos:**
- `CalendarGrid.tsx`, `CalendarHoverCard.tsx`, `CalendarAgendaView.tsx`, `ContentQuickPreview.tsx`
- `ContentDetailModal.tsx` (funcional, `LegacyContent = any` é dívida técnica)
- `BookNotesModal.tsx` — já usa `lib/database`, funcional
- `MobileNavBar.tsx` — 0 erros, funcional
- Hooks: `useBodyScrollLock`, `useScrollDirection`
- Common: `ViewModeToggle`, shell: `PageScaffold`

**🔲 Pendentes:**
- `Sidebar.tsx` — adicionar novos links (Projetos, Gravação, Análise, sublinks de Config)
- `CommandPalette.tsx` — adicionar Projetos à busca; `state.partnerships` (alias) funciona mas melhorar
- `DNAVozDrawer.tsx` — verificar se campo `pilares` ainda aparece na UI
- `CSVUploadModal.tsx` — verificar compatibilidade com novo shape de Content
- `Onboarding.tsx` — verificar se ainda é chamado em algum lugar; se não, remover

---

### 9.6 — Limpeza de arquivos

**✅ Já deletados (não precisam de ação):**
- `src/pages/Dashboard.tsx`, `Results.tsx`, `ShootingDays.tsx`, `Agenda.tsx`
- `src/pages/Partnerships.tsx`, `ProjectCalendar.tsx`, `Harvest.tsx`
- `src/pages/Arquivos.tsx`, `Series.tsx`
- `src/types.ts`
- `src/constants.ts` — mock data já removido; arquivo está limpo

**🔲 Ainda existem, remover:**
- `schema.new.sql` — arquivo intermediário de migração

---

### 9.7 — Roteiro de execução (próximas etapas)

> Ordem sugerida por valor entregue e dependências técnicas.

#### Fase A — Limpeza rápida *(~1h)*
1. Remover `schema.new.sql`
2. Corrigir links internos em `Settings.tsx` (`/settings/*` → `/configuracoes/*`)
3. Atualizar `Sidebar.tsx`: adicionar Projetos, Gravação, Análise; adicionar sublinks de Config

#### Fase B — MobileNavBar redesign *(~1h)*
Atualizar os 4 itens fixos e o FAB para o novo design:
- Item 1: Calendário `/calendario`
- Item 2: Projetos `/projetos`
- FAB: Novo conteúdo | Nova ideia | Nova anotação (livro em consumo)
- Item 4: Gravação `/gravacao`
- Item 5: Análise `/analise`

#### Fase C — `/projetos` *(~1 dia)*
Criar `src/pages/Projetos.tsx` + `src/pages/ProjetoDetalhe.tsx`.

`Projetos.tsx` — lista:
- Filtro por tipo (`campanha | publi | producao | outro`) e status
- Ordenação por `dataFim` (prazo mais próximo primeiro)
- Card por projeto: nome, tipo, status calculado pelas etapas, brand (se publi), prazo
- Botão "Novo projeto" abre form inline ou bottom sheet
- Estado vazio com CTA

`ProjetoDetalhe.tsx` — 4 abas:
1. **Visão Geral** — nome, tipo, brand/brandColor (se publi), datas, valor, notas
2. **Etapas** — lista de `ProjetoEtapa[]` com status individual; adicionar/reordenar/excluir
3. **Conteúdos** — lista de conteúdos vinculados; botão "Vincular existente" + "Criar novo"
4. **Agenda** — itens de `AgendaItem` com `projetoId === id`; adicionar evento

Dispatch necessários: `ADD_PROJETO`, `UPDATE_PROJETO`, `DELETE_PROJETO` (já existem no reducer).

#### Fase D — `/gravacao` *(~1 dia)*
Criar `src/pages/Gravacao.tsx` + `src/pages/GravacaoBloco.tsx`.

`Gravacao.tsx` — dois modos:

**Modo Planejamento:**
- Filtros: pilar, série, look, cenário, energiaNecessaria
- Lista de conteúdos com status "Pronto para Gravar" (com checkboxes de seleção)
- Botão "Criar bloco" com nome
- Lista de blocos existentes com progresso (x/y gravados)

**Modo Execução (`/gravacao/:id`):**
- HUD focado: título + roteiro em destaque
- Botão "Marcar como gravado" → avança para próximo, despacha `UPDATE_CONTENT` com status `Gravado`
- Barra de progresso (x de y gravados)
- Navegar entre conteúdos sem sair da tela

Dispatch: `ADD_RECORDING_BLOCK`, `UPDATE_RECORDING_BLOCK`, `DELETE_RECORDING_BLOCK` (já existem).

#### Fase E — `/analise` *(~1 dia)*
Criar `src/pages/Analise.tsx` com 3 abas:

1. **Leitura editorial** — listar `state.goldenRules` ativas; para cada regra, calcular pontos fora dos combinados contra `state.contents` dos últimos N dias; indicador de harmonia editorial
2. **Mix de Conteúdo** — distribuição de conteúdos postados por pilar (últimos 30/90 dias); comparação com intenção de equilíbrio; sugestão "[Pilar X] ficou mais quieto neste período"
3. **Resposta do público** — agregar `state.contentMetrics` por conteúdo; top 5 por views, saves, comentários; total geral; filtro por plataforma

#### Fase F — Configurações faltando *(~0.5 dia cada)*
- `/configuracoes/series` — CRUD de séries: form com nome, template de roteiro, frequência, cor, bordão; listagem
- `/configuracoes/plataformas` — listar plataformas do usuário; toggle ativo/inativo; adicionar plataforma custom
- `/configuracoes/templates` — CRUD de templates de roteiro; estrutura de blocos fixos + variáveis

## Design System Editorial (Notion)

Componentes canônicos em `src/components/ui/` e `src/components/overlays/`:

| Componente | Uso |
|------------|-----|
| `PageLayout` | Todas as páginas desktop — header, toolbar, largura de conteúdo |
| `Text` | Hierarquia tipográfica (`pageTitle`, `sectionTitle`, `body`, `meta`, `label`) |
| `Surface` | Cards e blocos (`plain`, `outlined`, `interactive`, `elevated`) |
| `Section` | Título + descrição + ação + conteúdo |
| `ListItem` | Linhas operacionais e listas |
| `Badge` | Status curtos (único uppercase por default) |
| `OverlayRoot` / `Dialog` / `Drawer` / `BottomSheet` | Modais e painéis |

Tokens em `src/styles/index.css`: `--radius-card` (10px desktop), `--radius-card-mobile` (12px), sem `font-black` nem tamanhos arbitrários `9–11px`.

Verificação: `npm run lint:design`

#### Fase G — Dívida técnica *(quando houver tempo)*
- `ContentDetailModal.tsx` — substituir `LegacyContent = any` (29 ocorrências) por tipos corretos de `Content` e `ContentPlataforma`
- `CSVUploadModal.tsx` — verificar e adaptar para novo shape de Content
- `Onboarding.tsx` — remover ou simplificar (trigger do Supabase cobre o básico)
- `DNAVozDrawer.tsx` — remover campo `pilares` se ainda aparecer na UI
