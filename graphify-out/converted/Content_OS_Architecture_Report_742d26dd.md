<!-- converted from Content_OS_Architecture_Report.docx -->

CONTENT OS
Relatório de Arquitetura e Melhorias de Sistema
Gerado em 1 de abril de 2026  •  Versão 1.0


# 1. Visão Geral da Aplicação
O Content OS é uma Progressive Web App (PWA) desenvolvida em React 19 + TypeScript voltada para gerenciamento do ciclo completo de produção de conteúdo de uma criadora de conteúdo literário (booktuber/booktok). A aplicação cobre desde a captura de ideias e anotações de leitura, passando por planejamento editorial, gravação e edição, até publicação e rastreamento de resultados em múltiplas plataformas (Instagram, TikTok, YouTube, Blog).
O sistema é single-user por design, com persistência dupla: localStorage para acesso offline imediato e Supabase (PostgreSQL) para sincronização em nuvem com debounce de 2 segundos.


# 2. Pontos Fortes da Arquitetura Atual
## 2.1 O que foi feito bem
Antes das recomendações de melhoria, vale registrar as decisoes acertadas:
- PWA com workbox bem configurado: cache-first para assets estaticos, NetworkFirst com timeout de 10s para Supabase. Excelente para uso mobile sem conexao.
- Soft delete: todos os registros usam deleted_at ao inves de DELETE fisico. Isso garante histrico e possibilita auditoria futura.
- Debounce de 2s no sync: evita chamadas excessivas ao Supabase a cada keystroke. Boa escolha de performance.
- Modo offline gracioso: a aplicacao inicializa do localStorage e funciona completamente sem Supabase. O Supabase e tratado como cache/backup, nao como dependencia critica.
- Command Palette (Cmd+K): feature de poder que melhora muito a velocidade de uso para usuarios avancados.
- Regras de Ouro editoriais: sistema de validacao de mix de conteudo semanal e inteligente e proprio do dominio.
- Reducer bem organizado: acoes tipadas por dominio, separacao clara de responsabilidades no arquivo reducer.ts.
- Vinculacao Livro-Conteudo: o fluxo Anotacao -> Ideia -> Conteudo e um insight de produto excelente, mapeia o fluxo real de trabalho da criadora.

# 3. Problemas Identificados
## 3.1 Tabela Resumo de Issues


## 3.2 Seguranca: Chave Gemini no Bundle Cliente

Como resolver: criar uma Supabase Edge Function (ou equivalente em Cloudflare Workers, ja que o schema.sql aponta para D1) que recebe o prompt, chama a API do Gemini server-side e retorna apenas o resultado. A chave nunca sai do servidor.
- Arquivo: supabase/functions/gemini-proxy/index.ts
- Cliente chama: supabase.functions.invoke('gemini-proxy', { body: { prompt } })
- A chave GEMINI_API_KEY vira um secret do Supabase, nao uma variavel de ambiente do Vite
## 3.3 Sincronizacao: Upsert Total do Estado
A funcao saveToSupabase em database.ts faz upsert de TODAS as entidades a cada mudanca, mesmo que apenas um campo de um registro tenha mudado. Com o crescimento do banco de dados (por exemplo, 200 livros, 2.000 anotacoes), cada keystroke ao editar um roteiro dispara um upsert de todos os 2.000 registros apos o debounce.
Risco adicional: se o usuario tiver o app aberto em duas abas simultaneamente (computador + celular), a segunda aba pode sobrescrever mudancas da primeira quando o debounce disparar.
## 3.4 Contexto Monolitico e Re-renders
O AppContext expoe todo o estado (11+ entidades) atraves de um unico contexto. Qualquer componente que chame useAppContext() sera re-renderizado sempre que qualquer parte do estado mudar - mesmo que a mudanca seja em uma entidade completamente irrelevante para aquele componente.
Exemplo pratico: adicionar uma anotacao a um livro forca re-render de Dashboard, Contents, Ideas, Partnerships, Results, EditorialCalendar e todos os outros consumers do contexto.
- Opcao A (menor esforca): memoizar seletores com useMemo dentro dos componentes para que derivem dados sem causar renders extras.
- Opcao B (recomendada a medio prazo): dividir em contextos por dominio - ContentContext, BookContext, PartnershipContext - cada um com seu proprio reducer.
- Opcao C (ideal para crescimento): migrar para Zustand, que tem selecao granular por slice e praticamente elimina re-renders desnecessarios.
## 3.5 Seguranca de Tipos no Reducer
A maioria das acoes em AppAction usa payload: any, o que anula o beneficio do TypeScript nessas mutations. Erros de estrutura de payload so sao descobertos em runtime.
Recomendacao: tipar todos os payloads explicitamente usando os tipos ja definidos em types.ts. Os tipos estao la - so falta usa-los nas acoes.
## 3.6 Inconsistencia de Schema: D1 vs Supabase
O arquivo schema.sql na raiz do projeto e um schema para Cloudflare D1 (SQLite), conforme indica o cabecalho do arquivo. Mas o runtime usa Supabase (PostgreSQL). Isso sugere uma migracao de plataforma que nao foi concluida na documentacao.
Consequencias praticas: arrays sao armazenados como TEXT (JSON.stringify) no D1, mas o Supabase pode armazenar JSON nativo com indexacao. Qualquer desenvolvedor novo que olhar o schema.sql vai ter uma visao incorreta do banco de producao.
- Acao imediata: renomear ou remover schema.sql, ou adicionar um comentario prominente indicando que e um artefato historico.
- Acao recomendada: gerar o schema real via Supabase CLI (supabase db dump) e versionar esse arquivo.

# 4. Melhorias Recomendadas por Prioridade
## 4.1 Prioridade Alta - Seguranca e Confiabilidade
### 4.1.1 Proxy para Gemini AI
Implementar Edge Function no Supabase para intermediar chamadas ao Gemini. Tempo estimado: 2-4 horas.
### 4.1.2 Verificar / Implementar Row Level Security no Supabase
Auditar as politicas RLS do banco. Para uma aplicacao single-user, a politica mais simples e eficaz e auth.uid() = user_id em todas as tabelas, o que garante isolamento total dos dados mesmo com a anon key exposta.
Alternativa sem autenticacao: dado que e uma aplicacao pessoal, pelo menos garantir que o service role key nunca seja exposto no frontend e que o acesso anonimo seja restrito via politica de rede no Supabase Dashboard.
### 4.1.3 Indicador de Status de Sincronizacao na UI
O usuario nao tem feedback visual de que seus dados estao sendo salvos (ou falharam ao salvar). Adicionar um indicador discreto no canto da tela que mostre: Sincronizando... / Salvo / Erro ao sincronizar - com botao de retry.
## 4.2 Prioridade Media - Qualidade e Escalabilidade
### 4.2.1 Upsert Incremental
Refatorar saveToSupabase para aceitar apenas as entidades modificadas na ultima janela de debounce. A abordagem mais simples: criar um Set de 'tabelas sujas' que e populado pelo wrappedDispatch junto com o pendingDeletes, e limpar o set apos o sync.
### 4.2.2 Tipar os Payloads do Reducer
Esforco pequeno, ganho grande. Substituir payload: any pelos tipos correspondentes em todos os UPDATE_*/ADD_* actions. Onde o payload e uma atualizacao parcial, usar Partial<T> ou Pick<T, 'id' | ...>.
### 4.2.3 Remover Dados Mock do initialState de Producao
Os dados mock (mock-1, mock-2, idea-1, p-1, etc.) no initialState sao uteis para desenvolvimento mas arriscados em producao - eles podem ser salvos no Supabase de um usuario real na primeira vez que o app abre sem dados.
- Solucao simples: checar import.meta.env.DEV antes de usar dados mock, usando um initialState vazio em producao.
### 4.2.4 Memoizacao de Seletores no Dashboard
O Dashboard computa weeklyKpis com useMemo, o que esta correto. Mas outros calculos derivados espalhados pelos componentes (como listas filtradas em Contents.tsx, Partnerships.tsx) provavelmente nao usam useMemo, causando recalculo a cada render.
## 4.3 Prioridade Baixa - Melhorias de Produto
### 4.3.1 Paginacao nas Queries do Supabase
Adicionar .range(0, 49) (ou parametrizavel) nas queries de fetchAllData para limitar o payload inicial. Implementar 'carregar mais' conforme necessario. Relevante especialmente para book_annotations que pode crescer rapidamente.
### 4.3.2 Unificar RG-01 e RG-02 em goldenRules.ts
As regras RG-01 ('mesmo assunto mais de 2x na semana') e RG-02 ('mesma serie mais de 1x na semana') sao conceitualmente a mesma regra com limiares diferentes. Para uma serie que aparece 3x, ambas disparam gerando duplicidade visual no dashboard de Regras de Ouro. Fundir em uma unica regra com mensagem adaptativa ou adicionar logica de supersessao.
### 4.3.3 Consistencia de Nomenclatura
Metade das entidades tem nomes em ingles (Content, Series, Result, Partnership, Book), a outra metade em portugues (Pilar, Look, Cenario, AgendaItem, EnergyLog). Nao e um bug funcional, mas dificulta onboarding de novos colaboradores. Recomendacao: adotar um padrao e migrar gradualmente.

# 5. Roadmap de Evolucao Arquitetural


# 6. Conclusao
O Content OS e uma aplicacao bem arquitetada para seu proposito: um sistema operacional pessoal de conteudo para uma criadora solo. As decisoes de usar PWA, soft delete, sync com debounce e modo offline refletem maturidade de engenharia.
Os problemas identificados sao tipicos de um produto em fase de crescimento rapido: a estrutura inicial (contexto monolitico, upsert total, tipos any) funcionou bem para a velocidade de desenvolvimento inicial, mas precisa de refatoracao antes de escalar.
As tres acoes de maior impacto imediato sao: (1) mover a chave Gemini para o servidor, (2) adicionar feedback visual de sincronizacao para o usuario, e (3) tipar os payloads do reducer para evitar bugs de runtime. Todas as tres podem ser feitas em menos de um dia de trabalho.
| React 19 + TS | Supabase (PostgreSQL) | PWA / Vite 6 | Gemini AI |
| --- | --- | --- | --- |
| Fluxo de Dados
Browser (localStorage)  ↔  AppContext (useReducer)  →  UI Components
                    ↑                                            ↓
Supabase REST API  ←→  database.ts  (fetchAllData / saveToSupabase) |
| --- |
| Problema | Impacto | Severidade | Solução Sugerida |
| --- | --- | --- | --- |
| API Key do Gemini exposta no bundle cliente | Chave visivel em producao no JS minificado | Alta | Proxy server-side ou Supabase Edge Function |
| Upsert total do estado a cada mudanca | Desperdicio de banda, risco de sobrescrita entre abas | Alta | Upsert incremental por entidade modificada |
| God Context: estado monolitico | Re-renders desnecessarios em todo o app | Media | Dividir em contextos por dominio ou Zustand |
| payload: any em 80% das actions do reducer | Nenhuma seguranca de tipo nas mutations | Media | Tipar todos os payloads explicitamente |
| Schema D1 (SQLite) inconsistente com Supabase | Confusion tecnica, risco de migracao errada | Media | Remover schema.sql ou alinhar com Supabase |
| Sem estado de carregamento/erro na UI | Usuario nao sabe se app esta online ou syncing | Media | Adicionar indicador de sync e toast de erro |
| Sem autenticacao / sem RLS validado | Qualquer pessoa com a anon key pode ler dados | Alta | Implementar RLS ou Auth no Supabase |
| Dados mock hardcoded no estado inicial | Mock data pode ser salvo no Supabase acidentalmente | Baixa | Remover mocks ou isolar com flag de desenvolvimento |
| RG-01 e RG-02 redundantes em goldenRules.ts | Duas violacoes para o mesmo problema na mesma semana | Baixa | Fundir regras ou adicionar logica de supersessao |
| Sem paginacao na busca do Supabase | Nao escala com centenas de livros e anotacoes | Baixa | Adicionar .range() nas queries do Supabase |
|  | CRITICO
A linha process.env.GEMINI_API_KEY no vite.config.ts injeta a chave diretamente no JavaScript compilado. Qualquer usuario que inspecione o codigo-fonte em producao ve a chave em texto simples. |
| --- | --- |
|  | Solucao recomendada
Adotar upsert incremental: o wrappedDispatch ja intercepta acoes de DELETE. Expandir esse padrao para rastrear quais IDs foram criados/modificados por acao, e fazer upsert apenas desses registros no Supabase. |
| --- | --- |
|  | Exemplo problemático
{ type: 'ADD_CONTENT'; payload: any }  // sem verificacao de tipo
{ type: 'ADD_BOOK'; payload: Book }  // com verificacao de tipo — modelo correto |
| --- | --- |
| Fase | Prazo Estimado | Acoes | Beneficio |
| --- | --- | --- | --- |
| Fase 1
(1-2 semanas) | Rapida | Proxy Gemini + Remover mocks em prod + Tipar payloads | Seguranca e corretude |
| Fase 2
(2-4 semanas) | Media | Indicador de sync na UI + Upsert incremental + Verificar RLS | Confiabilidade e UX |
| Fase 3
(1-2 meses) | Longo prazo | Dividir contextos ou Zustand + Paginacao + Limpeza de schema | Escalabilidade |
|  | Proximo passo sugerido
Comece pelo proxy do Gemini - e a unica questao de seguranca critica e a mais simples de implementar isoladamente sem risco de regressao. |
| --- | --- |