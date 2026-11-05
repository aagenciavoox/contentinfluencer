# Revisão do diagnóstico e plano de refatoração das telas

Data: 03/11/2026. Escopo: revisão do código atual e planejamento. Nenhuma alteração de comportamento faz parte desta entrega.

Ampliação: a [auditoria transversal do app](./AUDITORIA-APP-2026-11-03.md) registra 16 achados de comportamento, incluindo isolamento de sessão, perda de edição e sincronização. As correções prioritárias dessa auditoria devem anteceder a extração estrutural das telas; manter testes e correções funcionais em entregas próprias.

## Conclusão

O diagnóstico identifica problemas reais de manutenção: páginas com muitas responsabilidades, tratamento repetido de parâmetros de URL e diferenças na organização do mobile. A separação entre orquestração, apresentação e regras de domínio é adequada. Ela deve ser aplicada por tela, sem metas rígidas de linhas e sem concentrar novamente toda a complexidade em um único hook.

Os ganhos de desempenho precisam de medição. Separar arquivos ou renomear o consumo do contexto não garante menos renderizações. A proposta de desmontar todos os modais também precisa ser revista: a infraestrutura existente já desmonta o conteúdo e preserva a animação de saída.

Recomendação: começar pela Biblioteca, corrigir sua inconsistência de filtragem mobile em uma entrega própria e usar essa tela para consolidar o padrão antes de migrar as telas maiores.

## 1. Diagnóstico conferido

As referências abaixo são relativas à raiz do repositório. As linhas representam o estado consultado e podem mudar durante a implementação.

| Afirmação original | Resultado da revisão | Evidência |
| --- | --- | --- |
| Rotas com carregamento assíncrono, prefetch e carregamento por domínio | Confirmado. O boundary solicita os domínios em efeito; seu Suspense cobre os chunks, sem aguardar todos os dados antes de mostrar a rota. | `src/app/router/routePrefetch.ts:134`, `src/app/router/RouteDataBoundary.tsx:21` |
| A casca controla o topo e a navegação mobile | Confirmado. Preservar essa autoridade durante extrações. | `src/layouts/app/AppShell.tsx:136`, `src/layouts/app/AppShell.tsx:170` |
| Páginas concentram estado, ações e apresentação | Confirmado, com tamanhos diferentes do texto original. | Tabela a seguir |
| Existem três formas de integrar o mobile | Confirmado nos exemplos: Biblioteca em `src/mobile/screens/`, Planejamento em componente da feature e Criação com ramificações internas. | Imports e JSX das três páginas |
| Biblioteca e detalhe repassam mais de 25–30 props | Parcial. A Biblioteca passa 18 props; o detalhe da obra passa 29. Quantidade de props é um sinal para revisar responsabilidades, não um defeito por si só. | `LibraryPage.tsx:583`, `BookDetailPage.tsx:1097` |
| Modais fechados mantêm toda a árvore e listeners ativos | Generalização incorreta. `OverlayRoot` retorna `null` quando desmontado, mantém a saída animada e condiciona os efeitos de interação a `open`. Componentes externos ao overlay ainda podem executar hooks e cálculos. | `src/components/overlays/OverlayRoot.tsx:60`, `src/components/overlays/OverlayRoot.tsx:106`, `src/components/overlays/useOverlayBehavior.ts:24` |
| O contexto amplo pode provocar renderizações não relacionadas | Confirmado como risco estrutural; o impacto no tempo de interação ainda não foi medido. O valor do provider já usa `useMemo`, mas depende de `state` e `domainStatus`. | `src/context/AppContext.tsx:846`, `src/context/AppContext.tsx:865` |
| Há 156 suítes em `lib/` e nenhum teste de apresentação | Existem 156 arquivos `*.test.*` em `src/`, distribuídos por várias camadas; 9 estão diretamente em `src/lib/`. Não há arquivos `*Page.test.*`. Já existem testes de componentes com renderização estática. Isso não equivale a cobertura de interação das páginas. | `src/test-runner.ts`, `src/components/ui/textPresentation.test.tsx` e inventário de nomes de testes |
| Há repetição no tratamento da URL | Confirmado na Biblioteca e em Criação. Os contratos diferem: `pagina` versus `page`, aliases legados e preferência de visualização persistida. | `LibraryPage.tsx:228`, `CreationHubPage.tsx:190` |

Tamanhos atuais aproximados, contando linhas lógicas do arquivo:

| Página | Linhas |
| --- | ---: |
| Biblioteca | 749 |
| Detalhe da obra | 1.502 |
| Criação | 1.617 |
| Planejamento | 1.834 |
| Calendário editorial | 1.733 |

### Problema adicional: filtros mobile aplicados depois da paginação

`LibraryPage.tsx:287` busca uma página com `usePaginatedQuery` e passa `libraryItems` para o mobile. Em `src/mobile/screens/library/LibraryMobileScreen.tsx:178`, busca, tipo, status e aba são estados locais; em `:188` e `:197`, contagens e filtragem usam somente os itens recebidos.

Consequência demonstrável pelo fluxo: uma obra em outra página não participa da busca local e as contagens das abas representam a página carregada. Uma página pode aparecer vazia depois do filtro, mesmo havendo correspondências no restante do acervo. A tela também aplica uma ordenação local por atualização.

O caminho está confirmado por leitura de código; a reprodução visual com um acervo maior que o tamanho da página ainda precisa ser executada. A correção deve definir o alcance das contagens e a semântica da busca, incluindo tags, antes de reaproveitar a consulta do desktop.

## 2. Arquitetura proposta

```text
src/features/library/
  pages/LibraryPage.tsx
  hooks/useLibraryController.ts
  hooks/useLibraryQueryState.ts
  hooks/useLibraryActions.ts
  hooks/useLibraryCreateForm.ts
  screens/LibraryDesktopView.tsx
  screens/LibraryMobileView.tsx
  components/LibraryDialogs.tsx
  lib/libraryQuery.ts
  lib/libraryPresentation.ts
```

- A página chama o controller uma vez, escolhe a view e compõe os diálogos compartilhados. As duas views não instanciam controllers independentes.
- O controller coordena consulta, ações e estado de interação por meio de hooks menores. As regras puras ficam em `lib/`, sem dependência do React.
- As views recebem contratos tipados por responsabilidade, como `query`, `collection`, `actions` e `creation`. Agrupar props deve expressar uma fronteira real; não basta esconder dezenas de campos em um objeto genérico.
- Estado transitório de apresentação, como abertura do sheet de filtros ou falha de imagem, pode continuar no componente específico. Não precisa entrar no controller nem na URL.
- As views de página deixam o acesso a dados no controller. Componentes internos com responsabilidade própria, como upload de capa, podem manter sua integração existente até uma extração justificada.
- `PageLayout`, `DesktopPageHeader`, `PageToolbar`, tokens e componentes do design system continuam sendo usados. O shell mobile continua responsável pelo cabeçalho, navegação e áreas seguras.
- A migração do mobile para a feature ocorre junto da migração da tela. Um re-export temporário pode preservar imports; removê-lo depois de verificar os consumidores.

O objetivo é reduzir responsabilidades acopladas. Não impor um limite de 150 linhas por hook ou 200 por view: esses limites poderiam apenas redistribuir um monólito em arquivos artificiais.

## 3. Plano de implementação em entregas

| Etapa | Entrega | Dependência | Critério para concluir |
| --- | --- | --- | --- |
| 0 | Registrar comportamento e preparar testes da Biblioteca | Nenhuma | Casos de URL, navegação, criação e estados de consulta documentados; cenário com múltiplas páginas preparado; falhas anteriores separadas das novas. |
| 1 | Corrigir a filtragem e paginação da Biblioteca mobile | Etapa 0 | Busca e filtros encontram obras além da página atual; mudança de filtro volta à primeira página; contagens e ordenação seguem contrato explícito; desktop preservado. |
| 2 | Extrair o contrato da URL da Biblioteca e criar `useQueryFilters` | Etapas 0–1 | Uma atualização pode alterar vários filtros atomicamente; parsing e serialização têm testes; URLs existentes e histórico mantêm comportamento. |
| 3 | Separar controller, views e diálogo da Biblioteca | Etapa 2 | Página contém apenas composição; uma única consulta por controller; desktop e mobile passam pelos casos da etapa 0; comportamento permanece equivalente ao resultado da etapa 1. |
| 4 | Reutilizar o padrão em Criação | Etapa 3 | Validar aliases, filtros múltiplos, preferência de visualização, seleção em massa e transições; manter o fallback de Kanban no mobile. |
| 5 | Migrar Planejamento, detalhe da obra e calendário | Etapa 4 | Uma tela por entrega, com seus próprios testes de interação e revisão desktop/mobile. |
| 6 | Reduzir assinaturas do contexto onde a medição justificar | Medições da etapa 0 e telas relevantes estabilizadas | A mesma operação provoca menos trabalho nos consumidores sem alterar persistência, carregamento e atualização da interface. |

Cada entrega deve ser revisável e reversível por conta própria. A correção funcional da etapa 1 deve permanecer separada da movimentação de JSX da etapa 3. O repositório já contém alterações locais em Criação, Planejamento e outros módulos; verificar essas diferenças antes de iniciar cada implementação.

### Etapa 0: testes e referência de comportamento

1. Registrar os contratos atuais de URL e retorno do detalhe para a listagem, incluindo `replace: true` na Biblioteca.
2. Usar `node:test` para parsing, serialização, derivação de dados e regras de ações puras.
3. Adicionar um suporte mínimo a testes de interação com DOM e roteador em memória, compatível com React 19. A configuração atual executa testes Node e renderização estática; só extrair um hook não cria esse suporte.
4. Conectar os novos testes a `npm test`; não deixar arquivos novos fora do comando executado pelo projeto.
5. Registrar perfis reproduzíveis com o mesmo volume de dados, dispositivo e configuração: busca, troca de página, abertura de modal e atualização de uma entidade não utilizada pela tela. Medir duração dos commits e quantidade de consultas antes de prometer otimização.

### Etapas 1–2: consulta e estado de URL

Na etapa 1, conferir a implementação de `fetchBibliotecaPage` e seus filtros suportados antes de levar a busca mobile para a consulta paginada. Definir se as contagens são globais ou refletem filtros ativos. Não calcular uma contagem global a partir de uma página. Preservar a busca por tags ou registrar expressamente qualquer mudança de contrato em entrega própria.

O utilitário genérico deve oferecer:

- Schema estável com `parse` e `serialize` por campo, suportando enums, números inteiros positivos e formatos específicos de cada domínio.
- Nome configurável do parâmetro de página: `pagina` na Biblioteca e `page` em Criação.
- `setFilters(patch)` atômico, além de `setFilter` e `resetFilters`; preservar parâmetros que não pertencem ao schema.
- Política explícita de reinício da página e de `replace`/`push`. Inicialmente conservar o comportamento da tela migrada.
- Composição de atualizações feitas no mesmo evento, sem perder campos; sincronização correta após voltar, avançar e navegação externa ao hook.
- Omissão de defaults ao escrever a URL; fallback seguro na leitura de valores inválidos, sem efeitos que gerem ciclos de navegação.
- Adaptação de aliases e formatos legados na feature, sem impor esses detalhes a todas as telas.

A implementação atual de `paramsRef` resolve uma limitação real: callbacks de `setSearchParams` não possuem a fila de atualizações de `setState`. A extração precisa conservar essa garantia. Referência: [React Router 7.13.2 — useSearchParams](https://reactrouter.com/7.13.2/api/hooks/useSearchParams).

### Etapa 3: extração da Biblioteca

Manter `usePaginatedQuery`, cache e contratos de mutação existentes. Separar sua chamada da apresentação sem introduzir uma segunda fonte de dados para a mesma lista. As contagens já dependem da coleção completa no contexto; preservar essa distinção até uma revisão específica de carregamento.

Preservar também o uso do item completo nas alterações de obras: `LibraryPage.tsx:354` documenta que a grade paginada não contém as anotações. Atualizar a partir do registro parcial pode causar perda de dados se essa proteção for removida.

### Etapas 4–5: expansão por domínio

- **Criação:** separar query state, seleção em massa, ações e visualização. Conferir persistência da preferência de visualização, abas e filtros legados, arquivamento, lixeira e publicação. Regras de negócio extraídas devem ser comparadas com `mcp/src/` quando compartilhadas.
- **Planejamento:** extrair por responsabilidade — período/filtros, seleção e arraste, ações de post-it, saúde editorial e overlays. Reaproveitar `PlanejamentoMobileView` e componentes existentes antes de criar novas divisões.
- **Detalhe da obra:** dividir por anotações, progresso/metadados e roteiros relacionados. Preservar rascunhos e confirmar a política de reset dos formulários.
- **Calendário:** separar construção das entradas, navegação do período, filtros e detalhe/edição; preservar datas, horários, camadas e arraste.

### Overlays: aplicar sob demanda conforme o custo real

Revisar componentes que fazem trabalho fora de `OverlayRoot`, como `PostItRapidoDialog`, que mantém estado e calcula opções mesmo fechado. Extrair esses componentes pode melhorar a organização; ganhos de execução devem ser medidos.

Não aplicar mecanicamente `{open && <Dialog />}`: desmontar o componente externo ao fechar pode cortar sua animação de saída e mudar o comportamento de rascunhos. Preservar a montagem até `onExitComplete` ou montar o invólucro no primeiro uso e deixar o ciclo de saída sob responsabilidade da infraestrutura atual.

Usar importação dinâmica somente para módulos com peso relevante no bundle, com estado de carregamento e tratamento de falha definidos. Montagem condicional e divisão do bundle são decisões diferentes. Agrupar todos os diálogos em outro arquivo, por si só, não reduz execução.

### Etapa 6: contexto e desempenho

`useContentsSelector` implementado apenas como `selector(useAppContext().state)` continuaria assinando o mesmo contexto. `useMemo` pode evitar cálculos repetidos, mas não elimina essa assinatura. Essa distinção acompanha o contrato de [useContext do React](https://react.dev/reference/react/useContext).

Depois de medir, experimentar uma mudança pequena: um contexto separado de ações, de status de carregamento ou de uma fatia de domínio, alimentado pelo estado existente e com referências estáveis. Isso só permite isolamento nos consumidores que deixarem de assinar o contexto amplo. Não duplicar o estado persistente. Uma store com assinaturas seletivas pode ser avaliada se a divisão dos contextos não resolver o problema medido.

Critérios: comparar o mesmo cenário antes/depois; atualizar uma entidade não consumida não deve disparar trabalho evitável nos consumidores migrados; uma alteração relevante precisa aparecer corretamente na tela. Conferir ações, invalidação, troca de usuário e sincronização quando a infraestrutura for alterada.

## 4. Matriz mínima de aceitação

| Área | Casos obrigatórios |
| --- | --- |
| URL | Valores ausentes e inválidos; defaults; Unicode; patch com vários campos; parâmetros desconhecidos; reinício e preservação de página; voltar/avançar; retorno do detalhe. |
| Biblioteca mobile | Acervo maior que uma página; resultado de busca fora da página inicial; abas de status; tipo e capa combinados; contagens; ordenação; vazio real versus vazio filtrado. |
| Consulta | Carregando, vazio, erro, tentar novamente e atualização em segundo plano; navegação rápida entre filtros; ausência de nova consulta duplicada causada pela extração. |
| Mutações | Criar obra; alterar status e capa; manter anotações e metadados; desfazer quando disponível; feedback de sucesso e erro. |
| Overlays | Abrir, cancelar, salvar e reabrir; reset/preservação do rascunho; Escape; foco; bloqueio de rolagem; saída animada; teclado mobile. |
| Apresentação | Comparação desktop/mobile; um cabeçalho mobile; gutters e área segura; uma ação primária por contexto; desktop preservado em correções exclusivas do mobile. |

Para cada entrega de código: executar testes focados e os checks aplicáveis. Para os marcos estruturais: `npm run lint:design`, `npm run lint`, `npm test` e `npm run build`; executar também `voice:audit` se houver alteração de textos. Rodar `graphify update .` uma vez ao terminar alterações de código. Registrar falhas preexistentes separadamente, sem ampliar a entrega para corrigi-las automaticamente.

## 5. Limites e situação desta revisão

- Foram consultados o grafo atual, fontes das páginas, infraestrutura de layout/overlays, hooks de consulta, scripts e nomes de testes. O grafo serviu para localizar código; as conclusões foram verificadas nas fontes.
- Foram conferidos os contratos oficiais de contexto React e parâmetros do React Router; a versão do Router no lockfile é 7.13.2.
- Não foram executados testes, build, aplicação no navegador ou perfis de desempenho nesta revisão documental. Não há estimativa comprovada de ganho de velocidade ou memória.
- Não foram alterados código, schema, configuração de testes ou dependências. Este arquivo é a única entrega nova desta revisão.
- A primeira implementação recomendada é a etapa 0, seguida da correção mobile isolada e da extração incremental da Biblioteca.
