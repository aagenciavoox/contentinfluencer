# PLAYBOOK — Core Creator
> Executar **uma tarefa por vez**. Verificar ✅ antes de avançar. Ref: SPEC.md para detalhes de schema/UI.
> Não pular fases. Não abrir múltiplos arquivos sem necessidade.

---

## QUICK REF

### Padrão de página
```tsx
import { useAppContext } from '../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function NomePagina() {
  const { state, dispatch } = useAppContext();
  // ...
}
```

### State shape (chaves relevantes)
```
state.contents          Content[]
state.ideas             Idea[]
state.pilares           Pilar[]
state.series            Serie[]
state.cenarios          Cenario[]
state.looks             Look[]
state.bibliotecaItems   BibliotecaItem[]
state.projetos          Projeto[]
state.recordingBlocks   RecordingBlock[]
state.templates         Template[]
state.agendaItems       AgendaItem[]
state.goldenRules       GoldenRule[]
state.contentMetrics    ContentMetric[]
state.platforms         Platform[]
state.dnaVoz            DnaVoz | null
state.preferences       Record<string, string>
```

### Dispatches disponíveis
```
ADD/UPDATE/DELETE_CONTENT · DELETE_MULTIPLE_CONTENTS
ADD/UPDATE/DELETE_IDEA · PROMOTE_IDEA
ADD/UPDATE/DELETE_PILAR
ADD/UPDATE/DELETE_SERIE
ADD/UPDATE/DELETE_CENARIO · ADD/UPDATE/DELETE_LOOK
ADD/UPDATE/DELETE_BIBLIOTECA_ITEM
ADD/UPDATE/DELETE_ANOTACAO
ADD/UPDATE/DELETE_PROJETO
ADD_PROJETO_ETAPA · UPDATE_PROJETO_ETAPA · DELETE_PROJETO_ETAPA  -- payload: { projetoId, etapa }
ADD/UPDATE/DELETE_RECORDING_BLOCK
UPDATE_BLOCK_CONTENTS  -- payload: { blockId, contents: RecordingBlockContent[] }
ADD/UPDATE/DELETE_TEMPLATE
ADD/UPDATE/DELETE_AGENDA_ITEM
ADD/UPDATE/DELETE_GOLDEN_RULE
ADD/UPDATE/DELETE_CONTENT_METRIC
UPDATE_DNA_VOZ · SET_DNA_VOZ
SET_PREFERENCE · UPDATE_PREFERENCE  -- payload: { key, value }
```

### Tipos — importar de
```
import type { Content, Projeto, RecordingBlock, ... } from '../lib/database';
```

### Componentes compartilhados
```
PageScaffold      -- shell de página com header
ViewModeToggle    -- toggle grid/lista
useBodyScrollLock -- hook para modais
```

### Convenções
- Formulários inline ou bottom sheet (mobile) — sem modal extra quando possível
- Status `calculado` de projeto = todas etapas concluídas → "concluído"; alguma em_andamento → "em_andamento"; senão → "pendente"
- Sempre 0 erros TS antes de marcar ✅
- dark mode: classes Tailwind `dark:` — fundo `bg-zinc-950`, superfície `bg-zinc-900`, borda `border-zinc-800`

---

## FASE A — Limpeza rápida (~30min, 3 tarefas)

### A1 — Deletar schema.new.sql
**Arquivo:** `schema.new.sql` (raiz do projeto)
**Ação:** deletar o arquivo
**✅ Feito quando:** arquivo não existe

---

### A2 — Corrigir links em Settings.tsx
**Arquivo:** `src/pages/Settings.tsx`
**Faz:** trocar hrefs internos de `/settings/*` para `/configuracoes/*`
**Mudanças:**
- `/settings/dna` → `/configuracoes/dna`
- `/settings/pilares` → `/configuracoes/pilares`
- `/settings/regras` → `/configuracoes/regras`
- `/settings/looks` → `/configuracoes/looks`
- Adicionar links novos: `/configuracoes/series`, `/configuracoes/plataformas`, `/configuracoes/templates`
**✅ Feito quando:** todos os links apontam para `/configuracoes/*`, 0 erros TS

---

### A3 — Atualizar Sidebar.tsx
**Arquivo:** `src/components/Sidebar.tsx`
**Faz:** adicionar novas rotas e sublinks de configurações
**Adicionar na nav principal:**
- Projetos → `/projetos`
- Gravação → `/gravacao`
- Análise → `/analise`

**Adicionar sublinks em Configurações:**
- Séries → `/configuracoes/series`
- Templates → `/configuracoes/templates`
- Plataformas → `/configuracoes/plataformas`

**Bonus:** na linha ~154 onde usa `state.books`, trocar para `state.bibliotecaItems`
**✅ Feito quando:** sidebar exibe todos os links, sem erros TS

---

## FASE B — MobileNavBar redesign (~30min, 1 tarefa)

### B1 — Reescrever itens da MobileNavBar
**Arquivo:** `src/components/MobileNavBar.tsx`
**Faz:** trocar os 5 slots para o novo design

**Nova ordem dos 4 itens fixos:**
1. Calendário → `/calendario`
2. Projetos → `/projetos`
3. *(FAB central — não mudar lógica, só atualizar itens)*
4. Gravação → `/gravacao`
5. Análise → `/analise`

**FAB — menu rápido (substituir itens atuais):**
- "Nova ideia" → abre form/sheet de criação de ideia
- "Novo conteúdo" → navega para `/conteudos` com modal de criação aberto (ou usa estado local)
- "Nova anotação" → abre form vinculado ao bibliotecaItem mais recente com status "Consumindo" (se não houver, permite escolher)

**✅ Feito quando:** navbar renderiza 5 slots corretos, FAB abre 3 opções, 0 erros TS

---

## FASE C — /projetos (~1 dia, 2 tarefas)

### C1 — src/pages/Projetos.tsx
**Arquivo:** `src/pages/Projetos.tsx` *(criar)*
**Rota já existe:** `/projetos` em App.tsx (placeholder → substituir)
**Dados:** `state.projetos`, `state.pilares`

**UI:**
- Header: título "PROJETOS" + botão "Novo projeto"
- Filtros: tipo (`campanha | publi | producao | outro`) + status calculado
- Ordenação: `dataFim` ASC (prazo mais próximo primeiro); sem prazo → fim da lista
- Card por projeto:
  - Nome + tipo badge
  - Status calculado das etapas (ver convenção acima)
  - `brand` (se tipo === 'publi')
  - `dataFim` formatado
  - Clique → navega para `/projetos/:id`
- Estado vazio: "Nenhum projeto ainda" + CTA "Criar projeto"
- Botão "Novo projeto" abre form inline com: `nome` (obrigatório), `tipo`, `dataFim`, `brand` (aparece só se tipo='publi'), `value`

**Dispatch:** `ADD_PROJETO` com objeto `Projeto` completo (gerar `id` com `crypto.randomUUID()`, `userId` do `useAuth()`)

**Mobile:** lista simples, cards full-width
**Desktop:** lista com max-width + sidebar para form novo projeto

**✅ Feito quando:** rota `/projetos` renderiza lista, botão cria projeto, 0 erros TS

---

### C2 — src/pages/ProjetoDetalhe.tsx
**Arquivo:** `src/pages/ProjetoDetalhe.tsx` *(criar)*
**Rota:** `/projetos/:id` *(adicionar em App.tsx)*
**Dados:** `state.projetos`, `state.agendaItems`, `state.contents`

**Estrutura de abas (4):**

**Aba 1 — Visão Geral**
- Campos editáveis inline: nome, tipo, brand/brandColor (se publi), dataInicio, dataFim, value/currency, notes
- Salvar → `UPDATE_PROJETO`
- Botão "Excluir projeto" → `DELETE_PROJETO` + navegar para `/projetos`

**Aba 2 — Etapas**
- Lista de `etapas` ordenadas por `ordem`
- Cada etapa: nome + status toggle (`pendente → em_andamento → concluída`) + dataPrazo
- Adicionar etapa: form inline → `ADD_PROJETO_ETAPA` com `{ projetoId: id, etapa: ProjetoEtapa }`
- Reordenar: botões ↑↓ → `UPDATE_PROJETO_ETAPA` com nova `ordem`
- Excluir: `DELETE_PROJETO_ETAPA` com `{ projetoId: id, etapaId }`

**Aba 3 — Conteúdos**
- Lista de `state.contents` onde `projetoId === id` (filtrar por projeto)
- Botão "Vincular existente" → dropdown/search de contents disponíveis → `UPDATE_CONTENT` com `projetoId`
- Botão "Criar novo" → navega para `/conteudos` com projetoId pré-selecionado

**Aba 4 — Agenda**
- Lista de `state.agendaItems` onde `projetoId === id`
- Adicionar evento: form inline → `ADD_AGENDA_ITEM` com `{ projetoId: id, title, date, time, tipo }`
- Excluir: `DELETE_AGENDA_ITEM`

**✅ Feito quando:** as 4 abas funcionam, CRUD de etapas funciona, 0 erros TS

---

## FASE D — /gravacao (~1 dia, 2 tarefas)

### D1 — src/pages/Gravacao.tsx
**Arquivo:** `src/pages/Gravacao.tsx` *(criar)*
**Rota:** `/gravacao` *(já existe como placeholder em App.tsx)*
**Dados:** `state.contents`, `state.recordingBlocks`, `state.pilares`, `state.series`, `state.cenarios`, `state.looks`

**2 seções na mesma página:**

**Seção Planejamento:**
- Filtros: pilar, série, look, cenário, energiaNecessaria
- Lista de `state.contents` com `status === 'Pronto p/ Gravar'` (após filtros)
- Checkbox por item para seleção
- Botão "Criar bloco" (ativo quando ≥1 selecionado) → input de nome → `ADD_RECORDING_BLOCK` + criar `RecordingBlockContent[]` para cada content selecionado via `UPDATE_BLOCK_CONTENTS`
- Estado vazio: "Nenhum conteúdo pronto para gravar"

**Seção Blocos existentes:**
- Lista de `state.recordingBlocks`
- Por bloco: nome + progresso (x/y gravados, calculado de `recordingBlockContents`)
- Clique → navega para `/gravacao/:id`
- Botão excluir bloco → `DELETE_RECORDING_BLOCK`

**✅ Feito quando:** lista filtra corretamente, criar bloco funciona, 0 erros TS

---

### D2 — src/pages/GravacaoBloco.tsx
**Arquivo:** `src/pages/GravacaoBloco.tsx` *(criar)*
**Rota:** `/gravacao/:id` *(adicionar em App.tsx)*
**Dados:** `state.recordingBlocks`, `state.contents`

**UI (HUD de execução):**
- Buscar `block = state.recordingBlocks.find(b => b.id === id)`
- Buscar `blockContents` (do block, ordenados por `ordem`)
- Estado local: `currentIndex` (0 ao iniciar)
- `currentContent = state.contents.find(c => c.id === blockContents[currentIndex].contentId)`
- Exibir: título do content em destaque + script (se houver) em área de leitura
- Barra de progresso: `gravados / total`
- Botão "Marcar como gravado":
  1. `UPDATE_CONTENT` com `{ ...currentContent, status: 'Gravado' }`
  2. Atualiza `blockContents[currentIndex].gravado = true` via `UPDATE_BLOCK_CONTENTS`
  3. Avança `currentIndex`
- Botão "Próximo" (sem marcar) → avança `currentIndex` sem mudar status
- Botão "Anterior" → recua `currentIndex`
- Quando todos gravados: tela de conclusão "Bloco concluído! 🎉" + botão voltar

**Mobile:** tela cheia, header mínimo, script ocupa 70% da tela
**Desktop:** script à esquerda, lista do bloco à direita

**✅ Feito quando:** HUD navega entre conteúdos, "Marcar gravado" atualiza status, progresso reflete, 0 erros TS

---

## FASE E — /analise (~1 dia, 3 tarefas)

### E1 — src/pages/Analise.tsx (shell + aba Regras de Ouro)
**Arquivo:** `src/pages/Analise.tsx` *(criar)*
**Rota:** `/analise` *(já existe como placeholder)*
**Dados:** `state.goldenRules`, `state.contents`

**Shell:** página com 3 abas — "Regras de Ouro" | "Mix de Conteúdo" | "Performance"

**Aba 1 — Regras de Ouro:**
- Listar `state.goldenRules` onde `ativa === true`
- Para cada regra, calcular violações:
  - Pegar `state.contents` com `status === 'Postado'` dos últimos `N` dias (N = 7 se periodo='semana', 30 se 'mês', 1 se 'dia')
  - Contar por `tipo` da regra (ex: tipo='pilar' → agrupar por pilarId, verificar se count respeita `condicao` + `valor`)
  - `max`: violação se count > valor · `min`: violação se count < valor · `recomendado`: aviso se fora do valor
- Exibir: nome da regra + status (✅ ok / ⚠️ aviso / ❌ violação) + detalhe em texto simples
- Score geral: `% de regras sem violação` → card no topo (ex: "7/10 regras cumpridas — 70%")
- Estado vazio: "Nenhuma regra de ouro configurada" + link para `/configuracoes/regras`

**✅ Feito quando:** aba renderiza, score calcula, 0 erros TS

---

### E2 — Aba Mix de Conteúdo (adicionar em Analise.tsx)
**Arquivo:** `src/pages/Analise.tsx` *(editar)*
**Dados:** `state.contents`, `state.pilares`

**Aba 2 — Mix de Conteúdo:**
- Filtro de período: 30 dias / 90 dias (state local)
- Calcular distribuição: pegar contents `status === 'Postado'` no período → agrupar por `pilarId` → calcular %
- Exibir por pilar: nome + cor + barra de progresso visual + contagem
- Detectar desequilíbrio: se algum pilar ativo está com 0 posts no período → card de sugestão "Você não postou nada de [Pilar X] nos últimos N dias"
- Se nenhum pilar tem mais que 80% → sem alerta (mix equilibrado)

**✅ Feito quando:** aba exibe distribuição correta com barras, sugestão aparece quando pilar ausente, 0 erros TS

---

### E3 — Aba Performance (adicionar em Analise.tsx)
**Arquivo:** `src/pages/Analise.tsx` *(editar)*
**Dados:** `state.contentMetrics`, `state.contents`, `state.platforms`

**Aba 3 — Performance:**
- Filtro: plataforma (dropdown com `state.platforms`)
- Total agregado: views, likes, saves, comments (cards de resumo)
- Top 5 por views: lista com título do content + plataforma + views
- Top 5 por saves: idem
- Se não há métricas: "Nenhuma métrica registrada ainda" + texto explicativo

**✅ Feito quando:** aba exibe totais e top 5, filtro por plataforma funciona, 0 erros TS

---

## FASE F — Config faltando (~0.5 dia cada, 3 tarefas)

### F1 — src/pages/settings/Series.tsx
**Arquivo:** `src/pages/settings/Series.tsx` *(criar)*
**Rota:** `/configuracoes/series` *(adicionar em App.tsx)*
**Dados:** `state.series`, `state.pilares`, `state.platforms`

**UI:**
- Lista de séries: nome + cor + frequência + status (ativa/inativa)
- Toggle ativo/inativo → `UPDATE_SERIE`
- Botão "Nova série" → form com: nome(NN), cor(hex), frequenciaRecomendada(`Semanal|Quinzenal|Mensal|Sob demanda`), estruturaRoteiro, bordao, slotPadrao, formatoVisualPadrao
- Clique na série → expansão inline com campos editáveis
- Excluir → `DELETE_SERIE`

**Dispatch:** `ADD_SERIE`, `UPDATE_SERIE`, `DELETE_SERIE`

**✅ Feito quando:** CRUD funciona, 0 erros TS

---

### F2 — src/pages/settings/Plataformas.tsx
**Arquivo:** `src/pages/settings/Plataformas.tsx` *(criar)*
**Rota:** `/configuracoes/plataformas` *(adicionar em App.tsx)*
**Dados:** `state.platforms`

**UI:**
- Lista de plataformas: nome + status ativo
- Toggle ativo/inativo → `UPDATE_PLATFORM` *(verificar se dispatch existe; se não: usar `UPDATE_PREFERENCE`)*
- Botão "Adicionar plataforma" → input de nome → `ADD_PLATFORM`
- Plataformas padrão (Instagram, TikTok, YouTube, Blog): não permitir excluir, apenas desativar

**✅ Feito quando:** lista exibe plataformas, toggle funciona, adicionar custom funciona, 0 erros TS

---

### F3 — src/pages/settings/Templates.tsx
**Arquivo:** `src/pages/settings/Templates.tsx` *(criar)*
**Rota:** `/configuracoes/templates` *(adicionar em App.tsx)*
**Dados:** `state.templates`, `state.series`, `state.platforms`

**UI:**
- Lista de templates: nome + série vinculada + plataforma vinculada + status
- Botão "Novo template" → form com: nome(NN), seriesId(opcional), platformId(opcional)
- Editor de blocos (estrutura JSONB):
  - Lista de blocos com: label + tipo(fixo|variavel) + conteúdo/placeholder
  - Adicionar bloco · Reordenar (↑↓) · Excluir bloco
  - Bloco fixo: campo de texto para `conteudo`
  - Bloco variável: campo para `placeholder`
- Salvar → `ADD_TEMPLATE` ou `UPDATE_TEMPLATE`
- Excluir → `DELETE_TEMPLATE`

**✅ Feito quando:** CRUD funciona, editor de blocos adiciona/remove/reordena, 0 erros TS

---

## FASE G — Dívida técnica (quando houver tempo)

### G1 — ContentDetailModal.tsx — substituir LegacyContent
**Arquivo:** `src/components/ContentDetailModal.tsx`
**Faz:** trocar `LegacyContent = any` (29 ocorrências) por tipos corretos de `Content` e `ContentPlataforma` de `../lib/database`
**Como:** ler o tipo `Content` exportado de `database.ts` → substituir props e variáveis internas
**✅ Feito quando:** 0 ocorrências de `LegacyContent`, 0 erros TS

---

### G2 — CSVUploadModal.tsx — compatibilidade com Content novo
**Arquivo:** `src/components/CSVUploadModal.tsx`
**Faz:** verificar se o shape de Content esperado no CSV bate com o novo tipo `Content` de `database.ts`
**Ajustar:** campos renomeados (`format` → `formatoVisual`, `plataformas` → array separado, `tags` como `TEXT[]`)
**✅ Feito quando:** upload de CSV não causa erros de tipo, 0 erros TS

---

### G3 — Onboarding.tsx + DNAVozDrawer.tsx
**Arquivo A:** `src/components/Onboarding.tsx`
**Ação A:** buscar onde é chamado (Grep por `<Onboarding`); se nenhum resultado → remover o componente; se chamado → verificar se ainda faz sentido (trigger do Supabase já faz onboarding básico)

**Arquivo B:** `src/components/DNAVozDrawer.tsx`
**Ação B:** verificar se campo `pilares` ainda aparece na UI; se sim → remover (pilares vivem em `state.pilares`, não no dnaVoz)
**✅ Feito quando:** sem referências mortas, 0 erros TS

---

## CHECKLIST DE PROGRESSO

```
FASE A  [x] A1 schema.new.sql  [x] A2 Settings links  [x] A3 Sidebar links
FASE B  [x] B1 MobileNavBar
FASE C  [x] C1 Projetos.tsx    [x] C2 ProjetoDetalhe.tsx
FASE D  [x] D1 Gravacao.tsx    [x] D2 GravacaoBloco.tsx
FASE E  [x] E1 Analise+Regras  [x] E2 Mix              [x] E3 Performance
FASE F  [x] F1 Series          [x] F2 Plataformas       [x] F3 Templates
FASE G  [x] G1 LegacyContent   [x] G2 CSV              [x] G3 Onboarding+DNA
```
