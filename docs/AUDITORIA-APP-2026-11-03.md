# Auditoria transversal de bugs do app

Data: 03/11/2026. Revisão da árvore de trabalho atual, incluindo alterações locais que já estavam presentes. Não atribui os problemas a um commit específico.

## Resultado e alcance

Foram identificados 16 achados de comportamento: 10 P1 e 6 P2. Oito achados têm reproduções controladas com código do projeto; os demais foram confirmados pela leitura dos caminhos de execução. A reprodução controlada usa dados sintéticos, funções reais e dependências simuladas; não substitui teste integrado no navegador.

P1 indica correção prioritária por perda de edição, isolamento de sessão ou inconsistência de dados. P2 indica um defeito funcional com impacto mais restrito. Não foi demonstrado um incidente em produção, acesso indevido ao banco ou bug P0.

A revisão percorreu autenticação, roteamento, estado global, caches, persistência, Biblioteca, Legendas, Transcrição, Gravação, Projetos, configurações de contas/horários e consumidores de Planejamento, Calendário, Editorial e Hoje. O grafo atual foi consultado para localizar dependências; as conclusões abaixo vêm das fontes. Não é uma certificação de ausência de outros bugs nesses módulos.

## Inventário priorizado

| ID | Prioridade | Problema | Validação |
| --- | --- | --- | --- |
| A01 | P1 | Logout preserva dados da conta anterior no estado | Reprodução |
| A02 | P1 | Validação de sessão atrasada recoloca usuário após logout | Reprodução |
| A03 | P1 | Recuperação após falha não executa o rollback esperado | Fluxo de código |
| A04 | P1 | Substituição de vínculos pode apagar dados antes de falhar | Reprodução |
| A05 | P1 | Abrir uma obra sem cache pode levar a salvar ficha vazia | Reprodução |
| A06 | P1 | Ficha da obra é marcada como salva antes da confirmação | Fluxo de código |
| A07 | P1 | Legendas perde edição ao trocar de roteiro antes de 600 ms | Fluxo de código |
| A08 | P1 | Resposta antiga sobrescreve resultado da busca atual | Reprodução |
| A09 | P1 | Sincronização mantém roteiros excluídos/arquivados remotamente | Reprodução |
| A10 | P2 | Sincronização de contas sempre dá preferência ao registro local | Reprodução |
| A11 | P1 | Fila e transcrições permanecem disponíveis na troca de conta | Fluxo de código |
| A12 | P2 | Horário pendente pode ser salvo na conta errada | Reprodução |
| A13 | P2 | Busca e contagens mobile da Biblioteca só consideram a página atual | Fluxo de código |
| A14 | P2 | Página da Biblioteca fora do limite remove a própria navegação | Fluxo de código |
| A15 | P2 | Ações da Biblioteca atualizam contexto, mas deixam a grade antiga | Fluxo de código |
| A16 | P2 | Login descarta o destino que exigiu autenticação | Fluxo de código |

## Achados

### A01 — Dados da conta anterior sobrevivem ao logout

Evidências: [AppContext.tsx:487](../src/context/AppContext.tsx#L487), [reducer.ts:208](../src/context/reducer.ts#L208), [domainCacheMerge.ts:52](../src/lib/domainCacheMerge.ts#L52), [AppProviders.tsx:14](../src/app/providers/AppProviders.tsx#L14).

No logout, `SET_DATA` recebe `{}`. O reducer mescla esse objeto ao estado, preservando conteúdos, obras, preferências e outras coleções. O provider permanece montado fora do roteador. Na entrada seguinte, a mesclagem de conteúdos conserva também IDs ausentes no retorno da nova conta.

Reprodução com o reducer e a função de merge reais: após o logout continuam `roteiro-A` e `obra-A`; ao carregar conteúdos de B, o resultado contém usuários `['B', 'A']`. Isso demonstra mistura no estado do cliente, sem implicar que as políticas do banco permitam ler dados de terceiros.

Há um agravante no mesmo limite de sessão: `loadDomains` escreve estado e caches quando sua promise termina, sem conferir se o usuário ainda é o mesmo. O `cancelled` do bootstrap só é consultado depois desse trabalho. Uma consulta antiga pode repovoar o estado após a limpeza.

Correção: ação explícita de reset para o estado inicial; invalidação dos trabalhos em voo por geração/usuário; reinício de referências e caches na mudança de identidade. Testar A → logout → B e resposta de A terminando após a troca.

### A02 — Resposta antiga de autenticação altera a sessão atual

Evidência: [AuthContext.tsx:41](../src/context/AuthContext.tsx#L41).

A checagem inicial `getUser(session.access_token)` não valida se aquele token ainda representa a sessão ativa. Se o usuário sair enquanto ela está em voo, o callback de sucesso recoloca o usuário antigo. Um erro atrasado também pode zerar o usuário de uma sessão mais recente.

Reprodução controlada do provider: o evento `SIGNED_OUT` deixa `user=null` e `session=null`; depois, a resposta antiga de `getUser` deixa `user={id:'A'}` e `session=null`. `RequireAuth` usa `user` para liberar as rotas.

Correção: ignorar resultados de gerações anteriores da sessão e após desmontagem. Testar logout e troca de conta enquanto a validação está pendente, tanto no sucesso quanto no erro.

### A03 — Rollback após duas falhas é inalcançável pelo caminho esperado

Evidências: [AppContext.tsx:465](../src/context/AppContext.tsx#L465), [AppContext.tsx:821](../src/context/AppContext.tsx#L821).

Quando a persistência falha, `enhancedDispatch` tenta atualizar o estado pelo servidor. Seu `catch` interno deveria restaurar o snapshot se essa atualização também falhasse. Entretanto, `refreshFromServer` captura o erro e resolve normalmente. A rejeição necessária para executar a restauração não chega ao chamador.

Cenário: excluir um post-it otimisticamente, falhar a gravação e falhar a recarga. O item permanece removido da interface, embora a exclusão não tenha sido confirmada no banco. O aviso de erro não restaura o estado.

Correção: retornar um resultado explícito de sucesso/falha ou propagar a falha aos chamadores que precisam recuperar estado. Restaurar apenas as partes afetadas, sem apagar mutações concorrentes bem-sucedidas.

### A04 — Substituir vínculos pode deixar a entidade sem suas relações

Evidências: [database.ts:4347](../src/lib/database.ts#L4347), [database.ts:3381](../src/lib/database.ts#L3381), [database.ts:3533](../src/lib/database.ts#L3533), [database.ts:4316](../src/lib/database.ts#L4316).

Os métodos removem todos os vínculos e depois fazem outro pedido para inserir a lista nova. Uma falha após a exclusão deixa o primeiro pedido confirmado e a lista vazia. O padrão aparece em itens de blocos de gravação, pilares de séries, temas de conteúdos e conteúdos de projetos.

Reprodução com o corpo real de `saveRecordingBlockContents` e cliente simulado: o DELETE termina; o INSERT falha; a função rejeita e os vínculos anteriores já não existem. Em `saveProjetoConteudos`, o erro do DELETE nem é examinado: remover todos os vínculos pode retornar sucesso sem efetivamente removê-los.

Correção: executar a substituição em uma operação transacional no banco, com autorização preservada, e conferir todos os erros. Cobrir falha intermediária e manutenção da lista anterior. Conferir os escritores equivalentes do MCP ao implementar a correção.

### A05 — Carregamento tardio da obra não inicializa seu formulário

Evidências: [BookDetailPage.tsx:206](../src/features/library/pages/BookDetailPage.tsx#L206), [BookDetailPage.tsx:272](../src/features/library/pages/BookDetailPage.tsx#L272), [BookDetailPage.tsx:475](../src/features/library/pages/BookDetailPage.tsx#L475).

`infoLocal` é inicializado a partir de `livro`, que pode ainda não existir. A tela busca a obra, mas não há sincronização de `infoLocal` quando ela chega. O formulário conserva título, autoria e outros campos vazios. Alterar o status ou outro campo salva a ficha inteira usando esses valores.

Reprodução com o inicializador e o handler extraídos da fonte: montar sem obra, receber uma obra com título/autoria/capa/gênero, alterar o status e salvar resulta em `titulo:''`, `autorDiretor:''`, `capaUrl:null` e `generoIds:[]`.

Correção: montar o formulário apenas após carregar a obra ou inicializar o rascunho na primeira chegada do registro. Atualizações posteriores não podem sobrescrever edições locais. Testar abertura direta por URL sem cache.

### A06 — A ficha abandona o estado pendente antes de salvar no servidor

Evidências: [BookDetailPage.tsx:475](../src/features/library/pages/BookDetailPage.tsx#L475), [BookDetailPage.tsx:511](../src/features/library/pages/BookDetailPage.tsx#L511), [BookDetailPage.tsx:299](../src/features/library/pages/BookDetailPage.tsx#L299).

`handleSalvarInfo` não aguarda `dispatch`. Atualiza imediatamente `infoSavedSnapshotRef`, mostra o feedback local de salvo e retorna `void`. Se a gravação falhar, o rascunho já é considerado confirmado; a comparação de pendências e a tentativa ao sair deixam de enxergar a alteração.

O mesmo retorno `void` é entregue ao mecanismo que espera salvar antes de trocar a versão do app, que não consegue aguardar a operação real.

Correção: handler assíncrono; avançar o snapshot apenas após confirmação; manter o rascunho pendente no erro; não marcar uma edição mais recente como salva por uma confirmação antiga.

### A07 — Trocar de roteiro cancela a edição pendente em Legendas

Evidências: [CaptionEditorPanel.tsx:118](../src/features/captions/components/CaptionEditorPanel.tsx#L118), [CaptionEditorPanel.tsx:146](../src/features/captions/components/CaptionEditorPanel.tsx#L146), [CaptionsPage.tsx:292](../src/features/captions/pages/CaptionsPage.tsx#L292).

O salvamento aguarda 600 ms. O painel tem `key={content.id}`; escolher outro roteiro o desmonta. O cleanup apenas cancela o timer, sem persistir ou guardar o rascunho. Sair da rota dentro dessa janela tem o mesmo efeito. Não há proteção de alterações pendentes nesse editor.

Cenário: editar uma legenda e clicar imediatamente em outro roteiro. Nenhum pedido de salvamento é iniciado para aquela edição. Além disso, o `catch` da gravação muda o indicador de volta para `saved`, mesmo após erro.

Correção: manter rascunhos por conteúdo/publicação e confirmar ou aguardar sua gravação antes da troca; apresentar estado de erro e retentativa. Testar a troca em menos de 600 ms e falha de rede.

### A08 — Uma busca antiga pode substituir a busca atual

Evidência: [usePaginatedQuery.ts:76](../src/hooks/usePaginatedQuery.ts#L76).

O hook inicia novos pedidos ao mudar query/página, mas não cancela nem ignora as respostas anteriores. Todas as respostas escrevem nos mesmos estados de itens, total, erro e loading.

Reprodução do hook em um executor mínimo de hooks, com promises controladas: resolver a busca nova mostra `resultado novo`; resolver a antiga depois troca a tela para `resultado antigo`, apesar de a query atual continuar sendo a nova. A Biblioteca é o consumidor atual identificado.

Correção: geração de pedido e verificação antes de qualquer atualização de estado; cancelamento quando disponível. Incluir query, sessão e desmontagem na proteção. Testar tanto resposta quanto erro antigo chegando por último.

### A09 — Sincronização conserva roteiros excluídos ou arquivados em outro cliente

Evidências: [domainCacheMerge.ts:52](../src/lib/domainCacheMerge.ts#L52), [database.ts:2446](../src/lib/database.ts#L2446), [AppContext.tsx:397](../src/context/AppContext.tsx#L397).

O servidor retorna conteúdos ativos, excluindo apagados e arquivados. `mergeContents` recoloca todo registro local ausente no retorno. A exceção que limpa uma lista totalmente vazia não resolve exclusões parciais.

Reprodução: estado local contém A e B; a consulta autoritativa retorna apenas B; o merge continua contendo A e B. Um roteiro excluído ou arquivado por outra aba/dispositivo pode continuar nas filas e métricas locais. Atualizar esse registro antigo também pode enviar campos desatualizados de volta ao servidor.

Correção: distinguir respostas completas, parciais e de cache. Nas respostas completas, remover ausências confirmadas; preservar somente mutações locais realmente pendentes, por ID. Testar exclusão de um entre vários registros e arquivamento remoto.

### A10 — Mudanças remotas em contas perdem para qualquer versão local

Evidência: [domainCacheMerge.ts:3](../src/lib/domainCacheMerge.ts#L3).

`mergePlatforms` começa com os registros recebidos e substitui cada ID pelos registros locais, sem comparar versão nem consultar pendência de gravação. Contas locais ausentes no retorno também são preservadas.

Reprodução: local tem `name:'Antigo', ativo:true`; servidor tem o mesmo ID com `name:'Novo', ativo:false`; o resultado mantém o nome antigo e a conta ativa.

Correção: aplicar a versão recebida quando não houver mutação local pendente; tratar remoção e invalidação das referências dependentes. Validar atualização e exclusão por outro cliente.

### A11 — Transcrições permanecem na memória após sair da conta

Evidências: [appTranscriptionQueue.ts:5](../src/features/transcription/lib/appTranscriptionQueue.ts#L5), [transcriptionQueue.ts:64](../src/features/transcription/lib/transcriptionQueue.ts#L64), [AuthContext.tsx:62](../src/context/AuthContext.tsx#L62).

A fila é um singleton de módulo, sem proprietário ou integração com logout. Desmontar a página não a limpa. Seus arquivos e transcrições continuam acessíveis quando outra pessoa entra na mesma aba e abre Transcrição. Trabalhos pendentes também não recebem cancelamento por mudança de sessão.

Correção: associar a fila ao usuário, abortar os trabalhos e limpar arquivos/textos na saída ou troca de identidade. Preservar a continuidade entre rotas apenas dentro da mesma sessão. Testar tanto resultados concluídos quanto uma extração em andamento durante logout.

### A12 — Horário digitado em A pode ser gravado em B

Evidências: [PostingTimesEditor.tsx:157](../src/features/settings/components/PostingTimesEditor.tsx#L157), [PostingTimesEditor.tsx:303](../src/features/settings/components/PostingTimesEditor.tsx#L303), [PostingTimesEditor.tsx:337](../src/features/settings/components/PostingTimesEditor.tsx#L337).

Horários digitados antes de clicar em adicionar ficam em `pendentesRef`, indexados somente pelo dia. Trocar a conta muda `selectedKey`, sem guardar ou limpar esses valores. No salvar, `rascunhoPronto` aplica todos eles à conta atualmente selecionada. As linhas são remontadas pela chave da conta, de modo que o texto anterior pode nem estar mais visível.

Cenário reproduzido com as funções reais: digitar segunda-feira às 18:00 em A, mudar para B e salvar produz o horário em B, deixando A vazia.

Correção: indexar pendências por conta e dia, ou consolidar o campo na conta original antes de permitir a troca. Testar conta → conta e conta → padrão geral.

### A13 — Busca mobile só procura nas 24 obras da página carregada

Evidências: [LibraryPage.tsx:287](../src/features/library/pages/LibraryPage.tsx#L287), [LibraryMobileScreen.tsx:178](../src/mobile/screens/library/LibraryMobileScreen.tsx#L178), [LibraryMobileScreen.tsx:188](../src/mobile/screens/library/LibraryMobileScreen.tsx#L188), [LibraryMobileScreen.tsx:197](../src/mobile/screens/library/LibraryMobileScreen.tsx#L197).

Achado da revisão anterior, reconfirmado. A consulta do pai é paginada. Busca, tipo, status e abas do mobile filtram esse subconjunto em memória. Contagens de abas e opções de status também vêm desse subconjunto. Uma obra existente em outra página não pode ser encontrada pela busca local.

Correção: aplicar os filtros antes de paginar, com contrato de busca compatível com tags e metadados; definir explicitamente o universo das contagens. Testar um acervo com mais de 24 obras.

### A14 — Uma página fora do limite fica vazia e esconde os controles

Evidências: [LibraryPage.tsx:178](../src/features/library/pages/LibraryPage.tsx#L178), [LibraryPage.tsx:331](../src/features/library/pages/LibraryPage.tsx#L331), [LibraryPage.tsx:680](../src/features/library/pages/LibraryPage.tsx#L680), [QueryViewState.tsx:64](../src/components/ui/QueryViewState.tsx#L64).

A URL aceita qualquer inteiro positivo, sem ajustar a página ao total recebido. Quando não há itens naquela página, `QueryViewState` mostra vazio e remove seus children, onde está `PaginationBar`. O usuário fica sem o controle de voltar à página anterior dentro da lista.

Cenários: abrir `/biblioteca?pagina=999` com um acervo pequeno, ou retornar à última página depois de excluir seu último item no detalhe.

Correção: após obter o total, normalizar a página ao limite e refazer a consulta; manter uma saída para a primeira página no estado vazio. Não normalizar antes de saber o total.

### A15 — Marcar obra como concluída não atualiza a grade atual

Evidências: [LibraryPage.tsx:358](../src/features/library/pages/LibraryPage.tsx#L358), [LibraryPage.tsx:409](../src/features/library/pages/LibraryPage.tsx#L409), [AppContext.tsx:244](../src/context/AppContext.tsx#L244), [usePaginatedQuery.ts:99](../src/hooks/usePaginatedQuery.ts#L99).

Marcar como concluída e trocar a capa atualizam `state.bibliotecaItems`. Os cards recebem outra coleção, `libraryItems`, mantida pelo hook paginado. A invalidação limpa o cache, mas não notifica o hook nem muda sua query. Nenhuma dessas ações chama `reloadLibrary` ou atualiza os itens paginados.

Resultado: o feedback anuncia sucesso, mas o card conserva status/capa antigos; uma obra pode continuar na lista de um filtro ao qual já não pertence. O problema afeta também os itens enviados à view mobile.

Correção: fornecer atualização/invalidação observável para a consulta ativa, ou reconciliar os itens com o estado confirmado, preservando total, filtros e paginação. Testar a ação sem navegar nem mudar filtros depois.

### A16 — Login não retorna ao destino solicitado

Evidências: [RequireAuth.tsx:10](../src/app/router/RequireAuth.tsx#L10), [RequireAuth.tsx:21](../src/app/router/RequireAuth.tsx#L21), [LoginPage.tsx](../src/features/auth/pages/LoginPage.tsx).

O bloqueio de autenticação guarda apenas `location.pathname` em `state.from`. Após autenticar, `LoginRoute` sempre redireciona para `/criacao`; o formulário não consome esse destino. Query e hash já se perderam no primeiro redirecionamento.

Cenário: abrir uma obra ou roteiro por link estando deslogado, entrar e chegar à Criação em vez do conteúdo solicitado.

Correção: preservar pathname, search e hash; consumir o destino validado no sucesso; usar `/criacao` como fallback. A validação precisa aceitar apenas destinos internos autorizados.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou: TypeScript sem erros. |
| `npm test` | Passou. A etapa principal registrou 182 testes e a etapa complementar 14; ambas sem falhas. Há também verificações com asserts executadas diretamente pelo runner. |
| `npm run build` | Passou. Avisos de CSS inválido gerado, chunks grandes, importação dinâmica sem separação de chunk e base Browserslist desatualizada. |
| `npm run lint:design` | Falhou na árvore atual. Os 5 testes do lint passaram; a inspeção do código apontou violações de tipografia/espaçamento e contagens em Planejamento e na lista de séries. |
| Reproduções controladas | Logout/reset, entrada B após A, autenticação atrasada, busca fora de ordem, exclusão remota parcial, atualização remota de conta, falha no INSERT de vínculos, inicialização tardia da ficha e horário pendente entre contas. |

Os testes existentes passarem não invalida os achados: os cenários de concorrência, montagem de formulários e troca rápida de item acima não estão cobertos pelos checks executados.

Os experimentos usaram funções importadas ou trechos extraídos da AST das fontes atuais. Os casos de hook/provider usaram um executor mínimo de hooks e promessas controladas; não simularam o DOM completo nem o comportamento visual do React. Nenhum experimento escreveu dados reais no Supabase.

## Ordem recomendada de correção

1. **Sessão e isolamento:** A01, A02 e A11. Fazer reset real e proteger resultados assíncronos por usuário/geração.
2. **Perda de edição:** A05, A06 e A07. Corrigir inicialização, confirmação e preservação de rascunhos.
3. **Persistência e sincronização:** A03, A04, A09 e A10. Recuperação explícita, vínculos transacionais e semântica de consulta autoritativa.
4. **Consultas e Biblioteca:** A08, A13, A14 e A15. Evitar resposta atrasada e unificar atualização da lista com sua consulta.
5. **Horários e navegação:** A12 e A16. Preservar a origem de campos pendentes e o destino de login.
6. Retomar a separação controller/views do plano anterior depois de proteger esses comportamentos com testes. As falhas de design ficam em uma entrega independente.

Não misturar todas as correções em uma refatoração. Cada entrega precisa de reprodução anterior, correção focada e teste que passe depois. Mudanças de schema/SQL exigem verificar políticas e escritores do app e do MCP.

## Limites

- Não foram realizados testes manuais no navegador, testes ponta a ponta autenticados nem perfis de desempenho.
- Não foram consultados logs, dados, políticas efetivamente aplicadas ou configurações de limite de linhas do Supabase de produção. A auditoria não conclui que exista falha de RLS ou vazamento remoto.
- Fontes de Planejamento, Calendário, Editorial e Hoje foram inspecionadas em buscas e trechos relevantes; não há pretensão de ter exercitado todas as suas regras de negócio.
- Hipóteses sem caminho de execução suficiente foram descartadas, inclusive sobre funções de datas sem consumidor ativo e possíveis sobreposições de atualizações de série cujos alvos são distintos.
- A documentação de [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), seu [changelog](https://supabase.com/changelog) e a referência de [observabilidade](https://supabase.com/docs/guides/observability) foram consultadas para delimitar verificações de banco. Os bugs listados estão sustentados pelo código local.
- Não houve alteração de código ou banco nesta etapa. A entrega desta ampliação é este relatório; builds e checks produziram apenas suas saídas normais.
