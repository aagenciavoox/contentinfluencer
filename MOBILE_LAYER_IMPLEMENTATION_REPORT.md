# Mobile Layer Isolation Report

## Objetivo

Isolar a camada mobile da camada desktop em todas as paginas principais, compartilhando apenas estado, dados e regras de negocio.

## Snapshot Atual

Data da auditoria ativa: 2026-05-02

Panorama validado no codigo:

- A fundacao mobile global existe e esta integrada em `src/layouts/app/AppShell.tsx`.
- `Ideias`, `Agenda`, `Projetos` e `Acervo` ja possuem camada mobile dedicada em `src/mobile/screens`.
- `Conteudos` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Gravacao` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Dashboard` e `Analise` agora tambem possuem camada mobile dedicada em `src/mobile/screens`.
- O hub de `Configuracoes` e a tela de `Plataformas` agora possuem camada mobile dedicada em `src/mobile/screens`.
- `Series` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Pilares` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Templates` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Regras de Ouro` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `DNA da Voz` agora tambem possui camada mobile dedicada em `src/mobile/screens`.
- `Looks & Cenarios` saiu do roadmap como modulo proprio.
- A nova direcao passa a usar `marcadores de gravacao` em `Conteudos` e `Gravacao`, sem catalogo rigido de looks e cenarios.
- `DesktopPageHeader` segue espalhado nas telas desktop, mas nao vaza mais para `Ideias`, `Agenda` e `Projetos` no mobile.
- `FilterBar` segue presente nas superficies desktop de `Acervo`, `Projetos`, `Gravacao` e `Conteudos`, porem `Projetos` e `Acervo` agora usam filtros mobile proprios.

## Auditoria Atual

### Acoplamentos confirmados no codigo

- `src/layouts/app/AppShell.tsx` misturava chrome mobile e desktop no mesmo shell global.
- `src/layouts/page/PageScaffold.tsx` ainda renderiza `header` e `toolbar` no mobile, o que puxa composicao desktop-first.
- `src/layouts/navigation/MobileNavBar.tsx` usava IA de navegacao antiga e misturava CTA, navegação e modais num unico componente.
- `src/features/ideas/pages/IdeasPage.tsx` era 100% desktop-first, inclusive no mobile.

### Direcao de isolamento adotada

- Shell mobile proprio, paralelo ao desktop.
- Header mobile contextual por rota.
- Bottom nav mobile proprio com IA de produto separada.
- Action menu mobile separado da navegacao.
- Paginas passam a decidir explicitamente entre experiencia desktop e mobile.

## Fases

### Fase 1 - Fundacao mobile global

Status: concluida em 2026-05-01

Entregas:

- `src/mobile/components/MobileAppShell.tsx`
- `src/mobile/components/MobileHeaderIOS.tsx`
- `src/mobile/components/MobileBottomNav.tsx`
- `src/mobile/components/MobileActionMenu.tsx`
- `src/mobile/components/MobileSearchBar.tsx`
- `src/mobile/components/MobileSegmentTabs.tsx`
- `src/mobile/components/MobileListCard.tsx`
- `src/mobile/components/MobileGridCard.tsx`
- `src/mobile/components/MobileEmptyState.tsx`
- `src/mobile/components/MobileFilterSheet.tsx`
- `src/mobile/config/mobileRouteMeta.ts`
- integracao no `src/layouts/app/AppShell.tsx`

Resultado:

- O mobile deixou de depender de `MobileHeader` e `MobileNavBar` legados.
- O shell desktop permaneceu intacto.
- A navegacao mobile agora usa `Agenda | Projetos | Ideias | Acervo` com CTA central separado.
- Build de verificacao executado com sucesso em 2026-05-01 via `npm.cmd run build`.

### Fase 2 - Primeira tela mobile nativa

Status: concluida em 2026-05-02

Entregas concluidas ate 2026-05-02:

- `src/mobile/screens/ideas/IdeasMobileScreen.tsx`
- `src/features/ideas/pages/IdeasPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/agenda/AgendaMobileScreen.tsx`
- `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/projects/ProjectsMobileScreen.tsx`
- `src/features/projects/pages/ProjectsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/library/LibraryMobileScreen.tsx`
- `src/features/library/pages/LibraryPage.tsx` agora bifurca desktop/mobile

Resultado:

- `IdeasPage` passou a ter uma camada mobile propria.
- O mobile de Ideias nao reutiliza `DesktopPageHeader`.
- A experiencia mobile agora usa captura rapida, busca, filtro em sheet e lista dedicada.
- `Agenda` deixou de reaproveitar a visao mensal densa no mobile e passou a usar timeline agrupada por data.
- `Projetos` deixou de levar `FilterBar` e header desktop para o mobile e passou a usar cards, filtros em sheet e criacao em bottom sheet.
- `Acervo` deixou de usar a grade densa e a aba analitica no mobile e passou a operar com tabs de consumo, cards proprios e cadastro rapido.
- O desktop das paginas permaneceu funcional e preservado no mesmo container.

### Proximas fases

1. Iniciar a Fase 4 pelo hub de `Configuracoes`.
2. Isolar as telas modulares de configuracao.
3. Fazer polimento final de consistencia mobile.

### Fase 3 - Fluxos operacionais leves

Status: concluida em 2026-05-02

Entregas concluidas ate agora:

- `src/mobile/screens/contents/ContentsMobileScreen.tsx`
- `src/features/contents/pages/ContentsPage.tsx` agora bifurca desktop/mobile sem reaproveitar `ContentTable`
- `src/mobile/screens/recording/RecordingMobileScreen.tsx`
- `src/features/recording/pages/RecordingPage.tsx` agora bifurca desktop/mobile sem reaproveitar `FilterBar`
- `src/mobile/screens/dashboard/DashboardMobileScreen.tsx`
- `src/features/dashboard/pages/DashboardPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/analytics/AnalyticsMobileScreen.tsx`
- `src/features/analytics/pages/AnalyticsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/components/MobileSegmentTabs.tsx` agora suporta quantidade dinamica de tabs

Resultado:

- `Conteudos` deixou de usar `ContentTable` no mobile.
- A operacao mobile agora usa busca, filtros em sheet, segmentacao por fluxo e cards dedicados.
- Os modais de detalhe e preview continuaram compartilhando estado e comportamento com a camada desktop.
- `Gravacao` deixou de carregar a fila desktop no mobile e passou a usar selecao leve, criacao de bloco e acesso direto ao bloco de execucao.
- `Dashboard` virou uma superficie mobile de foco do dia, com prioridades, fila critica e agenda proxima.
- `Analise` virou uma leitura resumida de score editorial, mix e performance, sem reaproveitar a composicao analitica desktop.

### Fase 4 - Configuracoes mobile

Status: iniciada em 2026-05-02

Entregas concluidas ate agora:

- `src/mobile/screens/settings/SettingsMobileScreen.tsx`
- `src/features/settings/pages/SettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/PlatformsMobileScreen.tsx`
- `src/features/settings/pages/PlatformsSettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/SeriesMobileScreen.tsx`
- `src/features/settings/pages/SeriesSettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/PillarsMobileScreen.tsx`
- `src/features/settings/pages/PillarsSettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/TemplatesMobileScreen.tsx`
- `src/features/settings/pages/TemplatesSettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/GoldenRulesMobileScreen.tsx`
- `src/features/settings/pages/GoldenRulesSettingsPage.tsx` agora bifurca desktop/mobile
- `src/mobile/screens/settings/DNAVozMobileScreen.tsx`
- `src/features/settings/pages/DNAVozSettingsPage.tsx` agora bifurca desktop/mobile
- `Looks & Cenarios` removido do hub de configuracoes como modulo de produto
- `Gravacao` e `Conteudos` iniciaram a migracao para `marcadores de gravacao`

Resultado:

- O hub de configuracoes deixou de depender da lista desktop no mobile.
- `Plataformas` agora oferece leitura, toggle e criacao rapida em fluxo mobile proprio.
- `Series` agora oferece leitura, ativacao e criacao rapida em fluxo mobile proprio.
- `Pilares` agora oferece leitura, ativacao e criacao rapida em fluxo mobile proprio.
- `Templates` agora oferece catalogo filtrado por tipo e criacao rapida em fluxo mobile proprio.
- `Regras de Ouro` agora oferece leitura de alertas, ativacao, exclusao e criacao rapida em fluxo mobile proprio.
- `DNA da Voz` agora oferece edicao mobile dedicada para promessa, publico, tom, limites editoriais e alertas de desvio.
- `Looks & Cenarios` deixou de ser tratado como cadastro obrigatorio e foi substituido por uma direcao mais flexivel baseada em marcadores de gravacao.
- A navegacao mobile para ajustes ja tem um ponto de entrada consistente para os modulos que permanecem no produto.

Status atualizado:

- Fase 4 concluida em 2026-05-02 com a remocao do modulo `Looks & Cenarios` do backlog mobile.
- Proxima frente arquitetural: consolidar a migracao de `lookId` e `cenarioId` para `tags` e `metadata.recordingTags`.
- Rota `/configuracoes/looks` agora redireciona para `/configuracoes`.
- O helper central de gravacao deixou de depender de fallback visual por `look` e `cenario`.
- O realtime deixou de observar as tabelas `looks` e `cenarios` no fluxo principal do app.
- O detalhe mobile do `Acervo` agora abre `Nova anotacao` em um composer dedicado via bottom sheet, sem misturar a captura com a listagem existente.
- O botao `+` da bottom nav mobile agora reutiliza o mesmo composer dedicado de anotacao, substituindo a abertura do modal amplo legado de notas.

## Verificacao

- Build de verificacao executado com sucesso em 2026-05-02 via `npm.cmd run build`.

## Regras de execucao em vigor

- Nao reutilizar `DesktopPageHeader` no mobile.
- Nao levar `FilterBar` para mobile.
- Nao usar tabela no mobile.
- Toda pagina nova deve ter switch explicito entre `desktop` e `mobile`.
