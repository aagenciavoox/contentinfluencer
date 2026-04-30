# Documentacao de Telas

Baseado no codigo atual do app React em `src/App.tsx` e nas paginas/componentes conectados por rota.

## Regras gerais da interface autenticada

- Nome e rota: Shell autenticado -> aplicado em todas as rotas apos login -> existe em: mobile + desktop
- O que aparece: navegacao global, area principal com scroll, overlays e modais contextuais, Command Palette por atalho `Ctrl/Cmd + K`, onboarding quando `onboarding_completo` ainda nao e `true`
- O que e editavel: menu lateral, navegacao entre rotas, abertura de modais, tema claro/escuro, busca global por atalho, logout
- O que e automatico: `/` redireciona para `/conteudos`; se usuario nao estiver autenticado qualquer rota redireciona para `/login`; onboarding abre sozinho na primeira carga; header mobile recolhe/expande conforme scroll
- O que nao pode faltar: acesso a navegacao principal, area de conteudo rolavel, feedback visual de rota ativa, possibilidade de sair da conta
- Diferenca mobile vs desktop: desktop usa sidebar fixa lateral; mobile usa header superior recolhivel, menu lateral em drawer e bottom bar fixa com atalho central de acoes rapidas

## Login

- Nome e rota: Login -> `/login` -> existe em: mobile + desktop
- O que aparece: logo "Content OS", subtitulo "A sua Central de Producao Inteligente", card de autenticacao, toggle entre login e cadastro, campo de nome no cadastro, campo de e-mail, campo de senha com mostrar/ocultar, mensagem de erro, CTA principal, estado de loading, tela de sucesso apos cadastro com instrucao para validar e-mail
- O que e editavel: alternar entre login e cadastro, preencher nome/e-mail/senha, mostrar ou ocultar senha, enviar formulario, voltar do estado de sucesso para login
- O que e automatico: exibe spinner durante autenticacao; se cadastro der certo mostra estado de sucesso; se der erro mostra a mensagem retornada; ao autenticar com sucesso o shell autenticado assume
- O que nao pode faltar: campo de e-mail, campo de senha, CTA principal, feedback de erro e feedback de loading
- Diferenca mobile vs desktop: layout e essencialmente o mesmo, com comportamento responsivo do card e do espacamento

## Conteudos

- Nome e rota: Conteudos -> `/conteudos` -> existe em: mobile + desktop
- O que aparece: guia da pagina, header fixo, tabs "Estoque" e "Blocos", filtros de serie/pilar/status, botoes "Importar" e "Novo Roteiro", lista de conteudos, selecao multipla, barra flutuante de acoes em lote, modal de detalhe de conteudo, modal de importacao CSV, confirmacao de exclusao
- O que e editavel: trocar entre Estoque e Blocos, filtrar por status/serie/pilar, alternar ordenacao, selecionar um conteudo para abrir detalhe, selecionar varios conteudos, importar CSV, criar novo roteiro, excluir em lote
- O que e automatico: rota pode iniciar filtro por query string `status`; conteudos sao filtrados localmente; status "No Escuro" eh calculado com regra especial; lista e ordenada por campo/direcao ativos; alerta de repeticao de look aparece quando ha 3 videos seguidos com o mesmo look; barra de selecao em lote aparece so quando ha itens selecionados
- O que nao pode faltar: lista de conteudos clicavel, filtros de status/serie/pilar, CTA de novo roteiro, acesso ao detalhe do conteudo, feedback de selecao multipla
- Diferenca mobile vs desktop: mobile mostra os itens como cards compactos com seletor no proprio card e seletor de ordenacao simples; desktop oferece view mode "Tabela", "Ecossistema" e "Timeline"

## Conteudos - visao Tabela

- Nome e rota: Conteudos / Tabela -> `/conteudos` -> existe em: mobile + desktop
- O que aparece: titulo do conteudo, status, pilar, serie, seletores de checkbox, controle "Todos/Nenhum", icones de ordenacao; no desktop a lista vira tabela com colunas "Titulo", "Serie", "Pilar", "Status"
- O que e editavel: selecionar individualmente ou tudo, ordenar por titulo/status/data no mobile e por colunas no desktop, abrir detalhe clicando no item
- O que e automatico: badges e pontos de status usam cor automatica por status; alerta "Refazer" aparece automaticamente quando existe look alert; no desktop o estado parcial do "selecionar todos" e calculado
- O que nao pode faltar: titulo, status visivel, possibilidade de abrir detalhe, selecao multipla
- Diferenca mobile vs desktop: mobile usa cards em coluna unica; desktop usa tabela com cabecalho fixo de colunas e leitura horizontal

## Conteudos - visao Ecossistema

- Nome e rota: Conteudos / Ecossistema -> `/conteudos` -> existe em: desktop
- O que aparece: colunas por serie, contador por serie, cards com status, look, titulo, formato visual, cenario, data de postagem, estado vazio por serie, alerta de repeticao de look
- O que e editavel: abrir detalhe de um conteudo clicando no card
- O que e automatico: agrupamento por serie, contador por serie, decoracao do card conforme formato visual, alerta de look repetido
- O que nao pode faltar: agrupamento por serie e acesso ao detalhe do conteudo
- Diferenca mobile vs desktop: esta visao nao aparece no mobile

## Conteudos - visao Timeline

- Nome e rota: Conteudos / Timeline -> `/conteudos` -> existe em: desktop
- O que aparece: legenda de "Gravacao" e "Postagem", linha do tempo vertical, cards por conteudo com titulo, serie, datas de gravacao/postagem, look e cenario, estado vazio quando nao existem datas
- O que e editavel: abrir detalhe do conteudo clicando no card
- O que e automatico: so entram itens com `recordingDate` ou `publishDate`; ordenacao cronologica usa a primeira data disponivel
- O que nao pode faltar: datas dos eventos e clique para abrir detalhe
- Diferenca mobile vs desktop: esta visao nao aparece no mobile

## Conteudos - tab Blocos

- Nome e rota: Conteudos / Blocos -> `/conteudos` -> existe em: mobile + desktop
- O que aparece: cards de blocos de gravacao, status "Aguardando Camera" ou "Finalizado", progresso gravado/total, exemplo do primeiro roteiro, total de videos, roupa/look e cenario do primeiro item, botao de excluir, modal de analise do bloco, modo "Bloco Explosao"
- O que e editavel: abrir um bloco, excluir bloco, iniciar modo explosao, marcar roteiro como gravado durante a sessao, pausar e salvar progresso
- O que e automatico: status do bloco muda conforme ainda existam conteudos "Pronto para Gravar"; progresso e percentual sao calculados; no modo explosao o encerramento salva todos os IDs marcados como gravados
- O que nao pode faltar: nome do bloco, progresso, quantidade de videos e acesso ao modo de gravacao
- Diferenca mobile vs desktop: no modo explosao o desktop ganha sidebar lateral com controles e contexto do script; no mobile esses controles viram chips e botoes horizontais

## Ideias

- Nome e rota: Caixa de Ideias -> `/ideias` -> existe em: mobile + desktop
- O que aparece: guia da pagina, header sticky, textarea "O que voce esta pensando?", selects opcionais de pilar/serie/origem da biblioteca, botao "Capturar", grid de cards de ideias, estado vazio, bottom sheet de detalhe da ideia, acoes de editar/salvar/excluir/promover
- O que e editavel: criar ideia, associar pilar/serie/origem, abrir uma ideia, editar texto, excluir, promover para conteudo
- O que e automatico: ideias arquivadas ficam fora da lista; lista e ordenada da mais recente para a mais antiga; query string `itemId` preseleciona origem da biblioteca; livro em status "Consumindo" alimenta o select de origem
- O que nao pode faltar: campo de captura, CTA de captura, lista de ideias e acao de promover
- Diferenca mobile vs desktop: mesma estrutura; mudam densidade, tamanhos e comportamento do bottom sheet

## Calendario Editorial

- Nome e rota: Calendario -> `/calendario` -> existe em: mobile + desktop
- O que aparece: header da pagina com tabs "Agenda", "Cronograma", "Projetos", "Visao Geral", CTA contextual que alterna entre adicionar evento de agenda e adicionar projeto, previews/modais e subvisoes especificas por aba
- O que e editavel: trocar de aba, abrir itens, mover datas, criar evento de agenda, criar/editar projeto, arquivar/excluir projeto conforme modal
- O que e automatico: projeto ativo filtra status "Finalizado" para certas visoes; tipo do item clicado decide se abre preview simples ou fluxo de projeto; diferentes camadas de agenda ficam ligadas inicialmente
- O que nao pode faltar: troca entre as quatro abas, acesso aos itens do calendario e criacao de agenda/projeto
- Diferenca mobile vs desktop: as subvisoes respondem ao breakpoint, especialmente agenda e modais; o layout amplo de cronograma/kanban favorece desktop

## Calendario Editorial - Agenda

- Nome e rota: Calendario / Agenda -> `/calendario` -> existe em: mobile + desktop
- O que aparece: visao de agenda editorial, layers ativas ("recordings", "posts", "partnerships", "agenda", "rules"), preview de item, edicao completa, CTA para novo evento
- O que e editavel: ligar/desligar camadas, selecionar item, mover data de item, abrir edicao completa, criar novo evento
- O que e automatico: ao mover item o sistema escolhe o campo correto (`publishDate`, `recordingDate`, `dataFim` ou `date`) conforme o tipo do item
- O que nao pode faltar: visualizacao de gravacoes, postagens, agenda e projetos no calendario
- Diferenca mobile vs desktop: a agenda se adapta ao tamanho de tela, mas a mesma logica de camadas e preview permanece

## Calendario Editorial - Cronograma

- Nome e rota: Calendario / Cronograma -> `/calendario` -> existe em: mobile + desktop
- O que aparece: timeline dos projetos ativos, eventos por projeto, visualizacao por periodo
- O que e editavel: abrir preview de projeto a partir da timeline
- O que e automatico: apenas projetos nao deletados e nao finalizados entram nessa aba
- O que nao pode faltar: relacao temporal dos projetos
- Diferenca mobile vs desktop: o desktop aproveita melhor a largura para a linha do tempo completa

## Calendario Editorial - Projetos

- Nome e rota: Calendario / Projetos -> `/calendario` -> existe em: mobile + desktop
- O que aparece: botoes de view "Ativas", "Encerradas", "Arquivadas", "Calendario", cards por marca, acoes "Projeto", "Evento" e "Agenda", mini calendario por marca, lista resumida de eventos por marca, visao calendario de 6 meses com itens de conteudo/projeto/agenda
- O que e editavel: alternar view, expandir mini agenda, abrir projeto, criar evento para marca, abrir configuracao do projeto, ligar/desligar filtros do calendario
- O que e automatico: agrupamento por marca; contadores por marca e por dia; chips do calendario limitam exibicao a tres itens por dia e mostram `+N` automaticamente
- O que nao pode faltar: agrupamento por marca e visualizacao de eventos do projeto
- Diferenca mobile vs desktop: o desktop mostra grades mais amplas de marcas e calendarios de seis meses com melhor leitura horizontal

## Calendario Editorial - Visao Geral

- Nome e rota: Calendario / Visao Geral -> `/calendario` -> existe em: mobile + desktop
- O que aparece: colunas kanban por etapa da parceria/projeto, badge com quantidade por coluna, cards com marca, nome e data final, estado vazio por coluna
- O que e editavel: abrir o projeto clicando no card
- O que e automatico: projetos sao agrupados pelas etapas predefinidas (`Leitura`, `Roteiro`, `Envio de Roteiro`, `Gravacao`, `Edicao`, `Aprovacao`, `Postagem`, `Metricas`, `Finalizado`)
- O que nao pode faltar: visao por etapa e contador de itens
- Diferenca mobile vs desktop: no desktop a rolagem horizontal do kanban fica mais natural; no mobile funciona como faixa horizontal

## Biblioteca

- Nome e rota: Seus Livros -> `/biblioteca` -> existe em: mobile + desktop
- O que aparece: guia da pagina, header com contador de livros, botao "Adicionar Livro", KPIs rapidos, busca por titulo/autor, filtro de status, filtro de genero, grid de capas/cards de livro, badge de status, contador de conteudos gerados por livro, estado vazio, modal "Adicionar Livro" com campos essenciais e secoes complementares persistidas via preferencia por livro
- O que e editavel: buscar, filtrar, abrir detalhe do livro, criar livro, preencher campos essenciais, abrir/fechar secoes "Detalhes Tecnicos" e "Para voce" do formulario
- O que e automatico: KPIs so aparecem se houver livros; contador de conteudos por livro e calculado do inventario; capa sem imagem cai para placeholder textual; ao criar livro o app navega automaticamente para o detalhe do novo item
- O que nao pode faltar: busca, filtros, acesso ao detalhe do livro e CTA para adicionar
- Diferenca mobile vs desktop: mesmo fluxo; desktop comporta mais colunas no grid

## Detalhe do Livro

- Nome e rota: Detalhe do Livro -> `/biblioteca/:id` -> existe em: mobile + desktop
- O que aparece: header com voltar, tabs "Info", "Notas" e "Conteudos", capa, avaliacao por estrelas, campos de informacao, bloco de anotacoes com tipos, filtros, CTA para criar anotacao, lista de notas, acoes para transformar anotacao em ideia ou conteudo, ideias do livro, conteudos do livro agrupados por slot ou plataforma, capitulos cobertos, hashtags sugeridas, performance, brainstorm modal, modal de detalhe de conteudo, confirmacoes
- O que e editavel: alterar info do livro, nota geral, status, generos, paginas, rating, criar anotacoes, marcar potencial de conteudo, transformar anotacao em ideia/conteudo, criar conteudo diretamente, promover ideia, adicionar/remover capitulos cobertos, alternar agrupamento do ecossistema, copiar hashtags
- O que e automatico: tabs mostram contagem; filtro "Destaques" usa `contentPotential`; alerta de ecossistema aparece se livro concluido nao gerou conteudo postado; hashtags sao agregadas automaticamente a partir dos pilares/plataformas dos conteudos; ranking de performance soma metricas por conteudo
- O que nao pode faltar: tabs de navegacao, anotacoes do livro, relacao com ideias/conteudos e salvamento das infos do livro
- Diferenca mobile vs desktop: mesma estrutura funcional; desktop aproveita melhor o grid da aba Info e a leitura das secoes longas

## Projetos

- Nome e rota: Projetos -> `/projetos` -> existe em: mobile + desktop
- O que aparece: header "Projetos", botao "Novo projeto", filtros por tipo e status, formulario inline de novo projeto, lista de projetos com tipo, status calculado, marca, data, valor, estado vazio
- O que e editavel: filtrar, abrir projeto, criar projeto, escolher tipo, data fim, valor e marca quando `publi`
- O que e automatico: status visual da lista e calculado pelas etapas do projeto; ordenacao prioriza data fim mais proxima; se nao houver etapas o status calculado cai em "pendente"
- O que nao pode faltar: lista clicavel, filtros e criacao de novo projeto
- Diferenca mobile vs desktop: mesma estrutura, com responsividade do formulario e da lista

## Detalhe do Projeto

- Nome e rota: Detalhe do Projeto -> `/projetos/:id` -> existe em: mobile + desktop
- O que aparece: header com nome/tipo/marca, tabs "Visao Geral", "Etapas", "Conteudos", "Agenda", cards de resumo, formulario de edicao inline, lista de etapas com reordenacao, lista de conteudos vinculados, select para vincular conteudo, lista de eventos de agenda, formularios inline para etapa e agenda
- O que e editavel: editar metadados do projeto, excluir projeto, adicionar/reordenar/excluir etapas, ciclar status da etapa, ver conteudos vinculados, abrir /conteudos para criar novo, adicionar evento de agenda e excluir evento
- O que e automatico: badges de contagem nas tabs; agenda do projeto filtra por `projetoId`; lista de conteudos vinculados usa `contentIds`; ordem de etapas e respeitada por campo `ordem`
- O que nao pode faltar: tabs, edicao do projeto, etapas e agenda
- Diferenca mobile vs desktop: mesma logica; desktop oferece mais espaco para formularios lado a lado

## Gravacao

- Nome e rota: Gravacao -> `/gravacao` -> existe em: mobile + desktop
- O que aparece: header "Gravacao", secao "Prontos para Gravar", filtros por pilar/serie/look/cenario/energia, lista selecionavel de conteudos prontos, criacao de bloco, secao de blocos existentes com barra de progresso e acoes de abrir/excluir
- O que e editavel: filtrar conteudos, selecionar multiplos roteiros, nomear bloco, criar bloco, abrir bloco, excluir bloco
- O que e automatico: lista so inclui conteudos em status `Pronto para Gravar`; progresso do bloco calcula gravados/total; se nao houver conteudos prontos ou blocos, mostra estado vazio correspondente
- O que nao pode faltar: filtros de preparo, selecao multipla e criacao de bloco
- Diferenca mobile vs desktop: mesma estrutura, com adaptacao de espacamento e largura

## Bloco de Gravacao

- Nome e rota: Bloco de Gravacao -> `/gravacao/:id` -> existe em: mobile + desktop
- O que aparece: header com nome do bloco, barra de progresso, contador `gravados/total`, conteudo atual do roteiro, texto do script ou estado "Sem roteiro", botoes "Anterior", "Marcar como gravado" e "Proximo", tela final "Bloco concluido!", lista lateral do bloco no desktop
- O que e editavel: navegar entre roteiros, marcar item como gravado, voltar para Gravacao
- O que e automatico: marcar como gravado atualiza o status do conteudo para `Gravado`, atualiza o bloco e avanca automaticamente; ao terminar todos os itens mostra a tela de conclusao
- O que nao pode faltar: script atual, progresso do bloco e acao de marcar como gravado
- Diferenca mobile vs desktop: desktop mostra sidebar fixa com todos os itens do bloco e indicador de qual esta atual; mobile foca na coluna principal sem essa sidebar

## Analise

- Nome e rota: Analise -> `/analise` -> existe em: mobile + desktop
- O que aparece: tabs "Regras de Ouro", "Mix de Conteudo", "Performance", score geral de regras, lista de regras com estado, alertas de pilares sem posts, barras por pilar, filtro de plataforma, cards de metricas totais, top 5 por views e top 5 por saves
- O que e editavel: trocar de aba, mudar periodo do mix (30 ou 90 dias), filtrar performance por plataforma, navegar para configuracao de regras quando nao ha regra
- O que e automatico: score geral e calculado a partir das regras ativas; avaliacoes usam janela temporal conforme a regra; mix usa apenas conteudos postados no periodo; ranking agrega metricas por `contentId`
- O que nao pode faltar: score/diagnostico, mix por pilar e consolidado de performance
- Diferenca mobile vs desktop: mesma estrutura, com reorganizacao responsiva dos cards numericos

## Proposta de evolucao - Analise como bloco unificado

- Nome e rota: Analise -> `/analise` -> existe em: mobile + desktop
- O que aparece: uma area unica de analises com navegacao interna por blocos, reunindo "Regras de Ouro", "Mix de Conteudo", "Performance", "Leituras Editoriais", "Oportunidades" e "Conteudos e Vinculos"; header com periodo, plataforma e conta conectada; cards-resumo no topo; alertas operacionais e editoriais; rankings; comparativos; lista de conteudos com metricas e estado de vinculacao
- O que e editavel: trocar o bloco ativo, filtrar por periodo, filtrar por plataforma, filtrar por conta conectada, ordenar rankings e listas, abrir detalhe do conteudo, abrir vinculacao por URL, reconectar conta, atualizar sincronizacao
- O que e automatico: todos os blocos compartilham o mesmo contexto de filtros; as leituras cruzam dados de regras, mix e metricas; oportunidades aparecem com base no mesmo conjunto analisado; a tela mostra lacunas como "sem vinculo", "sem sync" e "sem publicacao em pilar relevante"
- O que nao pode faltar: uma visao unificada que conecte saude editorial, distribuicao de conteudo e resultado de performance sem obrigar o usuario a trocar de modulo
- Diferenca mobile vs desktop: mobile usa navegacao em tabs/chips horizontais e cards empilhados por bloco / desktop usa abas ou sidebar interna com area principal larga para comparativos e tabela analitica

## Proposta de evolucao - Analise / Resumo Geral

- Nome e rota: Analise / Resumo Geral -> `/analise` -> existe em: mobile + desktop
- O que aparece: score geral da operacao, cards com views, likes, comentarios, saves, conteudos com post vinculado, conteudos sem metricas, serie com melhor desempenho, pilar com menor frequencia, ultima sincronizacao por plataforma
- O que e editavel: trocar periodo, trocar plataforma, abrir bloco relacionado a partir de cada card
- O que e automatico: cards consolidam dados dos blocos internos e se atualizam com os filtros globais
- O que nao pode faltar: leitura executiva rapida da operacao inteira
- Diferenca mobile vs desktop: mobile prioriza carrossel ou grid 2xN; desktop exibe todos os cards em faixa superior

## Proposta de evolucao - Analise / Performance integrada

- Nome e rota: Analise / Performance integrada -> `/analise` -> existe em: mobile + desktop
- O que aparece: KPIs de performance, top conteudos por views/saves/comentarios, ranking por plataforma, comparativo contra media da serie/pilar, lista de conteudos com metricas e status de vinculacao
- O que e editavel: ordenar por metrica, abrir conteudo, vincular post por URL, filtrar por "com metricas" / "sem metricas" / "sem vinculo"
- O que e automatico: o sistema agrupa metricas por periodo e plataforma, compara conteudo com media do proprio contexto editorial e marca itens sem sincronizacao
- O que nao pode faltar: relacao entre o numero da plataforma e o conteudo do sistema
- Diferenca mobile vs desktop: mobile usa cards e listas resumidas / desktop usa tabela mais completa

## Proposta de evolucao - Analise / Leituras Editoriais

- Nome e rota: Analise / Leituras Editoriais -> `/analise` -> existe em: mobile + desktop
- O que aparece: comparativos por pilar, serie, formato visual, look, cenario e energia necessaria; frases-resumo do tipo "serie X gera mais saves" e "pilar Y performa melhor no Instagram"
- O que e editavel: escolher criterio de comparacao, abrir subconjuntos de conteudos
- O que e automatico: sistema cruza desempenho com os metadados editoriais e so mostra leitura quando existe base minima
- O que nao pode faltar: transformar metrica em aprendizado editorial
- Diferenca mobile vs desktop: mobile mostra um insight por vez; desktop mostra varios comparativos lado a lado

## Proposta de evolucao - Analise / Oportunidades

- Nome e rota: Analise / Oportunidades -> `/analise` -> existe em: mobile + desktop
- O que aparece: alertas de serie promissora com baixa frequencia, pilar sem publicacao recente, conteudos publicados sem vinculo, plataforma sem sync, padroes que merecem repeticao, conteudos com queda de performance
- O que e editavel: abrir o item sugerido, ir para vincular post, ir para editar conteudo, marcar insight como visto
- O que e automatico: priorizacao por urgencia e impacto, separando alertas operacionais dos editoriais
- O que nao pode faltar: sugestoes praticas do que fazer a seguir
- Diferenca mobile vs desktop: mobile usa cards com CTA direto / desktop pode separar em duas colunas "operacional" e "editorial"

## Proposta de evolucao - Analise / Conteudos e Vinculos

- Nome e rota: Analise / Conteudos e Vinculos -> `/analise` -> existe em: mobile + desktop
- O que aparece: lista/tabela com titulo do conteudo, plataforma, conta conectada, status de vinculacao, URL do post, ultima sync, views, saves, comentarios, CTA "Vincular post", CTA "Atualizar", CTA "Ver conteudo"
- O que e editavel: colar URL do post, confirmar vinculacao, remover vinculo, ordenar lista, filtrar por estado de vinculacao
- O que e automatico: sistema resolve ID externo pela URL, valida a conta autorizada e prepara o sync de metricas
- O que nao pode faltar: visibilidade clara de quais conteudos estao realmente medidos
- Diferenca mobile vs desktop: mobile usa cards resumidos / desktop usa tabela completa com mais colunas

## Configuracoes

- Nome e rota: Configuracoes -> `/configuracoes` -> existe em: mobile + desktop
- O que aparece: lista de cards para "DNA da Voz", "Pilares Editoriais", "Looks & Cenarios", "Regras de Ouro", "Series", "Plataformas", "Templates de Roteiro" e CTA "Reiniciar Guia de Operacao"
- O que e editavel: abrir subrotas de configuracao, reiniciar onboarding
- O que e automatico: confirmacao aparece antes de reiniciar onboarding; ao confirmar salva preferencia `onboarding_completo = false` e volta para `/`
- O que nao pode faltar: acesso a todas as subconfiguracoes e CTA de reinicio do guia
- Diferenca mobile vs desktop: mesma estrutura com cards empilhados

## DNA da Voz

- Nome e rota: DNA da Voz -> `/configuracoes/dna` -> existe em: mobile + desktop
- O que aparece: secoes "Promessa Central", "Publico", "Pilares de Conteudo", "Tom de Voz", "O que nao faco", "Alertas de Desvio", botao salvar quando ha alteracoes
- O que e editavel: editar textos longos, adicionar/remover itens em "nao faco" e "alertas"
- O que e automatico: lista de pilares ativos e puxada do cadastro de pilares; botao salvar so aparece quando ha diferenca entre estado local e estado salvo
- O que nao pode faltar: promessa, publico, tom e limites/editoriais
- Diferenca mobile vs desktop: mesma estrutura

## Pilares Editoriais

- Nome e rota: Pilares Editoriais -> `/configuracoes/pilares` -> existe em: mobile + desktop
- O que aparece: contador de pilares, botao "Novo", formulario com nome/descricao/cor/hashtags por plataforma, lista de pilares com cor, nome, total de plataformas e acoes de ativar, editar e excluir
- O que e editavel: criar, editar, ativar/desativar, excluir e configurar combos de hashtags por Instagram/TikTok/YouTube
- O que e automatico: contador de plataformas por pilar; formulario monta `plataformas` apenas quando ha hashtag preenchida
- O que nao pode faltar: nome do pilar, cor, estado ativo e hashtags por plataforma
- Diferenca mobile vs desktop: mobile compacta o card e move algumas acoes para o topo/inferior do item; desktop deixa acoes alinhadas lateralmente

## Looks & Cenarios

- Nome e rota: Looks & Cenarios -> `/configuracoes/looks` -> existe em: mobile + desktop
- O que aparece: secao de looks, secao de cenarios, botoes "Novo Look" e "Novo Cenario", formularios inline, lista de looks com numero/descricao/cenario, lista de cenarios com nome/descricao/setup
- O que e editavel: criar, editar descricao de look, associar cenario ao look, ativar/desativar, excluir look; criar, ativar/desativar e excluir cenario
- O que e automatico: numero sugerido do novo look avanca com base no maior numero existente; texto de cenario combina descricao e tempo de setup
- O que nao pode faltar: catalogo de looks e catalogo de cenarios
- Diferenca mobile vs desktop: mesma estrutura

## Regras de Ouro

- Nome e rota: Regras de Ouro -> `/configuracoes/regras` -> existe em: mobile + desktop
- O que aparece: header, botao "Nova Regra", formulario de nova regra, bloco de violacoes da semana atual, lista de regras com icone/tipo/id/descricao, toggle ativo/inativo, exclusao de regras customizadas
- O que e editavel: criar regra personalizada, escolher severidade visual, ativar/desativar regra, excluir regra que nao seja padrao
- O que e automatico: violacoes da semana atual sao recalculadas via `validateWeeklyContent`; regras padrao nao exibem botao de exclusao
- O que nao pode faltar: lista de regras, status ativo e visao de violacoes
- Diferenca mobile vs desktop: mesma estrutura

## Series

- Nome e rota: Series -> `/configuracoes/series` -> existe em: mobile + desktop
- O que aparece: botao "Nova serie", formulario com nome/cor/frequencia/estrutura/bordao, lista de series com cor, frequencia, status ativa/inativa, expansao para editar campos
- O que e editavel: criar serie, ativar/desativar, excluir, expandir e editar nome/cor/frequencia/estrutura do roteiro/bordao
- O que e automatico: contagem nas tabs e status visual da serie; atualizacao usa `updatedAt` a cada alteracao
- O que nao pode faltar: nome da serie, frequencia e estado ativo
- Diferenca mobile vs desktop: mesma estrutura

## Plataformas

- Nome e rota: Plataformas -> `/configuracoes/plataformas` -> existe em: mobile + desktop
- O que aparece: botao "Adicionar", formulario de nome, lista de plataformas com badge "Padrao" quando aplicavel, toggle de ativa/inativa e exclusao para plataformas customizadas
- O que e editavel: criar nova plataforma, ativar/desativar, excluir plataforma nao padrao
- O que e automatico: lista reconhece automaticamente plataformas padrao (`Instagram`, `TikTok`, `YouTube`, `Blog`)
- O que nao pode faltar: nome e estado ativo de cada plataforma
- Diferenca mobile vs desktop: mesma estrutura

## Templates

- Nome e rota: Templates -> `/configuracoes/templates` -> existe em: mobile + desktop
- O que aparece: botao "Novo", formulario para novo template com nome/serie/plataforma, lista lateral de templates, editor do template selecionado, lista de blocos do template, formulario para adicionar bloco variavel ou fixo
- O que e editavel: criar template, selecionar template, excluir template, adicionar bloco, reordenar bloco, editar label, editar conteudo fixo ou placeholder variavel, excluir bloco
- O que e automatico: subtitulo da lista lateral combina serie e plataforma quando presentes, senao mostra "Geral"; `updatedAt` atualiza sempre que o template muda
- O que nao pode faltar: lista de templates e editor de estrutura em blocos
- Diferenca mobile vs desktop: desktop usa layout em duas colunas com lista lateral e editor; mobile empilha essas secoes

## Rotas auxiliares e redirecionamentos

- Nome e rota: Inicio -> `/` -> existe em: mobile + desktop
- O que aparece: nenhuma tela propria
- O que e editavel: nao se aplica
- O que e automatico: redireciona para `/conteudos`
- O que nao pode faltar: redirecionamento funcional
- Diferenca mobile vs desktop: nenhuma

- Nome e rota: Rotas legadas -> `/contents`, `/ideas`, `/editorial`, `/calendar`, `/results`, `/settings/*` -> existe em: mobile + desktop
- O que aparece: nenhuma tela propria
- O que e editavel: nao se aplica
- O que e automatico: redirecionam respectivamente para `/conteudos`, `/ideias`, `/calendario`, `/calendario`, `/analise` e `/configuracoes`
- O que nao pode faltar: compatibilidade com URLs antigas
- Diferenca mobile vs desktop: nenhuma

## Proposta de fluxo complementar - Vincular post por URL

- Nome e rota: Modal ou painel "Vincular Post" -> acionado dentro de `/analise` e do detalhe do conteudo -> status atual: proposta futura
- O que aparece: seletor de plataforma, seletor de conta conectada, campo para colar URL, estado de validacao, preview do post resolvido, mensagem de erro quando a URL nao puder ser lida, botao confirmar, botao cancelar
- O que e editavel: escolher plataforma, escolher conta, colar URL, confirmar ou cancelar
- O que e automatico: sistema extrai o ID externo da URL, verifica se a conta conectada tem permissao sobre aquele post, tenta buscar dados basicos do post antes de salvar o vinculo, registra data de vinculacao e prepara a primeira sincronizacao
- O que nao pode faltar: validacao da URL, checagem de permissao da conta e preview antes de confirmar
- Diferenca mobile vs desktop: mobile abre em bottom sheet com fluxo em etapas; desktop pode abrir em modal central ou painel lateral
