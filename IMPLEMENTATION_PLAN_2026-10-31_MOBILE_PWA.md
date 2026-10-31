# Plano de correção e implementação — celular e PWA (Criaki)

**Data:** 2026-10-31
**Origem:**
- Leitura do código do PWA (`vite.config.ts`, `index.html`, `src/lib/pwaRegister.ts`, `appUpdate*.ts`, `unsavedChanges.ts`) e do shell móvel (`src/mobile`).
- Medição com o app rodando em 390×844, com emulação de celular, em 14 telas.
- Seção 9 do guia `C:\Users\mente\Downloads\DESIGN (1).md` (PWA no iPhone: áreas seguras, teclado, suspensão, offline).

**Complementa:** [`IMPLEMENTATION_PLAN_2026-10-31_DESIGN_SYSTEM.md`](IMPLEMENTATION_PLAN_2026-10-31_DESIGN_SYSTEM.md). Cores, tokens, altura de controle e tipografia ficam lá; aqui fica o que é só do celular e do app instalado.

**Limite da medição:** a emulação no navegador não tem teclado virtual, áreas seguras (os recortes valem 0), app instalado nem Safari de verdade. O que depende disso foi lido no código e precisa ser conferido no iPhone (Fase 0).

---

## Status de execução

Nada iniciado. Nenhum arquivo de código foi alterado na análise.

---

## Como o PWA funciona hoje

| Assunto | Comportamento atual | Onde |
|---|---|---|
| Instalação | Pode ser instalado. `display: standalone`, ícones (com versão *maskable*), ícone da Apple, nome Criaki | `vite.config.ts` (`VitePWA.manifest`), `index.html` |
| O que fica guardado no aparelho | Todo JS, CSS, ícone e fonte (*precache*). O **HTML não** é guardado, de propósito, para não prender uma versão velha do app | `workbox.globPatterns`, `navigateFallback: null` |
| Dados | Sempre da rede: o Supabase é `NetworkOnly` no service worker. Em paralelo, as listas (roteiros, biblioteca, gravação…) ficam no `localStorage` por até 24h para a tela abrir rápido e se atualizam depois de 5 min | `runtimeCaching`, `src/lib/persistentDataCache.ts` |
| Abrir sem internet | **Não abre.** Sem o HTML guardado e sem página de reserva, o app instalado mostra o erro do sistema, mesmo com o JS e as listas no aparelho | — |
| Atualização | Duas checagens: o service worker (a cada hora, ao voltar para o app, ao ganhar foco e ao voltar a internet) e `version.json` (para o Safari, que quase nunca checa sozinho). Sem rascunho pendente, **recarrega na hora**. Com rascunho, mostra "Nova versão disponível · Atualizar", salva tudo e então troca | `pwaRegister.ts`, `appVersion.ts`, `appUpdateDecision.ts` |
| Quem conta como "rascunho pendente" | Só três telas: roteiro (`ContentDetailShell`), item da Biblioteca (`BookDetailPage`) e edição de série (`SerieEditForm`). Pilar, Perfil, Legendas, projetos e formulários em painel não contam | `setUnsavedChanges` |
| Salvamento do roteiro | Salva no servidor 0,9s depois que a pessoa para de digitar. Ao sair do app (`visibilitychange`, `pagehide`), tenta enviar o que falta. **Não existe cópia do texto no aparelho** | `ContentDetailShell.tsx:130, 586, 638` |
| Teclado | Um hook (`useVisualViewportKeyboard`) considera o teclado aberto quando a área visível encolhe mais de 80px. Só o editor de roteiro usa: a barra de formatação sobe acima do teclado | `src/hooks/useVisualViewportKeyboard.ts` |
| Áreas seguras | Topo no cabeçalho, base na barra inferior, nos painéis e nos avisos. As laterais não têm proteção (só importam em paisagem, e a orientação está travada em retrato) | `MobileHeaderIOS`, `.mobile-bottom-nav`, `OverlayRoot` |
| Barra de status do iPhone | `black-translucent`: o app desenha por baixo da barra do sistema, e o iOS desenha relógio e bateria em branco. **No tema claro, provavelmente ficam ilegíveis** (conferir no aparelho) | `index.html` |
| Orientação | Travada em retrato (`portrait-primary`). O guia pede para não travar | manifest |
| Atalhos do ícone (Android) | Agenda, Roteiros, Ideias, Gravação. Dois apontam para rotas antigas (`/conteudos`, `/ideias`) que só redirecionam. Textos sem acento ("Gravacao") | manifest `shortcuts` |
| Rolagem | O app inteiro fica numa coluna de `100dvh`, e só o `<main>` rola. Puxar para baixo atualiza (*pull-to-refresh* próprio) | `MobileAppShell.tsx` |

### O que já está bom
- A tag de viewport está certa (`viewport-fit=cover`, sem bloquear zoom).
- Em todas as 14 telas medidas, todo campo tem pelo menos 16px (o iPhone não dá zoom ao tocar).
- Nenhuma tela tem rolagem lateral nem caixa com rolagem dentro de outra.
- No roteiro, a barra inferior some enquanto se escreve, e a barra de formatação acompanha o teclado.
- Atualização nunca recarrega por cima de um roteiro com alteração pendente.

---

## Medição no celular (390×844, 31/10)

| Tela | Alvos de toque menores que 44px | O que são |
|---|---|---|
| `/criacao` | **24 de 87** | caixa "Selecionar" de cada card, 20×20, colada na área que abre o card |
| `/analises` | **29 de 41** | linhas de 39px, ícones de 24×24, links de 20px de altura |
| `/editorial/pilares/nova` | **11 de 33** | botões de 36px, campo de 27px |
| `/criacao/legendas` | 5 de 29 | botões de 32×44, 34px e 19px de altura |
| `/planejamento` | 5 de 53 | botões de 32px |
| `/hoje` | 3 de 19 | 40px e 22px de altura |
| `/biblioteca` | 2 de 51 | botões de 40px |
| `/conteudos/:id` (roteiro) | 3 de 11 | 33px e 36px; o título fica numa linha só e é cortado (sem `h1` na tela) |
| `/gravacao`, `/calendario`, `/editorial`, `/series`, `/configuracoes/perfil`, `/projetos` | 0 | — |

Em todas as telas:
- título da página com 18px (o guia pede 22; decisão D3 do plano de design system);
- cabeçalho de 57px (Hoje não tem cabeçalho);
- barra inferior de 64px (some no roteiro);
- rótulos da barra com 11px (padrão do iOS; pode ficar).

---

## Menu do celular hoje (medido em 390px, 31/10)

No celular convivem **dois menus**:

1. **Barra inferior:** Hoje · Criação · [Criar] · Biblioteca · Gravação.
2. **Menu lateral**, aberto pelo botão ☰ do cabeçalho. É o menu do desktop dentro de uma gaveta de 280px:
   - 13 itens em duas seções ("Criação", "Produção"), mais Configurações e o perfil no fim;
   - 4 itens repetem a barra inferior (Hoje, Criação, Biblioteca, Gravação);
   - a lista tem 978px numa tela de 844px, então Configurações e o perfil só aparecem rolando;
   - não se anuncia como diálogo (`role="dialog"`, `aria-modal`), contra a regra 10 do DESIGN.md.

**Onde o menu aparece**

| Telas | Cabeçalho, à esquerda | Barra inferior | Chega em Planejamento, Calendário, Editorial, Séries, Análises, Projetos, Contas e Configurações? |
|---|---|---|---|
| Criação, Biblioteca, Gravação, Planejamento, Calendário, Editorial, Séries, Análises, Projetos, Contas, Configurações | ☰ (Abrir menu) | sim | sim, pelo ☰ |
| Hoje | sem cabeçalho; o menu é o círculo com a inicial "A", que não parece menu | sim | só pelo "A" |
| Legendas, Transcrição, Biblioteca › Análise, Perfil, Novo pilar, roteiro na aba Gestão, detalhes de série, livro, projeto e bloco | **Voltar** (o ☰ some) | sim | **não**: só voltando antes ou pela busca |
| Roteiro na aba Roteiro (escrita) | Voltar | não (modo foco, de propósito) | não |

Por que acontece: o cabeçalho tem um botão só à esquerda, que é ☰ **ou** Voltar (`AppShell.tsx`, `onLeftAction`). Toda tela com `mode: 'back'` em `mobileRouteMeta.ts` perde o acesso ao menu, e a barra inferior não tem o "Mais" que o substituiria.

**A decisão de 30/10** (Criação · Biblioteca · [Criar] · Gravação · Mais, com Hoje, Calendário e Planejamento dentro de Mais) **ainda não foi aplicada.**

---

## Decisões pendentes

| # | Decisão | Opções | Recomendação | Trava |
|---|---|---|---|---|
| M1 | Até onde vai o offline | (a) o app abre sem internet, mostra as listas guardadas só para leitura e avisa que editar precisa de conexão · (b) a, mais o teleprompter preparado offline (seção 9.7 do guia) · (c) nada, só uma tela "Sem conexão" decente | (a) agora; (b) como fase separada (Fase 6), porque é recurso novo | Fases 2 e 6 |
| M2 | Cópia do texto do roteiro no aparelho | sim · não | Sim. Hoje, se o iPhone fechar o app suspenso com texto ainda não enviado, esse texto se perde | Fase 1 |
| M3 | Orientação | liberar paisagem · manter retrato | Liberar: gravar vídeo horizontal com o teleprompter é um uso real. Exige as áreas seguras laterais (3.4) | 3.4, 4.1 |
| M4 | Barra de status | manter `black-translucent` · trocar por `default` | Conferir no aparelho primeiro (Fase 0). Se relógio e bateria somem no tema claro, `default` é a troca mais simples | 4.2 |
| M5 | iPhones suportados | modelo e versão do iOS que você usa, e a versão mínima | Testar no seu iPhone e registrar a versão; a mínima fica sendo a anterior à atual | Fase 0 |
| M6 | Formato do "Mais" | (a) página própria `/mais`, como a aba "Mais" dos apps do iPhone · (b) painel que sobe de baixo | (a). Tem endereço próprio, o Voltar funciona, rola como qualquer tela e não briga com teclado nem com outras camadas | 5.2 |
| M7 | O que fica no "Mais" e em que ordem | grupos propostos em 5.2 · outra ordem | Os grupos de 5.2, gerados da mesma lista do menu do desktop | 5.2 |

---

## Coordenação com o trabalho em andamento

Livres em 31/10: `MobileAppShell`, `MobileHeaderIOS`, `MobileBottomNav`, `BottomSheet`, `AppShell`, `ContentDetailShell`, `ContentDetailMobileScreen`, `useVisualViewportKeyboard`, `pwaRegister`, `appUpdate*`, os dois avisos (`AppUpdateToast`, `SaveFeedbackToast`), `vite.config.ts` e `index.html`.

Mexa nestes arquivos só **depois** do commit da outra sessão:

| Arquivo | Itens |
|---|---|
| `src/layouts/navigation/navConfig.ts` · `src/mobile/config/mobileRouteMeta.ts` (a outra sessão está trocando nomes como "Séries e quadros" e títulos de série) | 5.1, 5.3, 5.5 |
| `src/components/editors/RichTextEditor.tsx` | 3.1 |
| `src/features/analises/pages/AnalisesPage.tsx` · `captions/pages/CaptionsPage.tsx` · `settings/components/PilarEditForm.tsx` | 1.5, 5.6 |
| `src/mobile/screens/recording/BurstModeMobileScreen.tsx` | 6.x |

---

## Ordem e tamanho

| Fase | Tema | Gravidade | Tamanho | Depende de |
|---|---|---|---|---|
| 0 | Conferir no iPhone (o que a emulação não mostra) | 🔴 | S | M5 |
| 1 | Não perder texto: cópia no aparelho e atualização segura | 🔴 | M | M2 |
| 2 | Abrir sem internet | 🔴 | M | M1 |
| 3 | Teclado, áreas seguras e camadas | 🟡 | M | 0; M3 para 3.4 |
| 4 | Manifest e instalação | 🟢 | S | M3, M4 |
| 5 | Menu do celular (barra com Mais, fim do menu lateral) e toque | 🔴 | M | M6, M7; arquivos em andamento |
| 6 | Teleprompter offline (opcional) | 🟢 | L | M1 = b |

---

## Fase 0 — Conferir no iPhone

### Problema
Teclado, áreas seguras, barra de status, app instalado e suspensão só aparecem no aparelho. Sem isso, as fases 3 e 4 corrigem às cegas.

### Mudanças
**0.1 Roteiro de teste** (fica em `docs/MOBILE_PWA_CHECKLIST.md`). Você faz no seu iPhone, Safari e app instalado, em retrato. Paisagem só depois de M3.

| Cenário | O que olhar |
|---|---|
| Abrir pelo ícone | relógio e bateria legíveis no tema claro e no escuro; cabeçalho abaixo da barra do sistema |
| Rolar uma lista até o fim | último item acima da barra inferior; barra acima do indicador de início |
| Roteiro: abrir e fechar o teclado 5 vezes | cursor visível, barra de formatação acima do teclado, sem faixa vazia ao fechar |
| Novo pilar e Perfil: tocar no último campo | campo, mensagem de erro e botão Salvar alcançáveis com o teclado aberto |
| Um painel com formulário (ex.: Novo evento) | o painel não fica escondido atrás do teclado |
| Escrever no roteiro, trocar de app por 1 min e voltar | texto intacto, "Salvo" correto |
| Escrever, ligar o modo avião, escrever mais, fechar o app pelo seletor, desligar o modo avião e abrir | **o que aconteceu com o texto** (hoje se espera perda; é a linha de base da Fase 1) |
| Modo avião e abrir pelo ícone | o que aparece (hoje se espera o erro do sistema) |
| Aviso de atualização com o roteiro aberto | nada recarrega sozinho |

**0.2** Anotar modelo, versão do iOS e resultado de cada linha no próprio checklist. Isso responde M4 e M5.

### Aceite
Checklist preenchido com fotos dos problemas encontrados.

---

## Fase 1 — Não perder texto (M2)

### Problema
O roteiro salva só no servidor. Ao sair do app, tenta enviar o que falta, mas o iOS pode congelar o app antes do envio terminar, e o guia pede para não depender disso (9.7). Além disso, a atualização recarrega na hora quando nenhum dos três editores registrados tem pendência: um pilar, um perfil ou uma legenda pela metade se perde se o app voltar do segundo plano bem quando sai uma versão nova.

### Mudanças
**1.1 Cópia de recuperação no aparelho** (novo `src/lib/localDraft.ts`)
- Gravar no IndexedDB, com chave `conta + id do roteiro`, o corpo e o rascunho de apoio a cada alteração (agrupando em 300ms), com o `updated_at` do servidor em que a edição começou.
- Gravar também no `visibilitychange` (quando o app fica oculto) e no `pagehide`. Não depender só do envio pela rede.
- Apagar a cópia quando o servidor confirmar **aquela** versão.
- Tratar erro de gravação: se falhar, não dizer "Salvo neste aparelho".

**1.2 Recuperar ao abrir** (`ContentDetailShell.tsx`)
- Se existe cópia local mais nova que o servidor: aviso no topo do roteiro com "Recuperar o texto deste aparelho" e "Descartar".
- Um refetch nunca substitui texto local pendente.
- Sessão expirada: entrar de novo sem perder a cópia.

**1.3 Estados de salvamento com os textos do guia** (9.7)
"Sincronizando…" · "Salvo na conta." · "Salvo neste aparelho. Aguardando envio para sua conta." · "Sem conexão. Seu texto está salvo neste aparelho." · "Seu texto está salvo neste aparelho, mas não foi possível sincronizar." (com "Tentar novamente") · "Não foi possível salvar suas últimas alterações. Copie o texto para preservá-lo." · "Sua sessão expirou. Entre novamente para sincronizar." Num componente só, usado no desktop e no celular. Antes de fixar os textos, conferir com `PRODUCT_VOICE.md`.

**1.4 Atualização não recarrega com a tela aberta** (`appUpdateDecision.ts`)
- `decideOnNewVersion` só devolve `reload` com o app **oculto** e sem pendência. A regra já existe em `shouldAutoApplyPendingUpdate`; falta usar no caminho do service worker.
- Com o app na tela, sempre o aviso "Atualizar / Depois".

**1.5 Formulários contam como pendência**
- `useUnsavedChangesRegistration` (já existe) em `PilarEditForm`*, Perfil, editor de legenda (`CaptionsPage`*), formulários de projeto e evento, e no rodapé de qualquer `BottomSheet` com formulário.
- Regra no `FormField` do plano de design system: campo alterado e não salvo registra pendência.
(* em andamento)

### Aceite
No iPhone: modo avião, escrever, fechar o app pelo seletor, reabrir. O texto volta com "Salvo neste aparelho…" e sobe ao reconectar, sem duplicar. Uma versão nova publicada com o app aberto só mostra o aviso. Testes unitários de `localDraft` (gravar, conferir a versão, apagar) e da nova decisão de atualização.

---

## Fase 2 — Abrir sem internet (M1 = a)

### Problema
O app instalado não abre sem rede, embora o JS, o CSS e as listas já estejam no aparelho. O HTML ficou de fora para não prender versão velha.

### Mudanças
**2.1 HTML com rede primeiro e reserva local** (`vite.config.ts`, `workbox`)
- Rota de navegação `NetworkFirst` com tempo-limite de 3s, guardando o `index.html` num cache próprio.
- Com rede, sempre vem o HTML novo (resolve o motivo de ter tirado o HTML). Sem rede, abre o último guardado.
- Fora dessa rota: `version.json`, `sw.js`, `/share/*` (campanha pública).

**2.2 Modo leitura sem conexão**
- Ao abrir sem rede, as telas usam as listas do `persistentDataCache` (até 24h).
- Faixa fixa abaixo do cabeçalho: "Sem conexão. Mostrando o que estava salvo neste aparelho às HH:MM. Editar precisa de conexão."
- Salvar, criar e mover ficam desabilitados com motivo (`disabledReason` do `AppButton`).
- O roteiro abre para leitura se estiver no cache. Se tiver cópia da Fase 1, abre com ela.

**2.3 Ao reconectar**
Revalidar os dados da tela sem recarregar o app, e enviar as cópias pendentes da Fase 1.

### Aceite
Modo avião e abrir pelo ícone: o app abre em Criação com as listas e a faixa de aviso, sem erro do sistema. Ao voltar a rede, a faixa some e os dados se atualizam. Com rede, uma versão publicada aparece na abertura seguinte (o HTML não fica preso).

---

## Fase 3 — Teclado, áreas seguras e camadas

### Problema
- O hook do teclado usa um limite fixo (80px) e ignora zoom e foco. Só o editor usa.
- Os painéis (`BottomSheet`, `max-h-[90dvh]`) não acompanham o teclado: o `dvh` não encolhe com o teclado no iPhone.
- A altura do cabeçalho (3,5rem) e da barra inferior estão escritas em vários lugares. Os avisos usam distâncias fixas (`5.5rem`, `10rem`).
- Há 26 valores de `z-index` diferentes.
- O *pull-to-refresh* aplica `transform` no próprio `<main>`, o que desloca qualquer elemento `fixed` dentro dele durante o gesto (guia 9.6).

### Mudanças
**3.1 Um hook só para a área visível** (`src/hooks/useVisualViewport.ts`, substitui `useVisualViewportKeyboard`)
- Devolve `height`, `offsetTop`, `scale` e `keyboardLikely`: área encolheu **e** há campo editável em foco **e** `scale ≈ 1`.
- Atualiza com `requestAnimationFrame`, só quando a medida muda, e remove os ouvintes ao desmontar.
- Usar no editor (`RichTextEditor`*, `ContentDetailMobileScreen`), nos painéis e nos formulários longos.
(* em andamento)

**3.2 Painéis com o teclado** (`BottomSheet.tsx`, `OverlayRoot.tsx`, `overlayConstants.ts`)
- Com teclado aberto, a altura máxima do painel segue a área visível, e o rodapé (Salvar, Cancelar) fica acima do teclado.
- Formulário longo no celular abre como painel de tela cheia (guia 9.6), não como meia-folha.
- O fundo não rola com o painel aberto, e a posição é restaurada ao fechar.

**3.3 Alturas medidas, não escritas** (`MobileHeaderIOS`, `MobileBottomNav`, `index.css` L2178–2180 e L2251–2259)
- Um `ResizeObserver` grava `--mobile-header-h` e `--mobile-nav-h` (já com a área segura) no `<html>`.
- `.mobile-shell-scroll--header`, `.mobile-shell-bottom-spacer`, o indicador do *pull-to-refresh* e os dois avisos usam essas variáveis no lugar de `3.5rem`, `5.5rem` e `10rem`.
- Com texto ampliado, nada fica escondido atrás das barras.

**3.4 Áreas seguras laterais** (se M3 = liberar)
`px-4` do `<main>`, cabeçalho e barra inferior → `max(16px, env(safe-area-inset-left/right))`. Cada borda é protegida por um componente só.

**3.5 Camadas** (`index.css`)
- Tokens `--z-raised` (1–2), `--z-header`, `--z-nav`, `--z-sheet`, `--z-toast`, `--z-modal`, `--z-palette`.
- Trocar os 26 valores soltos.
- O aviso de atualização e o de salvamento ficam na mesma camada, empilhados, sem se cobrir.

**3.6 *Pull-to-refresh*** (`MobileAppShell.tsx`)
O `transform` vai para o filho `div.min-h-full`, não para o `<main>`.

### Aceite
Os cenários de teclado e painel da Fase 0 passam no iPhone. `grep` não acha `3.5rem`, `5.5rem` e `10rem` nos componentes de borda. Sem `z-[N]` solto fora das exceções do teleprompter.

---

## Fase 4 — Manifest e instalação

**4.1 Manifest** (`vite.config.ts`)
- `orientation`: retirar a trava (M3).
- `id: '/'`, para o sistema reconhecer o app mesmo se `start_url` mudar.
- `description` com acentos, igual ao `index.html`.
- `theme_color` e `background_color` iguais ao fundo do tema claro (#F5F5F7 depois da Fase 2 do plano de design system).
- Atalhos: Calendário (`/calendario`), Criação (`/criacao`), Nova ideia (rota de captura) e Gravação (`/gravacao`). Sem rotas que só redirecionam; nomes com acento.

**4.2 Barra de status e cor do tema** (`index.html`, depois de M4)
- Se `black-translucent` ficar ilegível no claro: `default`. Isso também tira a necessidade da área segura do topo no cabeçalho, mas mantenha o código, que funciona com o recorte valendo 0.
- `theme-color` do escuro (#0C0C0C) igual ao fundo do tema escuro.
- O tema escolhido no app (não o do sistema) atualiza o `theme-color` em tempo de execução.

**4.3 Abertura** (opcional)
Imagens de abertura do iPhone (`apple-touch-startup-image`) nas cores do fundo, para não piscar branco no tema escuro.

### Aceite
Chrome DevTools › Application › Manifest sem avisos. App reinstalado abre na cor certa nos dois temas. Atalhos levam direto à tela, sem redirecionar.

---

## Fase 5 — Menu do celular e toque (M6, M7)

### Problema
O celular tem dois menus que se repetem. O lateral é o do desktop numa gaveta, maior que a tela. Em toda tela secundária, o ☰ vira Voltar e metade do app fica inalcançável sem voltar antes. Detalhes na seção "Menu do celular hoje".

### Regra nova
**Um menu só no celular: a barra inferior.** Toda tela tem, sempre visíveis, a barra com uma aba marcada e, se for tela secundária, o Voltar. A busca (lupa) continua no cabeçalho de todas as telas como atalho para qualquer lugar. A única exceção é o modo foco (escrita do roteiro, teleprompter), que mostra só Voltar.

**5.1 Barra inferior da decisão de 30/10** (`navConfig.ts`*, `MobileBottomNav.tsx`)
- Criação · Biblioteca · [Criar] · Gravação · Mais.
- O Criar central continua sendo a captura rápida.
- **Uma aba sempre marcada:** a rota atual marca a aba dona dela. Legendas e Transcrição marcam Criação; Biblioteca › Análise marca Biblioteca; Planejamento, Calendário, Editorial e o restante marcam **Mais**. Assim a pessoa sempre sabe onde está.
- A tabela "rota → aba" fica em `navConfig.ts`, ao lado da lista de itens, com teste.

**5.2 Página Mais** (nova rota `/mais`, se M6 = a)
- Lista em grupos, linhas de 48px com ícone, nome, contador quando houver e seta. Sem gaveta e sem rolagem dentro de caixa.

| Grupo | Itens |
|---|---|
| Planejar | Hoje · Calendário · Planejamento |
| Criar | Legendas · Transcrição · Séries e quadros · Editorial |
| Acompanhar | Análises · Projetos · Contas e horários |
| Conta | Configurações · Perfil · Tema claro/escuro · Sair |

- Gerada de `buildSidebarSections()`, a mesma lista do menu do desktop e da busca, tirando o que já está na barra. Uma tela nova no menu aparece no Mais sem outra edição, como já acontece com a busca (regra 20 do DESIGN.md). Os grupos acima viram rótulos dessa lista.
- Módulo desligado some e os outros mantêm a ordem.
- Reaproveitar a linha do `MobileSidebarDrawer` (já tem 44px, seta e contador).
- Cabeçalho "Mais", sem Voltar: é uma aba.

**5.3 Fim do ☰ e da gaveta no celular** (`AppShell.tsx`, `MobileHeaderIOS.tsx`, `Sidebar.tsx`)
- O botão da esquerda do cabeçalho passa a ser **só Voltar**, nas telas secundárias. Nas telas de aba (Criação, Biblioteca, Gravação, Mais) fica vazio ou com a marca.
- Telas abertas pelo Mais (Planejamento, Calendário, Editorial…) ganham Voltar para `/mais` em `mobileRouteMeta.ts`*, com a aba Mais marcada.
- O `Sidebar` deixa de abrir a gaveta no celular. O desktop não muda.
- `MobileSidebarDrawer` sai depois que a página Mais estiver no ar (a linha dele fica num componente próprio).

**5.4 Hoje** (`DashboardMobileScreen`)
- Ganha o mesmo cabeçalho das outras telas ("Hoje", Voltar para Mais, busca).
- O círculo com a inicial deixa de abrir o menu. Se ficar, abre o Perfil, com o nome "Perfil".

**5.5 Testes**
- `navConfig.test.ts`*: itens da barra, aba marcada por rota, lista do Mais derivada do menu do desktop sem repetir a barra.
- `mobileRouteMeta.test.ts`*: toda rota tem Voltar ou é uma aba; telas do Mais voltam para `/mais`.
- Teste novo que percorre as rotas do `buildAppRoutes` e falha se alguma tela do celular ficar sem caminho de volta nem aba.

(* em andamento noutra sessão: esperar o commit dela)

**5.6 Alvos de toque** (medidos acima)
- Criação: a caixa "Selecionar" do card ganha área de toque de 44×44 (`pointer-coarse:`), com o desenho continuando em 20px e separada da área que abre o card. Alternativa: no celular, selecionar só depois de "Selecionar" no menu ou de um toque longo.
- Análises: linhas com 44px, ícones de ajuda com área de 44, links das legendas dos gráficos com 44 de altura.
- Novo pilar, Legendas*, Planejamento, Hoje, Biblioteca: botões e campos via `h-control` (44 no celular, Fase 3 do plano de design system).

**5.7 Título do roteiro no celular** (`ContentDetailMobileScreen.tsx`)
- Campo de título que quebra linha e cresce com o texto, em vez de cortar numa linha.
- Marcado como o título principal da tela (`h1` ou `aria-level=1`), já que hoje a tela não tem nenhum.

**5.8 Arrastar tem alternativa**
Onde há arrastar (planejamento, blocos de gravação), conferir se existe "Mover para…" no menu (guia 8 e 9.6).

### Aceite
- Em 390px, percorrer todas as rotas da tabela "Menu do celular hoje": cada tela tem uma aba marcada e, se for secundária, Voltar. Nenhuma tem ☰.
- Qualquer tela do app a no máximo dois toques (aba Mais e o item), de qualquer lugar.
- A página Mais cabe sem rolagem em 844px de altura, ou rola como página, nunca dentro de uma caixa.
- Rodar de novo a medição da análise (`scripts/measure-ui.js`, plano de design system 0.2): nenhuma das 14 telas com alvo menor que 44px fora das exceções do DESIGN.md (grade do mês).
- Testes de navegação verdes.

---

## Fase 6 — Teleprompter offline (opcional, M1 = b)

Recurso novo, previsto no guia (9.7) e ainda em aberto na direção de design. Resumo do escopo, para virar plano próprio se for aprovado:
- "Preparar offline" explícito por roteiro ou bloco, com progresso e confirmação. O texto e as preferências do teleprompter vão para o IndexedDB.
- Lista "Disponível neste aparelho" na Gravação, que abre sem consultar o servidor.
- Sem rede: ler, rolar, trocar de roteiro. Marcar como gravado e editar pedem conexão. "Próximo" não registra gravação.
- A versão preparada não muda no meio da leitura. Se o servidor tiver uma versão mais nova, a pessoa escolhe atualizar.
- Mensagem: "Disponível offline neste aparelho."

---

## Verificação de cada commit

1. `npm run check`.
2. Medição em 390 e 360px nas telas afetadas (sem rolagem lateral, alvos ≥ 44px, campos ≥ 16px).
3. Para as fases 1, 2, 3 e 4: as linhas correspondentes do checklist da Fase 0 **no iPhone**, no Safari e no app instalado. A emulação não substitui.
4. Dev grava no Supabase real: testar salvamento e modo sem conexão com um roteiro de teste, nunca com um roteiro real.

## Critério de pronto

- O texto do roteiro sobrevive a modo avião + app fechado.
- O app instalado abre sem internet em modo leitura.
- Nenhuma atualização recarrega uma tela aberta.
- Teclado e painéis passam no checklist do iPhone.
- Relógio e bateria legíveis nos dois temas.
- Um menu só no celular (barra com Mais), com aba marcada ou Voltar em toda tela.
- Nenhum alvo de toque menor que 44px fora das exceções.

## Riscos

| Risco | Cuidado |
|---|---|
| A cópia local "ressuscita" texto velho por cima de uma edição feita em outro aparelho | Guardar o `updated_at` de origem; se o servidor mudou depois, a pessoa escolhe qual versão fica, nunca automático |
| HTML com rede primeiro devolve uma versão velha em rede lenta | Tempo-limite curto (3s) e a checagem de `version.json` continua avisando |
| IndexedDB indisponível (modo privado, espaço cheio) | Detectar e cair para o estado "não foi possível salvar neste aparelho", sem fingir sucesso |
| Testar salvamento no dev mexe em dados reais | Usar um roteiro de teste criado para isso |
| Arquivos de navegação em andamento noutra sessão | 5.1 só depois do commit dela |
