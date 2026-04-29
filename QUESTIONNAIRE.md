# QUESTIONNAIRE.md — Content OS
> Documento para decisão antes da reconstrução  
> Gerado em: 2026-04-27  
> Preencha cada resposta diretamente após o `→`

---

## COMO USAR

Cada pergunta tem um número e contexto explicando **por que ela existe** (o que o código atual faz e por que isso gera dúvida). Responda com o que você **quer que seja**, não com o que existe hoje.

Perguntas com opções `[A]` `[B]` `[C]` aceitam uma das letras como resposta. Perguntas abertas pedem texto livre.

---

## BLOCO 1 — O SISTEMA E QUEM USA

**1.1 — Para quem é este sistema?**  
Contexto: o código foi construído para uso individual mas tem estrutura que sugere multi-usuário (Supabase Auth, alguns `user_id` espalhados). Antes de qualquer decisão de banco de dados, essa resposta define tudo.

- [A] Sistema para uma única criadora (você). Nunca vai ter mais de um usuário real.  
- [B] Sistema para você agora, mas pode virar multi-usuário no futuro (outros criadores).  
- [C] Sistema multi-usuário desde o início — outras criadoras podem ter contas separadas.

**→ Resposta:**

---

**1.2 — Se multi-usuário (1.1 = B ou C): cada usuária vê apenas os próprios dados?**  
Contexto: hoje, tabelas como `books`, `contents`, `ideas`, `pilares` não têm `user_id`. Se duas pessoas usarem o sistema agora, veem os mesmos dados.

- [A] Sim — isolamento total. Cada usuária tem seus próprios conteúdos, pilares, livros, parcerias.  
- [B] Alguns dados são compartilhados (ex: pilares, regras de ouro) mas conteúdos e livros são privados.  
- [C] Não se aplica — sistema single-user (resposta 1.1 = A).

**→ Resposta:**

---

**1.3 — O sistema tem nome definitivo?**  
Contexto: o código usa "Content OS" em vários lugares (título do app, manifest PWA, variáveis).

**→ Resposta:**

---

**1.4 — O sistema vai continuar sendo uma PWA (instalável, funciona offline)?**  
Contexto: o projeto tem configuração de PWA com cache offline para Supabase (24h) e fontes (365 dias). Isso adiciona complexidade ao desenvolvimento.

- [A] Sim — precisa funcionar instalado e ter suporte offline básico.  
- [B] Não — pode ser um webapp normal sem funcionalidade offline.  
- [C] Parcialmente — instalável no celular, mas sem necessidade de funcionar sem internet.

**→ Resposta:**

---

## BLOCO 2 — CONTEÚDOS (entidade central)

**2.1 — Quais campos de um conteúdo são obrigatórios no momento da criação?**  
Contexto: hoje apenas `title` e `status` são obrigatórios no banco. O resto é opcional.

**→ Campos obrigatórios na criação:**

---

**2.2 — `caption` vs `legendas`: qual sobrevive?**  
Contexto: `caption` é um campo de texto único e está marcado como "legado" no código. `legendas` é um JSON que guarda uma legenda por plataforma (ex: `{ "Instagram": "...", "TikTok": "..." }`). Ambos existem na mesma tabela e podem ter dados duplicados.

- [A] Apenas `legendas` (por plataforma) — delete `caption`.  
- [B] Apenas `caption` (texto único) — o sistema não precisa de legendas diferentes por plataforma.  
- [C] Os dois — `caption` é a legenda principal, `legendas` são versões específicas por plataforma.

**→ Resposta:**

---

**2.3 — Conteúdo pode ir para múltiplas plataformas ao mesmo tempo?**  
Contexto: existe o campo `plataformas` (array) indicando onde o conteúdo será publicado. As plataformas disponíveis hoje são: Instagram, TikTok, YouTube, Blog.

- [A] Sim — um conteúdo pode ser publicado em várias plataformas.  
- [B] Não — cada conteúdo é de uma plataforma só.  
- [C] Sim, mas cada plataforma tem data de publicação diferente.

**→ Resposta:**

---

**2.4 — Existem plataformas além das 4 atuais (Instagram, TikTok, YouTube, Blog)?**  
Contexto: a lista de plataformas está hardcoded como enum no código. Adicionar uma nova plataforma hoje exige alterar o código.

**→ Quais plataformas devem existir no sistema novo:**

---

**2.5 — `tags` em conteúdos: como você usa hoje?**  
Contexto: o campo `tags` é uma string (provavelmente palavras separadas por vírgula ou espaço). Não é possível buscar ou filtrar por tag exata.

- [A] Uso bastante e quero poder filtrar conteúdos por tag.  
- [B] Uso como anotação livre — não preciso filtrar por tag.  
- [C] Não uso / pode ser removido.

**→ Resposta:**

---

**2.6 — O campo `scriptNotes` (notas sobre o roteiro) deve existir?**  
Contexto: o tipo TypeScript de `Content` tem um campo `scriptNotes` com anotações por seleção de texto no editor de roteiro (similar a comentários do Google Docs). Esse campo existe no código mas não aparece no schema SQL — pode ser uma feature incompleta.

- [A] Sim — quero poder fazer anotações específicas em trechos do roteiro.  
- [B] Não — o editor de roteiro não precisa de comentários por seleção.  
- [C] Não sabia que existia / nunca usei.

**→ Resposta:**

---

**2.7 — `format` (formato do conteúdo) e `formatoVisual` (formato de produção): são a mesma coisa?**  
Contexto: `format` é um campo string marcado como "legado" no código. `formatoVisual` é um enum com valores `Talking Head | Tela Verde | Voiceover | POV Texto | Reação | Vlog | Misto`. Parecem resolver a mesma questão.

- [A] São a mesma coisa — delete `format`, mantém só `formatoVisual`.  
- [B] São diferentes — `format` era o tipo editorial (ex: "Review", "Ranking"), `formatoVisual` é a técnica de gravação.  
- [C] Não sei distinguir os dois — precisa de exemplos para decidir.

**→ Resposta:**

---

**2.8 — O campo `slotType` (`Curto | Série | Janela`) faz sentido para você?**  
Contexto: `slotType` classifica o "encaixe" do conteúdo na grade semanal. Não está clara a diferença intencional entre os três valores na prática.

- [A] Sim — uso para organizar a frequência de publicação. Explique cada um abaixo.  
- [B] Não uso / não entendo — pode ser removido.

**→ Resposta:**  
**→ Se A: o que significa cada valor (Curto / Série / Janela)?**

---

## BLOCO 3 — STATUS E PIPELINE

**3.1 — Os 7 status atuais fazem sentido?**  
Contexto: `Ideia → Pronto para Gravar → Gravado → A Editar → Editado → Programado → Postado`

- [A] Sim — todos os 7 são necessários.  
- [B] Alguns podem ser removidos ou renomeados. Indique abaixo.  
- [C] O pipeline precisa ser diferente. Descreva o novo fluxo.

**→ Resposta:**  
**→ Se B ou C, descreva o pipeline ideal:**

---

**3.2 — Alguma transição de status deve ser automática?**  
Exemplos de automação possível: se a data de publicação chegou, mudar para "Programado"; se o conteúdo tem `publishDate` no passado e está "Programado", mudar para "Postado".

- [A] Não — prefiro controle manual total.  
- [B] Sim — quando a `publishDate` chegar, mudar para "Programado" automaticamente.  
- [C] Sim — quando a `publishDate` passar, marcar como "Postado" automaticamente.  
- [D] Outro comportamento (descreva):

**→ Resposta:**

---

**3.3 — Conteúdos no status "Ideia" devem aparecer separados dos outros (ex: na tela de Ideias) ou junto com todos os conteúdos?**  
Contexto: hoje existe uma tela `/ideas` separada para capturar ideias, E o status "Ideia" também existe em `contents`. A sobreposição cria confusão — uma "ideia" pode estar em dois lugares ao mesmo tempo.

- [A] Separados — "Ideia" é uma entidade diferente de "Conteúdo". Ideias viram conteúdos ao serem promovidas.  
- [B] Juntos — o primeiro status do conteúdo é "Ideia", não precisa de tela separada.  
- [C] Os dois existem para funções diferentes (explique):

**→ Resposta:**

---

## BLOCO 4 — PILARES E SÉRIES

**4.1 — Os pilares são criados por você ou são fixos do sistema?**  
Contexto: o banco vem pré-populado com 7 pilares. O sistema permite editar/criar novos.

- [A] São completamente editáveis por mim — posso criar, renomear e excluir qualquer pilar.  
- [B] São fixos do sistema — não preciso de CRUD de pilares.  
- [C] Tenho os 7 que existem e não vou mudar.

**→ Resposta:**

---

**4.2 — Qual é a diferença entre Pilar e Série para você?**  
Contexto: `Pilar` é uma categoria temática (ex: "Análise", "Opinião"). `Série` é um formato recorrente com estrutura própria (ex: "Review Rápido", "Clipe da Semana"). Um conteúdo pode ter um pilar e pertencer a uma série. Mas na prática isso às vezes parece redundante.

**→ Como você distingue os dois no seu fluxo de trabalho:**

---

**4.3 — Uma série pode pertencer a mais de um pilar?**  
Contexto: hoje `series.pilar_id` é um FK único — uma série tem um pilar.

- [A] Não — série pertence a um pilar só.  
- [B] Sim — uma série pode cruzar pilares.

**→ Resposta:**

---

**4.4 — Séries têm hashtags próprias ou herdam do pilar?**  
Contexto: `pilares` tem campos de hashtags por plataforma. `series` também tem `hashtagsPorPlataforma` no TypeScript (mas não está no schema SQL — pode ser feature incompleta).

- [A] Herdam do pilar — série não precisa de hashtags próprias.  
- [B] Série tem suas próprias hashtags, independente do pilar.  
- [C] Série tem hashtags adicionais que se somam às do pilar.

**→ Resposta:**

---

**4.5 — Looks e cenários de gravação continuam existindo no sistema novo?**  
Contexto: existe uma tela `/settings/looks` para cadastrar looks (número, descrição, look do dia) e cenários (fundo, tempo de setup). São usados para planejar dias de gravação.

- [A] Sim — uso ativamente para planejar o que gravar em cada look.  
- [B] Não — essa feature pode ser descartada no rebuild.  
- [C] O conceito sim, mas a implementação atual não funciona como eu quero. Explique:

**→ Resposta:**

---

## BLOCO 5 — IDEIAS

**5.1 — O que acontece com uma ideia depois que ela é promovida para conteúdo?**  
Contexto: ao promover uma ideia, o campo `promoted_to_content_id` é preenchido. Não está claro se a ideia deve desaparecer da lista, ficar marcada, ou ser arquivada.

- [A] Desaparece automaticamente da lista de ideias.  
- [B] Fica na lista marcada como "promovida" (com link para o conteúdo).  
- [C] É arquivada automaticamente.  
- [D] Nada muda — continua aparecendo normalmente.

**→ Resposta:**

---

**5.2 — Você usa ideias que NÃO vêm de livros?**  
Contexto: `ideas` tem `livro_origem_id` (opcional). A ideia pode ter origem em um livro ou não.

- [A] Sim — a maioria das minhas ideias não vem de livros.  
- [B] Sim — mas quero sempre poder rastrear a origem (livro ou outra fonte).  
- [C] A maioria das minhas ideias vem de livros.

**→ Resposta:**

---

**5.3 — Ideias precisam ter pilar e série associados?**  
Contexto: hoje esses campos são opcionais em ideias.

- [A] Não — captura rápida é mais importante que categorizar.  
- [B] Sim — pilar é obrigatório ao criar a ideia.  
- [C] Opcional — posso classificar depois.

**→ Resposta:**

---

## BLOCO 6 — BIBLIOTECA E LIVROS

**6.1 — A biblioteca de livros é essencial para o sistema ou é secundária?**

- [A] Essencial — o sistema gira em torno de conteúdo sobre livros.  
- [B] Importante mas não central — é um módulo complementar.  
- [C] Pode ser simplificada no rebuild.

**→ Resposta:**

---

**6.2 — Os gêneros de livro são fixos ou você quer poder criar novos?**  
Contexto: hoje os gêneros são um enum fixo: Fantasy, Dark Romance, Ficção Científica, Clássico, Não-ficção, Romance, Thriller, Horror, Outro.

- [A] Esses gêneros bastam.  
- [B] Quero poder criar gêneros personalizados.  
- [C] Preciso de mais gêneros — quais: ___

**→ Resposta:**

---

**6.3 — `potencial_conteudo` em livros (escala 1-2-3) e `content_potential` em anotações (boolean): para que você usa cada um?**  
Contexto: são dois campos diferentes em entidades diferentes, mas parecem marcar a mesma coisa ("esse livro/essa anotação tem potencial de virar conteúdo"). Podem estar duplicando informação.

**→ O que você quis dizer com `potencial_conteudo` no livro:**  
**→ O que você quis dizer com `content_potential` na anotação:**

---

**6.4 — `destilada` em anotações: o que significa na prática?**  
Contexto: existe um campo `destilada` (boolean) nas anotações. Parece ser diferente de `content_potential`, mas a semântica não está clara no código.

**→ O que significa uma anotação "destilada":**

---

**6.5 — Tipos de anotação atuais: `Trecho | Reação | Análise | Ideia de conteúdo | Pergunta`**  
São suficientes ou faltam tipos?

**→ Faltam tipos? Quais:**  
**→ Algum pode ser removido:**

---

**6.6 — O fluxo livro → anotação → ideia → conteúdo precisa de botões diretos em cada etapa?**  
Contexto: tecnicamente os dados se conectam (via `livro_origem_id`), mas a UI pode não ter botões explícitos para cada passo. Ex: botão "criar ideia a partir desta anotação" dentro do detalhe do livro.

- [A] Sim — quero um botão em cada etapa para avançar para a próxima.  
- [B] Não — navego manualmente entre as telas.  
- [C] Quero o fluxo automático só em alguns pontos (quais):

**→ Resposta:**

---

**6.7 — Campanhas de livro: você usa?**  
Contexto: existe uma entidade `campaigns` que agrupa um período de conteúdos em torno de um livro específico (com meta numérica de conteúdos a produzir).

- [A] Sim — uso para planejar "vou produzir X conteúdos sobre esse livro em Y meses".  
- [B] Não uso / não sabia que existia.  
- [C] A ideia faz sentido mas a implementação atual não funciona bem. Explique:

**→ Resposta:**

---

**6.8 — Campos de livro que você nunca preenche (podem ser removidos)?**  
Contexto: o livro tem muitos campos opcionais: `editora`, `ano_publicacao`, `isbn`, `idioma`, `traducao`, `serie_colecao`, `quem_indicou`, `motivo_escolha`, `capitulos_cobertos`.

**→ Quais campos você nunca usa:**

---

## BLOCO 7 — PARCERIAS

**7.1 — A tela de Parcerias existe no sistema mas não está no menu de navegação.**  
Contexto: o arquivo `Partnerships.tsx` existe com todas as funcionalidades (pipeline kanban, tabela, calendário de parcerias) mas não tem rota registrada no router. O conteúdo de parcerias aparece no Calendário Editorial, mas a tela dedicada de Parcerias está inacessível.

- [A] Parcerias devem ter uma tela dedicada no menu principal.  
- [B] Parcerias ficam apenas dentro do Calendário Editorial.  
- [C] Parcerias são raras — basta gerenciar pelo modal sem tela própria.

**→ Resposta:**

---

**7.2 — O pipeline de status de parcerias está correto?**  
Status atuais: `Leitura → Roteiro → Envio de Roteiro → Gravação → Edição → Aprovação → Postagem → Métricas → Finalizado`

- [A] Sim — esse fluxo reflete o que acontece nas minhas parcerias.  
- [B] Falta algum passo (qual): ___  
- [C] Algum passo não faz sentido (qual): ___  
- [D] O fluxo inteiro precisa ser repensado. Descreva:

**→ Resposta:**

---

**7.3 — Uma parceria pode ter mais de um conteúdo associado?**  
Contexto: hoje `Partnership.contentId` é um campo único (1-para-1). Mas uma parceria pode exigir produção de múltiplos conteúdos (ex: 3 Reels + 1 Stories).

- [A] Sim — uma parceria pode ter múltiplos conteúdos vinculados.  
- [B] Não — cada parceria gera um único conteúdo.  
- [C] Depende — às vezes 1, às vezes vários.

**→ Resposta:**

---

**7.4 — Você registra o valor financeiro das parcerias?**  
Contexto: o campo `value` (número) existe mas sem campo de moeda.

- [A] Sim — quero registrar e ver total de receita.  
- [B] Às vezes — só para parcerias maiores.  
- [C] Não — campo pode ser removido.

**→ Resposta:**  
**→ Se A ou B: qual moeda principal (BRL, USD, EUR)?**

---

## BLOCO 8 — RESULTADOS E MÉTRICAS

**8.1 — Quais métricas você realmente preenche após postar um conteúdo?**  
Contexto: o sistema coleta: `views`, `interactions`, `likes`, `comments`, `saves`, `shares`, `newFollowers`, `reposts`, `accountsReached`. São 9 campos por conteúdo.

**→ Métricas que você realmente usa (risque as que não usa):**  
Views / Interactions / Likes / Comments / Saves / Shares / New Followers / Reposts / Accounts Reached

---

**8.2 — As métricas variam por plataforma?**  
Contexto: um Reel no Instagram tem alcance, um vídeo no YouTube tem watch time. As métricas relevantes são diferentes por plataforma.

- [A] Sim — quero campos de métricas diferentes para cada plataforma.  
- [B] Não — uso os mesmos campos para todas as plataformas, mesmo que nem todos se apliquem.  
- [C] Prefiro um campo de texto livre para anotar o que quiser.

**→ Resposta:**

---

**8.3 — `worth_it` (Valeu a pena?): os valores `Sim / Não / Mais ou menos` são suficientes?**  
Contexto: esse campo aparece no post-mortem de conteúdos.

- [A] Sim — esses três valores são o suficiente.  
- [B] Prefiro uma escala numérica (ex: 1-5).  
- [C] Prefiro outro tipo de avaliação (descreva):

**→ Resposta:**

---

**8.4 — `creative_satisfaction` (Satisfação criativa 1-5) faz sentido para você?**  
Contexto: este campo avalia o quanto você ficou satisfeita com o conteúdo produzido, independente do resultado de métricas.

- [A] Sim — importante separar resultado externo (métricas) de satisfação interna.  
- [B] Não — pode ser removido.

**→ Resposta:**

---

## BLOCO 9 — AGENDA E CALENDÁRIO

**9.1 — Você tem dois calendários no sistema: `EditorialCalendar` e `Harvest`. Qual é a diferença para você?**  
Contexto: `EditorialCalendar` (`/editorial`) exibe conteúdos planejados por data de publicação/gravação. `Harvest` é outra tela de calendário que também aparece no código mas não tem rota registrada — está inacessível.

**→ O que você entende como diferença entre os dois:**  
**→ Você usa os dois ou só um deles:**

---

**9.2 — Existe também uma tela `ProjectCalendar` (inacessível no menu) focada em parcerias. Você quer isso como tela separada?**  
Contexto: `ProjectCalendar` tem 4 modos de visualização (calendar, timeline, projects, dashboard) para parcerias.

- [A] Sim — quero um calendário/painel dedicado para parcerias.  
- [B] Não — parcerias ficam no Calendário Editorial junto com o restante.

**→ Resposta:**

---

**9.3 — Eventos de agenda têm horário ou apenas data?**  
Contexto: `agenda_items.date` é um campo de data (sem hora). Reuniões e entregas normalmente têm horário.

- [A] Apenas data é suficiente.  
- [B] Quero registrar horário também (ex: reunião às 14h).

**→ Resposta:**

---

**9.4 — No calendário, quais "camadas" você quer ver ativas por padrão?**  
Contexto: o calendário tem toggles para mostrar/ocultar: conteúdos orgânicos, parcerias, gravações, publicações, regras de ouro.

**→ Camadas que devem aparecer por padrão:**

---

**9.5 — A tela `ShootingDays` (Dias de Gravação) existe no código mas está inacessível. Ela serve para agrupar conteúdos para gravar no mesmo dia por looks/cenários. Você usa esse conceito?**

- [A] Sim — muito útil para planejar dias de gravação em lote.  
- [B] Não uso / não sabia que existia.  
- [C] A ideia faz sentido mas quero em um formato diferente (descreva):

**→ Resposta:**

---

**9.6 — Energy logs (registro de energia 1-5 por dia) continuam existindo?**  
Contexto: aparecem no Dashboard. O usuário marca seu nível de energia e isso fica visível no calendário.

- [A] Sim — uso para correlacionar disposição com produtividade.  
- [B] Não — pode ser removido.

**→ Resposta:**

---

## BLOCO 10 — PÁGINAS ÓRFÃS

As páginas abaixo existem no código com funcionalidades completas, mas **não estão registradas no menu nem no router** — são completamente inacessíveis hoje. Decida o destino de cada uma:

**10.1 — `Partnerships` (pipeline de parcerias em kanban/tabela)**
- [A] Adicionar ao menu e ao router.  
- [B] Mesclar com outra tela existente (qual):  
- [C] Descartar — parcerias vivem no calendário.

**→ Resposta:**

---

**10.2 — `ProjectCalendar` (calendário/painel focado em parcerias)**
- [A] Adicionar ao menu e ao router.  
- [B] Mesclar com `EditorialCalendar`.  
- [C] Descartar.

**→ Resposta:**

---

**10.3 — `Harvest` (calendário visual de publicações/agenda)**
- [A] Adicionar ao menu e ao router.  
- [B] Mesclar com `EditorialCalendar`.  
- [C] Descartar.

**→ Resposta:**

---

**10.4 — `ShootingDays` (planejar dias de gravação em bloco)**
- [A] Adicionar ao menu e ao router.  
- [B] Integrar como aba dentro de `EditorialCalendar` ou `Contents`.  
- [C] Descartar.

**→ Resposta:**

---

**10.5 — `Agenda` (lista de compromissos separada do calendário)**
- [A] Adicionar ao menu e ao router.  
- [B] Mesclar com `EditorialCalendar`.  
- [C] Descartar.

**→ Resposta:**

---

## BLOCO 11 — NAVEGAÇÃO

**11.1 — Quais são as 5 telas que você usa com mais frequência?**  
Contexto: isso define os itens do menu principal e da barra mobile.

**→ As 5 telas mais usadas (em ordem de frequência):**

---

**11.2 — O menu lateral (sidebar) no desktop está bom ou você mudaria algo?**

- [A] Está bom como está.  
- [B] Mudaria a ordem dos itens.  
- [C] Adicionaria ou removeria itens (quais):  
- [D] Quero um menu diferente (descreva):

**→ Resposta:**

---

**11.3 — No mobile, quais 4-5 telas devem estar na barra de navegação inferior?**  
Contexto: a barra mobile atual tem um subset das telas do desktop. O usuário mobile não tem acesso fácil a Settings, Séries, etc.

**→ Telas que devem estar na barra mobile:**

---

**11.4 — O Command Palette (Cmd+K) precisa existir no sistema novo?**  
Contexto: abre uma paleta de comandos para navegar rapidamente pelo teclado.

- [A] Sim — uso bastante para navegar.  
- [B] Não sei o que é / nunca usei.  
- [C] Não precisa.

**→ Resposta:**

---

## BLOCO 12 — DESIGN E IDENTIDADE VISUAL

**12.1 — A paleta de cores atual representa a identidade do sistema para você?**  
Contexto: cores atuais — backgrounds quase-branco (#FBFBFA), texto escuro (#37352F), accents: azul (#2EAADC), roxo (#9065B0), rosa (#D44C47), laranja (#D9730D), verde (#448361). Inspiração visual próxima ao Notion.

- [A] Sim — gosto das cores, podem continuar.  
- [B] Algumas cores mudariam (quais e para quê):  
- [C] Quero uma identidade visual diferente (descreva o tom):

**→ Resposta:**

---

**12.2 — O tema escuro é essencial?**  
Contexto: existe suporte completo a dark mode com variáveis CSS separadas.

- [A] Sim — uso principalmente em dark mode.  
- [B] Sim — quero poder alternar entre os dois.  
- [C] Não — só o tema claro é necessário.

**→ Resposta:**

---

**12.3 — Você tem referências visuais de outros apps que representam como quer que o sistema seja?**  
Exemplos: Notion, Linear, Arc, Cron, Craft, Obsidian, Fey, Raycast, etc.

**→ Referências que você gosta (e por quê cada uma):**

---

**12.4 — Qual é a "personalidade" visual que você quer para o sistema?**  
Escolha as que mais combinam:

- [ ] Minimal e limpo  
- [ ] Editorial e tipográfico  
- [ ] Denso e informacional (muito dado visível)  
- [ ] Caloroso e orgânico (cores, arredondamentos)  
- [ ] Técnico e preciso (linhas, grid, espaçamento apertado)  
- [ ] Expressivo e com personalidade (fonte display, elementos gráficos)

**→ Escolhas marcadas:**  
**→ Alguma observação adicional sobre o tom visual:**

---

**12.5 — As fontes atuais (Inter para UI, JetBrains Mono para código) estão boas?**

- [A] Sim — não mudaria nada.  
- [B] Quero uma fonte diferente para os títulos das páginas.  
- [C] Quero uma fonte diferente para o UI geral.  
- [D] Quero fontes completamente diferentes (quais):

**→ Resposta:**

---

**12.6 — Os títulos das páginas hoje são em UPPERCASE + itálico. Esse estilo representa o sistema?**  
Contexto: o sistema usa muito `uppercase italic tracking-tight font-black` nos títulos principais, criando um estilo editorial/esportivo.

- [A] Sim — gosto desse estilo agressivo.  
- [B] Parcialmente — gosto do uppercase mas não do itálico.  
- [C] Não — prefiro títulos em capitalização normal.  
- [D] Quero algo diferente (descreva):

**→ Resposta:**

---

**12.7 — Os cards de conteúdo têm bordas arredondadas (`rounded-2xl` = 16px). Está certo?**

- [A] Sim — esse arredondamento está bom.  
- [B] Quero mais arredondado.  
- [C] Quero menos arredondado / quase reto.

**→ Resposta:**

---

**12.8 — Os modais/painéis: qual padrão você prefere para cada situação?**  
Contexto: existem 3 padrões de modal hoje: (1) full-screen, (2) painel lateral direito, (3) bottom sheet do celular.

**→ Para editar um conteúdo completo (roteiro, legendas, campos):** Full-screen / Painel lateral / Bottom sheet  
**→ Para confirmações rápidas (deletar, arquivar):** Full-screen / Painel lateral / Bottom sheet / Inline  
**→ Para adicionar ideia rápida:** Full-screen / Painel lateral / Bottom sheet / Inline

---

**12.9 — O status de um conteúdo é representado por cor (badge colorido). Faz sentido para você?**

- [A] Sim — a cor me ajuda a identificar o status visualmente.  
- [B] Prefiro ícone em vez de cor.  
- [C] Prefiro texto sem cor especial.  
- [D] Cor + ícone juntos.

**→ Resposta:**

---

**12.10 — Você quer cor associada a cada pilar?**  
Contexto: cada pilar tem uma cor hex que aparece como identificador visual nos conteúdos.

- [A] Sim — uso a cor para identificar o pilar rapidamente.  
- [B] Não — pode ser só texto/nome.

**→ Resposta:**

---

## BLOCO 13 — MOBILE

**13.1 — Você usa o sistema mais no celular ou no computador?**

- [A] Principalmente celular.  
- [B] Principalmente computador.  
- [C] Os dois de forma igual.  
- [D] Computador para criar, celular para consultar.

**→ Resposta:**

---

**13.2 — Quais ações você faz com mais frequência no celular?**  
Exemplos: capturar ideia rápida, ver o que gravar hoje, registrar métricas, fazer anotação em livro, verificar calendário.

**→ Ações no celular mais frequentes:**

---

**13.3 — Existe alguma tela que você tenta usar no celular mas não funciona bem?**

**→ Telas problemáticas no mobile:**

---

**13.4 — No mobile, prefere o conteúdo em lista vertical ou em cards em grade (2 colunas)?**

- [A] Lista vertical — mais fácil de ler títulos longos.  
- [B] Grade de 2 colunas — vejo mais de uma vez.  
- [C] Depende da tela (especifique):

**→ Resposta:**

---

## BLOCO 14 — DNA DA VOZ E REGRAS DE OURO

**14.1 — O DNA da Voz é algo que você configura uma vez e não muda, ou atualiza com frequência?**

- [A] Configuro uma vez — é a identidade fixa do canal.  
- [B] Atualizo às vezes conforme o canal evolui.  
- [C] Quase nunca entro nessa tela.

**→ Resposta:**

---

**14.2 — As Regras de Ouro são alertas editoriais que o sistema pode usar para validar conteúdos. Você quer que o sistema valide automaticamente os conteúdos contra as regras?**  
Contexto: as 7 regras existem no banco, mas a validação no frontend é parcial — não há alertas em tempo real ao editar um conteúdo.

- [A] Sim — quero ver um alerta imediato se um conteúdo viola uma regra.  
- [B] Não — regras são referência, não validação automática.  
- [C] Quero validação mas apenas como aviso, não bloqueio.

**→ Resposta:**

---

## BLOCO 15 — DECISÕES DE RECONSTRUÇÃO

**15.1 — O que absolutamente não pode falhar no sistema novo?**  
Contexto: quais features são inegociáveis — se não funcionarem, o sistema não presta.

**→ Lista de features inegociáveis:**

---

**15.2 — O que pode ser jogado fora sem dó?**  
Contexto: quais features existem hoje que nunca foram usadas ou que não fazem falta.

**→ Features que podem ser descartadas:**

---

**15.3 — Existe alguma feature que você queria mas o sistema nunca teve?**

**→ Features que faltam:**

---

**15.4 — O sistema atual tem alguma tela ou fluxo que você acha visualmente feio ou confuso?**

**→ Partes do sistema que você não gosta:**

---

**15.5 — Qual é o prazo ideal para ter o sistema novo funcionando?**

**→ Prazo:**

---

**15.6 — Você tem prints/screenshots de telas que você acha bonitas (de qualquer app) e quer usar como referência de design?**

**→ Onde estão / como compartilhar:**

---

*Fim do questionário — total de 65 perguntas*
