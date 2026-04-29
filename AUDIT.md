# AUDIT.md — Content OS
> Gerado em: 2026-04-27  
> Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase (PostgreSQL)  
> Base analisada: 73 arquivos TSX/TS, ~11.632 linhas, 18 tabelas no banco

---

## 1. ENTIDADES E DADOS

### `app_config`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| key | TEXT (PK) | sim |
| value | TEXT | sim |

**Função:** Armazenamento key-value global (tema, onboarding_completo).  
**[PROBLEMA]** Sem `user_id`. Em ambiente multi-usuário, as configurações se tornam globais e compartilhadas entre todas as contas.  
**[ ] Como você quer separar configurações globais do app de preferências por usuário?**

---

### `dna_voz`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK fixo = 1) | sim |
| promessa_central | TEXT | não |
| publico | TEXT | não |
| tom | TEXT | não |
| pilares | JSON | não |
| nao_faco | JSON | não |
| alertas | JSON | não |

**Função:** Configuração de identidade da criadora (single-row por usuário).  
**[PROBLEMA]** `id = 1` fixo implica design single-user, mas a tabela filtra por `user_id`. Entidade criada para single-user e adaptada para multi-user depois, sem refactor completo.  
**[VERIFICAR]** Os campos `pilares`, `nao_faco`, `alertas` são JSONs cujo conteúdo pode se sobrepor à tabela `pilares`. Se sim, há duplicação de dados entre as duas entidades.  
**[ ] Essa entidade é uma por usuário ou uma global do sistema?**  
**[ ] O conteúdo JSON de `pilares` aqui é o mesmo que está na tabela `pilares`?**

---

### `pilares`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| nome | TEXT | sim |
| descricao | TEXT | não |
| cor | TEXT (hex) | não |
| hashtags_instagram | TEXT | não |
| hashtags_tiktok | TEXT | não |
| hashtags_youtube | TEXT | não |
| template_legenda | TEXT | não |
| ativo | BOOL | sim |

**Pré-populado com:** 7 pilares (Humor, Análise, Identificação, Opinião, Indicação, Cultura Pop, Ciência).  
**[PROBLEMA]** Sem `user_id`. Pilares são compartilhados entre todos os usuários.  
**[PROBLEMA]** Hashtags em colunas fixas por plataforma. Adicionar uma plataforma nova exige alterar o schema.  
**[PROBLEMA]** Nas tabelas `contents` e `ideas`, o campo `pillar` é uma **string solta**, não um FK para esta tabela. Mudar o nome de um pilar não atualiza os conteúdos vinculados — dados se tornam inconsistentes silenciosamente.  
**[ ] Pilares são por usuário ou pré-definidos globais do sistema?**  
**[ ] Hashtags por plataforma devem continuar como colunas fixas ou virar uma tabela `pilar_plataformas`?**  
**[ ] `contents.pillar` e `ideas.pillar` devem virar FKs reais para esta tabela?**

---

### `series`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| name | TEXT | sim |
| template | TEXT | não |
| notes | TEXT | não |
| pilar_id | INT (FK → pilares) | não |
| slot_padrao | TEXT | não |
| plataformas_principais | JSON | não |
| formato_visual_padrao | TEXT | não |
| estrutura_roteiro | TEXT | não |
| bordao | TEXT | não |
| cor | TEXT | não |
| ativa | BOOL | sim |
| frequencia_recomendada | TEXT | não |

**Pré-populado com:** 7 séries.  
**[PROBLEMA]** `pilar_id` está corretamente como FK aqui — o que contrasta com `contents.pillar` e `ideas.pillar` como strings. Inconsistência de design na mesma base de código.  
**[PROBLEMA]** `plataformas_principais` é array JSON — não é possível consultar "quais séries publicam no YouTube" sem filtro no app.  
**[PROBLEMA]** Sem `user_id`.  
**[ ] Séries são por usuário ou templates globais do sistema?**

---

### `looks` e `cenarios`

**`cenarios`:** id, nome, descricao, tempo_setup_minutos, ativo  
**`looks`:** id, numero, descricao, cenario_associado_id (FK → cenarios), ativo

**[PROBLEMA]** Sem `user_id` em nenhuma das duas.  
**[PROBLEMA]** `contents.scenario` é uma **string solta** (não FK para `cenarios`). Cenários renomeados não refletem em conteúdos existentes.  
**[ ] Looks e cenários são por usuário ou opções globais do sistema?**  
**[ ] `contents.scenario` deve virar um FK para `cenarios.id`?**  
**[ ] Looks e cenários existem no sistema novo ou essa feature é descartada?**

---

### `books`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| titulo | TEXT | sim |
| autor | TEXT | não |
| generos | JSON | não |
| capa_url | TEXT | não |
| status_leitura | TEXT | sim |
| data_inicio | DATE | não |
| data_fim | DATE | não |
| avaliacao | INT (1-5) | não |
| notas_gerais | TEXT | não |
| created_at | TIMESTAMP | sim |
| paginas_lidas | INT | não |
| total_paginas | INT | não |
| editora | TEXT | não |
| ano_publicacao | INT | não |
| isbn | TEXT | não |
| idioma | TEXT | não |
| traducao | TEXT | não |
| serie_colecao | TEXT | não |
| quem_indicou | TEXT | não |
| motivo_escolha | TEXT | não |
| potencial_conteudo | TEXT | não |
| capitulos_cobertos | TEXT | não |

**[PROBLEMA]** Sem `user_id`. Biblioteca compartilhada entre todos os usuários.  
**[PROBLEMA]** `generos` é JSON array — não permite consultar "todos os livros de Fantasy" com query direta.  
**[VERIFICAR]** `potencial_conteudo` em `books` parece redundante com anotações do tipo `'Ideia de conteúdo'` em `book_annotations`. Os mesmos dados podem estar sendo salvos nos dois lugares.  
**[ ] Biblioteca é por usuário?**  
**[ ] `generos` deve virar uma relação separada ou pode continuar como JSON?**  
**[ ] `potencial_conteudo` em books e `content_potential` em book_annotations: qual é a diferença intencional?**

---

### `book_annotations`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| livro_id | INT (FK → books) | sim |
| texto | TEXT | sim |
| tipo | TEXT (enum) | sim |
| capitulo_ref | TEXT | não |
| destilada | BOOL | não |
| user_id | UUID | não |
| content_potential | BOOL | não |
| deleted_at | TIMESTAMP | não |
| created_at | TIMESTAMP | sim |

**[PROBLEMA]** `book_annotations` tem `user_id` mas `books` não. Um usuário pode anotar um livro que pertence a outro usuário.  
**[PROBLEMA]** `destilada` e `content_potential` são duas flags booleanas com semântica similar. A diferença intencional entre elas não está clara no código.  
**[ ] A relação entre `user_id` nas anotações e a ausência de `user_id` nos livros é intencional?**  
**[ ] `destilada` e `content_potential` têm semânticas diferentes ou é duplicação?**

---

### `contents`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| title | TEXT | sim |
| series_id | INT (FK → series) | não |
| pillar | TEXT | não |
| format | TEXT | não |
| status | TEXT (enum) | sim |
| slot_type | TEXT (enum) | não |
| publish_date | DATE | não |
| recording_date | DATE | não |
| look_id | INT (FK → looks) | não |
| scenario | TEXT | não |
| estimated_duration | TEXT | não |
| link | TEXT | não |
| script | TEXT | não |
| caption | TEXT | não |
| tags | TEXT | não |
| notes | TEXT | não |
| references | TEXT | não |
| plataformas | JSON | não |
| formato_visual | TEXT | não |
| livro_origem_id | INT (FK → books) | não |
| legendas | JSON (Record<Platform, string>) | não |
| created_at | TIMESTAMP | sim |

**[PROBLEMA]** `pillar` é string solta, não FK para `pilares`. `scenario` é string solta, não FK para `cenarios`. Ambos quebram integridade referencial.  
**[PROBLEMA]** `caption` (string) e `legendas` (JSON por plataforma) resolvem o mesmo problema em campos diferentes. Não está claro qual é legado e qual é o atual — os dados podem estar duplicados nos dois lugares.  
**[PROBLEMA]** `legendas` como JSON impede consultas como "todos os conteúdos com legenda para YouTube".  
**[PROBLEMA]** `plataformas` é array JSON — mesmo problema de outras entidades.  
**[PROBLEMA]** `tags` é uma string — provavelmente CSV separado por vírgula. Filtro por tag exata requer LIKE ou parsing no app.  
**[ ] `caption` vs `legendas`: qual sobrevive no sistema novo?**  
**[ ] `legendas` deve virar uma tabela `content_captions(content_id, platform, text)`?**  
**[ ] `pillar` e `scenario` devem virar FKs reais?**  
**[ ] `tags` deve ser normalizada em tabela separada?**

---

### `ideas`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| text | TEXT | sim |
| created_at | TIMESTAMP | sim |
| pillar | TEXT | não |
| series_id | INT (FK → series) | não |
| promoted_to_content_id | INT (FK → contents) | não |
| archived | BOOL | não |
| livro_origem_id | INT (FK → books) | não |

**[PROBLEMA]** Mesma inconsistência de `pillar` como string solta.  
**[ ] Ideias arquivadas devem ser soft-deleted ou manter status separado?**  
**[ ] Ideias promovidas devem continuar visíveis na lista?**

---

### `partnerships`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| brand | TEXT | sim |
| brand_color | TEXT (hex) | não |
| title | TEXT | sim |
| status | TEXT (enum) | sim |
| deadline | DATE | não |
| publish_date | DATE | não |
| recording_date | DATE | não |
| value | REAL | não |
| notes | TEXT | não |
| script | TEXT | não |
| link | TEXT | não |
| created_at | TIMESTAMP | sim |
| delivered_on_time | BOOL | não |
| relationship_quality | INT (1-5) | não |
| would_do_again | BOOL | não |

**[PROBLEMA]** Sem `user_id`.  
**[PROBLEMA]** `value` sem campo `currency` — valor financeiro sem contexto de moeda.  
**[VERIFICAR]** Se `brand_color` ficar vazio, o UI renderiza algum fallback ou quebra?  
**[ ] Uma parceria pode ter múltiplos conteúdos vinculados ou é sempre 1-para-1?**

---

### `results`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| content_id | INT (FK → contents) | não |
| partnership_id | INT (FK → partnerships) | não |
| metrics | TEXT | não |
| qualitative_notes | TEXT | não |
| worth_it | TEXT ('Sim'\|'Não'\|'Mais ou menos') | não |
| engagement | TEXT | não |
| creative_satisfaction | INT (1-5) | não |
| learning_by_series | TEXT | não |
| created_at | TIMESTAMP | sim |

**[PROBLEMA]** `metrics` é TEXT armazenando JSON — não é possível filtrar por "conteúdos com mais de X views" sem parsear no app.  
**[PROBLEMA]** `worth_it` com valor 'Mais ou menos' dificulta lógica condicional — string longa para comparar em código.  
**[ ] Quais métricas precisam ser consultáveis/filtráveis no sistema novo?**  
**[ ] `worth_it` deve ser normalizado para enum ou escala numérica?**

---

### `agenda_items`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| title | TEXT | sim |
| date | TEXT (ISO) | sim |
| type | TEXT (enum) | sim |
| slot_type | TEXT | não |
| external | BOOL | não |

**[PROBLEMA]** Sem `user_id`.  
**[PROBLEMA]** `external` (bool) é frágil — se surgirem outros tipos de origem além de "externo/interno", o campo não comporta.  
**[ ] Agenda items têm horário (não apenas data) no sistema novo?**

---

### `energy_logs`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| date | TEXT (ISO, PK) | sim |
| level | INT (1-5) | sim |

**[PROBLEMA]** Sem `user_id` — logs de energia compartilhados entre todos os usuários.  
**[ ] Energy logs devem continuar existindo no sistema novo?**

---

### `recording_blocks`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| name | TEXT | sim |
| content_ids | JSON (array) | sim |
| created_at | TIMESTAMP | sim |

**[PROBLEMA]** `content_ids` é um array JSON de IDs — relação muitos-para-muitos implementada como dado denormalizado. Não é possível consultar "em qual bloco está o conteúdo X" sem escanear todos os blocos. Deveria ser uma tabela `recording_block_contents(block_id, content_id)`.  
**[ ] Recording blocks devem ter data associada?**  
**[ ] `content_ids` deve virar tabela de junção?**

---

### `golden_rules`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| descricao | TEXT | sim |
| tipo | TEXT ('error'\|'warning'\|'info') | sim |
| ativa | BOOL | sim |

**Pré-populado com:** 7 regras.  
**[PROBLEMA]** Sem `user_id`.  
**[ ] Regras de ouro são globais do sistema ou personalizáveis por criadora?**

---

### `campaigns`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| id | INT (PK) | sim |
| user_id | UUID (FK → auth.users) | sim |
| nome | TEXT | sim |
| livro_id | INT (FK → books) | sim |
| data_inicio | DATE | não |
| data_fim | DATE | não |
| meta_conteudos | INT | não |
| status | TEXT (enum) | sim |
| created_at | TIMESTAMP | sim |
| deleted_at | TIMESTAMP | não |

**[PROBLEMA] Inconsistência crítica de multi-tenancy:** `campaigns` e `book_annotations` têm `user_id`. As demais tabelas — `books`, `pilares`, `series`, `contents`, `ideas`, `partnerships`, `agenda_items`, `energy_logs`, `golden_rules`, `recording_blocks` — **não têm**. O modelo de isolamento de dados por usuário está incompleto e inconsistente.  
**[PROBLEMA]** Sem FK entre `campaigns` e `contents` — uma campanha tem meta de conteúdos (`meta_conteudos`) mas não sabe quais conteúdos foram criados para ela. O vínculo é inferido via `contents.livro_origem_id`, não explícito.  
**[ ] Qual é a estratégia de multi-tenancy do sistema novo? RLS por `user_id` em todas as tabelas, ou o sistema é single-user?**  
**[ ] Campanhas devem vincular conteúdos explicitamente via FK?**

---

### Problemas Transversais de Dados

**[PROBLEMA] Mock data em produção:** `AppContext.tsx` contém 3 conteúdos e 3 ideias hardcoded (`mock-1`, `mock-2`, `mock-3`) como fallback. Se o Supabase não estiver configurado, esses dados aparecem na interface como se fossem dados reais.

**[PROBLEMA] Dois mecanismos de persistência paralelos:** os dados são salvos tanto no Supabase quanto no localStorage (`content_os_data`). Não está claro qual fonte é autoritativa em caso de conflito entre os dois.

**[PROBLEMA] Schema divergente:** existe um `schema.sql` (445 linhas) e uma pasta `migrations/` com 2 arquivos. A versão canônica do banco não está clara — se as migrations não forem aplicadas em ordem, o banco pode estar em estado diferente do `schema.sql`.

**[VERIFICAR] `express` como dependência:** `express@4.21.2` está no `package.json` mas nenhum uso foi encontrado no código-fonte. Provavelmente resquício de versão anterior com backend próprio.

---

## 2. PÁGINAS E TELAS

### `/` — Dashboard
**O que faz:** Painel principal com pipeline de conteúdo, registro de energia diária e tarefas do dia.  
**Entidades consumidas:** `contents`, `ideas`, `partnerships`, `energy_logs`, `agenda_items`, `series`  
**Problemas:**  
- [PROBLEMA] Sem paginação — toda a aplicação carrega todos os registros de todas as tabelas no startup via `fetchAllData()` com `Promise.all()` de 16 queries paralelas.  
- [PROBLEMA] Sem tratamento de erro visível — se o Supabase falhar, o app cai silenciosamente para localStorage ou estado vazio.  
- [VERIFICAR] Sem error boundaries React — erros em subcomponentes podem derrubar a página inteira.  
**[ ] Quais métricas e widgets devem aparecer no Dashboard do sistema novo?**  
**[ ] Existe versão mobile pensada para o Dashboard?**

---

### `/contents` — Contents
**O que faz:** Inventário completo de conteúdos com filtros, ordenação e três modos de visualização (tabela, timeline, ecossistema).  
**Entidades consumidas:** `contents`, `series`, `pilares`, `looks`, `books`  
**Problemas:**  
- Sem paginação — todos os conteúdos em memória.  
- [VERIFICAR] A view `ContentEcosystem` (grafo de relacionamentos) está completamente implementada e funcional ou é parcial?  
- [VERIFICAR] As três views funcionam corretamente em telas < 768px.  
**[ ] Quais filtros são obrigatórios no sistema novo?**  
**[ ] A view de ecossistema (grafo) tem utilidade real ou pode ser removida?**  
**[ ] Existe versão mobile pensada?**

---

### `/ideas` — Ideas
**O que faz:** Captura e arquivamento de ideias com fluxo de promoção para `contents`.  
**Entidades consumidas:** `ideas`, `series`, `pilares`, `books`  
**Problemas:**  
- [VERIFICAR] O estado visual de uma ideia após ser promovida (`promoted_to_content_id` preenchido) não foi auditado — a ideia desaparece da lista ou fica marcada de alguma forma?  
**[ ] Ideias promovidas devem ficar visíveis na lista de ideias ou serem ocultadas automaticamente?**

---

### `/arquivos` — Arquivos
**O que faz:** [VERIFICAR] Função exata não ficou clara na exploração — pode ser conteúdos arquivados ou arquivos de mídia.  
**[PROBLEMA]** O nome "Arquivos" é ambíguo. A função desta página precisa ser verificada diretamente no código de `Arquivos.tsx`.  
**[ ] O que esta tela deve fazer no sistema novo?**

---

### `/series/:id` — Series Detail
**O que faz:** Detalhe e gerenciamento de uma série com seus conteúdos vinculados.  
**Entidades consumidas:** `series`, `contents`, `pilares`  
**[ ] Como essa tela deve se comportar no sistema novo? Existe versão mobile pensada?**

---

### `/results` — Results
**O que faz:** Análise post-mortem de conteúdos e parcerias com métricas quantitativas e reflexões qualitativas.  
**Entidades consumidas:** `results`, `contents`, `partnerships`, `series`  
**Problemas:**  
- [VERIFICAR] `results.metrics` é TEXT (JSON) — há validação de formato antes de parsear, ou o app pode quebrar com dados malformados?  
**[ ] Quais métricas específicas devem ser inputadas e exibidas no sistema novo?**

---

### `/editorial` — Editorial Calendar
**O que faz:** Calendário editorial com múltiplas camadas (gravações, publicações, parcerias, regras de ouro).  
**Entidades consumidas:** `contents`, `partnerships`, `agenda_items`, `golden_rules`, `series`  
**Problemas:**  
- `/calendar` redireciona para `/editorial` — sugere renomeação de rota em algum momento; bookmarks antigos podem estar quebrados.  
- [VERIFICAR] View de agenda em mobile com múltiplos eventos no mesmo dia funciona corretamente?  
**[ ] Como essa tela deve se comportar no sistema novo? Existe versão mobile pensada?**

---

### `/biblioteca` — Biblioteca
**O que faz:** Biblioteca de livros com filtros por status de leitura e gênero.  
**Entidades consumidas:** `books`, `book_annotations`  
**Problemas:**  
- Sem paginação — toda a biblioteca carregada de uma vez com anotações (eager load via JOIN).  
**[ ] Como essa tela deve se comportar no sistema novo? Existe versão mobile pensada?**

---

### `/biblioteca/:id` — Book Detail
**O que faz:** Detalhe de um livro com suas anotações organizadas por tipo.  
**Entidades consumidas:** `books`, `book_annotations`, `contents`, `campaigns`  
**[ ] Como essa tela deve se comportar no sistema novo?**

---

### `/settings` — Settings
**O que faz:** Configurações gerais do sistema.  
**Entidades consumidas:** `app_config`  
**[ ] Quais configurações devem existir no sistema novo?**

---

### `/settings/pilares`
**O que faz:** CRUD de pilares de conteúdo.  
**[ ] Pilares são editáveis livremente ou têm restrições (ex: não deletar pilar com conteúdos vinculados)?**

---

### `/settings/looks`
**O que faz:** CRUD de looks visuais e cenários de gravação.  
**[ ] Looks e cenários existem no sistema novo ou essa feature é descartada?**

---

### `/settings/regras`
**O que faz:** Editor de regras editoriais com tipos (error/warning/info).  
**[ ] Regras de ouro são por usuário no sistema novo?**

---

### `/settings/dna`
**O que faz:** Configuração da identidade da criadora (promessa central, público, tom, pilares).  
**[ ] O DNA da Voz é por usuário ou pode ser editado colaborativamente?**

---

### `/login`
**O que faz:** Autenticação via Supabase Auth.  
**[VERIFICAR]** Não foi auditado se existe fluxo de recuperação de senha ou cadastro de novo usuário na interface.  
**[ ] Quais métodos de login existem no sistema novo (email/senha, OAuth, magic link)?**  
**[ ] Existe onboarding pós-cadastro?**

---

## 3. DESIGN E IDENTIDADE VISUAL

**[PROBLEMA: sem sistema de design centralizado]** Os tokens existem em `src/index.css` como variáveis CSS, mas não há arquivo de tema separado, storybook, ou documentação de componentes. Não existe componente `<Button>`, `<Input>`, ou `<Card>` centralizado — cada página estiliza seus elementos manualmente via classes Tailwind inline.

---

### Cores (CSS Variables)

**Tema Claro (`:root`):**
```
--bg-primary:      #FBFBFA
--bg-secondary:    #FFFFFF
--bg-hover:        #F1F1EF
--text-primary:    #37352F
--text-secondary:  rgba(55, 53, 47, 0.6)
--text-tertiary:   rgba(55, 53, 47, 0.4)
--border-color:    #EDECE9
--border-strong:   #E1E1E0
--accent-blue:     #2EAADC
--accent-purple:   #9065B0
--accent-pink:     #D44C47
--accent-orange:   #D9730D
--accent-green:    #448361
```

**Tema Escuro (`[data-theme='dark']`):**
```
--bg-primary:      #191919
--bg-secondary:    #202020
--bg-hover:        #2F2F2F
--text-primary:    #E3E3E3
--border-color:    #2F2F2F
--border-strong:   #3F3F3F
--accent-blue:     #3694D1
--accent-purple:   #9A6DD7
--accent-pink:     #E94B4B
--accent-orange:   #FFA344
--accent-green:    #529E72
```

**Status colors (conteúdo):**
```
--status-idea:      rgba(156,163,175,1)   [gray]
--status-ready:     #D9730D              [= accent-orange]
--status-recorded:  #9065B0              [= accent-purple]
--status-editing:   #F59E0B              [amber — SEM variável no set de accent]
--status-edited:    #2EAADC              [= accent-blue]
--status-scheduled: #06B6D4              [cyan — SEM variável no set de accent]
--status-posted:    #448361              [= accent-green]
```

**Inconsistência:** `--status-editing` (#F59E0B amber) e `--status-scheduled` (#06B6D4 cyan) não têm correspondentes no set de accent colors — são cores "soltas" fora do sistema.  
**[ ] O amber e o cyan devem entrar como accent colors ou os status colors são um conjunto independente?**

---

### Tipografia

| Fonte | Pesos | Uso |
|-------|-------|-----|
| Inter | 400, 500, 600, 700 | UI principal |
| JetBrains Mono | 400, 500 | Texto técnico/código |

**[PROBLEMA]** Fontes carregadas via Google Fonts (CDN externo). Em modo offline (PWA) sem cache pré-aquecido, a tipografia degrada para fallback do sistema operacional.  
**[PROBLEMA]** Sem escala tipográfica explícita nomeada (h1, h2, body-lg, body-sm, caption). Tamanhos são aplicados ad-hoc via classes Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`) sem garantia de consistência entre páginas.  
**[ ] Qual é a escala tipográfica do sistema novo?**  
**[ ] A fonte deve ser self-hosted para suporte offline confiável?**

---

### Espaçamentos

Container de página: `px-4` (mobile) / `px-10` (desktop) via `.page-container`  
Gap interno: `gap-2`, `gap-3`, `gap-4`, `gap-6` usados de forma mista  
Padding em cards: varia entre `p-3`, `p-4`, `p-5` sem regra definida

**[PROBLEMA]** Sem grade de espaçamento documentada — cada componente usa o que "parece certo".  
**[ ] Qual é a escala de espaçamento do sistema novo (ex: base 4px → 4, 8, 12, 16, 24, 32, 48)?**

---

### Componentes Visuais Recorrentes

**Botões:** Aplicados via classes Tailwind inline em cada componente. Sem componente `<Button>` com variantes.  
**Inconsistência encontrada:** O mesmo botão primário pode ter classes ligeiramente diferentes entre `/contents`, `/biblioteca` e `/editorial`.  
**[ ] Qual padrão de botão (variantes: primary, secondary, ghost, danger) deve existir?**

**Cards:** Sem componente `<Card>` centralizado. Bordas e padding aplicados manualmente em cada uso.  
**[ ] Cards devem ter um componente base reutilizável?**

**Inputs:** Sem componente `<Input>` ou `<Select>` centralizado — estilizados inline em formulários.  
**[ ] Qual padrão de input (tamanhos, estados: focus/error/disabled) deve existir?**

**Modais:** Três implementações diferentes coexistem:
- `ContentDetailModal` — full-screen
- `BottomSheetModal` — slide de baixo (mobile)
- `FixedPanelModal` — painel lateral direito

**[PROBLEMA]** Três padrões de modal sem documentação de quando usar cada um.  
**[ ] Quando usar BottomSheet vs FixedPanel vs full-screen?**

---

### Tailwind Config

**[VERIFICAR]** Não foi encontrado `tailwind.config.js` — o projeto usa Tailwind v4 com diretiva `@theme` no CSS. Válido para v4, mas os tokens customizados vivem somente em `index.css`, sem arquivo de configuração exportável.

---

## 4. FLUXOS E NAVEGAÇÃO

### Fluxo: Login / Autenticação
**Passos atuais:**
1. Usuário acessa qualquer rota
2. Se não autenticado → redirect para `/login`
3. Login via Supabase Auth
4. Redirect para `/` pós-login

**[VERIFICAR]** Não foi auditado se existe fluxo de recuperação de senha ou cadastro de novo usuário na interface.  
**[ ] Como esse fluxo deve funcionar no sistema novo? Existe onboarding pós-cadastro?**

---

### Fluxo: Captura de Ideia → Promoção para Conteúdo
**Passos atuais:**
1. Usuário cria ideia em `/ideas` (texto, pilar, série opcionais)
2. Ideia fica no estado não-arquivada
3. Usuário promove a ideia → cria `content` com `ideas.promoted_to_content_id` preenchido

**[VERIFICAR]** O estado visual de uma ideia promovida vs. não-promovida não foi auditado. A ideia desaparece da lista ao ser promovida ou fica visível com marcação diferente?  
**[ ] Como esse fluxo deve funcionar no sistema novo?**

---

### Fluxo: Pipeline de Status de Conteúdo
**Passos atuais:**
1. Conteúdo criado com status `'Ideia'`
2. Status avança manualmente: `Ideia → Pronto para Gravar → Gravado → A Editar → Editado → Programado → Postado`
3. Cada status tem cor via CSS variables

**Sem automação de transição** — tudo é manual.  
**[ ] Alguma transição de status deve ser automática (ex: data de publicação chegou → muda para 'Programado')?**

---

### Fluxo: Parceria (Partnership Pipeline)
**Passos atuais:**
1. Parceria criada com status `'Leitura'`
2. Status avança: `Leitura → Roteiro → Envio de Roteiro → Gravação → Edição → Aprovação → Postagem → Métricas → Finalizado`
3. Campos de avaliação pós-parceria disponíveis: `delivered_on_time`, `relationship_quality`, `would_do_again`

**[INCOMPLETO]** Não há vinculação direta entre `partnerships` e `contents` via FK. Uma parceria não tem conteúdo "filho" formal. O link é feito via `results.partnership_id` (registro pós-mortem), não no planejamento.  
**[ ] Uma parceria deve poder vincular múltiplos conteúdos ou sempre é 1-para-1?**

---

### Fluxo: Biblioteca → Anotação → Conteúdo
**Passos atuais:**
1. Usuário adiciona livro em `/biblioteca`
2. Acessa `/biblioteca/:id` e cria anotações por tipo
3. Anotações com `content_potential = true` ficam marcadas

**[INCOMPLETO]** O fluxo "anotação → ideia → conteúdo" está estruturalmente suportado pelos campos (`livro_origem_id` em `ideas` e `contents`), mas não foi auditado se existe UI que guia o usuário por esse fluxo de ponta a ponta ou se o usuário precisa navegar manualmente entre páginas.  
**[ ] O fluxo anotação → ideia → conteúdo tem UI dedicada de ponta a ponta no sistema novo?**

---

### Fluxo: Gravação em Bloco (Recording Blocks)
**Passos atuais:**
1. Usuário agrupa conteúdos em um `recording_block`
2. IDs ficam salvos como array JSON em `content_ids`

**[INCOMPLETO]** Não foi auditado se existe view dedicada para gerenciar blocos de gravação fora do contexto do calendário editorial. A feature existe no banco mas pode não estar exposta completamente na UI.  
**[ ] Recording blocks têm interface própria no sistema novo?**

---

### Fluxo: Campanha de Livro
**Passos atuais:**
1. Usuário cria campanha vinculada a um livro com período e meta de conteúdos
2. Status: `Planejando → Em Execução → Concluída`

**[INCOMPLETO]** Sem FK entre `campaigns` e `contents`. A campanha tem uma meta numérica mas não sabe quais conteúdos foram criados para ela. O vínculo só pode ser inferido via `contents.livro_origem_id`.  
**[ ] Campanhas devem vincular conteúdos explicitamente no sistema novo?**

---

### Fluxo: Navegação Geral

**Desktop:** Sidebar fixa com links principais + submenu de settings expansível + Command Palette (Cmd+K)  
**Mobile:** Bottom navigation bar com subset dos links principais

**[VERIFICAR]** O `MobileNavBar` não cobre todos os links do Sidebar (settings, series, etc.). Usuários mobile podem não ter acesso fácil às configurações.  
**[VERIFICAR]** Command Palette está acessível em mobile?  
**[ ] Quais rotas devem estar na navegação mobile do sistema novo?**

---

## 5. RESUMO DAS LACUNAS

### Dados e Entidades:
- [ ] Qual é a estratégia de multi-tenancy do sistema novo? RLS por `user_id` em todas as tabelas, ou o sistema é single-user?
- [ ] `app_config`: Como separar configurações globais do app de preferências por usuário?
- [ ] `dna_voz`: É uma entidade por usuário ou global do sistema?
- [ ] O conteúdo JSON de `pilares` em `dna_voz` é o mesmo dado da tabela `pilares`?
- [ ] Pilares são por usuário ou pré-definidos globais?
- [ ] Hashtags por plataforma em `pilares` devem continuar como colunas fixas ou virar uma tabela `pilar_plataformas`?
- [ ] `contents.pillar` e `ideas.pillar` devem virar FKs reais para a tabela `pilares`?
- [ ] Séries são por usuário ou templates globais?
- [ ] Looks e cenários são por usuário ou globais? Existem no sistema novo?
- [ ] `contents.scenario` deve virar FK para `cenarios.id`?
- [ ] Biblioteca é por usuário?
- [ ] `generos` em `books` deve virar relação separada ou continuar como JSON?
- [ ] `potencial_conteudo` em `books` e `content_potential` em `book_annotations`: diferença intencional ou duplicação?
- [ ] A ausência de `user_id` em `books` vs. presença em `book_annotations` é intencional?
- [ ] `destilada` e `content_potential` em `book_annotations` têm semânticas diferentes ou é duplicação?
- [ ] `caption` vs `legendas` em `contents`: qual sobrevive?
- [ ] `legendas` deve virar uma tabela `content_captions(content_id, platform, text)`?
- [ ] `pillar` e `scenario` em `contents` e `ideas` devem virar FKs reais?
- [ ] `tags` em `contents` deve ser normalizada em tabela separada?
- [ ] Ideias arquivadas devem ser soft-deleted ou manter status separado?
- [ ] Uma parceria pode vincular múltiplos conteúdos ou sempre é 1-para-1?
- [ ] Quais métricas em `results.metrics` precisam ser consultáveis/filtráveis?
- [ ] `worth_it` em `results` deve ser normalizado para enum ou escala numérica?
- [ ] Agenda items têm horário (não apenas data) no sistema novo?
- [ ] Energy logs devem continuar existindo no sistema novo?
- [ ] `recording_blocks.content_ids` deve virar tabela de junção `recording_block_contents`?
- [ ] Regras de ouro são globais ou personalizáveis por criadora?
- [ ] Campanhas devem vincular conteúdos explicitamente via FK?
- [ ] `express` como dependência não utilizada pode ser removido?
- [ ] `schema.sql` vs `migrations/`: qual é a fonte canônica de verdade do banco?

### Telas e Páginas:
- [ ] Quais widgets devem aparecer no Dashboard do sistema novo?
- [ ] Existe versão mobile pensada para o Dashboard?
- [ ] Quais filtros são obrigatórios na tela de conteúdos do sistema novo?
- [ ] A view de ecossistema (grafo) em `/contents` tem utilidade real ou pode ser removida?
- [ ] Ideias promovidas devem ficar visíveis na lista de ideias ou serem ocultadas automaticamente?
- [ ] O que a tela `/arquivos` deve fazer no sistema novo?
- [ ] Looks e cenários (`/settings/looks`) existem no sistema novo ou a feature é descartada?
- [ ] Regras de ouro são por usuário no sistema novo?
- [ ] DNA da Voz é por usuário ou editado colaborativamente?
- [ ] Quais métodos de login existem no sistema novo?
- [ ] Existe fluxo de cadastro/recuperação de senha na interface?
- [ ] Qual estratégia de paginação para as listas de conteúdos, ideias e biblioteca?

### Design:
- [ ] O amber (#F59E0B) e o cyan (#06B6D4) dos status devem entrar como accent colors?
- [ ] A fonte Inter deve ser self-hosted para suporte offline confiável?
- [ ] Qual é a escala tipográfica do sistema novo (heading, body, caption)?
- [ ] Qual padrão de botão (variantes: primary, secondary, ghost, danger) deve existir?
- [ ] Cards devem ter um componente base reutilizável?
- [ ] Qual padrão de input (tamanhos, estados: focus/error/disabled) deve existir?
- [ ] Quando usar BottomSheet vs FixedPanel vs full-screen modal?
- [ ] Qual é a escala de espaçamento do sistema novo (4px base)?

### Fluxos:
- [ ] Como o fluxo de login deve funcionar no sistema novo? Existe onboarding pós-cadastro?
- [ ] O estado visual de uma ideia promovida é distinto da não-promovida na UI?
- [ ] Alguma transição de status de conteúdo deve ser automática?
- [ ] Uma parceria deve poder vincular múltiplos conteúdos?
- [ ] O fluxo anotação → ideia → conteúdo tem UI dedicada de ponta a ponta?
- [ ] Recording blocks têm interface própria no sistema novo?
- [ ] Campanhas devem vincular conteúdos explicitamente?
- [ ] Quais rotas devem estar na navegação mobile do sistema novo?
- [ ] O Command Palette (Cmd+K) deve ser acessível em mobile?
