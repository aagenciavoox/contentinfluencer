# Auditoria — Sidebar e Organização de Navegação

> Data: 2026-06-12 · Escopo: `Sidebar.tsx`, `MobileBottomNav.tsx`, `MobileSidebarDrawer.tsx`, `SettingsSubSidebar.tsx`, rotas

## 1. Estrutura atual

**Desktop (Sidebar):**

| Seção | Itens |
|---|---|
| Geral | Dashboard, Pipeline (badge), Ideias, Calendário, Programação |
| Estúdio | DNA da Voz, Pilares, Séries, Regras de Ouro |
| Workspace | Biblioteca, Gravação, Análise |
| Rodapé | Configurações |

**Mobile:** bottom nav = Agenda, Pipeline, Gravação, Ideias + FAB; drawer = Dashboard, Biblioteca, Projetos, Análise.

**Configurações (sub-sidebar):** Visão geral, Perfil, Plataformas, Templates, Horários.

## 2. Problemas encontrados

### 🔴 Críticos

1. **Projetos é órfão no desktop.** A rota `/projetos` existe, tem module flag e aparece no drawer mobile — mas não está em nenhuma seção da sidebar desktop. Só é alcançável via Ctrl K ou URL direta.
2. **Programação é inalcançável no mobile.** Não está no bottom nav nem no drawer. Quem usa celular não chega na tela nova.
3. **O fluxo de produção está espalhado entre seções.** O trabalho real segue Ideia → Roteiro (Pipeline) → Gravação → Programação → Análise, mas na sidebar: Ideias e Pipeline estão em "Geral", Gravação e Análise em "Workspace", Programação em "Geral". O usuário pula entre seções para seguir o próprio processo.

### 🟡 Moderados

4. **Nomes de seção não comunicam.** "Geral" e "Workspace" são vagos e a divisão entre eles é arbitrária (por que Calendário é "Geral" e Biblioteca é "Workspace"?). "Estúdio" funciona.
5. **Naming inconsistente entre plataformas.** A mesma tela é "Calendário" no desktop e "Agenda" no mobile.
6. **Active-state de Configurações é um hack duplicado.** O rodapé exclui manualmente as 4 rotas do Estúdio (`studioRoutes = [...]`) em dois lugares (colapsado e expandido). Cada página nova de settings exige manutenção manual; esquecer = highlight duplo.
7. **Horários vive longe de quem o usa.** Os horários alimentam a Programação e o calendário, mas estão enterrados em Configurações → Horários. O Estúdio (DNA, Pilares, Séries, Regras) é exatamente "configuração editorial" — Horários pertence a esse grupo.

### 🟢 Menores

8. **Badge do Pipeline sem contexto** — número sem tooltip explicando o que conta (conteúdos em produção editorial).
9. **Ordem dentro de "Geral" não segue prioridade de uso**: Dashboard → Pipeline → Ideias, mas Ideias precede Pipeline no fluxo.
10. **Programação sem badge** — o nº de "prontos para programar" é a fila de trabalho dessa tela; um badge fecharia o loop (igual ao Pipeline).

## 3. Proposta de reorganização

Reorganizar por **etapa do trabalho**, não por tipo de tela:

| Seção | Itens (em ordem) | Racional |
|---|---|---|
| **Visão** | Dashboard, Calendário, Projetos | Onde se olha o todo e planeja |
| **Produção** | Ideias, Pipeline (badge), Gravação, Programação (badge), Análise | A ordem espelha o pipeline real, de cima para baixo |
| **Estúdio** | DNA da Voz, Pilares, Séries, Regras de Ouro, Horários | Identidade e regras editoriais |
| **Workspace** | Biblioteca | Acervo de referência |
| Rodapé | Configurações (Perfil, Plataformas, Templates) | Só configuração de sistema |

Benefícios: a seção "Produção" vira um mapa do processo (o usuário desce a lista conforme o conteúdo avança), Projetos deixa de ser órfão, e Configurações fica só com o que é de sistema.

**Mobile:**
- Drawer: adicionar **Programação** (e manter Projetos).
- Bottom nav: renomear "Agenda" → "Calendário" (ou padronizar tudo como "Agenda"); avaliar trocar "Gravação" por "Programação" se a fase de agendamento for mais frequente no celular que a de gravação — decisão sua.

**Limpezas técnicas:**
- Extrair `STUDIO_ROUTES` para constante única (ou melhor: derivar de `studioItems`) e usar nos dois pontos do rodapé.
- Tooltip no badge do Pipeline ("X conteúdos em produção").
- Badge na Programação = nº de cards `Gravado`/`Editado` sem data.

## 4. O que funciona bem (manter)

Busca Ctrl K no topo, modo colapsado com tooltips, badge como ponto azul quando colapsado, menu do usuário no rodapé com tema/perfil/sair, e module flags escondendo seções desativadas de forma consistente entre rotas e nav.

## 5. Plano de implementação

1. **Fase 1 (15 min):** adicionar Projetos ao desktop e Programação ao drawer mobile — corrige os dois órfãos sem mudar estrutura.
2. **Fase 2 (30 min):** reorganizar seções (Visão / Produção / Estúdio / Workspace) + mover Horários para Estúdio + constante `STUDIO_ROUTES` derivada.
3. **Fase 3 (15 min):** badges (Programação), tooltip do badge, naming Calendário/Agenda unificado.
