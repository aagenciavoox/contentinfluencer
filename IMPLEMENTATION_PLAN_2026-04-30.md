# Plano de Implementacao

## Objetivo
Preparar o sistema para separar claramente:

- fluxo editorial pre-gravacao
- fluxo de producao e historico
- configuracoes modulares
- modelos de dados mais flexiveis para biblioteca, templates e regras

Este plano assume uma estrategia de rollout em duas camadas:

1. migracoes SQL aditivas e seguras
2. adaptacao progressiva da UI e do estado, sem quebrar o fluxo atual

## Principios de rollout

- Fazer primeiro mudancas aditivas de schema. Nada destrutivo antes de a UI nova estar operando.
- Manter compatibilidade temporaria com os campos atuais (`look_id`, `cenario_id`, `descricao`, `condicao`, `valor`).
- Centralizar regras de negocio novas em helpers/queries antes de mexer em muitas telas.
- Remover comportamento legado apenas depois de existir rota/tela substituta.

## Fase 0 - Banco e compatibilidade

### Escopo

- Criar colunas para toggles de datas de producao/postagem.
- Criar colunas para classificacao simples de conteudo.
- Preparar `recording_blocks` para virar dono operacional de look/cenario.
- Preparar `templates` para multiplos tipos.
- Preparar `golden_rules` para a estrutura mensuravel nova.
- Preparar `biblioteca_items` para tipos novos e metricas de consumo.
- Adicionar indices para filtros novos.

### Entrega

- Migration SQL: `migrations/2026-04-30_pre_implementation_foundation.sql`

## Fase 1 - Dominio central e queries

### Arquivos-base

- `src/lib/database.ts`
- `src/context/AppContext.tsx`
- `src/context/reducer.ts`
- `src/constants.ts`

### Decisoes tecnicas

- Introduzir helpers centrais para separar conteudos de pre-gravacao vs producao/historico.
- Parar de espalhar regras de filtro por tela.
- Trocar o uso de `STATUS_STAGES` puro por grupos semanticos:
  - editorial: `Ideia`, `Roteiro`, `Pronto para Gravar`
  - producao: `Gravado`, `A Editar`, `Editado`, `Programado`, `Postado`
- Usar as novas flags de data:
  - `recording_date_enabled`
  - `publish_date_enabled`
- Manter compatibilidade de leitura com `look_id`/`cenario_id`, mas priorizar dados do bloco quando existirem.

### Ordem

1. Atualizar types do `database.ts`
2. Atualizar fetch/mappers/save functions
3. Criar selectors/helpers reutilizaveis
4. Ajustar reducer/context para os novos campos

## Fase 2 - Conteudos e Historico

### Status

- Concluida em 2026-04-30.
- `ContentsPage` ficou restrita ao fluxo editorial.
- A rota `/conteudos/historico` passou a concentrar producao/historico.
- O toggle legado com `timeline/ecosystem` foi encerrado em favor de `table|grid`.

### Arquivos impactados

- `src/app/router/AppRoutes.tsx`
- `src/layouts/navigation/Sidebar.tsx`
- `src/features/contents/pages/ContentsPage.tsx`
- `src/features/contents/components/filters/ContentsToolbar.tsx`
- `src/features/contents/components/desktop/ContentsDesktop.tsx`
- `src/features/contents/components/desktop/ContentTable.tsx`
- novo `src/features/contents/components/desktop/ContentGrid.tsx`
- nova `src/features/contents/pages/ContentHistoryPage.tsx`

### Decisoes tecnicas

- `ContentsPage` passa a listar apenas pre-gravacao.
- Criar uma nova rota dedicada para producao/historico.
- Remover `timeline` de Conteudos e substituir por `grid`.
- Grid usa exatamente o mesmo dataset filtrado da tabela.
- Nao depender de serie para agrupamento do grid.

### Ordem

1. Criar selectors `getEditorialContents` e `getProductionContents`
2. Criar `ContentHistoryPage`
3. Adicionar rota/sidebar
4. Substituir toggle `table|ecosystem|timeline` por `table|grid`
5. Remover calendario da tela de Conteudos

## Fase 3 - Modal de roteiro

### Status

- Concluida em 2026-04-30.
- Modal reduzido para as abas `roteiro` e `producao`.
- Fluxo de salvar passou a persistir apenas o conteudo.
- Estrutura interna separada entre `scriptDraft` e `productionDraft`.

### Arquivos impactados

- `src/features/contents/components/modals/ContentDetailModal.tsx`

### Decisoes tecnicas

- Reduzir tabs para:
  - `roteiro`
  - `producao`
- Remover aba `resultados` do modal.
- Tirar persistencia de metricas do fluxo de salvar conteudo.
- Separar o draft interno em dois blocos logicos:
  - `scriptDraft`
  - `productionDraft`
- Mover legenda, datas e configuracoes operacionais para `producao`.
- Remover UI de `notas de gravacao`.
- Usar `recording_date_enabled` e `publish_date_enabled` como toggles reais.

### Ordem

1. Extrair o save flow do modal
2. Remover metricas do modal
3. Reorganizar tabs/campos
4. Ligar toggles aos novos campos

## Fase 4 - Gravacao e blocos

### Status

- Concluida em 2026-04-30.
- A transicao para `Gravado` foi centralizada em helper de dominio.
- `RecordingBlockPage` e `RecordingQueueTab` passaram a usar a mesma regra de persistencia.
- Blocos passaram a priorizar `lookLabel` e `cenarioLabel` quando existirem.
- Ao finalizar a sessao, o fluxo segue para `/conteudos/historico`.

### Arquivos impactados

- `src/features/recording/pages/RecordingPage.tsx`
- `src/features/recording/pages/RecordingBlockPage.tsx`
- `src/features/recording/components/desktop/RecordingQueueTab.tsx`

### Decisoes tecnicas

- Unificar a transicao "marcar como gravado" em helper unico.
- Persistir sempre:
  - `contents.status = 'Gravado'`
  - `recording_block_contents.gravado = true`
- Fazer o bloco carregar e mostrar look/cenario prioritariamente do proprio bloco.
- Ao finalizar sessao, navegar para historico/producao em vez de voltar para Conteudos.

### Ordem

1. Criar helper de transicao de gravacao
2. Usar o helper em `RecordingBlockPage`
3. Usar o helper em `RecordingQueueTab`
4. Atualizar navegacao de saida

## Fase 5 - Calendario e Projetos

### Status

- Concluida em 2026-04-30.
- O calendario deixou de atuar como hub de projetos.
- Projetos permaneceu como superficie independente.
- Foi criada uma visualizacao mensal horizontal com 2 meses no desktop e 1 no mobile.
- A tela principal do calendario foi simplificada para foco editorial.

### Arquivos impactados

- `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx`
- `src/features/editorial-calendar/components/*`
- `src/features/projects/pages/ProjectsPage.tsx`
- `src/features/projects/pages/ProjectDetailPage.tsx`

### Decisoes tecnicas

- O calendario deixa de ser hub de projetos.
- Projetos vira superficie independente e completa.
- Extrair um componente de visualizacao mensal horizontal.
- Mostrar 2 meses no desktop e 1 no mobile.
- Remover logica de projetos da visualizacao mensal principal.

### Ordem

1. Migrar capacidades faltantes do calendario para `ProjectsPage`
2. Extrair o calendario mensal
3. Simplificar datasource do calendario
4. Remover a aba/visao de projetos do calendario

## Fase 6 - Configuracoes e modulos

### Status

- Concluida em 2026-04-30.
- Flags modulares passaram a ser lidas de `user_preferences`.
- Foi criado o helper central `getModuleFlags(preferences)`.
- Rotas, sidebar e tela de configuracoes passaram a respeitar os modulos ativos.

### Arquivos impactados

- `src/features/settings/pages/SettingsPage.tsx`
- `src/layouts/navigation/Sidebar.tsx`
- `src/app/router/AppRoutes.tsx`
- `src/context/*`

### Decisoes tecnicas

- Armazenar flags modulares em `user_preferences`.
- Criar helper `getModuleFlags(preferences)`.
- Condicionar:
  - sidebar
  - cards de configuracao
  - rotas
  - componentes secundarios

### Ordem

1. Modelar flags em helper
2. Aplicar guards em rotas
3. Aplicar filtros em sidebar/settings

## Fase 7 - Settings especificos

### Status

- Concluida em 2026-04-30.
- Templates passaram a operar por `type` com filtros dedicados.
- `Pilares` migrou create/edit para painel lateral reutilizavel.
- Regras de ouro passaram a usar `titulo`, `minimo`, `maximo` e validacao dinamica.
- Series agora expoe hashtags por plataforma.
- A leitura de plataformas preserva referencias historicas mesmo quando uma plataforma fica inativa.

### Templates

- Adaptar `TemplatesSettingsPage` para `type`.
- Filtrar e criar templates por `roteiro | legenda | outro`.

### Pilares

- Criar `SidePanel` reutilizavel.
- Mover create/edit para painel lateral.

### Regras de ouro

- Atualizar UI para `titulo`, `minimo`, `maximo`, `periodo`.
- Reescrever `src/utils/goldenRules.ts` para usar regras salvas e nao IDs fixos.

### Series

- Expor hashtags por plataforma na UI.
- Unificar sugestao com hashtags do pilar no modal de conteudo.

### Plataformas

- Ajustar leitura para nao perder refs historicas quando uma plataforma ficar inativa.
- Filtrar apenas seletores de criacao/edicao, nao leitura historica.

## Fase 8 - Biblioteca

### Status

- Concluida em 2026-04-30.
- A tela principal foi separada em `Acervo | Analises`.
- Os KPIs sairam da home e passaram para uma aba analitica dedicada.
- As agregacoes da biblioteca foram extraidas para helper puro.
- O fluxo de criacao passou a aceitar `anime` e `manga` como tipos aditivos.

### Arquivos impactados

- `src/features/library/pages/LibraryPage.tsx`
- `src/features/library/pages/BookDetailPage.tsx`
- componentes novos em `src/features/library/components/`

### Decisoes tecnicas

- Criar tabs `Acervo | Analises`.
- Remover KPIs da home.
- Extrair modal dinamico por tipo.
- Usar configuracao por tipo para renderizar campos.
- Adotar novos tipos: `anime`, `manga`.
- Passar agregacoes para helpers puros.

### Ordem

1. Helpers de agregacao
2. Nova aba `Analises`
3. Extracao do modal dinamico
4. Tipos novos e campos condicionais

## Ordem recomendada de implementacao real

1. Aplicar migration SQL
2. Atualizar types e camada `database.ts`
3. Criar selectors de conteudo e flags modulares
4. Entregar `Conteudos` + `Historico`
5. Refatorar `ContentDetailModal`
6. Refatorar `Gravacao`
7. Separar `Calendario` e `Projetos`
8. Ajustar settings (`templates`, `regras`, `pilares`, `series`, `plataformas`)
9. Refatorar `Biblioteca`
10. Otimizar bundle do frontend com code-splitting e chunking manual

## Otimizacao de bundle frontend

### Status

- Concluida em 2026-04-30.
- As rotas principais migraram para `React.lazy` + `Suspense`.
- Revisada novamente em 2026-05-01 para validar a superficie real do frontend.
- O build passou a gerar chunks dedicados para `editor`, `motion`, `router`, `supabase`, `icons` e `vendor`.
- O aviso de chunk grande do Vite deixou de aparecer no build final.
- `ContentDetailModal`, `ScriptPreviewModal` e `CSVUploadModal` passaram a carregar sob demanda a partir de `ContentsPage`.
- Build de verificacao executado com sucesso em 2026-05-01 via `npm.cmd run build`.

### Objetivo

- Reduzir o chunk inicial gerado pelo Vite.
- Evitar que rotas e dependencias pesadas carreguem juntas no primeiro acesso.
- Melhorar tempo de carregamento percebido sem alterar o comportamento funcional.

### Arquivos impactados

- `src/app/router/AppRoutes.tsx`
- `vite.config.ts`
- componentes pesados carregados sob demanda, com prioridade para:
  - `src/features/contents/components/modals/ContentDetailModal.tsx`
  - `src/components/editors/RichTextEditor.tsx`

### Decisoes tecnicas

- Trocar imports estaticos de paginas por `React.lazy` + `Suspense`.
- Configurar `build.rollupOptions.output.manualChunks` no Vite.
- Separar vendors pesados em chunks dedicados, com prioridade para:
  - `@tiptap/*` e dependencias do editor
  - `motion`
  - `react-router`
  - `@supabase/supabase-js`
  - `lucide-react`
- Aplicar lazy load em modais e editores que nao precisam entrar no bundle inicial.

### Verificacao adicional de frontend em 2026-05-01

- Rotas lazy, separacao `Conteudos | Producao`, calendario mensal, projetos independentes, modulos em settings/sidebar e biblioteca com `Acervo | Analises` foram revisados e permanecem alinhados com o plano.
- Nao foi encontrada outra lacuna funcional evidente nas superficies auditadas nesta rodada.

### Ordem

1. Lazy-load das rotas principais
2. Configurar `manualChunks` no `vite.config.ts`
3. Lazy-load de modais/componentes pesados
4. Medir novamente o build e revisar os maiores chunks

## Riscos controlados no rollout

- `look_id` e `cenario_id` permanecem no schema por compatibilidade, mesmo com a nova direcao de blocos.
- `golden_rules` antigo continua legivel ate a UI nova entrar.
- `templates` antigo continua valido com `type = 'roteiro'`.
- `biblioteca_items` continua funcionando para `livro|filme|serie`, enquanto os tipos novos entram de forma aditiva.
