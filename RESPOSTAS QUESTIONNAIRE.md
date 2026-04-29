# QUESTIONNAIRE.md — Content OS

Documento para decisão antes da reconstrução  
Gerado em: 2026-04-27  
Preencha cada resposta diretamente após o `→`

---

## COMO USAR

Cada pergunta tem um número e contexto explicando **por que ela existe** (o que o código atual faz e por que isso gera dúvida). Responda com o que você **quer que seja**, não com o que existe hoje.

Perguntas com opções `[A]` `[B]` `[C]` aceitam uma das letras como resposta. Perguntas abertas pedem texto livre.

---

## BLOCO 1 — O SISTEMA E QUEM USA

**1.1 — Para quem é este sistema?**  
Contexto: o código foi construído para uso individual mas tem estrutura que sugere multi-usuário (Supabase Auth, alguns `user_id` espalhados). Antes de qualquer decisão de banco de dados, essa resposta define tudo.

- \[A\] Sistema para uma única criadora (você). Nunca vai ter mais de um usuário real.  
- \[B\] Sistema para você agora, mas pode virar multi-usuário no futuro (outros criadores).  
- \[C\] Sistema multi-usuário desde o início — outras criadoras podem ter contas separadas.

**→ Resposta: C**

---

**1.2 — Se multi-usuário (1.1 \= B ou C): cada usuária vê apenas os próprios dados?**  
Contexto: hoje, tabelas como `books`, `contents`, `ideas`, `pilares` não têm `user_id`. Se duas pessoas usarem o sistema agora, veem os mesmos dados.

- \[A\] Sim — isolamento total. Cada usuária tem seus próprios conteúdos, pilares, livros, parcerias.  
- \[B\] Alguns dados são compartilhados (ex: pilares, regras de ouro) mas conteúdos e livros são privados.  
- \[C\] Não se aplica — sistema single-user (resposta 1.1 \= A).

**→ Resposta: A**

---

**1.3 — O sistema tem nome definitivo?**  
Contexto: o código usa "Content OS" em vários lugares (título do app, manifest PWA, variáveis).

**→ Resposta:** Core Creator

---

**1.4 — O sistema vai continuar sendo uma PWA (instalável, funciona offline)?**  
Contexto: o projeto tem configuração de PWA com cache offline para Supabase (24h) e fontes (365 dias). Isso adiciona complexidade ao desenvolvimento.

- \[A\] Sim — precisa funcionar instalado e ter suporte offline básico.  
- \[B\] Não — pode ser um webapp normal sem funcionalidade offline.  
- \[C\] Parcialmente — instalável no celular, mas sem necessidade de funcionar sem internet.

**→ Resposta: B**

---

## BLOCO 2 — CONTEÚDOS (entidade central)

**2.1 — Quais campos de um conteúdo são obrigatórios no momento da criação?**  
Contexto: hoje apenas `title` e `status` são obrigatórios no banco. O resto é opcional.

**→ Campos obrigatórios na criação: Se for em roteiro, somente o título e o campo do roteiro mesmo.** 

---

**2.2 — `caption` vs `legendas`: qual sobrevive?**  
Contexto: `caption` é um campo de texto único e está marcado como "legado" no código. `legendas` é um JSON que guarda uma legenda por plataforma (ex: `{ "Instagram": "...", "TikTok": "..." }`). Ambos existem na mesma tabela e podem ter dados duplicados.

- \[A\] Apenas `legendas` (por plataforma) — delete `caption`.  
- \[B\] Apenas `caption` (texto único) — o sistema não precisa de legendas diferentes por plataforma.  
- \[C\] Os dois — `caption` é a legenda principal, `legendas` são versões específicas por plataforma.

**→ Resposta: A**

---

**2.3 — Conteúdo pode ir para múltiplas plataformas ao mesmo tempo?**  
Contexto: existe o campo `plataformas` (array) indicando onde o conteúdo será publicado. As plataformas disponíveis hoje são: Instagram, TikTok, YouTube, Blog.

- \[A\] Sim — um conteúdo pode ser publicado em várias plataformas.  
- \[B\] Não — cada conteúdo é de uma plataforma só.  
- \[C\] Sim, mas cada plataforma tem data de publicação diferente.

**→ Resposta: C, pode ter uma data diferente, e a pessoa pode querer acresentar plataformas.** 

---

**2.4 — Existem plataformas além das 4 atuais (Instagram, TikTok, YouTube, Blog)?**  
Contexto: a lista de plataformas está hardcoded como enum no código. Adicionar uma nova plataforma hoje exige alterar o código.

**→ Quais plataformas devem existir no sistema novo: Existe uma forma de manter a lógica mas permitir que o usuário adicione mais alguma plataforma? Se não, mantenha apenas as 4, considerando blog/site**

---

**2.5 — `tags` em conteúdos: como você usa hoje?**  
Contexto: o campo `tags` é uma string (provavelmente palavras separadas por vírgula ou espaço). Não é possível buscar ou filtrar por tag exata.

- \[A\] Uso bastante e quero poder filtrar conteúdos por tag.  
- \[B\] Uso como anotação livre — não preciso filtrar por tag.  
- \[C\] Não uso / pode ser removido.

**→ Resposta: A**

---

**2.6 — O campo `scriptNotes` (notas sobre o roteiro) deve existir?**  
Contexto: o tipo TypeScript de `Content` tem um campo `scriptNotes` com anotações por seleção de texto no editor de roteiro (similar a comentários do Google Docs). Esse campo existe no código mas não aparece no schema SQL — pode ser uma feature incompleta.

- \[A\] Sim — quero poder fazer anotações específicas em trechos do roteiro.  
- \[B\] Não — o editor de roteiro não precisa de comentários por seleção.  
- \[C\] Não sabia que existia / nunca usei.

**→ Resposta: A**

---

**2.7 — `format` (formato do conteúdo) e `formatoVisual` (formato de produção): são a mesma coisa?**  
Contexto: `format` é um campo string marcado como "legado" no código. `formatoVisual` é um enum com valores `Talking Head | Tela Verde | Voiceover | POV Texto | Reação | Vlog | Misto`. Parecem resolver a mesma questão.

- \[A\] São a mesma coisa — delete `format`, mantém só `formatoVisual`.  
- \[B\] São diferentes — `format` era o tipo editorial (ex: "Review", "Ranking"), `formatoVisual` é a técnica de gravação.  
- \[C\] Não sei distinguir os dois — precisa de exemplos para decidir.

**→ Resposta: A, mas ele nao precisa ser obrigatório.** 

---

**2.8 — O campo `slotType` (`Curto | Série | Janela`) faz sentido para você?**  
Contexto: `slotType` classifica o "encaixe" do conteúdo na grade semanal. Não está clara a diferença intencional entre os três valores na prática.

- \[A\] Sim — uso para organizar a frequência de publicação. Explique cada um abaixo.  
- \[B\] Não uso / não entendo — pode ser removido.

**→ Resposta:** A  
**→ Se A: o que significa cada valor (Curto / Série / Janela)? Na verdade, ele vai ser “UNICO, SÉRIE, JANELA”, onde unico é um conteudo que nao tem relação com outros, série são pra conteudos seriados, e janela pra conteudos que podem surgir como temas em alta ou ideias que não envolvam roteiro, mas que possam ser interessantes mapear.** 

---

## BLOCO 3 — STATUS E PIPELINE

**3.1 — Os 7 status atuais fazem sentido?**  
Contexto: `Ideia → Pronto para Gravar → Gravado → A Editar → Editado → Programado → Postado`

- \[A\] Sim — todos os 7 são necessários.  
- \[B\] Alguns podem ser removidos ou renomeados. Indique abaixo.  
- \[C\] O pipeline precisa ser diferente. Descreva o novo fluxo.

**→ Resposta:** A, porque o conteudo pode ser uma ideia (antes do roteiro), depois eu crio o roteiro com anotações e etc, e ele estárá pronto pra ser gravado, logo depois, ele vai pra parte de prontos pra gravar porque já foi revisado, no momento que ele foi gravado, ele não precisa estar com todos os campos visiveis (em todas as fases), porque eu preciso só controlar se ele já foi editado ou está pra editar, nesse processo, as anotações caso tenham imagens (tem gente que comenta no roteiro com a parte de comentários tipo google docs os links das imagens que vão entrar na edição), depois de editado, os campos de legenda/descrição, tags são importantes porque eles voa ser usados para programar ou postar, e por fim, postrado, que ai se torna um asset pra analisar métricas, mas é interessante manter tudo no banco pra conseguir estudar depois estruturas de roteiro que funcionaram baseado nas métricas.   
**→ Se B ou C, descreva o pipeline ideal:**

---

**3.2 — Alguma transição de status deve ser automática?**  
Exemplos de automação possível: se a data de publicação chegou, mudar para "Programado"; se o conteúdo tem `publishDate` no passado e está "Programado", mudar para "Postado".

- \[A\] Não — prefiro controle manual total.  
- \[B\] Sim — quando a `publishDate` chegar, mudar para "Programado" automaticamente.  
- \[C\] Sim — quando a `publishDate` passar, marcar como "Postado" automaticamente.  
- \[D\] Outro comportamento (descreva):

**→ Resposta: D, se o conteudo estiver marcado como programado, poderá ser mudado para “PUBLICADO”, mas se ele não estiver como PROGRAMADO e sim só como EDITADO, e tiver data prevista para publicação, pode-se gerar um aviso de postagem, para que a pessoa saiba que é aquele o dia da postagem.** 

---

**3.3 — Conteúdos no status "Ideia" devem aparecer separados dos outros (ex: na tela de Ideias) ou junto com todos os conteúdos?**  
Contexto: hoje existe uma tela `/ideas` separada para capturar ideias, E o status "Ideia" também existe em `contents`. A sobreposição cria confusão — uma "ideia" pode estar em dois lugares ao mesmo tempo.

- \[A\] Separados — "Ideia" é uma entidade diferente de "Conteúdo". Ideias viram conteúdos ao serem promovidas.  
- \[B\] Juntos — o primeiro status do conteúdo é "Ideia", não precisa de tela separada.  
- \[C\] Os dois existem para funções diferentes (explique):

**→ Resposta: A, a ideia da página ideias é que seja um hub de anotações e coisas que podem virar roteiros ou outras informações, e que caso seja necessário, ela é promovida a roteiro.** 

---

## BLOCO 4 — PILARES E SÉRIES

**4.1 — Os pilares são criados por você ou são fixos do sistema?**  
Contexto: o banco vem pré-populado com 7 pilares. O sistema permite editar/criar novos.

- \[A\] São completamente editáveis por mim — posso criar, renomear e excluir qualquer pilar.  
- \[B\] São fixos do sistema — não preciso de CRUD de pilares.  
- \[C\] Tenho os 7 que existem e não vou mudar.

**→ Resposta: A, cada usuário deve definir seus próprios pilares.** 

---

**4.2 — Qual é a diferença entre Pilar e Série para você?**  
Contexto: `Pilar` é uma categoria temática (ex: "Análise", "Opinião"). `Série` é um formato recorrente com estrutura própria (ex: "Review Rápido", "Clipe da Semana"). Um conteúdo pode ter um pilar e pertencer a uma série. Mas na prática isso às vezes parece redundante.

**→ Como você distingue os dois no seu fluxo de trabalho: Pilar é a natureza do conteúdo — a categoria estratégica que define *o tipo de entrega* (ex: análise, opinião, humor). Ele organiza o equilíbrio do feed e garante variedade, evitando saturação de um mesmo tipo de conteúdo em sequência.**

**Série é um formato recorrente — um modelo com estrutura e identidade própria que pode se repetir ao longo do tempo (ex: “Review Rápido”, “Clipe da Semana”). Ela define *como* o conteúdo é apresentado e cria reconhecimento no público.**

**No meu fluxo, um conteúdo sempre pertence a um pilar, mas pode ou não fazer parte de uma série.**  
 **A série funciona como um “guarda-chuva de formato”, permitindo inclusive misturar diferentes pilares dentro dela, enquanto o pilar continua sendo o critério principal para balanceamento estratégico do conteúdo.**

---

**4.3 — Uma série pode pertencer a mais de um pilar?**  
Contexto: hoje `series.pilar_id` é um FK único — uma série tem um pilar.

- \[A\] Não — série pertence a um pilar só.  
- \[B\] Sim — uma série pode cruzar pilares.

**→ Resposta: B**

---

**4.4 — Séries têm hashtags próprias ou herdam do pilar?**  
Contexto: `pilares` tem campos de hashtags por plataforma. `series` também tem `hashtagsPorPlataforma` no TypeScript (mas não está no schema SQL — pode ser feature incompleta).

- \[A\] Herdam do pilar — série não precisa de hashtags próprias.  
- \[B\] Série tem suas próprias hashtags, independente do pilar.  
- \[C\] Série tem hashtags adicionais que se somam às do pilar.

**→ Resposta: C**

---

**4.5 — Looks e cenários de gravação continuam existindo no sistema novo?**  
Contexto: existe uma tela `/settings/looks` para cadastrar looks (número, descrição, look do dia) e cenários (fundo, tempo de setup). São usados para planejar dias de gravação.

- \[A\] Sim — uso ativamente para planejar o que gravar em cada look.  
- \[B\] Não — essa feature pode ser descartada no rebuild.  
- \[C\] O conceito sim, mas a implementação atual não funciona como eu quero. Explique:

**→ Resposta: C O conceito faz sentido, mas a implementação atual não resolve meu problema real.**

**Eu gravo vários conteúdos no mesmo dia, porém preciso que eles pareçam distribuídos ao longo do tempo. Para isso, preciso de um sistema que me permita diferenciar visualmente esses conteúdos — principalmente por look e cenário — para evitar repetição perceptível.**

**Hoje, o que eu preciso não é só cadastrar “looks”, mas conseguir usá-los como tags operacionais no planejamento. Por exemplo: agrupar 5 roteiros com “camisa branca”, outros com “camisa azul”, e depois intercalar esses conteúdos na publicação.**

**Ou seja, o valor não está no registro do look em si, mas na capacidade de organizar, visualizar e alternar esses elementos na timeline de conteúdo, garantindo variedade visual e evitando que o público perceba que tudo foi gravado no mesmo dia.**

---

## BLOCO 5 — IDEIAS

**5.1 — O que acontece com uma ideia depois que ela é promovida para conteúdo?**  
Contexto: ao promover uma ideia, o campo `promoted_to_content_id` é preenchido. Não está claro se a ideia deve desaparecer da lista, ficar marcada, ou ser arquivada.

- \[A\] Desaparece automaticamente da lista de ideias.  
- \[B\] Fica na lista marcada como "promovida" (com link para o conteúdo).  
- \[C\] É arquivada automaticamente.  
- \[D\] Nada muda — continua aparecendo normalmente.

**→ Resposta: A**

---

**5.2 — Você usa ideias que NÃO vêm de livros?**  
Contexto: `ideas` tem `livro_origem_id` (opcional). A ideia pode ter origem em um livro ou não.

- \[A\] Sim — a maioria das minhas ideias não vem de livros.  
- \[B\] Sim — mas quero sempre poder rastrear a origem (livro ou outra fonte).  
- \[C\] A maioria das minhas ideias vem de livros.

**→ Resposta: \[A\] Sim — a maioria das minhas ideias não vem de livros.**

**Mas eu quero expandir o conceito de “livro” para uma biblioteca de fontes de repertório. Além de livros, o sistema deve permitir cadastrar também filmes, séries (e potencialmente outros formatos no futuro), todos com a mesma lógica de uso.**

**Essas entidades funcionam como origem de ideias e conteúdos, e seguem um modelo estruturado:**

* **Cada item da biblioteca (livro, filme, série) é uma entidade própria**  
* **Possui uma tela dedicada dividida em:**  
  1. **Info — dados principais (título, autor/diretor, etc.)**  
  2. **Notas — anotações e insights feitos durante o consumo**  
  3. **Conteúdos — conteúdos gerados a partir dessa fonte**

**Além disso:**

* **Ideias e conteúdos podem ser vinculados a um item da biblioteca como origem**  
* **A origem não é obrigatória**  
* **O sistema deve permitir diferentes tipos de fonte, não apenas livros**

**Ou seja, o sistema evolui de “ideias que podem vir de livros” para um ecossistema de repertório, onde qualquer referência consumida pode gerar ideias, anotações e conteúdos conectados.**

---

**5.3 — Ideias precisam ter pilar e série associados?**  
Contexto: hoje esses campos são opcionais em ideias.

- \[A\] Não — captura rápida é mais importante que categorizar.  
- \[B\] Sim — pilar é obrigatório ao criar a ideia.  
- \[C\] Opcional — posso classificar depois.

**→ Resposta: A**

---

## BLOCO 6 — BIBLIOTECA E LIVROS

**6.1 — A biblioteca de livros é essencial para o sistema ou é secundária?**

- \[A\] Essencial — o sistema gira em torno de conteúdo sobre livros.  
- \[B\] Importante mas não central — é um módulo complementar.  
- \[C\] Pode ser simplificada no rebuild.

**→ Resposta: A**

---

**6.2 — Os gêneros de livro são fixos ou você quer poder criar novos?**  
Contexto: hoje os gêneros são um enum fixo: Fantasy, Dark Romance, Ficção Científica, Clássico, Não-ficção, Romance, Thriller, Horror, Outro.

- \[A\] Esses gêneros bastam.  
- \[B\] Quero poder criar gêneros personalizados.  
- \[C\] Preciso de mais gêneros — quais: \_\_\_

**→ Resposta: \[B\] Quero poder criar gêneros personalizados.**

**Os gêneros não devem ser fixos, porque variam muito de acordo com o tipo de conteúdo que estou produzindo e podem evoluir com o tempo. O ideal é permitir criação e edição livre de gêneros, mantendo flexibilidade sem depender de alterações no sistema.**

---

**6.3 — `potencial_conteudo` em livros (escala 1-2-3) e `content_potential` em anotações (boolean): para que você usa cada um?**  
Contexto: são dois campos diferentes em entidades diferentes, mas parecem marcar a mesma coisa ("esse livro/essa anotação tem potencial de virar conteúdo"). Podem estar duplicando informação.

**→ potencial\_conteudo (no livro):**  
 **É uma avaliação macro do livro como um todo — o quanto ele é “rico” em termos de geração de conteúdo. Funciona como priorização de repertório.**

**→ content\_potential (na anotação):**  
 **É uma avaliação micro — indica se aquela anotação específica pode virar conteúdo diretamente.**

**Ou seja:**

* **Livro \= potencial estratégico (vale explorar?)**  
* **Anotação \= potencial tático (isso vira conteúdo agora?)**

---

**6.4 — `destilada` em anotações: o que significa na prática?**  
Contexto: existe um campo `destilada` (boolean) nas anotações. Parece ser diferente de `content_potential`, mas a semântica não está clara no código.

**→ O que significa uma anotação "destilada": Remover.**

**O conceito de “destilada” não precisa existir como um campo separado, pois ele não representa uma ação clara dentro do fluxo. A diferença entre uma anotação bruta e uma refinada pode ser absorvida por outros mecanismos, como:**

* **Tipo de anotação (ex: análise, ideia de conteúdo)**  
* **Marcação de potencial de conteúdo (content\_potential)**  
* **Ou evolução natural da anotação para ideia**

**Manter esse campo adiciona complexidade sem trazer uma utilidade prática clara.**

---

**6.5 — Tipos de anotação atuais: `Trecho | Reação | Análise | Ideia de conteúdo | Pergunta`**  
São suficientes ou faltam tipos?

**→ Faltam tipos? Quais: Sim — adicionar o tipo “Anotação” (genérico).**

**Nem sempre o usuário vai querer classificar a anotação no momento da captura, então precisa existir uma opção neutra e sem fricção.**

**Os tipos existentes (Trecho, Reação, Análise, Ideia de conteúdo, Pergunta) continuam importantes, mas funcionam como uma camada de organização posterior, ajudando o criador a revisar e analisar os insights gerados durante o consumo (livros, filmes, séries).**

**Ou seja:**

* **“Anotação” \= captura livre**  
* **Outros tipos \= organização e leitura estratégica depois**

**→ Algum pode ser removido:**

---

**6.6 — O fluxo livro → anotação → ideia → conteúdo precisa de botões diretos em cada etapa?**  
Contexto: tecnicamente os dados se conectam (via `livro_origem_id`), mas a UI pode não ter botões explícitos para cada passo. Ex: botão "criar ideia a partir desta anotação" dentro do detalhe do livro.

- \[A\] Sim — quero um botão em cada etapa para avançar para a próxima.  
- \[B\] Não — navego manualmente entre as telas.  
- \[C\] Quero o fluxo automático só em alguns pontos (quais):

**→ Resposta: \[A\] Sim — quero um botão em cada etapa para avançar para a próxima.**

**Mas o fluxo não precisa obrigatoriamente passar por “ideia”.**  
 **A partir de uma anotação, deve ser possível ir diretamente para conteúdo/roteiro, caso o insight já esteja claro.**

**Exemplos práticos:**

* **Criar conteúdo/roteiro diretamente de uma anotação**  
* **Criar ideia a partir de uma anotação (quando ainda não está estruturado)**  
* **Criar conteúdo a partir de uma ideia**

**O sistema deve permitir múltiplos caminhos, priorizando velocidade e flexibilidade no processo criativo, sem forçar etapas desnecessárias.**

---

**6.7 — Campanhas de livro: você usa?**  
Contexto: existe uma entidade `campaigns` que agrupa um período de conteúdos em torno de um livro específico (com meta numérica de conteúdos a produzir).

- \[A\] Sim — uso para planejar "vou produzir X conteúdos sobre esse livro em Y meses".  
- \[B\] Não uso / não sabia que existia.  
- \[C\] A ideia faz sentido mas a implementação atual não funciona bem. Explique:

**→ Resposta: Resposta refinada:**

**\[C\] A ideia faz sentido, mas a implementação atual não funciona como eu preciso.**

**O conceito deve evoluir de “campanhas de livro” para projetos.**

**Esses projetos não são exclusivos de livros — podem envolver:**

* **Livros**  
* **Séries**  
* **Filmes**  
* **Marcas (publis)**  
* **Ou qualquer outro tipo de parceria ou iniciativa de conteúdo**

**O principal objetivo é servir como um controle de agenda e execução, especialmente para conteúdos com etapas e prazos.**

**Cada projeto deve:**

* **Agrupar conteúdos relacionados**  
* **Ter um fluxo de fases (etapas)**  
* **Permitir customização dessas fases de acordo com o tipo de projeto**

**Exemplo de fases para um projeto com livro:**

* **Leitura (período planejado)**  
* **Criar roteiro**  
* **Enviar roteiro**  
* **Criar conteúdo**  
* **Enviar conteúdo para aprovação**  
* **Postar**  
* **Enviar métricas**

**Mas esse fluxo não pode ser fixo.**  
 **Cada projeto pode ter etapas diferentes, por exemplo em publis:**

* **Receber produto**  
* **Criar roteiro**  
* **Produzir conteúdo**  
* **Aprovação**  
* **Postagem**

**Ou seja, o sistema precisa permitir:**

* **Criar projetos com fases personalizáveis**  
* **Adaptar o fluxo conforme o escopo**  
* **Usar projetos como unidade de organização estratégica e operacional**

---

**6.8 — Campos de livro que você nunca preenche (podem ser removidos)?**  
Contexto: o livro tem muitos campos opcionais: `editora`, `ano_publicacao`, `isbn`, `idioma`, `traducao`, `serie_colecao`, `quem_indicou`, `motivo_escolha`, `capitulos_cobertos`.

**→ Quais campos você nunca usa: ano publicação, tradução, quem indicou, motivo escolha, capitulos cobetos.** 

---

## BLOCO 7 — PARCERIAS

**7.1 — A tela de Parcerias existe no sistema mas não está no menu de navegação.**  
Contexto: o arquivo `Partnerships.tsx` existe com todas as funcionalidades (pipeline kanban, tabela, calendário de parcerias) mas não tem rota registrada no router. O conteúdo de parcerias aparece no Calendário Editorial, mas a tela dedicada de Parcerias está inacessível.

- \[A\] Parcerias devem ter uma tela dedicada no menu principal.  
- \[B\] Parcerias ficam apenas dentro do Calendário Editorial.  
- \[C\] Parcerias são raras — basta gerenciar pelo modal sem tela própria.

**→ Resposta: \[A\] Parcerias devem ter uma tela dedicada no menu principal.**

**Mas, além disso, o sistema precisa manter um calendário unificado que consolide tudo que envolve o criador.**

**Ou seja:**

* **Parcerias têm sua própria tela (pipeline, gestão, detalhes)**  
* **Mas também aparecem no Calendário Editorial junto com conteúdos e projetos**

**Esse calendário deve permitir:**

* **Visualizar todos os compromissos e publicações em conjunto**  
* **Evitar conflitos (ex: múltiplos posts no mesmo dia)**  
* **Filtrar por tipo (conteúdos, parcerias, projetos), podendo ligar/desligar camadas**

**Na prática:**  
 **👉 Gestão é separada (por módulo)**  
 **👉 Visualização é unificada (calendário único)**

**O calendário funciona como a fonte de verdade da agenda do criador.**

---

**7.2 — O pipeline de status de parcerias está correto?**  
Status atuais: `Leitura → Roteiro → Envio de Roteiro → Gravação → Edição → Aprovação → Postagem → Métricas → Finalizado`

- \[A\] Sim — esse fluxo reflete o que acontece nas minhas parcerias.  
- \[B\] Falta algum passo (qual): \_\_\_  
- \[C\] Algum passo não faz sentido (qual): \_\_\_  
- \[D\] O fluxo inteiro precisa ser repensado. Descreva:

**→ Resposta: \[D\] O fluxo inteiro precisa ser repensado.**

**O pipeline atual é fixo e não reflete a realidade das parcerias, que variam muito de escopo. Assim como nos projetos, cada parceria deve ter etapas personalizáveis.**

**A lógica deve ser:**

* **Cada parceria define seu próprio fluxo**  
* **As etapas funcionam como controle de execução e prazo**  
* **Não existe um único pipeline padrão obrigatório**

**Exemplos:**

**Parceria com aprovação:**

* **Criar roteiro**  
* **Enviar roteiro**  
* **Ajustes**  
* **Produção**  
* **Aprovação**  
* **Postagem**  
* **Métricas**

**Parceria simples:**

* **Receber briefing/produto**  
* **Produzir conteúdo**  
* **Postar**

---

**7.3 — Uma parceria pode ter mais de um conteúdo associado?**  
Contexto: hoje `Partnership.contentId` é um campo único (1-para-1). Mas uma parceria pode exigir produção de múltiplos conteúdos (ex: 3 Reels \+ 1 Stories).

- \[A\] Sim — uma parceria pode ter múltiplos conteúdos vinculados.  
- \[B\] Não — cada parceria gera um único conteúdo.  
- \[C\] Depende — às vezes 1, às vezes vários.

**→ Resposta: \[A\] Sim — uma parceria pode ter múltiplos conteúdos vinculados.**

**Uma parceria pode envolver várias entregas (ex: vídeos, stories, formatos diferentes), então o sistema precisa suportar essa relação de 1 → N.**

---

**7.4 — Você registra o valor financeiro das parcerias?**  
Contexto: o campo `value` (número) existe mas sem campo de moeda.

- \[A\] Sim — quero registrar e ver total de receita.  
- \[B\] Às vezes — só para parcerias maiores.  
- \[C\] Não — campo pode ser removido.

\[A\] Sim — quero registrar e ver total de receita.

O controle financeiro é importante para acompanhar ganhos e ter visão consolidada das parcerias.

→ **Moeda principal:** BRL

---

## BLOCO 8 — RESULTADOS E MÉTRICAS

**8.1 — Quais métricas você realmente preenche após postar um conteúdo?**  
Contexto: o sistema coleta: `views`, `interactions`, `likes`, `comments`, `saves`, `shares`, `newFollowers`, `reposts`, `accountsReached`. São 9 campos por conteúdo.

**Views / Interactions / Likes / Comments / Saves / Shares / New Followers / Reposts / Accounts Reached**

**Uso todas as métricas disponíveis, pois cada uma contribui para a análise de performance do conteúdo.**

**No entanto, o preenchimento não deve ser obrigatório. Cada usuário pode decidir se quer ou não utilizar métricas no seu fluxo.**

---

**8.2 — As métricas variam por plataforma?**  
Contexto: um Reel no Instagram tem alcance, um vídeo no YouTube tem watch time. As métricas relevantes são diferentes por plataforma.

- \[A\] Sim — quero campos de métricas diferentes para cada plataforma.  
- \[B\] Não — uso os mesmos campos para todas as plataformas, mesmo que nem todos se apliquem.  
- \[C\] Prefiro um campo de texto livre para anotar o que quiser.

**\[A\] Sim — quero campos de métricas diferentes para cada plataforma.**

**Cada plataforma tem lógica própria, então o sistema precisa respeitar isso.**  
 **Exemplo:**

* **Instagram → alcance, salvamentos, compartilhamentos**  
* **YouTube → retenção, watch time**  
* **TikTok → taxa de conclusão, etc**

**Mas mantendo:**

* **Um núcleo comum (views, likes, comentários, etc.)**  
* **E campos específicos por plataforma quando necessário**

---

**8.3 — `worth_it` (Valeu a pena?): os valores `Sim / Não / Mais ou menos` são suficientes?**  
Contexto: esse campo aparece no post-mortem de conteúdos.

- \[A\] Sim — esses três valores são o suficiente.  
- \[B\] Prefiro uma escala numérica (ex: 1-5).  
- \[C\] Prefiro outro tipo de avaliação (descreva):

**REmover.**

---

**8.4 — `creative_satisfaction` (Satisfação criativa 1-5) faz sentido para você?**  
Contexto: este campo avalia o quanto você ficou satisfeita com o conteúdo produzido, independente do resultado de métricas.

- \[A\] Sim — importante separar resultado externo (métricas) de satisfação interna.  
- \[B\] Não — pode ser removido.

**→ Resposta: b**

---

## BLOCO 9 — AGENDA E CALENDÁRIO

**9.1 — Você tem dois calendários no sistema: `EditorialCalendar` e `Harvest`. Qual é a diferença para você?**  
Contexto: `EditorialCalendar` (`/editorial`) exibe conteúdos planejados por data de publicação/gravação. `Harvest` é outra tela de calendário que também aparece no código mas não tem rota registrada — está inacessível.

Não vejo necessidade de dois calendários separados. A existência de dois cria confusão e fragmenta a visão do planejamento.

→ **Você usa os dois ou só um deles:**  
 Uso apenas um — e o sistema deve ter **um único calendário central**.

Esse calendário deve consolidar:

* Conteúdos (planejados, gravados, postados)  
* Parcerias  
* Projetos  
* Eventos de agenda

---

**9.2 — Existe também uma tela `ProjectCalendar` (inacessível no menu) focada em parcerias. Você quer isso como tela separada?**  
Contexto: `ProjectCalendar` tem 4 modos de visualização (calendar, timeline, projects, dashboard) para parcerias.

- \[A\] Sim — quero um calendário/painel dedicado para parcerias.  
- \[B\] Não — parcerias ficam no Calendário Editorial junto com o restante.

**→ Resposta: \[B\] Não — parcerias ficam no Calendário Editorial junto com o restante.**

**Parcerias devem aparecer no calendário principal junto com tudo, permitindo visão completa da agenda.**

**A gestão pode ser separada (tela de parcerias/projetos), mas a visualização deve ser unificada.**

---

**9.3 — Eventos de agenda têm horário ou apenas data?**  
Contexto: `agenda_items.date` é um campo de data (sem hora). Reuniões e entregas normalmente têm horário.

- \[A\] Apenas data é suficiente.  
- \[B\] Quero registrar horário também (ex: reunião às 14h).

**→ Resposta: \[B\] Quero registrar horário também (ex: reunião às 14h).**

**Principalmente para:**

* **Reuniões**  
* **Entregas com horário específico**  
* **Compromissos operacionais**

---

**9.4 — No calendário, quais "camadas" você quer ver ativas por padrão?**  
Contexto: o calendário tem toggles para mostrar/ocultar: conteúdos orgânicos, parcerias, gravações, publicações, regras de ouro.

→ **Camadas que devem aparecer por padrão:**

* Conteúdos (publicações)  
* Gravações  
* Parcerias  
* Projetos / entregas

→ **Não incluir no calendário:**

* Regras de ouro

Regras de ouro não são eventos de agenda, e sim critérios de avaliação. Elas devem existir em uma **tela separada de análise e configuração**.

**Como o sistema deve tratar isso:**

Regras de ouro devem ser um módulo próprio, com duas funções principais:

#### **1\. Configuração (definição das regras)**

O usuário pode criar e editar regras como:

* Mesmo tema: máx. X conteúdos por semana  
* Mesma série: máx. X episódios por período  
* Mesmo formato visual: limite por dia  
* Intervalo entre publis  
* Distribuição por pilar  
* Regras por plataforma (hashtags, etc.)

Cada regra precisa ter:

* Tipo (pilar, série, formato, publi, plataforma…)  
* Condição (máx, mín, recomendado)  
* Período (dia, semana, etc.)  
* Parâmetros (valores numéricos)

---

#### **2\. Avaliação (análise automática)**

O sistema cruza:

* Conteúdos postados  
* Conteúdos programados  
* Parcerias

E retorna:

* ✅ Regras respeitadas  
* ⚠️ Alertas  
* ❌ Violações

Exemplo:

* “Você postou 3 conteúdos do mesmo tema essa semana (limite: 2)”  
* “Intervalo entre publis não respeitado”  
* “Pilar X representa 70% da semana (acima do ideal)”

---

#### **3\. Resultado como painel**

Isso não é só um aviso — é uma **leitura estratégica do conteúdo**:

* Score geral da semana  
* Lista de violações  
* Insights acionáveis  
* Sugestões de ajuste

---

**9.5 — A tela `ShootingDays` (Dias de Gravação) existe no código mas está inacessível. Ela serve para agrupar conteúdos para gravar no mesmo dia por looks/cenários. Você usa esse conceito?**

- \[A\] Sim — muito útil para planejar dias de gravação em lote.  
- \[B\] Não uso / não sabia que existia.  
- \[C\] A ideia faz sentido mas quero em um formato diferente (descreva):

**→ Resposta: \[C\] A ideia faz sentido, mas quero em um formato diferente.**

**O conceito deve evoluir de “dias de gravação” para um sistema de blocos de gravação (execution blocks).**

**O usuário não apenas filtra conteúdos — ele pode selecionar e agrupar manualmente conteúdos para formar um bloco de gravação, independente de critérios automáticos.**

**Esse bloco funciona como uma unidade de execução e deve permitir:**

* **Agrupar conteúdos por contexto (look, cenário, formato, etc.) ou manualmente**  
* **Iniciar um modo de gravação focado (burst mode)**  
* **Navegar entre os roteiros sem sair do fluxo**  
* **Visualizar notas e instruções durante a gravação**  
* **Acompanhar progresso (quantos já foram gravados)**  
* **Pausar e retomar o bloco posteriormente**

**O objetivo é transformar a gravação em uma sessão contínua, eficiente e rastreável, reduzindo setups e aumentando produtividade.**

**Ou seja:**

* **Não é uma tela de planejamento**  
* **É uma ferramenta de execução real dentro do sistema**

---

**9.6 — Energy logs (registro de energia 1-5 por dia) continuam existindo?**  
Contexto: aparecem no Dashboard. O usuário marca seu nível de energia e isso fica visível no calendário.

- \[A\] Sim — uso para correlacionar disposição com produtividade.  
- \[B\] Não — pode ser removido.

**→ Resposta: \[C\] O conceito faz sentido, mas precisa ser aplicado de outra forma.**

**Não faz sentido registrar energia por dia como histórico. Em vez disso, a energia deve ser usada como um atributo dos conteúdos/roteiros.**

**Cada conteúdo pode ter um nível de energia necessário para ser executado (ex: baixo, médio, alto).**

**A partir disso, o sistema deve permitir que o usuário:**

* **Informe o nível de energia disponível no momento**  
* **Receba sugestões de conteúdos para gravar com base nisso**

**Essas sugestões devem considerar:**

* **Nível de energia do conteúdo**  
* **Status (ex: prontos para gravar)**  
* **Regras de ouro (evitar violações)**  
* **Planejamento atual (datas e distribuição)**

**Ou seja, o sistema passa a funcionar como um motor de decisão, ajudando o criador a escolher o que produzir naquele momento, sem depender de IA, apenas utilizando os dados já existentes.**

---

## BLOCO 10 — PÁGINAS ÓRFÃS

As páginas abaixo existem no código com funcionalidades completas, mas **não estão registradas no menu nem no router** — são completamente inacessíveis hoje. Decida o destino de cada uma:

**10.1 — `Partnerships` (pipeline de parcerias em kanban/tabela)**

- \[A\] Adicionar ao menu e ao router.  
- \[B\] Mesclar com outra tela existente (qual):  
- \[C\] Descartar — parcerias vivem no calendário.

**→ Resposta:  \[A\] Adicionar ao menu e ao router.**

**Parcerias precisam de gestão própria (pipeline, financeiro, entregas), não só calendário.**

---

**10.2 — `ProjectCalendar` (calendário/painel focado em parcerias)**

- \[A\] Adicionar ao menu e ao router.  
- \[B\] Mesclar com `EditorialCalendar`.  
- \[C\] Descartar.

**→ Resposta:c**

---

**10.3 — `Harvest` (calendário visual de publicações/agenda)**

- \[A\] Adicionar ao menu e ao router.  
- \[B\] Mesclar com `EditorialCalendar`.  
- \[C\] Descartar.

**→ Resposta:c**

---

**10.4 — `ShootingDays` (planejar dias de gravação em bloco)**

- \[A\] Adicionar ao menu e ao router.  
- \[B\] Integrar como aba dentro de `EditorialCalendar` ou `Contents`.  
- \[C\] Descartar.

**→ Resposta:c**

---

**10.5 — `Agenda` (lista de compromissos separada do calendário)**

- \[A\] Adicionar ao menu e ao router.  
- \[B\] Mesclar com `EditorialCalendar`.  
- \[C\] Descartar.

**→ Resposta:b**

---

## BLOCO 11 — NAVEGAÇÃO

**11.1 — Quais são as 5 telas que você usa com mais frequência?**  
Contexto: isso define os itens do menu principal e da barra mobile.

### **Menu principal (sidebar) computador**

1. **Conteúdos**  
2. **Calendário**  
3. **Ideias**  
4. **Projetos** *(inclui parcerias dentro)*  
5. **Biblioteca**  
6. **Gravação** *(Burst Mode / Blocos)*  
7. **Análise** *(Regras de Ouro \+ performance estratégica)*  
8. **Configurações**

## **Bottom bar ideal (mobile)**

1. **Calendário**  
2. **Projetos *(inclui parcerias)***  
3. **➕ Criar (FAB central)**  
4. **Gravação**  
5. **Análise**

---

## **🔥 Botão central (o mais importante)**

**Ao clicar no ➕, abre um menu rápido com:**

* **Nova ideia**  
* **Novo conteúdo / roteiro**  
* **Nova anotação (já com opção de vincular à biblioteca)**

---

**11.2 — O menu lateral (sidebar) no desktop está bom ou você mudaria algo?**

- \[A\] Está bom como está.  
- \[B\] Mudaria a ordem dos itens.  
- \[C\] Adicionaria ou removeria itens (quais):  
- \[D\] Quero um menu diferente (descreva):

**→ Resposta: 11.2 — Sidebar desktop**

**Resposta refinada:**

**\[D\] Quero um menu diferente.**

**Estrutura ideal do menu:**

* **Conteúdos**  
* **Calendário**  
* **Ideias**  
* **Projetos *(inclui parcerias)***  
* **Biblioteca**  
* **Gravação**  
* **Análise**  
* **Configurações**

**A navegação deve refletir o fluxo do criador:**

* **Criar → Conteúdos / Ideias**  
* **Planejar → Calendário / Projetos**  
* **Executar → Gravação**  
* **Melhorar → Análise**

**Evitar redundâncias (ex: parcerias separadas, múltiplos calendários).**

---

**11.3 — No mobile, quais 4-5 telas devem estar na barra de navegação inferior?**  
Contexto: a barra mobile atual tem um subset das telas do desktop. O usuário mobile não tem acesso fácil a Settings, Séries, etc.

**→ Telas que devem estar na barra mobile: Resposta refinada:**

**→ Telas na barra mobile:**

* **Calendário**  
* **Projetos**  
* **➕ Criar (ação central)**  
* **Gravação**  
* **Análise**

**Outras telas (Conteúdos, Biblioteca, Configurações) ficam acessíveis via menu superior.**

**O botão central deve abrir ações rápidas:**

* **Nova ideia**  
* **Novo conteúdo/roteiro**  
* **Nova anotação (vinculada à biblioteca)**

---

**11.4 — O Command Palette (Cmd+K) precisa existir no sistema novo?**  
Contexto: abre uma paleta de comandos para navegar rapidamente pelo teclado.

- \[A\] Sim — uso bastante para navegar.  
- \[B\] Não sei o que é / nunca usei.  
- \[C\] Não precisa.

**→ Resposta: \[A\] Sim — uso bastante para navegar.**

**Especialmente importante em um sistema com múltiplas entidades (conteúdos, projetos, biblioteca, etc.), permitindo acesso rápido sem depender da navegação manual.**

---

## BLOCO 12 — DESIGN E IDENTIDADE VISUAL

**12.1 — A paleta de cores atual representa a identidade do sistema para você?**  
Contexto: cores atuais — backgrounds quase-branco (\#FBFBFA), texto escuro (\#37352F), accents: azul (\#2EAADC), roxo (\#9065B0), rosa (\#D44C47), laranja (\#D9730D), verde (\#448361). Inspiração visual próxima ao Notion.

- \[A\] Sim — gosto das cores, podem continuar.  
- \[B\] Algumas cores mudariam (quais e para quê):  
- \[C\] Quero uma identidade visual diferente (descreva o tom):

**→ Resposta:Resposta refinada:**

**\[B\] Algumas cores mudariam.**

**Manter uma base neutra e limpa, mas:**

* **Reduzir uso excessivo de cores fortes**  
* **Usar cores principalmente como sinalização funcional (status, pilares)**  
* **Evitar saturação visual (ex: fundos muito intensos em excesso)**

---

**12.2 — O tema escuro é essencial?**  
Contexto: existe suporte completo a dark mode com variáveis CSS separadas.

- \[A\] Sim — uso principalmente em dark mode.  
- \[B\] Sim — quero poder alternar entre os dois.  
- \[C\] Não — só o tema claro é necessário.

**→ Resposta: Resposta refinada:**

* **a**

---

**12.3 — Você tem referências visuais de outros apps que representam como quer que o sistema seja?**  
Exemplos: Notion, Linear, Arc, Cron, Craft, Obsidian, Fey, Raycast, etc.

**→ Referências que você gosta (e por quê cada uma): Notion → organização e clareza**  
**Linear → eficiência e velocidade**  
**Raycast → ações rápidas e fluidez**

---

**12.4 — Qual é a "personalidade" visual que você quer para o sistema?**  
Escolha as que mais combinam:

**→ Escolhas marcadas:**

* **Minimal e limpo**  
* **Denso e informacional**  
* **Técnico e preciso**  
* **Leve personalidade (sem exagero visual)**

**→ Observação:**  
 **Interface deve priorizar eficiência e leitura, não estética decorativa.**

---

**12.5 — As fontes atuais (Inter para UI, JetBrains Mono para código) estão boas?**

- \[A\] Sim — não mudaria nada.  
- \[B\] Quero uma fonte diferente para os títulos das páginas.  
- \[C\] Quero uma fonte diferente para o UI geral.  
- \[D\] Quero fontes completamente diferentes (quais):

**→ Resposta: \[B\] Quero uma fonte diferente para os títulos das páginas.**

**A UI pode manter uma fonte neutra, mas títulos podem ter mais identidade.**

---

**12.6 — Os títulos das páginas hoje são em UPPERCASE \+ itálico. Esse estilo representa o sistema?**  
Contexto: o sistema usa muito `uppercase italic tracking-tight font-black` nos títulos principais, criando um estilo editorial/esportivo.

- \[A\] Sim — gosto desse estilo agressivo.  
- \[B\] Parcialmente — gosto do uppercase mas não do itálico.  
- \[C\] Não — prefiro títulos em capitalização normal.  
- \[D\] Quero algo diferente (descreva):

**→ Resposta: \[B\] Parcialmente — gosto do uppercase, mas não do itálico.** 

---

**12.7 — Os cards de conteúdo têm bordas arredondadas (`rounded-2xl` \= 16px). Está certo?**

- \[A\] Sim — esse arredondamento está bom.  
- \[B\] Quero mais arredondado.  
- \[C\] Quero menos arredondado / quase reto.

**→ Resposta: \[C\] Quero menos arredondado / quase reto.** 

---

**12.8 — Os modais/painéis: qual padrão você prefere para cada situação?**  
Contexto: existem 3 padrões de modal hoje: (1) full-screen, (2) painel lateral direito, (3) bottom sheet do celular.

Conteúdo completo → **Full-screen**  
Confirmações → **Inline**  
Ideia rápida → **Bottom sheet (mobile)** / **Inline (desktop)**

---

**12.9 — O status de um conteúdo é representado por cor (badge colorido). Faz sentido para você?**

- \[A\] Sim — a cor me ajuda a identificar o status visualmente.  
- \[B\] Prefiro ícone em vez de cor.  
- \[C\] Prefiro texto sem cor especial.  
- \[D\] Cor \+ ícone juntos.

**→ Resposta:d**

---

**12.10 — Você quer cor associada a cada pilar?**  
Contexto: cada pilar tem uma cor hex que aparece como identificador visual nos conteúdos.

- \[A\] Sim — uso a cor para identificar o pilar rapidamente.  
- \[B\] Não — pode ser só texto/nome.

**→ Resposta:a**

---

## BLOCO 13 — MOBILE

**13.1 — Você usa o sistema mais no celular ou no computador?**

- \[A\] Principalmente celular.  
- \[B\] Principalmente computador.  
- \[C\] Os dois de forma igual.  
- \[D\] Computador para criar, celular para consultar.

**→ Resposta:c**

---

**13.2 — Quais ações você faz com mais frequência no celular?**  
Exemplos: capturar ideia rápida, ver o que gravar hoje, registrar métricas, fazer anotação em livro, verificar calendário.

**→ Ações no celular mais frequentes: Ver o que gravar**  
**Criar ideia rapidamente**  
**Consultar calendário**  
**Acompanhar projetos/parcerias**  
**Iniciar gravação (burst mode)**

---

**13.3 — Existe alguma tela que você tenta usar no celular mas não funciona bem?**

→ **Telas problemáticas no mobile:**

* Edição de roteiros (principal problema)  
* Telas densas que não foram pensadas para mobile  
* Header ocupa muito espaço útil da tela  
* Problemas gerais de responsividade

O sistema atual foi claramente pensado para desktop e apenas adaptado para mobile, o que gera fricção em tarefas importantes.

**Os principais problemas são:**

* **Edição de roteiro**  
  * **Campo muito grande e pouco otimizado para mobile**  
  * **Falta de foco (muitos elementos ao redor)**  
  * **Experiência ruim para escrita longa**  
* **Header**  
  * **Ocupa espaço excessivo**  
  * **Reduz área útil de conteúdo**  
  * **Não se adapta ao contexto da tela**  
* **Responsividade geral**  
  * **Layouts quebram ou ficam apertados**  
  * **Componentes não escalam bem**  
  * **Falta priorização do que é essencial**  
* **Arquitetura de telas**  
  * **Algumas telas foram desenhadas só para desktop**  
  * **No mobile viram versões comprimidas, não adaptadas**

---

**13.4 — No mobile, prefere o conteúdo em lista vertical ou em cards em grade (2 colunas)?**

- \[A\] Lista vertical — mais fácil de ler títulos longos.  
- \[B\] Grade de 2 colunas — vejo mais de uma vez.  
- \[C\] Depende da tela (especifique):

**→ Resposta: \[C\] Depende da tela:**

* **Conteúdos → Grade (2 colunas estilo Keep estruturado) para exploração rápida**  
* **Ideias → Lista vertical (melhor para leitura e captura rápida)**  
* **Biblioteca (livros/filmes/séries) → Grid (visual e exploratório)**  
* **Projetos/Parcerias → Lista (mais estruturado, com etapas)**  
* **Análise → Layout próprio (cards \+ blocos, não lista tradicional)**

**A escolha depende do tipo de interação: exploração → grid, leitura/gestão → lista.**

---

## BLOCO 14 — DNA DA VOZ E REGRAS DE OURO

**14.1 — O DNA da Voz é algo que você configura uma vez e não muda, ou atualiza com frequência?**

- \[A\] Configuro uma vez — é a identidade fixa do canal.  
- \[B\] Atualizo às vezes conforme o canal evolui.  
- \[C\] Quase nunca entro nessa tela.

**→ Resposta: \[B\] Atualizo às vezes conforme o canal evolui.**

**O DNA não é totalmente fixo — ele evolui com o posicionamento do criador, então precisa ser editável, mas não é algo acessado no dia a dia.**

---

**14.2 — As Regras de Ouro são alertas editoriais que o sistema pode usar para validar conteúdos. Você quer que o sistema valide automaticamente os conteúdos contra as regras?**  
Contexto: as 7 regras existem no banco, mas a validação no frontend é parcial — não há alertas em tempo real ao editar um conteúdo.

- \[A\] Sim — quero ver um alerta imediato se um conteúdo viola uma regra.  
- \[B\] Não — regras são referência, não validação automática.  
- \[C\] Quero validação mas apenas como aviso, não bloqueio.

**→ Resposta: \[C\] Quero validação mas apenas como aviso, não bloqueio.**

**O sistema deve:**

* **analisar automaticamente os conteúdos**  
* **cruzar com calendário e histórico**  
* **mostrar alertas de violação em tempo real**

**Mas nunca impedir ações — o controle final é do criador.**

---

## BLOCO 15 — DECISÕES DE RECONSTRUÇÃO

**15.1 — O que absolutamente não pode falhar no sistema novo?**  
Contexto: quais features são inegociáveis — se não funcionarem, o sistema não presta.

**→ Lista de features inegociáveis: 15.1 — Features inegociáveis**

**→ Lista de features inegociáveis:**

* **Criação e gestão de conteúdos (roteiro \+ status) com fluidez**  
* **Sistema de séries como estrutura base (com herança de configuração e templates)**  
* **Calendário unificado (conteúdos \+ projetos/parcerias \+ gravações)**  
* **Organização e promoção de ideias para conteúdo**  
* **Biblioteca (livros, filmes, séries) com vínculo direto com conteúdos**  
* **Sistema de templates estruturais de publicação por plataforma**  
* **Agrupamento de conteúdos para gravação em lote (modo de gravação / blocos)**  
* **Sistema de regras de ouro com análise automática baseada no calendário**  
* **Filtros eficientes (pilar, série, status, plataforma)**  
* **Performance e usabilidade no mobile (especialmente para criação e consulta)**

---

**15.2 — O que pode ser jogado fora sem dó?**  
Contexto: quais features existem hoje que nunca foram usadas ou que não fazem falta.

**→ Features que podem ser descartadas: Resposta:**

* **Harvest (duplicação de calendário)**  
* **ProjectCalendar separado**  
* **ShootingDays como tela isolada (vira parte da gravação)**  
* **Energy logs por dia (substituído por energia por conteúdo \+ sugestão)**  
* **Campos bibliográficos pouco usados (isbn, editora, etc.)**

---

**15.3 — Existe alguma feature que você queria mas o sistema nunca teve?**

**→ Features que faltam:**

* **Sistema de templates estruturais por plataforma (com blocos reutilizáveis)**  
* **Engine de montagem automática de descrição/legenda baseada em dados do conteúdo**  
* **Sistema de sugestões baseado em energia disponível (sem IA, baseado em dados internos)**  
* **Agrupamento flexível de conteúdos em blocos de gravação (com controle de progresso)**  
* **Sistema de análise de consistência com regras de ouro (visual e quantitativo)**  
* **Templates e estruturas reutilizáveis dentro de séries**  
* **Vínculo expandido de origem (livros, filmes, séries) com conteúdos**  
* **Sistema de projetos (substituindo campanhas), com etapas customizáveis**

---

**15.4 — O sistema atual tem alguma tela ou fluxo que você acha visualmente feio ou confuso?**

**→ Partes do sistema que você não gosta: Interface pensada para desktop e adaptada para mobile (não nativa mobile)**

**→ Partes do sistema que você não gosta:**

* **Edição de roteiros no mobile (problemas de responsividade e usabilidade)**  
* **Headers muito grandes que consomem espaço útil da tela**  
* **Telas que não foram pensadas para mobile e exigem adaptação**  
* **Falta de hierarquia clara em algumas telas (excesso de campos visíveis ao mesmo tempo)**  
* **Navegação inconsistente entre módulos**  
* 

---

**15.5 — Qual é o prazo ideal para ter o sistema novo funcionando?**

**→ Prazo:**

---

**15.6 — Você tem prints/screenshots de telas que você acha bonitas (de qualquer app) e quer usar como referência de design?**

**→ Onde estão / como compartilhar:**

---

*Fim do questionário — total de 65 perguntas*

automações: 

## **1\. SUGESTÃO DE “O QUE GRAVAR HOJE”**

Baseado em:

* energia disponível (usuário escolhe)  
* conteúdos:  
  * com status “pronto para gravar”  
  * compatíveis com energia  
  * sem dependência bloqueada

👉 resultado:  
 “Você pode gravar 3 conteúdos hoje”

## **3\. ALERTA DE INCONSISTÊNCIA**

Ex:

* muitos conteúdos do mesmo pilar na semana  
* muitas publis seguidas  
* série repetida

👉 baseado nas regras de ouro

## **4\. SUGESTÃO DE MIX**

Sistema olha:

* últimos conteúdos postados  
* distribuição de pilares

👉 e sugere:

“Você precisa de conteúdo de Humor ou Opinião”

## **PRÉ-PREENCHIMENTO INTELIGENTE**

Quando cria conteúdo:

* já sugere:  
  * hashtags (pilar \+ série)

## **7\. SCORE AUTOMÁTICO (ANÁLISE)**

Sistema calcula:

* % de equilíbrio de pilares  
* frequência de publicação  
* consistência

## **RECOMENDAÇÃO DE AÇÃO (SEM IA)**

Baseado em regras simples:

* se energia baixa → sugerir conteúdos leves  
* se agenda vazia → sugerir gravação  
* se muitos editados → sugerir postar

## **Entidade nova: `Templates`**

Cada template tem:

* nome  
* plataforma (YouTube, Instagram, etc.)  
* estrutura (JSON de blocos)  
* ativo/inativo  
* user\_id

# **4\. COMO FUNCIONA NA PRÁTICA**

## **Quando criar conteúdo:**

1. Usuário escolhe plataforma → YouTube  
2. Sistema carrega template  
3. Renderiza os blocos:  
* campos editáveis  
* blocos fixos já preenchidos

# **. COMO ISSO CONECTA COM O RESTO**

Esse sistema conversa com:

* Biblioteca → puxa livros automaticamente  
* Pilares → hashtags  
* Séries → hashtags \+ identidade  
* Conteúdo → dados dinâmicos

👉 vira um ecossistema

Você pode ter:

* múltiplos templates por plataforma  
  * YouTube longo  
  * YouTube short  
* templates por série  
* templates por tipo de conteúdo

