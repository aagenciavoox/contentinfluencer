# Frontend Architecture Audit

## Decisao Arquitetural

Arquitetura final definida: **domain-first com route wrappers finos**.

Regra central:
- `src/pages/` fica apenas como camada de rota e compatibilidade.
- Toda implementacao real mora em `src/features/<feature>/`.
- `src/layouts/` concentra shell, navegacao e scaffolds de pagina.
- `src/components/` fica restrito a elementos realmente reutilizaveis.
- `src/app/` concentra bootstrap, providers e roteamento.
- `src/lib/` fica restrito a infraestrutura e utilitarios sem UI.

## Fases de Implementacao

### Fase 1 - Consolidar paginas por dominio

Status: `concluida`

Escopo:
- mover paginas reais para `src/features/*/pages/*Page.tsx`
- transformar `src/pages/` em wrappers finos
- criar `src/app/providers/AppProviders.tsx`

Resultado:
- implementada

### Fase 2 - Consolidar bootstrap e roteamento em `src/app`

Status: `concluida`

Escopo:
- mover a implementacao de rotas para `src/app/router/AppRoutes.tsx`
- manter `src/app/routes.tsx` apenas como compatibilidade temporaria
- reduzir acoplamento do componente raiz com arquivos legados

Resultado:
- implementada

### Fase 3 - Separar layouts globais de componentes compartilhados

Status: `concluida`

Escopo:
- mover `components/layout/*` para `layouts/*`
- mover `components/navigation/*` para `layouts/navigation/*`
- mover `components/common/*` para `components/ui/*`
- ajustar imports sem quebrar o app

Progresso aplicado:
- criados caminhos canonicos em `src/layouts/*`
- criados caminhos canonicos em `src/components/ui/*`
- `src/App.tsx` ja consome `src/layouts/app/AppShell.tsx`
- `DashboardPage`, `SettingsPage`, `RecordingPage` e `ContentsPage` ja consomem os novos imports
- a implementacao real de `components/layout/*` foi movida para `layouts/*`
- a implementacao real de `components/navigation/*` foi movida para `layouts/navigation/*`
- a implementacao real de `components/common/*` foi movida para `components/ui/*`
- os caminhos antigos foram mantidos como wrappers temporarios de compatibilidade

Residual conhecido:
- `FixedPanelModal` ainda permanece em `src/components/layout/` porque ele pertence a overlays e sera tratado junto da Fase 4

### Fase 4 - Isolar componentes por feature

Status: `em andamento`

Escopo:
- mover modais e componentes acoplados a dominio para dentro de cada feature
- remover dependencias cruzadas entre features
- criar subpastas `desktop`, `mobile`, `modals`, `filters`

Progresso aplicado:
- `ContentDetailModal`, `CSVUploadModal` e `ScriptPreviewModal` foram movidos para `src/features/contents/components/modals/`
- `BookNotesModal` foi movido para `src/features/library/components/modals/`
- componentes de calendario foram movidos para `src/features/editorial-calendar/components/`
- `EditorialAgendaTabView` e `EditorialCalendarHeader` foram consolidados em `src/features/editorial-calendar/components/`
- `ContentQuickPreview` foi movido para `src/features/editorial-calendar/components/modals/`
- `EditorialAgendaFilters` foi extraido para `src/features/editorial-calendar/components/filters/`
- build validado com sucesso apos a migracao desta rodada
- `RecordingQueueTab` foi consolidado em `src/features/recording/components/desktop/`
- `DNAVozDrawer` foi movido para `src/features/settings/components/modals/`
- `FixedPanelModal` foi movido para `src/components/overlays/`
- `contents` agora possui subpastas `desktop`, `mobile`, `modals`, `filters` e `burst-mode`
- `editorial-calendar` agora possui subpastas `filters` e `modals`
- `library` agora possui subpasta `modals`
- `recording` agora possui subpasta `desktop`
- `settings` agora possui subpasta `modals`
- a implementacao real da Fase 4 segue estavel em build

Residual desta fase:
- os wrappers legados citados originalmente ja foram removidos na Fase 6
- ainda faltam subpastas mais especificas em `editorial-calendar` e `recording` para separar melhor componentes de desktop/mobile e possiveis overlays auxiliares

### Fase 5 - Quebrar monolitos de estado e dados

Status: `em andamento`

Escopo:
- dividir `context/AppContext.tsx`
- dividir `lib/database.ts`
- separar tipos, services e sincronizacao realtime

Progresso geral:
- microfase 5.1 concluida
- `AppState` e `initialState` ja sairam de `AppContext.tsx`
- proximo passo: microfase 5.2 para extrair a persistencia de actions do provider

Microfases definidas:

#### Fase 5.1 - Extrair tipos e estado base do AppContext

Status: `concluida`

Escopo:
- mover `AppState`, `initialState` e tipos de contexto para `src/app/providers/`
- reduzir `AppContext.tsx` para composicao e efeitos
- manter API publica estavel

Resultado:
- `AppState` e `initialState` foram extraidos para `src/app/providers/appState.ts`
- `AppContext.tsx` deixou de concentrar a definicao do estado base
- build validado com sucesso

#### Fase 5.2 - Extrair persistencia de actions do AppContext

Status: `pendente`

Escopo:
- mover o `switch` de persistencia de `enhancedDispatch` para um modulo dedicado
- separar `dispatch` otimista de `persistAction`
- remover conhecimento de tabela do provider

#### Fase 5.3 - Extrair bootstrap e realtime do AppContext

Status: `pendente`

Escopo:
- mover `fetchAllData`, auth bootstrap e subscription realtime para modulos de sync
- reduzir `AppProvider` a orquestracao

#### Fase 5.4 - Extrair tipos de dominio de `lib/database.ts`

Status: `pendente`

Escopo:
- mover interfaces para `src/lib/db/types.ts`
- manter `database.ts` apenas como facade temporaria

#### Fase 5.5 - Extrair mapeadores e fetch de `lib/database.ts`

Status: `pendente`

Escopo:
- mover helpers, mappers e `fetchAllData` para modulos dedicados
- separar resolucao de platform refs

#### Fase 5.6 - Extrair services por dominio de `lib/database.ts`

Status: `pendente`

Escopo:
- criar services por dominio: preferences, dna, pilares, series, biblioteca, contents, projetos, recording, templates, agenda, rules, metrics
- manter `src/lib/database.ts` apenas reexportando durante a transicao

### Fase 6 - Formalizar regras finais e remover compatibilidade

Status: `concluida`

Escopo:
- remover wrappers e arquivos legados temporarios
- eliminar `.gitkeep` desnecessarios
- concluir renomeacoes finais e consolidar padrao

Resultado:
- wrappers legados removidos de `src/components/common/`, `src/components/layout/`, `src/components/navigation/`, `src/components/calendar/` e wrappers temporarios dentro de `src/features/`
- `.gitkeep` desnecessarios removidos de `src/app/`, `src/features/calendar/pages/`, `src/features/library/pages/` e `src/features/settings/pages/`
- `CommandPalette`, `RichTextEditor`, `BottomSheetModal` e `ConfirmModal` consolidados nos caminhos canonicos finais
- `ContentsToolbar`, `ContentsDesktop`, `ContentsMobile`, `RecordingQueueTab` e `types/index.ts` consolidados nos caminhos finais
- build validado com sucesso apos a limpeza de compatibilidade

## Problemas Reais Encontrados

1. `src/pages` e `src/features` coexistiam com responsabilidade sobreposta.
2. Havia wrappers finos (`Contents`, `Gravacao`) convivendo com paginas reais no mesmo nivel.
3. Paginas muito grandes:
- `src/pages/EditorialCalendar.tsx` com 1405 linhas.
- `src/pages/BookDetail.tsx` com 1360 linhas.
- `src/features/contents/components/BurstModeExperience.tsx` com 1130 linhas.
- `src/components/ContentDetailModal.tsx` com 1017 linhas.
4. `src/context/AppContext.tsx` mistura provider, estado, persistencia, sincronizacao realtime e regras de negocio.
5. `src/lib/database.ts` concentra tipos de dominio, mapeamento e acesso a dados em um unico arquivo monolitico.
6. Componentes feature-specific estavam soltos em `src/components/`, sem vinculo explicito ao dominio.
7. Layout, navegacao e UI generica estavam misturados dentro de `src/components/`.
8. Varias telas ainda decidem mobile/desktop dentro do mesmo arquivo em vez de delegar para views separadas.
9. Nomenclatura inconsistente:
- paginas sem sufixo `Page`
- mistura de portugues e ingles
- nomes genericos como `types.ts`, `utils.ts`, `routes.tsx`
10. Features vazias com `.gitkeep` mascaravam uma migracao inacabada.

## Estrutura Final Obrigatoria

```text
src/
  app/
    providers/
      AppProviders.tsx
      AppStateProvider.tsx
      AuthProvider.tsx
      appStateReducer.ts
    router/
      AppRoutes.tsx
  pages/
    Dashboard.tsx
    Contents.tsx
    Ideas.tsx
    Biblioteca.tsx
    BookDetail.tsx
    EditorialCalendar.tsx
    Projetos.tsx
    ProjetoDetalhe.tsx
    Gravacao.tsx
    GravacaoBloco.tsx
    Analise.tsx
    Login.tsx
    Settings.tsx
    settings/
      DNAVoz.tsx
      LooksScenarios.tsx
      Pilares.tsx
      Plataformas.tsx
      RegrasDeOuro.tsx
      Series.tsx
      Templates.tsx
  layouts/
    app/
      AppShell.tsx
    navigation/
      Sidebar.tsx
      MobileHeader.tsx
      MobileNavBar.tsx
    page/
      DesktopPageHeader.tsx
      PageContainer.tsx
      PageHeader.tsx
      PageScaffold.tsx
  components/
    ui/
      AppButton.tsx
      Card.tsx
      EmptyState.tsx
      FilterBar.tsx
      ListRow.tsx
      ViewModeToggle.tsx
    editors/
      RichTextEditor.tsx
    feedback/
      modals/
        ConfirmModal.tsx
        BottomSheetModal.tsx
    overlays/
      FixedPanelModal.tsx
      CommandPalette.tsx
  features/
    analytics/
      pages/
        AnalyticsPage.tsx
    auth/
      pages/
        LoginPage.tsx
    contents/
      pages/
        ContentsPage.tsx
      components/
        desktop/
        mobile/
        modals/
        burst-mode/
      hooks/
        useContentsFilters.ts
        useContentsSelection.ts
      services/
        createEmptyContent.ts
      types/
        index.ts
    dashboard/
      pages/
        DashboardPage.tsx
    editorial-calendar/
      pages/
        EditorialCalendarPage.tsx
      components/
        filters/
          EditorialAgendaFilters.tsx
        modals/
          ContentQuickPreview.tsx
      hooks/
      types/
        index.ts
    ideas/
      pages/
        IdeasPage.tsx
    library/
      pages/
        LibraryPage.tsx
        BookDetailPage.tsx
      components/
        modals/
          BookNotesModal.tsx
      hooks/
      services/
    projects/
      pages/
        ProjectsPage.tsx
        ProjectDetailPage.tsx
      hooks/
      services/
    recording/
      pages/
        RecordingPage.tsx
        RecordingBlockPage.tsx
      components/
        desktop/
          RecordingQueueTab.tsx
    settings/
      pages/
        SettingsPage.tsx
        DNAVozSettingsPage.tsx
        LooksSettingsPage.tsx
        PillarsSettingsPage.tsx
        PlatformsSettingsPage.tsx
        GoldenRulesSettingsPage.tsx
        SeriesSettingsPage.tsx
        TemplatesSettingsPage.tsx
      components/
        modals/
          DNAVozDrawer.tsx
      lib/
        goldenRulesValidator.ts
  hooks/
    useBodyScrollLock.ts
    useHideOnScroll.ts
    useIsMobile.ts
    useScrollDirection.ts
  lib/
    constants/
      workflow.ts
    db/
      types.ts
      contentService.ts
      libraryService.ts
      projectService.ts
      settingsService.ts
      realtimeService.ts
    supabase/
      client.ts
    utils/
      cn.ts
      content.ts
      eventDates.ts
      uuid.ts
  styles/
    index.css
    editor.css
```

## Regras Obrigatorias

### 1. Paginas

- Toda pagina concreta deve se chamar `XPage.tsx`.
- `src/pages/` nao pode conter logica de negocio, estado complexo nem JSX pesado.
- Arquivos em `src/pages/` devem apenas reexportar ou compor a pagina da feature correspondente.
- Toda tela com variante mobile e desktop deve ter:
- `XPage.tsx` como container
- `XDesktop.tsx` para desktop
- `XMobile.tsx` para mobile

### 2. Componentes

- Vai para `src/components/ui` apenas se for reutilizavel em 3 ou mais features e nao conhecer nenhum dominio.
- Vai para `src/features/<feature>/components` se conhecer entidades, rotas, textos ou estados daquela feature.
- Modais de dominio ficam dentro da feature.
- Componentes compartilhados nao podem importar `useAppContext` diretamente.

### 3. Features

- Cada feature concentra `pages`, `components`, `hooks`, `services` e `types`.
- `services` de feature podem chamar `src/lib/db/*`, mas pagina e componente nao podem falar com Supabase diretamente.
- `types.ts` generico e proibido fora de feature pequena; o padrao passa a ser `types/index.ts`.

### 4. Layouts

- `src/layouts/app` guarda shell principal.
- `src/layouts/navigation` guarda navegacao global.
- `src/layouts/page` guarda scaffolds e cabecalhos de pagina.
- Layout nao pode conter regra de negocio da feature.

### 5. Hooks

- `src/hooks` so para hooks cross-feature.
- Hooks especificos de dominio ficam em `src/features/<feature>/hooks`.
- `useIsMobile` pode ser usado apenas no container da pagina ou no layout, nunca espalhado por subcomponentes arbitrarios.

### 6. Proibicoes

- Proibido chamar API ou Supabase dentro de componente visual.
- Proibido misturar mobile e desktop no mesmo arquivo quando a renderizacao diverge de forma material.
- Proibido componente acima de 300 linhas sem divisao em subcomponentes ou hooks.
- Proibido `utils.ts`, `helpers.ts`, `types.ts` genericos na raiz sem contexto de dominio.
- Proibido importar feature A dentro de feature B para reutilizar UI; o compartilhamento deve subir para `components/` ou `layouts/`.

## Padrao Final de Uma Feature

```text
features/
  FeatureName/
    pages/
      FeaturePage.tsx
    components/
      FeatureDesktop.tsx
      FeatureMobile.tsx
      FeatureToolbar.tsx
    hooks/
      useFeatureFilters.ts
      useFeatureActions.ts
    services/
      featureService.ts
    types/
      index.ts
```

## Mapeamento Arquivo a Arquivo

### Core App

Arquivo atual: `src/App.tsx`  
Novo caminho: `src/app/App.tsx`  
Acao: mover

Arquivo atual: `src/main.tsx`  
Novo caminho: `src/main.tsx`  
Acao: manter

Arquivo atual: `src/constants.ts`  
Novo caminho: `src/lib/constants/workflow.ts`  
Acao: mover

Arquivo atual: `src/vite-env.d.ts`  
Novo caminho: `src/vite-env.d.ts`  
Acao: manter

Arquivo atual: `src/app/routes.tsx`  
Novo caminho: `src/app/router/AppRoutes.tsx`  
Acao: mover

Arquivo atual: `src/app/.gitkeep`  
Novo caminho: `-`  
Acao: deletar

### Layouts e Shared UI

Arquivo atual: `src/components/layout/AppLayout.tsx`  
Novo caminho: `src/layouts/app/AppShell.tsx`  
Acao: mover

Arquivo atual: `src/components/layout/DesktopPageHeader.tsx`  
Novo caminho: `src/layouts/page/DesktopPageHeader.tsx`  
Acao: mover

Arquivo atual: `src/components/layout/FixedPanelModal.tsx`  
Novo caminho: `src/components/overlays/FixedPanelModal.tsx`  
Acao: mover

Arquivo atual: `src/components/layout/PageContainer.tsx`  
Novo caminho: `src/layouts/page/PageContainer.tsx`  
Acao: mover

Arquivo atual: `src/components/layout/PageHeader.tsx`  
Novo caminho: `src/layouts/page/PageHeader.tsx`  
Acao: mover

Arquivo atual: `src/components/layout/PageScaffold.tsx`  
Novo caminho: `src/layouts/page/PageScaffold.tsx`  
Acao: mover

Arquivo atual: `src/components/navigation/MobileHeader.tsx`  
Novo caminho: `src/layouts/navigation/MobileHeader.tsx`  
Acao: mover

Arquivo atual: `src/components/navigation/MobileNavBar.tsx`  
Novo caminho: `src/layouts/navigation/MobileNavBar.tsx`  
Acao: mover

Arquivo atual: `src/components/navigation/Sidebar.tsx`  
Novo caminho: `src/layouts/navigation/Sidebar.tsx`  
Acao: mover

Arquivo atual: `src/components/common/AppButton.tsx`  
Novo caminho: `src/components/ui/AppButton.tsx`  
Acao: mover

Arquivo atual: `src/components/common/Card.tsx`  
Novo caminho: `src/components/ui/Card.tsx`  
Acao: mover

Arquivo atual: `src/components/common/EmptyState.tsx`  
Novo caminho: `src/components/ui/EmptyState.tsx`  
Acao: mover

Arquivo atual: `src/components/common/FilterBar.tsx`  
Novo caminho: `src/components/ui/FilterBar.tsx`  
Acao: mover

Arquivo atual: `src/components/common/ListRow.tsx`  
Novo caminho: `src/components/ui/ListRow.tsx`  
Acao: mover

Arquivo atual: `src/components/common/ViewModeToggle.tsx`  
Novo caminho: `src/components/ui/ViewModeToggle.tsx`  
Acao: mover

Arquivo atual: `src/components/modals/BottomSheetModal.tsx`  
Novo caminho: `src/components/feedback/modals/BottomSheetModal.tsx`  
Acao: mover

Arquivo atual: `src/components/modals/ConfirmModal.tsx`  
Novo caminho: `src/components/feedback/modals/ConfirmModal.tsx`  
Acao: mover

Arquivo atual: `src/components/CommandPalette.tsx`  
Novo caminho: `src/components/overlays/CommandPalette.tsx`  
Acao: mover

Arquivo atual: `src/components/RichTextEditor.tsx`  
Novo caminho: `src/components/editors/RichTextEditor.tsx`  
Acao: mover

### Providers e Estado

Arquivo atual: `src/context/AppContext.tsx`  
Novo caminho: `src/app/providers/AppStateProvider.tsx`  
Acao: dividir

Arquivo atual: `src/context/AuthContext.tsx`  
Novo caminho: `src/app/providers/AuthProvider.tsx`  
Acao: mover

Arquivo atual: `src/context/reducer.ts`  
Novo caminho: `src/app/providers/appStateReducer.ts`  
Acao: mover

### Hooks Globais

Arquivo atual: `src/hooks/useBodyScrollLock.ts`  
Novo caminho: `src/hooks/useBodyScrollLock.ts`  
Acao: manter

Arquivo atual: `src/hooks/useHideOnScroll.ts`  
Novo caminho: `src/hooks/useHideOnScroll.ts`  
Acao: manter

Arquivo atual: `src/hooks/useIsMobile.ts`  
Novo caminho: `src/hooks/useIsMobile.ts`  
Acao: manter

Arquivo atual: `src/hooks/useScrollDirection.ts`  
Novo caminho: `src/hooks/useScrollDirection.ts`  
Acao: manter

### Infraestrutura e Utilitarios

Arquivo atual: `src/lib/database.ts`  
Novo caminho: `src/lib/db/`  
Acao: dividir

Arquivo atual: `src/lib/supabase.ts`  
Novo caminho: `src/lib/supabase/client.ts`  
Acao: mover

Arquivo atual: `src/lib/utils.ts`  
Novo caminho: `src/lib/utils/`  
Acao: dividir

Arquivo atual: `src/utils/goldenRules.ts`  
Novo caminho: `src/features/settings/lib/goldenRulesValidator.ts`  
Acao: mover

Arquivo atual: `src/utils/goldenRules.test.ts`  
Novo caminho: `src/features/settings/lib/goldenRulesValidator.test.ts`  
Acao: mover

Arquivo atual: `src/utils/uuid.ts`  
Novo caminho: `src/lib/utils/uuid.ts`  
Acao: mover

### Features: Dashboard

Arquivo atual: `src/pages/Dashboard.tsx`  
Novo caminho: `src/features/dashboard/pages/DashboardPage.tsx`  
Acao: mover

### Features: Auth

Arquivo atual: `src/pages/Login.tsx`  
Novo caminho: `src/features/auth/pages/LoginPage.tsx`  
Acao: mover

### Features: Analytics

Arquivo atual: `src/pages/Analise.tsx`  
Novo caminho: `src/features/analytics/pages/AnalyticsPage.tsx`  
Acao: mover

### Features: Ideas

Arquivo atual: `src/pages/Ideas.tsx`  
Novo caminho: `src/features/ideas/pages/IdeasPage.tsx`  
Acao: mover

### Features: Library

Arquivo atual: `src/pages/Biblioteca.tsx`  
Novo caminho: `src/features/library/pages/LibraryPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/BookDetail.tsx`  
Novo caminho: `src/features/library/pages/BookDetailPage.tsx`  
Acao: mover

Arquivo atual: `src/components/BookNotesModal.tsx`  
Novo caminho: `src/features/library/components/modals/BookNotesModal.tsx`  
Acao: mover

Arquivo atual: `src/features/library/pages/.gitkeep`  
Novo caminho: `-`  
Acao: deletar

### Features: Contents

Arquivo atual: `src/pages/Contents.tsx`  
Novo caminho: `src/pages/Contents.tsx`  
Acao: manter

Arquivo atual: `src/features/contents/pages/Contents.tsx`  
Novo caminho: `-`  
Acao: deletar

Arquivo atual: `src/features/contents/pages/ContentsPage.tsx`  
Novo caminho: `src/features/contents/pages/ContentsPage.tsx`  
Acao: dividir

Arquivo atual: `src/components/ContentDetailModal.tsx`  
Novo caminho: `src/features/contents/components/modals/ContentDetailModal.tsx`  
Acao: mover

Arquivo atual: `src/components/CSVUploadModal.tsx`  
Novo caminho: `src/features/contents/components/modals/CSVUploadModal.tsx`  
Acao: mover

Arquivo atual: `src/components/ScriptPreviewModal.tsx`  
Novo caminho: `src/features/contents/components/modals/ScriptPreviewModal.tsx`  
Acao: mover

Arquivo atual: `src/features/contents/components/ContentsHeader.tsx`  
Novo caminho: `src/features/contents/components/filters/ContentsToolbar.tsx`  
Acao: renomear

Arquivo atual: `src/features/contents/components/ContentsDesktopView.tsx`  
Novo caminho: `src/features/contents/components/desktop/ContentsDesktop.tsx`  
Acao: renomear

Arquivo atual: `src/features/contents/components/ContentsMobileView.tsx`  
Novo caminho: `src/features/contents/components/mobile/ContentsMobile.tsx`  
Acao: renomear

Arquivo atual: `src/features/contents/components/ContentTable.tsx`  
Novo caminho: `src/features/contents/components/desktop/ContentTable.tsx`  
Acao: dividir

Arquivo atual: `src/features/contents/components/ContentTimeline.tsx`  
Novo caminho: `src/features/contents/components/desktop/ContentTimeline.tsx`  
Acao: mover

Arquivo atual: `src/features/contents/components/ContentEcosystem.tsx`  
Novo caminho: `src/features/contents/components/desktop/ContentEcosystem.tsx`  
Acao: mover

Arquivo atual: `src/features/contents/components/BurstModeExperience.tsx`  
Novo caminho: `src/features/contents/components/burst-mode/BurstModeExperience.tsx`  
Acao: dividir

Arquivo atual: `src/features/contents/components/RecordingTab.tsx`  
Novo caminho: `src/features/recording/components/desktop/RecordingQueueTab.tsx`  
Acao: mover

Arquivo atual: `src/features/contents/types.ts`  
Novo caminho: `src/features/contents/types/index.ts`  
Acao: mover

### Features: Editorial Calendar

Arquivo atual: `src/pages/EditorialCalendar.tsx`  
Novo caminho: `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx`  
Acao: mover

Arquivo atual: `src/components/calendar/CalendarAgendaView.tsx`  
Novo caminho: `src/features/editorial-calendar/components/CalendarAgendaView.tsx`  
Acao: mover

Arquivo atual: `src/components/calendar/CalendarGrid.tsx`  
Novo caminho: `src/features/editorial-calendar/components/CalendarGrid.tsx`  
Acao: mover

Arquivo atual: `src/components/calendar/CalendarHoverCard.tsx`  
Novo caminho: `src/features/editorial-calendar/components/CalendarHoverCard.tsx`  
Acao: mover

Arquivo atual: `src/components/calendar/CalendarLayerToggle.tsx`  
Novo caminho: `src/features/editorial-calendar/components/CalendarLayerToggle.tsx`  
Acao: mover

Arquivo atual: `src/components/calendar/ContentQuickPreview.tsx`  
Novo caminho: `src/features/editorial-calendar/components/modals/ContentQuickPreview.tsx`  
Acao: mover

Arquivo atual: `src/features/editorial-calendar/EditorialAgendaTabView.tsx`  
Novo caminho: `src/features/editorial-calendar/components/EditorialAgendaTabView.tsx`  
Acao: mover

Arquivo atual: `src/features/editorial-calendar/EditorialCalendarHeader.tsx`  
Novo caminho: `src/features/editorial-calendar/components/EditorialCalendarHeader.tsx`  
Acao: mover

Arquivo atual: `src/features/editorial-calendar/components/EditorialAgendaTabView.tsx`  
Novo caminho: `src/features/editorial-calendar/components/filters/EditorialAgendaFilters.tsx`  
Acao: extrair filtros

Arquivo atual: `src/features/editorial-calendar/types.ts`  
Novo caminho: `src/features/editorial-calendar/types/index.ts`  
Acao: mover

Arquivo atual: `src/features/calendar/pages/.gitkeep`  
Novo caminho: `-`  
Acao: deletar

### Features: Projects

Arquivo atual: `src/pages/Projetos.tsx`  
Novo caminho: `src/features/projects/pages/ProjectsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/ProjetoDetalhe.tsx`  
Novo caminho: `src/features/projects/pages/ProjectDetailPage.tsx`  
Acao: mover

### Features: Recording

Arquivo atual: `src/pages/Gravacao.tsx`  
Novo caminho: `src/pages/Gravacao.tsx`  
Acao: manter

Arquivo atual: `src/pages/GravacaoBloco.tsx`  
Novo caminho: `src/features/recording/pages/RecordingBlockPage.tsx`  
Acao: mover

Arquivo atual: `src/features/recording/pages/Gravacao.tsx`  
Novo caminho: `-`  
Acao: deletar

Arquivo atual: `src/features/recording/pages/RecordingPage.tsx`  
Novo caminho: `src/features/recording/pages/RecordingPage.tsx`  
Acao: dividir

### Features: Settings

Arquivo atual: `src/pages/Settings.tsx`  
Novo caminho: `src/features/settings/pages/SettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/DNAVoz.tsx`  
Novo caminho: `src/features/settings/pages/DNAVozSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/LooksScenarios.tsx`  
Novo caminho: `src/features/settings/pages/LooksSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/Pilares.tsx`  
Novo caminho: `src/features/settings/pages/PillarsSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/Plataformas.tsx`  
Novo caminho: `src/features/settings/pages/PlatformsSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/RegrasDeOuro.tsx`  
Novo caminho: `src/features/settings/pages/GoldenRulesSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/Series.tsx`  
Novo caminho: `src/features/settings/pages/SeriesSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/pages/settings/Templates.tsx`  
Novo caminho: `src/features/settings/pages/TemplatesSettingsPage.tsx`  
Acao: mover

Arquivo atual: `src/components/DNAVozDrawer.tsx`  
Novo caminho: `src/features/settings/components/modals/DNAVozDrawer.tsx`  
Acao: mover

Arquivo atual: `src/features/settings/pages/.gitkeep`  
Novo caminho: `-`  
Acao: deletar

### Styles

Arquivo atual: `src/styles/editor.css`  
Novo caminho: `src/styles/editor.css`  
Acao: manter

Arquivo atual: `src/styles/index.css`  
Novo caminho: `src/styles/index.css`  
Acao: manter

## Resultado Aplicado Nesta Refatoracao

- As paginas reais foram movidas para `src/features/*/pages/*Page.tsx`.
- `src/pages/` foi convertido em camada de wrappers de rota.
- `src/features/contents/pages/ContentsPage.tsx` e `src/features/recording/pages/RecordingPage.tsx` passaram a seguir o padrao `*Page`.
- `src/app/providers/AppProviders.tsx` foi criado para centralizar a composicao dos providers.
- a limpeza de compatibilidade da Fase 6 foi concluida e validada em build.
- a Fase 4 passou a incluir subpastas reais em `contents`, `editorial-calendar`, `library`, `recording` e `settings`.
