# Matriz de paridade desktop ↔ mobile

Paridade de **resultados** (não de layout). Aparência/Looks está **adiada** (redirect para o hub).

| Ação | Desktop | Mobile | Lacuna |
| --- | --- | --- | --- |
| **Criação** | | | |
| Ver ideias / roteiros / arquivados | `/criacao` (grid, lista, kanban) | `/criacao` (grid/lista; kanban vira grid) | Kanban só desktop |
| Buscar / filtrar por pilar, série, origem | FilterBar + sort | MobileSearchBar + MobileFilterSheet | — |
| Criar ideia | Composer (`?compose=idea`) | Mesmo composer em sheet | — |
| Abrir / arquivar / restaurar / excluir | Cards + ações no card | Mesmas rotas e ações | — |
| Exportar DOCX | Toolbar de seleção | Mesmo fluxo | — |
| **Calendário / Programação** | | | |
| Ver mês / agenda | `/calendario` | `/calendario` (layout compacto) | Timeline: desktop raias × mobile lista (quando ativa) |
| Agendar / mover conteúdo | Drag + sheet de agendamento | Sheet / ações touch | Drag limitado no mobile |
| **Conteúdo (detalhe)** | | | |
| Abrir roteiro | `/conteudos/:id` | Mesma rota (shell mobile) | — |
| Editar script / legendas / status | Workspace desktop | Mesmos painéis em stack | Densidade menor no mobile |
| **Biblioteca** | | | |
| Catálogo + filtros | `/biblioteca` (grid-catalog + capas) | Lista/cards mobile | — |
| Análise / métricas | `/biblioteca/analise` | Mesma rota | — |
| Detalhe do item | `/biblioteca/:id` | Mesma rota | — |
| **Projetos** | | | |
| Listar / criar | `/projetos` | `/projetos` (ProjectsMobileScreen) | — |
| Detalhe, agenda, vínculos | `/projetos/:id` | Mesma rota | — |
| **Configurações** | | | |
| Hub | `/configuracoes` (cards) | SettingsMobileScreen (ícones) | — |
| Perfil, plataformas, templates, pilares, séries, horários | Sub-rotas `/configuracoes/*` | Mesmas rotas (screens mobile) | — |
| Aparência / Looks | Redirect → `/configuracoes` | Redirect → `/configuracoes` | **Adiada** — código em `LooksSettingsPage.tsx` preservado; sem card/ícone no hub |
