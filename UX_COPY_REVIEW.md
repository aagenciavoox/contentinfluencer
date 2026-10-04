# Revisão de UX copy — textos e botões (Criaki)

**Data:** 2026-10-03
**Escopo:** cerca de 2.200 textos visíveis em `src/` (desktop e mobile): rótulos, botões, placeholders, `aria-label`, avisos, estados vazios e confirmações.
**Referências:** `PRODUCT_VOICE.md` (voz e glossário), `src/lib/uiCopy.ts` (textos compartilhados), `BUTTON_SYSTEM.md`.

A base é boa. `uiCopy.ts` já tem confirmações que dizem a ação e a consequência ("Excluir pilar" / "Manter pilar"), e os erros seguem o padrão "Não foi possível X. Verifique sua conexão e tente novamente." Os problemas estão nas telas que não usam esses textos compartilhados.

---

## Resumo por prioridade

| # | Prioridade | Problema | Volume |
|---|---|---|---|
| 1 | P1 | Textos sem acento ("Gravacao", "Serie", "Nao foi possivel") | 139 textos em 37 arquivos |
| 2 | P1 | Página pública de campanha assinada como **"Gerado por Content OS"** | 1 |
| 3 | P1 | Painel "Talvez util neste dia" mostra texto fixo e barra de 72% fixa (dado de exemplo) | 1 |
| 4 | P1 | Concordância quebrada: "Esse série ja foi concluido", "Ideias deste série" | 3 |
| 5 | P2 | O mesmo item tem 4 nomes: roteiro / conteúdo / criação / vídeo | ~40 |
| 6 | P2 | A mesma ação tem 2 ou 3 rótulos diferentes | ~12 ações |
| 7 | P2 | Tom fora da voz: "Carga Excessiva" (vermelho piscando), "Pendente", "gap", "faltam" | ~10 |
| 8 | P2 | Textos que descrevem a implementação ("modal", "composer", "camada mobile") | ~12 |
| 9 | P2 | Botões genéricos ("Novo", "Criar", "Adicionar", "Confirmar", "Tentar", "Play") | ~12 |
| 10 | P2 | Erros que não dizem o que fazer, ou que falam em "Supabase" | ~7 |
| 11 | P3 | Inglês misturado, inclusive no mesmo campo ("Janela" vs "Slot") | ~20 |
| 12 | P3 | Iniciais maiúsculas soltas ("Novo Evento", "Detalhes Técnicos") | ~25 |
| 13 | P3 | Atalhos de teclado no celular ("CMD", "Ctrl K") | 3 |

---

## Regras propostas (para incluir no `PRODUCT_VOICE.md`)

### R1. Um nome para cada coisa

| Termo | Quando usar | Não usar para |
|---|---|---|
| **Ideia** | Antes de virar roteiro | — |
| **Roteiro** | Item editorial depois da ideia, em qualquer etapa (escrita, gravação, publicação) | — |
| **Criação** | Só o nome da área (Ideias + Roteiros) | Um item ("Mover esta criação para a lixeira") |
| **Vídeo** | Só o que já foi publicado ("Vídeo postado", "Registrar vídeo postado") | Item na fila, no bloco ou na grade |
| **Conteúdo** | Só no sentido abstrato ("Potencial de conteúdo", "pode render conteúdo") | Item ("Novo conteúdo", "Conteúdos vinculados") |
| **Anotação** | Nota de obra da biblioteca | — (evitar "nota" para a mesma coisa) |
| **Notas** | Painel lateral do roteiro | — |

### R2. Uma etiqueta para cada ação

| Ação | Rótulo único | Hoje também aparece como |
|---|---|---|
| Ideia → roteiro | **Transformar em roteiro** | "Promover para roteiro", "Virar roteiro" |
| Obra ou anotação → ideia | **Transformar em ideia** | "Virar ideia", "→ Virar Ideia" |
| Obra ou anotação → roteiro | **Criar roteiro** | "Criar conteudo", "→ Virar Conteúdo", "→ Conteúdo", "Novo Conteúdo" |
| Marcar gravação | **Marcar como gravado** | "Marcar gravado", "Gravado" (botão no modo gravação mobile) |
| Abrir teleprompter | **Iniciar modo gravação** | "Abrir modo gravacao" |
| Pôr roteiro num bloco | **Adicionar ao bloco** | "Guardar em um bloco", "Salvar no bloco de gravação" |
| Busca | **Buscar** | "Procurar" (sidebar e menu mobile) |
| Recuperável | **Mover para a lixeira** | — (já está certo) |
| Apagar de vez | **Excluir** / **Excluir definitivamente** | "Remover o projeto" (`window.confirm`) |
| Tirar algo de um lugar sem apagar | **Remover de…** ("Remover do bloco", "Remover da seleção") | — |
| Nova anotação | **Nova anotação** | "Nova nota" (na mesma tela que "Nova anotação") |

### R3. Botões: verbo + objeto
Escreva sempre verbo e objeto ("Criar template", não "Criar"). Só use o verbo sozinho quando o objeto está no título do mesmo formulário e não há outro botão primário por perto.

### R4. Letra maiúscula só no início
No código, só a primeira letra é maiúscula ("Novo evento", "Detalhes técnicos"). Se o design pedir caixa alta, use `uppercase` no CSS. Ajuste também o `BUTTON_SYSTEM.md`, que ainda lista "Novo Roteiro" e "Novo Look".

### R5. Explique o que a pessoa ganha, não a tela
Uma descrição deve dizer o que a pessoa ganha, não como a tela foi construída. "No mesmo modal, sem etapa intermediária" é nota de desenvolvimento.

---

## P1 — Corrigir já

### 1. Acentos
Lista completa no **Apêndice A**. Os arquivos com mais casos:

| Arquivo | Casos |
|---|---|
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx` | 12 |
| `src/features/library/pages/LibraryPage.tsx` | 11 |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx` | 11 |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx` | 8 |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx` | 7 |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx` | 6 |
| `src/features/projects/pages/ProjectDetailPage.tsx` | 6 |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx` | 6 |
| `src/features/settings/pages/SettingsPage.tsx` | 4 (inclui a seção "Experiencia gentil") |

`src/constants.ts` também tem `'Reacao'` em `VISUAL_FORMATS`. Não troque esse valor direto: ele pode estar salvo no banco. Mude só o texto exibido, ou faça uma migração.

### 2. Marca antiga na página pública
`src/features/projects/pages/CampanhaPublicaPage.tsx:466`
- Antes: `Gerado por Content OS · {data}`
- Depois: `Gerado com Criaki · {data}`

Essa página é enviada para marcas, então é o lugar onde mais pesa.

### 3. Dado de exemplo visível
`src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1096-1101`: o painel "Talvez util neste dia" mostra sempre "Roteiro e um bloco separados para quando fizer sentido" e uma barra de progresso fixa em `w-[72%]`.
→ Ligue o painel a um dado real (por exemplo, a recomendação de `recommendDailyAction`) ou esconda até existir. Texto sugerido quando houver dado: **"Talvez útil neste dia"** + `{nº} roteiros prontos para gravar`.

### 4. Concordância com o tipo da obra
`itemTypeLabel` pode ser "Série" (feminino), o que gera frases como "Esse série ja foi concluido".

| Local | Antes | Depois (não depende do gênero) |
|---|---|---|
| `src/features/library/pages/BookDetailPage.tsx:1098` | Esse {tipo} ja foi concluido e ainda pode render conteudo quando fizer sentido. | Concluído. Ainda pode render conteúdo quando fizer sentido. |
| `src/mobile/screens/library/BookDetailMobileScreen.tsx:376` | Este {tipo} foi concluído e ainda pode render conteúdo. | Concluído. Ainda pode render conteúdo quando fizer sentido. |
| `src/features/library/pages/BookDetailPage.tsx:1220` | Ideias deste {tipo} ({n}) | Ideias a partir desta obra ({n}) |
| `src/features/library/pages/BookDetailPage.tsx:1304` | Nenhum conteúdo criado a partir deste {tipo} ainda | Nenhum roteiro criado a partir desta obra ainda |

Esse aviso usa ícone de alerta laranja, mas é só informação. Um ícone neutro combina mais com a voz do produto.

---

## P2 — Consistência e voz

### 5. Nome do item (aplicando R1)

| Local | Antes | Depois |
|---|---|---|
| `src/features/dashboard/pages/DashboardPage.tsx:108` | Novo Conteudo | Novo roteiro |
| `src/features/library/pages/BookDetailPage.tsx:1124` · `src/mobile/screens/library/BookDetailMobileScreen.tsx:413,472` | Novo Conteúdo / Novo conteúdo | Criar roteiro |
| `src/features/library/pages/BookDetailPage.tsx:659,1434` | → Virar Conteúdo | Criar roteiro |
| `src/features/library/pages/BookDetailPage.tsx:665,1441` | → Virar Ideia | Transformar em ideia |
| `src/features/library/pages/BookDetailPage.tsx:1233` | → Conteúdo | Criar roteiro |
| `src/features/library/components/AnnotationNoteCard.tsx:68-69` | Criar conteudo | Criar roteiro |
| `src/features/library/pages/BookDetailPage.tsx:1131` | ⭐ Você tem {n} destaque prontos para virar conteúdo. | {n} destaques podem virar roteiro. |
| `src/features/projects/pages/ProjectDetailPage.tsx:385` | Conteudos vinculados | Roteiros vinculados |
| `src/features/projects/pages/ProjectDetailPage.tsx:393` · `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:130` | Criar conteudo | Criar roteiro |
| `src/features/projects/pages/ProjectDetailPage.tsx:410` | Escolha um conteudo para vincular... | Escolha um roteiro para vincular… |
| `src/features/projects/pages/ProjectDetailPage.tsx:422` · mobile `:233` | Nenhum conteudo vinculado | Nenhum roteiro vinculado |
| `src/features/contents/components/detail/ContentDetailShell.tsx:725,798` | Mover esta criação para a lixeira — {título}? | Mover este roteiro para a lixeira — {título}? Você pode restaurá-lo depois. |
| `src/features/contents/pages/ContentDetailPage.tsx:32` | Carregando conteúdo... | Carregando roteiro… |
| `src/features/contents/pages/ContentDetailPage.tsx:156` | Não foi possível abrir este conteúdo | Não foi possível abrir este roteiro |
| `src/features/programacao/pages/ProgramacaoPage.tsx:624,946` | Detalhe do conteúdo | Detalhes do roteiro |
| `src/features/programacao/pages/ProgramacaoPage.tsx:630,952,1341` | Abrir conteúdo completo | Abrir roteiro |
| `src/features/programacao/pages/ProgramacaoPage.tsx:1826` · mobile `:269` | Escolher vídeo pronto | Escolher roteiro pronto |
| `src/features/programacao/pages/ProgramacaoPage.tsx:1449` · mobile `:208` | Nada por aqui. Roteiros e conteúdos em produção sem data aparecem aqui. | Roteiros prontos e sem data aparecem aqui. Ideias ficam nos dias da grade. |
| `src/mobile/screens/programacao/ProgramacaoMobileScreen.tsx:193` | {n} vídeos na fila | {n} roteiros na fila |
| `src/features/captions/pages/CaptionsPage.tsx:110` | Nenhum vídeo para legendar | Nenhum roteiro para legendar |
| `src/features/contents/components/burst-mode/BurstModeExperience.tsx:782,790,1002-1003` | Próximo vídeo / Vídeo anterior | Próximo roteiro / Roteiro anterior (a mesma tela diz "Roteiro atual") |
| `src/features/contents/components/modals/CSVUploadModal.tsx:143` | Adicione múltiplos conteúdos de uma vez | Adicione vários roteiros de uma vez |
| `src/features/contents/components/modals/CSVUploadModal.tsx:160` | roteiros foram adicionados ao seu inventário. | roteiros adicionados à Criação. |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:132,148,162` · `src/mobile/screens/recording/RecordingMobileScreen.tsx:230` | Conteudo sem titulo | Roteiro sem título |
| `src/components/overlays/CommandPalette.tsx:125` | Busque por conteúdo, ideias, parcerias... | Busque roteiros, ideias e projetos… |

### 6. Ação com vários nomes (aplicando R2)

| Local | Antes | Depois |
|---|---|---|
| `src/features/creation/lib/creationItemActions.ts:58` | Virar roteiro | Transformar em roteiro |
| `src/features/ideas/components/IdeaInboxCard.tsx:125` · `src/features/programacao/pages/ProgramacaoPage.tsx:468,1331` · `src/lib/uiCopy.ts:81` | Promover para roteiro | Transformar em roteiro |
| `src/features/library/components/LibraryItemCard.tsx:176` | Virar ideia | Transformar em ideia |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:93` | Marcar gravado | Marcar como gravado |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:584` | Gravado | Marcar como gravado |
| `src/mobile/components/SendToRecordingSheet.tsx:182` | Abrir modo gravacao | Iniciar modo gravação |
| `src/mobile/components/SendToRecordingSheet.tsx:150` | Guardar em um bloco | Adicionar ao bloco |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:110` · `src/features/contents/lib/contentPipeline.ts:335` | Salvar no bloco de gravação | Adicionar ao bloco |
| `src/layouts/navigation/Sidebar.tsx:395,399,411` · `src/mobile/components/MobileSidebarDrawer.tsx:124` | Procurar | Buscar |
| `src/features/library/pages/BookDetailPage.tsx:1031` · `BookNotesModal.tsx:138` · `BookAnnotationComposerSheet.tsx:112` | Nova nota | Nova anotação |
| `src/features/projects/pages/ProjectDetailPage.tsx:143` | `window.confirm("Remover o projeto X?")` | Usar `CONFIRM.excluirProjeto` com `ConfirmModal`. O texto já existe e o botão já diz "Excluir projeto". |
| `src/features/library/pages/BookDetailPage.tsx:1010` | Remover item | Remover da biblioteca (igual ao mobile e ao `CONFIRM.excluirBiblioteca`) |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:572` | Slot | Janela (o mesmo campo, na linha 366, já se chama "Janela") |
| `src/features/programacao/pages/ProgramacaoPage.tsx:809,1891` · mobile `:452,478` | Registrar postado | Registrar vídeo postado (igual ao menu "Vídeo postado" do calendário) |

### 7. Tom (`PRODUCT_VOICE.md`)

| Local | Antes | Depois | Motivo |
|---|---|---|---|
| `src/features/editorial-calendar/components/CalendarGrid.tsx:295-298` | "Carga Excessiva" (vermelho, piscando) + "Cuidado, carga excessiva para sua energia atual" | **Dia cheio** · tooltip: "Muita coisa para a energia deste dia. Dá para mover algo, se fizer sentido." Usar cor neutra ou âmbar, sem `animate-pulse`. | É um alarme, e a voz pede opções calmas |
| `src/features/settings/pages/SettingsPage.tsx:349` | Pendente | Em aberto | Proibido como rótulo no glossário |
| `src/features/recommendations/recommendDailyAction.ts:87` | "{pilar}" precisa de mais {n} no ciclo. | Cabem mais {n} posts de "{pilar}" neste ciclo. | "Precisa" é uma cobrança |
| `src/features/recommendations/recommendDailyAction.ts:104` | "{pilar}" tem gap de {n}, mas nada gravado pronto. … vale gravar primeiro. | "{pilar}" tem espaço para mais {n}, mas nada gravado ainda. "{série}" tem {m} roteiros, que podem ser um bom começo. | "gap" é jargão; a frase vira uma sugestão |
| `src/utils/pilarRhythm.ts:149` | {pilar}: {x}/{y} posts esta semana — faltam {n}. | {pilar}: {x} de {y} posts nesta semana. | Tirar o tom de falta |
| `src/utils/pilarRhythm.ts:229` | …faltam {n} posts e só há {m} roteiros prontos — precisa de mais {k} roteiros. | {rótulo}: cabem mais {n} posts e há {m} roteiros prontos. Mais {k} cobririam o ciclo. | Igual |
| `src/utils/pilarRhythm.ts:474` | Falta roteiro em 1 frente / Faltam roteiros em {n} frentes | 1 frente com espaço para roteiros / {n} frentes com espaço para roteiros | Igual |
| `src/features/settings/components/PilarEditForm.tsx:575` | Gap do ciclo: | Espaço no ciclo: | Jargão |
| `src/features/contents/components/burst-mode/BurstModeExperience.tsx:526-532` | "Parabéns!" + "Você finalizou ou pausou a sessão deste bloco." + "Todos os roteiros… foram marcados como gravados." | Ao concluir: **"Bloco gravado"** + "Todos os roteiros foram marcados como gravados." Ao pausar: **"Sessão pausada"** + "O bloco continua de onde você parou." | O texto atual dá parabéns por uma pausa e afirma "todos gravados" quando não é verdade |
| `src/features/settings/components/PilarEditForm.tsx:780` · `SerieEditForm.tsx:615` | Não se esqueça de salvar suas alterações. | *(remover; o título "Alterações não salvas" já diz isso)* | Repetido e soa como bronca |
| `src/features/contents/components/detail/ContentScriptWorkspace.tsx:104` | Abra o seu coracao e escreva o roteiro... | Escreva o roteiro… (igual a `RoteiroSection.tsx:313`) | Duas versões para o mesmo campo |
| `src/features/contents/components/modals/CSVUploadModal.tsx:158` | Importação Concluída! | {n} roteiros importados | Comemoração um pouco acima do tom |

### 8. Textos que descrevem a implementação (R5)

| Local | Antes | Depois |
|---|---|---|
| `src/features/settings/pages/TemplatesSettingsPage.tsx:338` | Edite contexto e estrutura no mesmo modal, sem etapa intermediária de visualização. | Defina onde o template vale e monte os blocos do roteiro. |
| `src/features/settings/pages/TemplatesSettingsPage.tsx:590` | Clique em qualquer bloco da coluna lateral para abrir a edição direta neste modal. | Escolha um bloco à esquerda para editar. |
| `src/mobile/screens/settings/TemplatesMobileScreen.tsx:139` | Defina o tipo como uma tag, sem separar o catálogo por abas. | Escolha se é um template de roteiro, legenda ou outro. |
| `src/mobile/screens/settings/TemplatesMobileScreen.tsx:73` | Um catálogo único com tags de tipo, série e plataforma. | Estruturas prontas para começar roteiros e legendas. |
| `src/features/library/pages/BookDetailPage.tsx:1033` | Abra um composer rapido para registrar uma anotação sem misturar com a lista existente. | Registre um trecho, uma reação ou uma ideia. |
| `src/features/library/pages/LibraryPage.tsx:495` | Cadastro rapido para consulta e captura no mobile. | Só o essencial. Os detalhes podem vir depois. |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:96` | Datas, valor e contexto em cards leves para consulta rapida. | Datas combinadas, valores e contexto de cada projeto. |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:140` | Ajuste a busca ou abra um novo projeto para alimentar essa camada mobile. | Ajuste a busca ou crie um projeto. |
| `src/mobile/screens/settings/SettingsMobileScreen.tsx:59` | Ajustes do sistema organizados para leitura e ação rápida no mobile. | *(remover, ou)* Ritmo, escrita e áreas do app. |
| `src/mobile/screens/settings/ProfileMobileScreen.tsx:73` | Atualize nome, e-mail de acesso e senha sem sair do fluxo mobile. | Nome, e-mail de acesso e senha. |
| `src/mobile/screens/settings/PlatformsMobileScreen.tsx:66` | Adicione o primeiro canal para começar a estruturar a operação. | Adicione a primeira rede onde você publica. |
| `src/features/editorial-calendar/components/CalendarTimelineView.tsx:77` | Eixo cronológico por dia, com raias por tipo de operação. | Gravações, publicações e eventos lado a lado, dia a dia. |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:870` | Lista cronológica de operações planejadas. | Tudo o que está marcado, em ordem de data. |
| `src/features/contents/components/filters/PipelineStatusPills.tsx:59` | Filtros salvos em breve | *(esconder o botão até a função existir)* |

### 9. Botões genéricos (R3)

| Local | Antes | Depois |
|---|---|---|
| `src/features/settings/pages/TemplatesSettingsPage.tsx:804` | Novo | Novo template |
| `src/features/settings/pages/TemplatesSettingsPage.tsx:691` · `TemplatesMobileScreen.tsx:186` | Criar | Criar template |
| `src/mobile/screens/settings/PlatformsMobileScreen.tsx:176` | Criar | Adicionar plataforma |
| `src/features/settings/pages/PlatformsSettingsPage.tsx:157` | Adicionar | Nova plataforma (o mobile já usa "Adicionar plataforma") |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:395,508` | Novo | Novo evento |
| `src/features/contents/components/desktop/ContentGrid.tsx:179` | Novo | Novo roteiro |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1060` | + Adicionar | Adicionar evento |
| `src/features/programacao/pages/ProgramacaoPage.tsx:616,987` | Agendar mesmo assim / **Cancelar** | Agendar mesmo assim / **Escolher outro dia** |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:244` | Tentar | Tentar novamente |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:578` | Play / Pausar | Iniciar / Pausar |
| `src/features/library/pages/BookDetailPage.tsx:671,1448` | Pular → | Pular |
| `src/features/library/pages/BookDetailPage.tsx:1139` · mobile `:431` | Brainstormar → | Gerar ideias |
| `src/features/library/pages/BookDetailPage.tsx:1154` | + Nova Produção | Nova produção editorial |

### 10. Erros

| Local | Antes | Depois |
|---|---|---|
| `src/features/library/components/CoverUploadField.tsx:87` · `LibraryItemCard.tsx:89` · `LibraryMobileScreen.tsx:121` | Nao foi possivel enviar a capa. | Não foi possível enviar a capa. Use JPG, PNG, WEBP ou GIF de até 5 MB e tente novamente. |
| `src/features/settings/components/PostingTimesEditor.tsx:161` | Os horários não foram salvos | Não foi possível salvar os horários. Verifique sua conexão e tente novamente. |
| `src/components/editors/RichTextEditor.tsx:485` | Erro ao salvar (status do editor) | Não salvo. Verifique a conexão |
| `src/features/auth/pages/LoginPage.tsx:262` | Serviço de autenticação indisponível. | Não foi possível conectar agora. Tente novamente em alguns minutos. |
| `src/lib/uiCopy.ts` `ERRORS.supabaseDesconectado` · `ProfileSettingsPage.tsx:255` · `ProfileMobileScreen.tsx:78` | Conecte o Supabase para… | Sem conexão com o servidor. Recarregue a página para alterar dados da conta. |
| `src/features/settings/pages/PlatformsSettingsPage.tsx:46` | Faça login para salvar plataformas. | Entre na conta para salvar plataformas. (mesmo verbo de "Entre na conta para enviar a capa.") |
| `src/features/projects/pages/CampanhaPublicaPage.tsx:150` | O link pode ter expirado ou ser inválido. | O link pode ter expirado. Peça um novo a quem compartilhou. |

---

## P3 — Acabamento

### 11. Inglês misturado

| Local | Antes | Depois |
|---|---|---|
| `src/layouts/navigation/navConfig.ts:47` | Home | Hoje (igual à sidebar e ao título da tela) |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:466` · `AgendaMobileScreen.tsx:343` | Timeline | Linha do tempo (o título da própria view já é esse) |
| `src/features/projects/pages/CampanhaPublicaPage.tsx:378-381,425-430` | Views · Likes · Saves · Shares | Visualizações · Curtidas · Salvamentos · Compartilhamentos (a mesma página já usa esses termos nas linhas 355-361) |
| `src/features/contents/components/desktop/PipelineProgressLegend.tsx:6,8` | Thumbnail · Analytics | Capa · Resultados |
| `src/features/settings/pages/TemplatesSettingsPage.tsx:535` | Label | Nome do bloco |
| `src/features/settings/pages/LooksSettingsPage.tsx:231,269` | Setup (min) · min de setup | Montagem (min) · min de montagem |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:607` | Presets | Ajustes rápidos |
| `src/features/contents/components/burst-mode/BurstModeExperience.tsx:994` | Fade das linhas acima e abaixo | Esmaecer linhas acima e abaixo |
| `src/features/contents/components/burst-mode/BurstModeExperience.tsx:813` | wpm | ppm (palavras por minuto) |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:532,601` | Modo Explosao | Modo gravação (o glossário pede esse nome) |
| `src/features/programacao/pages/ProgramacaoPage.tsx:1334` · mobile `:249,543` | Ver preview | Pré-visualizar |
| `src/features/contents/components/detail/PlatformCopyEditor.tsx:334` | Copy para {rede} | Legenda para {rede} |
| `src/layouts/navigation/Sidebar.tsx:361-376` | Expandir/Recolher sidebar | Expandir/Recolher menu |
| `src/lib/uiCopy.ts:70,80` | …volta ao inbox / Ela sai do inbox | …volta para Ideias / Ela sai de Ideias (o estado vazio usa "caixa de entrada") |
| `src/lib/uiCopy.ts:48` | Excluir template? … não usarão este modelo. | …não usarão este template. (um termo só por frase) |

"Template", "look", "hashtag" e "publi" fazem parte do vocabulário de criadores, então podem ficar. O que vale é usar sempre o mesmo termo.

### 12. Iniciais maiúsculas (R4)
Passar para minúscula depois da primeira palavra:
"Novo Evento" (`EditorialCalendarPage.tsx:1598`), "Novo Look", "Novo Cenário", "Cenário Associado" (`LooksSettingsPage.tsx`), "Importar Roteiros", "Instruções do Arquivo", "Exemplo de Conteúdo" (`CSVUploadModal.tsx`), "Detalhes Técnicos", "Ano de Publicação", "Quem Indicou", "Por que Escolheu", "Potencial de Conteúdo", "Notas Gerais", "Produção Editorial", "Voltar à Biblioteca" (`BookDetailPage.tsx`), "Carga Excessiva" (`CalendarGrid.tsx`), "Ver Gravações / Postagens / Publicidades / Compromissos Externos" (`CalendarLayerToggle.tsx`), "Pronto para Gravar", "A Editar" (`PipelineProgressLegend.tsx`), "Relatório de Campanha" (`CampanhaPublicaPage.tsx:188`), "Perfil e Segurança" (`SettingsPage.tsx:67`).

### 13. Atalhos de teclado no celular
- `src/mobile/components/MobileHeaderIOS.tsx:87`: "CMD" → remover (celular não tem Cmd)
- `src/mobile/components/MobileSidebarDrawer.tsx:126`: "Ctrl K" → remover
- `src/components/overlays/CommandPalette.tsx:183-185`: dicas de teclado → mostrar só com `pointer: fine`

### 14. Pontuação e tipografia
- Reticências: o código usa "Salvando…" e "Salvando..." misturados. Escolha **…** (um caractere só).
- Ordenação: "Título A–Z" (travessão curto) e "Título A-Z" (hífen). Escolha **A–Z**.
- Exemplos: a norma em PT-BR é **"Ex.:"**, e o app usa "Ex:".
- "Repost" (`ProgramacaoPage.tsx:1607`) vs. "Repostada" (`PostedVideoComposerSheet.tsx:305`) → **Repostagem**.

---

## Notas de localização (para quando for traduzir)
- **Gênero gramatical:** frases que juntam artigo e `{tipo}` quebram em PT-BR e em qualquer idioma com gênero. Prefira frases que não dependem do gênero (veja o item 4).
- **Plural montado com ternário:** `uiCopy.ts:64-72` monta "Ele/Eles poderão ser restaurado/s" com vários ternários. Funciona em PT-BR, mas não traduz. Tenha duas strings completas (singular e plural) ou use `Intl.PluralRules`.
- **Frases partidas no JSX:** "Esse | {tipo} | ja foi concluido…", "⭐ Você tem | {n} | destaque | prontos…". O tradutor não vê a frase inteira. Monte a frase numa string com interpolação.
- **Expansão:** textos em inglês ficam cerca de 15% mais curtos e em alemão até 35% mais longos. Botões de 40px com texto fixo (`BUTTON_SYSTEM.md`) precisam aceitar quebra ou reticências.
- **Centralizar:** hoje só cerca de 60 dos 2.200 textos estão em `uiCopy.ts`. Comece movendo para lá os rótulos de ação da R2. Assim a próxima tela já nasce com os nomes certos.

---

## Apêndice A — Acentos (139 textos)

| Local | Antes | Depois |
|---|---|---|
| `src/App.tsx:33` | Backend obrigatorio | Backend obrigatório |
| `src/App.tsx:35` | Este app nao opera mais em modo offline. Preencha o arquivo | Este app não opera mais em modo offline. Preencha o arquivo |
| `src/components/charts/HorizontalBarChart.tsx:16` | Sem dados no periodo | Sem dados no período |
| `src/components/ui/TagSelect.tsx:239` | Fechar opcoes | Fechar opções |
| `src/components/ui/TagSelect.tsx:239` | Abrir opcoes | Abrir opções |
| `src/components/ui/TagSelect.tsx:276` | Nenhuma opcao disponivel | Nenhuma opção disponível |
| `src/features/contents/components/detail/ContentDetailTabs.tsx:30` | Etapas do conteudo | Etapas do conteúdo |
| `src/features/contents/components/detail/ContentHistoryPanel.tsx:19` | Historico | Histórico |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:333` | Serie | Série |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:398` | Gravacao | Gravação |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:405` | Publicacao | Publicação |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:432` | Observacoes editoriais, referencias, links... | Observações editoriais, referências, links... |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:463` | Serie | Série |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:480` | Gravacao | Gravação |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:503` | Observacoes editoriais | Observações editoriais |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:638` | Observacoes editoriais, referencias, links... | Observações editoriais, referências, links... |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:655` | Titulo do conteudo | Título do conteúdo |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:683` | Vinculos | Vínculos |
| `src/features/contents/components/detail/ContentOperationalPanel.tsx:685` | Central da serie | Central da série |
| `src/features/contents/components/detail/ContentScriptWorkspace.tsx:104` | Abra o seu coracao e escreva o roteiro... | Abra o seu coração e escreva o roteiro... |
| `src/features/contents/components/detail/ContentScriptWorkspace.tsx:134` | Referencias | Referências |
| `src/features/contents/components/detail/ContentScriptWorkspace.tsx:143` | Links, observacoes e contexto do roteiro | Links, observações e contexto do roteiro |
| `src/features/contents/components/detail/PlatformCopyEditor.tsx:303` | Cadastre uma plataforma em Configuracoes → Plataformas. | Cadastre uma plataforma em Configurações → Plataformas. |
| `src/features/contents/components/detail/sections/HistorySection.tsx:86` | Historico | Histórico |
| `src/features/contents/components/detail/sections/PublishingSection.tsx:163` | Assets e observacoes | Assets e observações |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:67` | % concluido | % concluído |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:85` | Iniciar modo gravacao | Iniciar modo gravação |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:101` | Guarde este conteudo em um bloco para montar a sessao de gravacao. | Guarde este conteúdo em um bloco para montar a sessão de gravação. |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:118` | Ir para Gravacao | Ir para Gravação |
| `src/features/contents/components/detail/sections/RecordingSection.tsx:130` | Ver blocos de gravacao | Ver blocos de gravação |
| `src/features/contents/components/modals/CSVUploadModal.tsx:58` | Para importar, inclua as colunas "titulo" e "roteiro". O modelo abaixo pode ajudar. | Para importar, inclua as colunas "título" e "roteiro". O modelo abaixo pode ajudar. |
| `src/features/contents/components/modals/CSVUploadModal.tsx:172` | Use um arquivo **CSV** (Comma Separated Values). A primeira linha funciona como cabecalho das colunas. | Use um arquivo **CSV** (Comma Separated Values). A primeira linha funciona como cabeçalho das colunas. |
| `src/features/contents/components/modals/CSVUploadModal.tsx:177` | Necessario para importar | Necessário para importar |
| `src/features/contents/components/modals/CSVUploadModal.tsx:181` | Necessario para importar | Necessário para importar |
| `src/features/contents/lib/contentPipeline.ts:251` | Data futura guardada. No calendario, este conteudo aparece como Programado. | Data futura guardada. No calendário, este conteúdo aparece como Programado. |
| `src/features/contents/lib/contentPipeline.ts:261` | Essa data ja ficou para tras. O conteudo continua aqui para retomar, reagendar ou marcar como Postado. | Essa data já ficou para trás. O conteúdo continua aqui para retomar, reagendar ou marcar como Postado. |
| `src/features/contents/lib/contentPipeline.ts:329` | Preparar publicacao com calma | Preparar publicação com calma |
| `src/features/contents/lib/contentPipeline.ts:341` | Abrir bloco de gravacao | Abrir bloco de gravação |
| `src/features/contents/lib/contentPipeline.ts:347` | Conteudo publicado | Conteúdo publicado |
| `src/features/dashboard/lib/dashboardMetrics.ts:44` | (sem titulo) | (sem título) |
| `src/features/dashboard/lib/dashboardMetrics.ts:53` | (sem titulo) | (sem título) |
| `src/features/dashboard/pages/DashboardPage.tsx:108` | Novo Conteudo | Novo Conteúdo |
| `src/features/editorial-calendar/components/filters/EditorialAgendaFilters.tsx:15` | Gravacoes | Gravações |
| `src/features/editorial-calendar/components/MonthlyCalendarView.tsx:90` | (sem titulo) | (sem título) |
| `src/features/editorial-calendar/components/MonthlyCalendarView.tsx:113` | (sem titulo) | (sem título) |
| `src/features/editorial-calendar/components/MonthlyCalendarView.tsx:128` | (sem titulo) | (sem título) |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1064` | Nenhuma operacao planejada para este dia. | Nenhuma operação planejada para este dia. |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1096` | Talvez util neste dia | Talvez útil neste dia |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1122` | Gravacoes | Gravações |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1337` | Titulo | Título |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1606` | Titulo do evento | Título do evento |
| `src/features/editorial-calendar/pages/EditorialCalendarPage.tsx:1613` | Ex: reuniao, entrega, live... | Ex: reunião, entrega, live... |
| `src/features/library/components/AnnotationNoteCard.tsx:68` | Criar conteudo | Criar conteúdo |
| `src/features/library/components/CoverUploadField.tsx:87` | Nao foi possivel enviar a capa. | Não foi possível enviar a capa. |
| `src/features/library/components/CoverUploadField.tsx:169` | JPG, PNG, WEBP ou GIF · ate 5 MB · compactamos automaticamente | JPG, PNG, WEBP ou GIF · até 5 MB · compactamos automaticamente |
| `src/features/library/components/LibraryItemCard.tsx:89` | Nao foi possivel enviar a capa. | Não foi possível enviar a capa. |
| `src/features/library/pages/BookDetailPage.tsx:809` | Generos | Gêneros |
| `src/features/library/pages/BookDetailPage.tsx:810` | Selecione um ou mais generos para categorizar este item. | Selecione um ou mais gêneros para categorizar este item. |
| `src/features/library/pages/BookDetailPage.tsx:814` | Selecione generos | Selecione gêneros |
| `src/features/library/pages/BookDetailPage.tsx:1033` | Abra um composer rapido para registrar uma anotação sem misturar com a lista existente. | Abra um composer rápido para registrar uma anotação sem misturar com a lista existente. |
| `src/features/library/pages/BookDetailPage.tsx:1098` | ja foi concluido e ainda pode render conteudo quando fizer sentido. | já foi concluído e ainda pode render conteúdo quando fizer sentido. |
| `src/features/library/pages/LibraryPage.tsx:495` | Cadastro rapido para consulta e captura no mobile. | Cadastro rápido para consulta e captura no mobile. |
| `src/features/library/pages/LibraryPage.tsx:567` | Generos | Gêneros |
| `src/features/library/pages/LibraryPage.tsx:568` | Selecione um ou mais generos para categorizar este item. | Selecione um ou mais gêneros para categorizar este item. |
| `src/features/library/pages/LibraryPage.tsx:573` | Selecione ou digite generos | Selecione ou digite gêneros |
| `src/features/library/pages/LibraryPage.tsx:578` | Organize o acervo com tags proprias. | Organize o acervo com tags próprias. |
| `src/features/library/pages/LibraryPage.tsx:582` | Ex: comfort read, favorito de infancia | Ex: comfort read, favorito de infância |
| `src/features/library/pages/LibraryPage.tsx:812` | Generos | Gêneros |
| `src/features/library/pages/LibraryPage.tsx:813` | Selecione um ou mais generos para categorizar este item. | Selecione um ou mais gêneros para categorizar este item. |
| `src/features/library/pages/LibraryPage.tsx:818` | Digite e selecione generos | Digite e selecione gêneros |
| `src/features/library/pages/LibraryPage.tsx:822` | Organize o acervo com tags proprias. | Organize o acervo com tags próprias. |
| `src/features/library/pages/LibraryPage.tsx:826` | Ex: comfort read, favorito de infancia... | Ex: comfort read, favorito de infância... |
| `src/features/projects/pages/ProjectDetailPage.tsx:99` | Projeto nao encontrado | Projeto não encontrado |
| `src/features/projects/pages/ProjectDetailPage.tsx:354` | Crie reunioes, entregas e publicacoes. Tudo aparece no calendario. | Crie reuniões, entregas e publicações. Tudo aparece no calendário. |
| `src/features/projects/pages/ProjectDetailPage.tsx:385` | Conteudos vinculados | Conteúdos vinculados |
| `src/features/projects/pages/ProjectDetailPage.tsx:393` | Criar conteudo | Criar conteúdo |
| `src/features/projects/pages/ProjectDetailPage.tsx:410` | Escolha um conteudo para vincular... | Escolha um conteúdo para vincular... |
| `src/features/projects/pages/ProjectDetailPage.tsx:422` | Nenhum conteudo vinculado | Nenhum conteúdo vinculado |
| `src/features/recording/components/desktop/RecordingQueueGrid.tsx:94` | Limpar selecao ( | Limpar seleção ( |
| `src/features/recording/components/desktop/RecordingQueueGrid.tsx:132` | Remover da selecao | Remover da seleção |
| `src/features/recording/components/desktop/RecordingQueueGrid.tsx:151` | Abrir detalhe do conteudo | Abrir detalhe do conteúdo |
| `src/features/recording/components/desktop/RecordingQueueTab.tsx:170` | Videos | Vídeos |
| `src/features/recording/components/desktop/RecordingSelectionBar.tsx:84` | Fechar formulario | Fechar formulário |
| `src/features/recording/components/desktop/RecordingSelectionBar.tsx:122` | Marcadores de gravacao | Marcadores de gravação |
| `src/features/recording/components/desktop/RecordingSelectionBar.tsx:123` | Opcional — look, cenario ou props. | Opcional — look, cenário ou props. |
| `src/features/recording/components/RecordingBlockEditor.tsx:125` | Ex: Sessao da tarde | Ex: Sessão da tarde |
| `src/features/recording/components/RecordingBlockEditor.tsx:157` | Marcadores de gravacao | Marcadores de gravação |
| `src/features/recording/components/RecordingBlockEditor.tsx:158` | Organize look, cenario ou props deste bloco. | Organize look, cenário ou props deste bloco. |
| `src/features/recording/components/RecordingBlockEditor.tsx:173` | Reordene, remova ou adicione conteudos prontos sem bloco. | Reordene, remova ou adicione conteúdos prontos sem bloco. |
| `src/features/recording/components/RecordingBlockEditor.tsx:254` | Nenhum conteudo sem bloco disponivel no momento. | Nenhum conteúdo sem bloco disponível no momento. |
| `src/features/settings/pages/SettingsPage.tsx:67` | Perfil e Seguranca | Perfil e Segurança |
| `src/features/settings/pages/SettingsPage.tsx:137` | Experiencia gentil | Experiência gentil |
| `src/features/settings/pages/SettingsPage.tsx:153` | Sugestoes calmas | Sugestões calmas |
| `src/features/settings/pages/SettingsPage.tsx:161` | Numeros no dashboard | Números no dashboard |
| `src/mobile/components/MobileActionMenu.tsx:138` | Nova anotacao | Nova anotação |
| `src/mobile/components/MobileActionMenu.tsx:163` | Acoes rapidas | Ações rápidas |
| `src/mobile/components/MobileActionMenu.tsx:208` | Anotacao em | Anotação em |
| `src/mobile/components/MobileActionMenu.tsx:211` | Anotacao em | Anotação em |
| `src/mobile/components/SendToRecordingSheet.tsx:182` | Abrir modo gravacao | Abrir modo gravação |
| `src/mobile/components/SendToRecordingSheet.tsx:190` | Ver bloco de gravacao | Ver bloco de gravação |
| `src/mobile/components/SendToRecordingSheet.tsx:239` | Nenhum bloco disponivel sem este conteudo. | Nenhum bloco disponível sem este conteúdo. |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:132` | Conteudo sem titulo | Conteúdo sem título |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:148` | Conteudo sem titulo | Conteúdo sem título |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:162` | Conteudo sem titulo | Conteúdo sem título |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:360` | Mes anterior | Mês anterior |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:371` | Proximo mes | Próximo mês |
| `src/mobile/screens/agenda/AgendaMobileScreen.tsx:610` | Nenhum evento nos proximos 60 dias com as camadas ativas. | Nenhum evento nos próximos 60 dias com as camadas ativas. |
| `src/mobile/screens/library/LibraryMobileScreen.tsx:121` | Nao foi possivel enviar a capa. | Não foi possível enviar a capa. |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:130` | Criar conteudo | Criar conteúdo |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:188` | Conteudos | Conteúdos |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:199` | Adicione reunioes, entregas e publicacoes. Tudo vai aparecer no calendario. | Adicione reuniões, entregas e publicações. Tudo vai aparecer no calendário. |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:233` | Nenhum conteudo vinculado | Nenhum conteúdo vinculado |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:234` | Vincule ideias ja existentes ou crie novos conteudos para este projeto. | Vincule ideias já existentes ou crie novos conteúdos para este projeto. |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:243` | (sem titulo) | (sem título) |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:249` | Publicacao: | Publicação: |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:254` | Gravacao: | Gravação: |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:356` | Titulo do evento | Título do evento |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:369` | Horario | Horário |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:400` | Vincular conteudo | Vincular conteúdo |
| `src/mobile/screens/projects/ProjectDetailMobileScreen.tsx:407` | Escolha um conteudo... | Escolha um conteúdo... |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:96` | Datas, valor e contexto em cards leves para consulta rapida. | Datas, valor e contexto em cards leves para consulta rápida. |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:156` | Sem observacoes adicionais | Sem observações adicionais |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:205` | Producao | Produção |
| `src/mobile/screens/projects/ProjectsMobileScreen.tsx:220` | Ordenacao | Ordenação |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:472` | Abrir configuracoes | Abrir configurações |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:532` | Fechar modo explosao | Fechar modo explosão |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:591` | Proximo | Próximo |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:601` | Modo Explosao | Modo Explosão |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:609` | Tripe | Tripé |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:610` | Mao | Mão |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:617` | Espacamento | Espaçamento |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx:637` | Ambar | Âmbar |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:194` | Buscar roteiro, pilar ou serie | Buscar roteiro, pilar ou série |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:230` | Conteudo sem titulo | Conteúdo sem título |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:266` | Abrir detalhe do conteudo | Abrir detalhe do conteúdo |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:341` | Marcadores de gravacao | Marcadores de gravação |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:451` | videos | vídeos |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:490` | Serie | Série |
| `src/mobile/screens/recording/RecordingMobileScreen.tsx:524` | Ordenacao | Ordenação |
