# Mobile Parallel Layer Guide

## Objetivo

Criar uma camada mobile nova para o sistema inteiro, paralela ao desktop, sem reutilizar layouts desktop-first.

Regra central:

- Desktop = gestao e operacao detalhada
- Mobile = captura rapida, consulta leve e acao contextual

Este guide existe para impedir que a implementacao mobile vire apenas uma versao comprimida do desktop.

---

## Leitura Rapida Para a IA

Se voce for implementar esta iniciativa, siga estas regras sem negociar:

- Nao adapte tabela, header, filtros ou grids do desktop para mobile.
- Nao use `DesktopPageHeader` no mobile.
- Nao use `FilterBar` no mobile.
- Nao use tabelas no mobile.
- Nao use grids densos no mobile.
- Nao leve KPIs grandes para mobile.
- Nao replique a composicao desktop em breakpoints pequenos.
- Compartilhe dados, estado, actions, reducers e regras de negocio.
- Nao compartilhe a camada de apresentacao entre desktop e mobile quando a experiencia for diferente.
- Sempre crie componentes mobile dedicados por tipo de tela.

---

## Auditoria de Realidade 2026-05-05

Estado atual confirmado no codigo:

- A arvore real de rotas esta em [src/app/router/AppRoutes.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/app/router/AppRoutes.tsx).
- O shell global real esta em [src/layouts/app/AppShell.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/app/AppShell.tsx).
- A fundacao mobile global ja esta ativa com `MobileAppShell`, `MobileHeaderIOS`, `MobileBottomNav` e `MobileActionMenu`.
- A camada mobile dedicada ja existe para `Ideias`, `Agenda`, `Projetos`, `Acervo`, `Conteudos`, `Gravacao`, `Dashboard`, `Analise` e o hub principal de `Configuracoes`.
- `Detalhe de Conteudo` agora tambem possui superficie mobile dedicada.
- O backlog remanescente de isolamento mais relevante esta nas telas de detalhe de `Projetos` e `Acervo`.

Observacao importante:

- Partes desta documentacao nasceram antes da reorganizacao de pastas. Sempre considere os caminhos acima como a referencia atual.

---

## Auditoria do Sistema Atual

### 1. Acoplamento global atual

Hoje o app usa uma unica arvore de rotas e um unico layout global para desktop e mobile.

Arquivos-chave:

- [src/App.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/App.tsx)
- [src/app/router/AppRoutes.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/app/router/AppRoutes.tsx)
- [src/layouts/app/AppShell.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/app/AppShell.tsx)
- [src/layouts/page/PageScaffold.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/page/PageScaffold.tsx)

Diagnostico:

- `AppShell` ja injeta o novo shell mobile e as paginas principais ja trocam para telas dedicadas nas rotas centrais.
- `PageScaffold` continua sendo uma superficie desktop/shared, mas agora nao renderiza mais `header` nem `toolbar` no mobile por padrao.
- O sistema ainda diferencia mobile principalmente com `useIsMobile()`, mas a arquitetura paralela ja esta consolidada no fluxo principal.

Conclusao:

- A base saiu do estagio de casco mobile e entrou em consolidacao de rotas de detalhe e guardrails finais.

### 2. DesktopPageHeader esta espalhado pela aplicacao

O componente abaixo esta amplamente usado:

- [src/layouts/page/DesktopPageHeader.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/page/DesktopPageHeader.tsx)

Ele aparece em Dashboard, Biblioteca, Ideias, Projetos, Analise, Configuracoes e telas de settings.

Conclusao:

- O principal vazamento de UX desktop para mobile hoje acontece no nivel da pagina.
- A nova camada mobile precisa ignorar esse header e usar um header proprio.

### 3. FilterBar desktop esta espalhado pela aplicacao

Arquivo:

- [src/components/ui/FilterBar.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/components/ui/FilterBar.tsx)

Uso forte em:

- Biblioteca
- Conteudos
- Calendario editorial
- Projetos
- Gravacao

Conclusao:

- O mobile nao deve reaproveitar esse componente.
- O substituto precisa ser `MobileSearchBar` + `MobileFilterSheet`.

### 4. Ja existem sinais de mobile, mas ainda superficiais

Arquivos:

- [src/layouts/navigation/MobileHeader.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/navigation/MobileHeader.tsx)
- [src/layouts/navigation/MobileNavBar.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/layouts/navigation/MobileNavBar.tsx)
- [src/features/contents/components/ContentsMobileView.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/contents/components/ContentsMobileView.tsx)

Diagnostico:

- O `MobileNavBar` atual ja tem CTA central, mas a arquitetura de destinos nao bate com o novo desenho.
- `ContentsMobileView` hoje apenas devolve `ContentTable`, o que viola diretamente a regra de nao usar tabela no mobile.

Conclusao:

- Existem ativos aproveitaveis como ideia e wiring, mas nao como solucao final.

### 5. O modulo Conteudos confirma o problema de "mobile aparente"

Arquivos:

- [src/features/contents/pages/Contents.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/contents/pages/Contents.tsx)
- [src/features/contents/components/ContentsHeader.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/contents/components/ContentsHeader.tsx)

Diagnostico:

- A tela ja bifurca por `isMobile`, o que e bom.
- Mas o header e os filtros continuam baseados em componentes desktop.
- A view mobile ainda usa tabela.

Conclusao:

- Conteudos e um bom molde tecnico para separar desktop e mobile, mas a implementacao atual nao pode ser copiada como padrao de UX.

### 6. Settings estao 100% desktop-first

Arquivos representativos:

- [src/pages/Settings.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/Settings.tsx)
- [src/pages/settings/DNAVoz.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/settings/DNAVoz.tsx)
- [src/pages/settings/Pilares.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/settings/Pilares.tsx)
- [src/pages/settings/Templates.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/settings/Templates.tsx)

Diagnostico:

- Essas telas dependem fortemente de formularios longos, lists detalhadas e headers desktop.
- Elas vao exigir componentes mobile proprios e um rollout faseado.

### 7. Risco principal de implementacao

O maior risco nao e tecnico; e de direcao.

Risco:

- A IA tentar "aproveitar o maximo possivel" e acabar fazendo so uma adaptacao responsiva do desktop.

Antidoto:

- Separar apresentacao mobile por pasta, componente e contrato.
- Tratar desktop e mobile como dois produtos dentro da mesma aplicacao.

### 8. Backlog atual de maior impacto

Arquivos:

- [src/features/projects/pages/ProjectDetailPage.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/projects/pages/ProjectDetailPage.tsx)
- [src/features/library/pages/BookDetailPage.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/library/pages/BookDetailPage.tsx)

Diagnostico:

- As listagens principais de `Projetos` e `Acervo` ja estao isoladas, mas suas telas de detalhe ainda operam como paginas desktop completas em viewport pequena.
- Essas duas rotas concentram o maior risco de regressao de UX mobile no estado atual.

Conclusao:

- A proxima fase deve atacar detalhes de `Projetos` e `Acervo` antes de qualquer polimento cosmetico.

---

## O Que Pode Ser Reaproveitado

Pode reaproveitar:

- `AppContext`, `AuthContext`, reducers e actions
- hooks de dados e selecao
- tipos em `src/lib/database.ts`
- modais de dominio, quando o comportamento fizer sentido
- logica de filtros, sort e agrupamentos, desde que a UI mobile seja nova
- rotas existentes

Nao deve reaproveitar como UI mobile:

- `DesktopPageHeader`
- `FilterBar`
- `ContentTable`
- barras de tabs desktop
- grids analiticos/KPIs do dashboard
- qualquer composicao "header + toolbar + grid denso" herdada do desktop

---

## Arquitetura-Alvo

### Principio

Cada pagina principal deve decidir explicitamente entre desktop e mobile:

```tsx
export function Projetos() {
  const isMobile = useIsMobile()
  return isMobile ? <ProjetosMobileScreen /> : <ProjetosDesktopScreen />
}
```

Regra:

- Compartilhar logica de dados e handlers no container.
- Separar views desktop e mobile em componentes diferentes.

### Estrutura sugerida

```text
src/
  mobile/
    components/
      MobileAppShell.tsx
      MobileHeaderIOS.tsx
      MobileBottomNav.tsx
      MobileActionMenu.tsx
      MobileSearchBar.tsx
      MobileSegmentTabs.tsx
      MobileListCard.tsx
      MobileGridCard.tsx
      MobileEmptyState.tsx
      MobileFilterSheet.tsx
    patterns/
      MobileScreenSection.tsx
      MobileScreenStack.tsx
      MobileStatPill.tsx
      MobileInlineMeta.tsx
    screens/
      dashboard/
      agenda/
      projetos/
      ideias/
      acervo/
      conteudos/
      gravacao/
      analise/
      settings/
  features/
    ...
  pages/
    ...
```

### Shell mobile

Criar um shell proprio para mobile.

Obrigatorio:

- `MobileAppShell`
- `MobileHeaderIOS`
- `MobileBottomNav`
- `MobileActionMenu`

Regra de integracao:

- O shell mobile nao deve ser uma extensao do header desktop.
- O header mobile deve ser contextual por tela.
- O bottom nav deve seguir a nova IA de navegacao.

---

## Componentes Globais Mobile Obrigatorios

Criar estes componentes antes das paginas:

- `MobileAppShell`
- `MobileHeaderIOS`
- `MobileBottomNav`
- `MobileActionMenu`
- `MobileSearchBar`
- `MobileSegmentTabs`
- `MobileListCard`
- `MobileGridCard`
- `MobileEmptyState`
- `MobileFilterSheet`

### Contrato minimo por componente

#### `MobileAppShell`

Responsabilidade:

- estrutura base mobile
- safe areas
- espacamento entre header, conteudo e bottom nav
- controle de overlay do menu de acoes

#### `MobileHeaderIOS`

Responsabilidade:

- estilo iOS Notes
- botao voltar/menu a esquerda
- acao contextual a direita
- titulo grande dentro da pagina
- subtitulo curto
- sem breadcrumb
- sem reuso de header desktop

Props minimas:

- `title`
- `subtitle`
- `leftAction`
- `rightAction`
- `mode: 'menu' | 'back'`

#### `MobileBottomNav`

Itens obrigatorios:

- Agenda
- Projetos
- Ideias
- Acervo
- botao central CTA

CTA abre:

- Nova Ideia
- Novo Conteudo
- Nova Anotacao

#### `MobileSearchBar`

Responsabilidade:

- busca unica e leve
- gatilho de filtro por sheet

#### `MobileSegmentTabs`

Responsabilidade:

- alternancia entre sublistas compactas
- nunca substituir por tabs desktop existentes

#### `MobileListCard`

Responsabilidade:

- item principal de listas mobile
- titulo, meta curta, status, CTA leve

#### `MobileGridCard`

Responsabilidade:

- cards simples de acervo/templates
- densidade controlada

#### `MobileEmptyState`

Responsabilidade:

- vazio com CTA principal

#### `MobileFilterSheet`

Responsabilidade:

- filtros opcionais e colapsados
- zero barra de filtros exposta como no desktop

---

## Navegacao Mobile Desejada

### Bottom nav

- Agenda
- Projetos
- Ideias
- Acervo
- CTA central

### Observacao importante

Hoje o `MobileNavBar` aponta para:

- Agenda
- Projetos
- Gravacao
- Conteudos

Isso precisa mudar para a nova IA de produto mobile.

Conteudos, Gravacao, Templates, Analise e demais areas devem entrar por:

- CTA
- navegao contextual
- deep links
- acessos internos

Nao precisam estar todos na bottom nav.

---

## Mapeamento de Experiencia por Pagina

### Dashboard

Desktop:

- gestao, pipeline, volume, visao ampla

Mobile:

- resumo de foco do dia
- cards curtos de prioridade
- proximas acoes
- agenda imediata

Nao fazer:

- transplantar KPIs e graficos atuais

### Biblioteca -> Acervo

Desktop:

- catalogo com filtros e grade densa

Mobile:

- busca
- grade simples de referencias
- cards limpos

Nao fazer:

- KPIs
- filtros densos
- grid de muitas colunas

### Ideias

Mobile:

- captura rapida
- textarea grande
- botao capturar
- ideias recentes

Essa e uma das primeiras telas a entrar em producao, pois tem alto valor e baixa dependencia.

### Conteudos

Mobile:

- lista segmentada
- `Geral`
- `Prontos para Gravar`
- `Em andamento`

Nao fazer:

- tabela
- toolbar desktop

### Gravacao

Mobile:

- fila de gravacao
- acesso ao Modo Explosao

Nao fazer:

- reaproveitar filtros completos da fila desktop

### Calendario -> Agenda

Mobile:

- lista por dia/semana
- agrupamento por data
- calendario mensal complexo fica no desktop

### Projetos

Mobile:

- lista simples
- prazo
- status
- progresso

### Analise

Mobile:

- insights resumidos
- alertas rapidos
- sem dashboard completo

### Templates

Mobile:

- biblioteca simples
- busca
- cards

### Pilares Editoriais

Mobile:

- lista
- criacao/edicao em tela dedicada ou bottom sheet

### Regras de Ouro

Mobile:

- lista de regras
- status simples

### Series

Mobile:

- lista de series
- contagem
- botao criar

### DNA da Voz

Mobile:

- formulario em etapas ou sections
- nunca um formulario gigante na mesma tela

### Marcadores de Gravacao

Nova direcao:

- nao usar catalogo rigido de looks e cenarios
- usar marcadores livres por conteudo e por bloco de gravacao
- exemplos: roupa preta, estante, caneca vermelha, luz quente, livro na mao
- o objetivo e separar lotes gravados no mesmo dia para publicar em dias diferentes sem parecer repeticao obvia

### Plataformas

Mobile:

- lista de canais
- status ativo/inativo

---

## Estrategia de Implementacao

### Padrao tecnico recomendado

Para cada pagina principal:

1. Extrair logica de estado, filtros e handlers para um container ou hook local.
2. Criar uma view desktop explicita, se ainda estiver embutida na pagina.
3. Criar uma view mobile nova.
4. Trocar a pagina para um switch explicito entre desktop e mobile.

Exemplo:

```tsx
export function Biblioteca() {
  const isMobile = useIsMobile()
  const vm = useBibliotecaScreenModel()

  if (isMobile) {
    return <BibliotecaMobileScreen {...vm} />
  }

  return <BibliotecaDesktopScreen {...vm} />
}
```

### Regra de ouro de implementacao

- Primeiro separar.
- Depois redesenhar.
- Nunca redesenhar mantendo a view desktop no mesmo JSX.

---

## Fases de Execucao

## Fase 0 - Guardrails e preparacao

Objetivo:

- impedir regressao de direcao antes de construir telas

Entregas:

- criar este guide no repo
- definir pasta `src/mobile`
- definir naming convention `XMobileScreen` e `XDesktopScreen`
- alinhar a regra de nao usar `DesktopPageHeader` nem `FilterBar` em telas mobile
- revisar `MobileNavBar` atual e planejar substituicao por `MobileBottomNav`

Definition of done:

- qualquer nova tarefa mobile ja nasce com estrutura paralela

## Fase 1 - Fundacao mobile global

Objetivo:

- criar o sistema base da camada mobile

Entregas:

- `MobileAppShell`
- `MobileHeaderIOS`
- `MobileBottomNav`
- `MobileActionMenu`
- `MobileSearchBar`
- `MobileSegmentTabs`
- `MobileListCard`
- `MobileGridCard`
- `MobileEmptyState`
- `MobileFilterSheet`

Tambem nesta fase:

- adaptar `AppLayout` para montar shell mobile novo sem quebrar desktop
- manter desktop intocado

Definition of done:

- existe uma infraestrutura mobile pronta para ser consumida por qualquer tela

## Fase 2 - Telas nucleares de uso rapido

Objetivo:

- entregar rapidamente as experiencias mobile com maior frequencia de uso

Ordem sugerida:

1. Ideias
2. Agenda
3. Projetos
4. Acervo

Entregas:

- `IdeasMobileScreen`
- `AgendaMobileScreen`
- `ProjetosMobileScreen`
- `AcervoMobileScreen`

Motivo:

- validam captura, consulta, lista e navegacao
- exigem menos dependencia de modulos analiticos

Definition of done:

- bottom nav principal faz sentido
- usuario ja consegue capturar, consultar agenda, ver projetos e navegar acervo sem cair em layout desktop comprimido

## Fase 3 - Fluxos operacionais leves

Objetivo:

- cobrir o que o mobile precisa fazer em operacao, sem virar escritorio completo

Ordem sugerida:

1. Conteudos
2. Gravacao
3. Dashboard
4. Analise

Entregas:

- `ConteudosMobileScreen`
- `GravacaoMobileScreen`
- `DashboardMobileScreen`
- `AnaliseMobileScreen`

Pontos criticos:

- `ContentsMobileView` atual deve deixar de usar `ContentTable`
- Gravacao deve focar fila e acesso ao Modo Explosao
- Dashboard deve virar foco do dia
- Analise deve virar resumo e alertas

Definition of done:

- o mobile cobre operacao curta e contextual
- o desktop continua sendo o lugar da gestao detalhada

## Fase 4 - Configuracoes mobile

Objetivo:

- cobrir as telas de configuracao sem levar formularios gigantes do desktop

Ordem sugerida:

1. Settings hub
2. Templates
3. Pilares
4. Series
5. Plataformas
6. Regras de Ouro
7. DNA da Voz

Mudanca de produto em 2026-05-02:

- `Looks & Cenarios` saiu do roadmap como modulo dedicado
- a substituicao aprovada e `Marcadores de Gravacao` dentro de `Conteudos` e `Gravacao`

Estrategia:

- listas simples
- edicao por tela dedicada ou bottom sheet
- formularios por secoes

Definition of done:

- as configuracoes principais podem ser lidas e alteradas no mobile sem parecer um admin comprimido

## Fase 5 - Polimento, consistencia e QA

Objetivo:

- fechar a camada mobile com consistencia real

Entregas:

- revisar safe areas
- revisar alturas do bottom nav e overlays
- revisar scroll restoration
- revisar estados vazios
- revisar loading e erro
- revisar acessibilidade de toque
- revisar transicoes
- revisar codificacao quebrada de strings antigas

Definition of done:

- mobile parece um app nativo
- desktop nao sofreu regressao

---

## Ordem Recomendada de Arquivos

### Primeiro criar

- `src/mobile/components/*`
- `src/mobile/screens/ideas/IdeasMobileScreen.tsx`
- `src/mobile/screens/agenda/AgendaMobileScreen.tsx`
- `src/mobile/screens/projetos/ProjetosMobileScreen.tsx`
- `src/mobile/screens/acervo/AcervoMobileScreen.tsx`

### Depois adaptar containers

- [src/pages/Ideas.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/Ideas.tsx)
- [src/pages/EditorialCalendar.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/EditorialCalendar.tsx)
- [src/pages/Projetos.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/Projetos.tsx)
- [src/pages/Biblioteca.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/pages/Biblioteca.tsx)
- [src/features/contents/pages/Contents.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/contents/pages/Contents.tsx)
- [src/features/recording/pages/Gravacao.tsx](/C:/Users/mente/Desktop/CODING/content-os/src/features/recording/pages/Gravacao.tsx)

### Por ultimo

- settings
- refinamentos globais
- limpeza de componentes mobile antigos que ficarem obsoletos

---

## Checklist Operacional Para a IA

Antes de editar qualquer tela, valide:

- Estou criando uma view mobile nova ou apenas espremendo a desktop?
- Estou usando `DesktopPageHeader` no mobile?
- Estou usando `FilterBar` no mobile?
- Estou usando tabela no mobile?
- Existe CTA claro e principal?
- A tela mobile cabe em um uso de 30 a 90 segundos?
- Essa interacao e de captura, consulta leve ou acao contextual?

Se a resposta fugir disso, a implementacao esta saindo do trilho.

---

## Anti-Padroes Proibidos

- `isMobile ? classesMenores : classesDesktop`
- esconder colunas de tabela e chamar isso de mobile
- transformar `FilterBar` em scroll horizontal
- reaproveitar breadcrumb no mobile
- renderizar o mesmo header desktop com padding diferente
- manter grids de 4 a 7 colunas no mobile
- levar dashboards completos para telas pequenas

---

## Recomendacao Final de Execucao

Nao tentar migrar tudo de uma vez.

A ordem mais segura e:

1. fundacao mobile
2. quatro telas nucleares
3. fluxos operacionais leves
4. configuracoes
5. polimento

Se a IA seguir essa ordem, a chance de quebrar desktop cai bastante e a chance de produzir um mobile realmente nativo sobe muito.
