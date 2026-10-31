# Plano de correção e implementação — padronização do design system (Criaki)

**Data:** 2026-10-31
**Origem:** análise de 31/10 feita no código e com o app rodando (desktop 1440px e 900px, tema claro), cruzada com o guia `C:\Users\mente\Downloads\DESIGN (1).md` e as decisões de 30/10 (botão rosa #FF3D81 com texto #19161D, foco e links em #B51450, tema escuro com a versão escura da paleta nova).
**Objetivo:** cada tela usar os mesmos tokens e componentes, com uma regra só para altura de controle, foco, cor de estado, espaçamento e corte entre celular e desktop.
**Fora deste plano:** barra inferior do celular (decisão de 30/10, plano próprio) · PWA, teleprompter offline e cópia local da escrita (seção 9 do guia, ainda em aberto) · fonte monoespaçada do roteiro (seção 4 do guia, "Escrita") · textos e rótulos (`PRODUCT_VOICE.md`).

---

## Status de execução

Nada iniciado. Nenhum arquivo de código foi alterado na análise.

---

## Decisões pendentes

Cada decisão trava só as fases indicadas. As outras podem começar antes.

| # | Decisão | Opções | Recomendação | Trava |
|---|---|---|---|---|
| D1 | Paleta clara | (a) paleta completa do guia: fundo #F5F5F7, texto #2D2A32, cinzas frios, cores de texto escuras para estados · (b) só o que foi decidido em 30/10 (botão, foco, link) | (a). O guia pede para preservar os valores, e todos passam no cálculo de contraste (tabela 2.1) | Fase 2 |
| D2 | Paleta escura | (a) versão escura proposta na tabela 2.2 (fundos levemente violeta, combinando com o carvão) · (b) manter os fundos quentes atuais e trocar só marca, foco e estados | (a), conferida no olho antes do commit | Fase 2 |
| D3 | Tipografia no celular | (a) a do guia: não reduzir texto no celular (título 22, título de item 16, campo 16) · (b) manter a atual (título 18, item 14, `text-sm` encolhido para 13) | (a). O guia diz "não reduzir texto para acomodar mais controles no celular" | 4.3 (só a parte de texto) e Fase 6 |
| D4 | Fonte da interface | (a) manter Inter · (b) fonte do sistema, como no guia | (a) nesta rodada. Trocar a fonte muda todas as telas e não resolve nenhuma inconsistência medida | — |
| D5 | Corte entre celular e desktop | (a) manter 1024px (onde o layout de celular já troca hoje) e resolver o meio com grids que acompanham o painel · (b) faixas do guia: 768 / 1200 | (a). O guia também pede que "os pontos de mudança respondam ao conteúdo", e é isso que o item 4.4 faz | Fase 4 |
| D6 | Botão pequeno | 32px ou 36px | 36px (o guia pede 36–40px no desktop). 32px fica só nas grades densas (calendário, planejamento) | 3.2 |

---

## Coordenação com o trabalho em andamento

Em 31/10 havia alterações não commitadas de outras sessões em cerca de 160 arquivos. Os arquivos centrais deste plano estão **livres**: `src/styles/index.css`, `AppButton.tsx`, `FormField.tsx`, `Surface.tsx`, `Text.tsx`, `PageLayout.tsx`, `scripts/lint-design.mjs`, `tokenContrast.test.ts`, `DESIGN.md` e `BUTTON_SYSTEM.md`. As fases 1, 2 e 3.1–3.3 podem começar já.

Mexa nestes arquivos só **depois** que o trabalho da outra sessão for commitado:

| Arquivo | Itens deste plano que tocam nele |
|---|---|
| `src/features/contents/components/burst-mode/TeleprompterSettingsDialog.tsx` | 0.1 |
| `src/components/editors/RichTextEditor.tsx` | 0.1 |
| `src/features/settings/pages/ProfileSettingsPage.tsx` · `PillarEditPage.tsx` · `components/PilarEditForm.tsx` · `SerieEditForm.tsx` | 3.5, 6.3 |
| `src/features/dashboard/pages/DashboardPage.tsx` · `components/TodayHome.tsx` | 3.6, 6.3 |
| `src/features/planejamento/pages/PlanejamentoPage.tsx` | 3.6, 4.4, 6.3 |
| `src/features/creation/pages/CreationHubPage.tsx` · `editorial/components/DistribuicaoFuncoesPanel.tsx` · `projects/pages/ProjectDetailPage.tsx` · `recording/components/RecordingBlockEditor.tsx` | 3.5 |

Antes de cada fase: `git status --short` e a lista de sessões abertas, para não editar um arquivo que outra sessão está mexendo. Commit logo ao fim de cada parte (direto na main, como de costume).

Os números de linha abaixo foram conferidos em 31/10 e podem mudar com as edições em curso.

---

## Linha de base (medida em 31/10)

Estes números viram a contagem inicial da catraca do lint (item 0.3). Eles só podem diminuir.

| Medida | Valor |
|---|---|
| Alturas de botão na mesma tela (desktop) | Perfil 40 · Pilar novo 32/36/40 · Hoje 26/32/40 · Planejamento 28/32/36/40 · Biblioteca 28/40 |
| Campo ao lado do botão | Perfil: campo 50px, botão 40px. Em 900px: campo 52px, botão 40px |
| Recuo interno dos campos (Pilar novo) | 4 valores: 0 · 8/12 · 12 · 12/16 |
| Borda do campo | #E5E5E1, 1,26:1 (o mínimo é 3:1) |
| Estilos de foco | botão: anel sólido azul · campo no desktop: halo translúcido 12% · campo até 768px: outro halo · `.property-input`: borda azul |
| `<input>` / `<textarea>` soltos · usos de `FormField` | 160 / 31 · 5 |
| Usos de `[var(--x)]` em classes | 4.391 (83 tokens, 156 combinações) |
| Cantos fora do token | 153 `rounded-sm/md/lg/xl` em 40 arquivos (o `md` dá 6px) · 12 valores soltos (`rounded-[24px]`, `rounded-[3rem]`…) |
| Espaçamentos fora da escala | 74 `gap-1.5` · 25 `gap-2.5` |
| Cor de estado pura usada como texto | 203 (laranja 2,98:1 · verde 4,10:1 · azul 4,19:1 · roxo 4,07:1 · vermelho 4,42:1 sobre branco; o mínimo é 4,5:1) |
| Botões destrutivos feitos à mão | 11 arquivos |
| Peso de fonte direto na classe | 596 `font-semibold/bold/medium` |
| Cortes de tela | `md:` (768) 405 usos · CSS em 768/769 em 13 blocos · layout de celular troca em 1024 |
| Classes reescritas no celular | 19 classes (`p-6`, `px-6`, `gap-8`, `text-sm`…) com 537 usos: 160 de espaçamento e 377 de texto |
| `npm run lint:design` | **falha no main** (22 ocorrências em 6 arquivos) |
| `PageLayout` | 25 páginas usam, 3 passam alguma opção. `contentWidth` não muda nada (tudo 1440px) |

---

## Ordem e tamanho

| Fase | Tema | Gravidade | Tamanho | Muda o visual? | Depende de |
|---|---|---|---|---|---|
| 0 | Rede de segurança (lint, fotos, catraca) | 🔴 | S | Quase nada (4 textos de 10–11px vão para 12px) | — |
| 1 | Camada de tokens e classes novas | 🟡 | S | Não | — |
| 2 | Paleta do guia e decisões de 30/10 | 🔴 | M | Sim, o app todo (cor) | D1, D2 |
| 3 | Controles: campo, botão, foco, erro | 🔴 | M | Sim (altura e foco) | D6 |
| 4 | Um corte só entre celular e desktop | 🟡 | M | Sim (faixa 768–1023) | D5; 4.3 depende de D3 |
| 5 | Troca mecânica pasta por pasta | 🟢 | L | Quase nada (5.2 e 5.3 mudam poucos pixels) | 1 |
| 6 | Tipos de página e tipografia | 🟡 | L | Sim | D3, 3 |
| 7 | Proteções finais e documentação | 🟢 | S | Não | todas |

---

## Fase 0 — Rede de segurança

### Problema
O `npm run check` está quebrado no main, porque `lint:design` falha em código já commitado. Também não existe foto de referência para comparar antes e depois, e o lint só proíbe padrões, sem impedir que os antigos cresçam.

### Mudanças
**0.1 Consertar o lint que já falha (22 ocorrências)**
Trocar pelos tokens equivalentes, sem criar exceção:
- `TeleprompterSettingsControls.tsx` (8) e `TeleprompterSettingsDialog.tsx` (9, **em andamento**): `text-[15px]` → `text-[length:var(--font-size-callout)]`, `text-[13px]` → `--font-size-footnote`, `text-[17px]` → `--font-size-body-reading`. Mesmo tamanho, nada muda na tela.
- `ScriptComments.tsx:91`, `RoteiroTypographyControls.tsx:95,128` (11px) e `DestinationChips.tsx:177` (10px) → `text-2xs` (12px, o menor tamanho de leitura do sistema).
- `RichTextEditor.tsx:385` (**em andamento**): `bg-black/40` → `bg-[var(--backdrop-medium)]`.

**0.2 Fotos de referência**
- 12 rotas: `/criacao`, `/hoje`, `/biblioteca`, `/planejamento`, `/calendario`, `/editorial`, `/series`, `/gravacao`, `/configuracoes`, `/configuracoes/perfil`, `/editorial/pilares/nova` e um roteiro real em `/conteudos/:id`. Mais `/login`, aberto numa janela sem sessão.
- 3 larguras (390, 900, 1440) × 2 temas.
- Tiradas pelo navegador do app, **só navegando**: o dev grava no Supabase real, então nenhum clique que salve algo.
- Guardar em `tmp/design-baseline/<data>/` e incluir `tmp/design-baseline/` no `.gitignore`.
- Junto, salvar o script de medição (alturas de botão e campo, recuos, cantos) em `scripts/measure-ui.js`, para colar no console do navegador. É o mesmo script usado na análise de 31/10.

**0.3 Catraca no lint** (`scripts/lint-design.mjs`)
- Novo arquivo `scripts/design-baseline.json` com a contagem atual de cada regra abaixo. O lint falha se uma contagem **subir**. `node scripts/lint-design.mjs --update-baseline` regrava o arquivo, mas só aceita números menores.
- Regras novas (contadas no projeto inteiro):
  - cor de estado pura como texto: `text-[var(--(accent-(blue|green|orange|purple|pink|red)|danger|warning|success|info))]`;
  - cantos crus: `rounded-(sm|md|lg|xl)`;
  - espaçamento fora da escala: `(gap|p|px|py|m|mx|my|space-y)-(1|2|3).5` (`gap-1.5`, `gap-2.5`, `p-2.5`…);
  - `<input` e `<textarea` fora de `src/components/ui`;
  - `[var(--x)]` dos tokens que ganham classe na Fase 1 (lista fixa, igual à tabela 5.1);
  - alturas de controle fora da escala: `h-7`, `h-12`.
- Exceções: as mesmas do teleprompter que já existem (`visualWarnExceptions`).

### Aceite
`npm run check` passa. As fotos e `scripts/measure-ui.js` existem. Uma classe proibida nova num arquivo qualquer faz o lint falhar.

---

## Fase 1 — Camada de tokens (nada muda na tela)

### Problema
Os tokens existem, mas só chegam ao Tailwind como `[var(--x)]` (4.391 vezes). Faltam tokens para texto de estado, recuo de card, espaço de grid e alturas de controle menores. Por isso cada tela inventa os seus valores.

### Mudanças
**1.1 Tokens novos em `:root` e `[data-theme='dark']`** (`src/styles/index.css`, perto da linha 48)
Ainda sem uso, então nada muda na tela:
- Estados: `--success-text`, `--success-bg`, `--warning-text`, `--danger-text`, `--danger-bg`, `--info-text`, `--info-bg` (valores nas tabelas 2.1 e 2.2). `--warning-bg` já existe e muda de valor na Fase 2.
- Medidas: `--control-height-sm: 36px`, `--control-height-xs: 32px`, `--card-padding-sm: 12px`, `--card-padding: 16px`, `--card-padding-lg: 24px`, `--grid-gap: 16px`, `--radius-xs: 4px`, `--layout-max-form: 720px`.
- Marca: `--brand-accent-hover` (rosa 12% mais claro, para o hover do botão principal; ver 2.4).
- No bloco `html.mobile-app-shell` (linha 376): `--card-padding-lg: 16px` e `--grid-gap: 12px`.

**1.2 Classes do Tailwind a partir dos tokens** (`src/styles/index.css`, logo depois do `@theme` da linha 4)

```css
@theme inline {
  --color-page: var(--bg-primary);
  --color-page-alt: var(--bg-secondary);
  --color-surface: var(--bg-elevated);
  --color-subtle: var(--surface-subtle);
  --color-hover: var(--bg-hover);
  --color-fg: var(--text-primary);
  --color-fg-muted: var(--text-secondary);
  --color-fg-subtle: var(--text-tertiary);
  --color-line: var(--border-color);
  --color-line-strong: var(--border-strong);
  --color-line-input: var(--border-input);
  --color-brand: var(--brand-accent-strong);
  --color-brand-hover: var(--brand-accent-hover);
  --color-on-brand: var(--brand-on-accent);
  --color-brand-soft: var(--brand-accent-soft);
  --color-link: var(--brand-accent-text);
  --color-selected: var(--accent);
  --color-success-ink: var(--success-text);
  --color-success-soft: var(--success-bg);
  --color-warning-ink: var(--warning-text);
  --color-warning-soft: var(--warning-bg);
  --color-danger-ink: var(--danger-text);
  --color-danger-soft: var(--danger-bg);
  --color-info-ink: var(--info-text);
  --color-info-soft: var(--info-bg);
  --radius-small: var(--radius-xs);
  --radius-control: var(--radius-input);
  --radius-panel: var(--radius-card);
  --shadow-focus-ring: var(--focus-ring);
  --shadow-overlay: var(--shadow-dropdown);
  --spacing-control: var(--control-height);
  --spacing-control-sm: var(--control-height-sm);
  --spacing-control-xs: var(--control-height-xs);
  --spacing-card: var(--card-padding);
  --spacing-card-sm: var(--card-padding-sm);
  --spacing-card-lg: var(--card-padding-lg);
  --spacing-grid: var(--grid-gap);
  --spacing-gutter: var(--layout-gutter);
}
```

Resultado: `bg-surface text-fg-muted border-line rounded-control h-control p-card gap-grid shadow-focus-ring`.
Dois cuidados no Tailwind 4:
- No `@theme`, `--text-*` vira **tamanho de fonte**. Por isso as cores entram como `--color-*`, e `--text-primary` nunca vai para o `@theme`.
- Nenhum nome do `@theme` pode repetir um nome do `:root` apontando para ele mesmo (`--radius-card: var(--radius-card)` é circular). Daí os nomes `panel`, `control`, `focus-ring`.

**1.3 Teste do mapa** (novo `src/styles/themeMap.test.ts`, no mesmo estilo de `tokenContrast.test.ts`)
Cada `var(--x)` dentro do `@theme inline` precisa existir no `:root`. Pega erro de digitação antes de ele virar uma classe que não pinta nada.

### Aceite
`npm run check` passa. As fotos ficam idênticas. Um `<div className="bg-surface p-card rounded-panel">` de teste pinta igual a `Surface variant="outlined"`.

---

## Fase 2 — Paleta do guia e decisões de 30/10 (D1, D2)

### Problema
As decisões de 30/10 não estão no código. O botão continua #E0185A com texto branco (que dá 4,72:1 e cai para 3,37:1 no rosa exato do guia) e o foco continua azul. `DESIGN.md` e `BUTTON_SYSTEM.md` também descrevem o antigo.

### Mudanças
**2.1 Tema claro** (`:root`, linhas 128–242). Contraste calculado contra os 5 fundos do teste (página, secundário, card, informativo, hover):

| Token | Hoje | Novo | Menor contraste |
|---|---|---|---|
| `--bg-primary` | #F6F5F3 | #F5F5F7 | — |
| `--bg-hover` · `--surface-subtle` | #F1F1EF | #EEEEF1 | — |
| `--text-primary` · `--accent` | #111111 | #2D2A32 | 12,18:1 |
| `--text-secondary` | #5F5F5A | #6B6870 | 4,72:1 |
| `--text-tertiary` | #6B6B65 | `var(--text-secondary)` (vira apelido; o guia tem um cinza só) | 4,72:1 |
| `--border-color` | #E5E5E1 | #E5E4E9 | decorativa |
| `--border-input` | #85857E | #89858F | 3,12:1 |
| `--brand-accent` · `--brand-accent-strong` | #FF2D6F · #E0185A | #FF3D81 (o mesmo rosa exato) | — |
| `--brand-on-accent` | #FFFFFF | #19161D | 5,31:1 |
| `--brand-accent-text` | #D0104F | #B51450 | 5,70:1 |
| `--brand-accent-soft` | #FFE4EF | #FDEBF1 | link sobre ele: 5,76:1 |
| `--success-text` · `--success-bg` | — | #376000 · #F1F9E5 | 6,40:1 · 6,85:1 sobre o próprio fundo |
| `--warning-text` · `--warning-bg` | — · `color-mix` 6% | #805100 · #F8F0DE | 5,86:1 · 5,98:1 |
| `--danger-text` · `--danger-bg` | — | #AD243A · #FCECEF | 5,87:1 · 5,95:1 |
| `--info-text` · `--info-bg` | — | #2F5D8F · #EAF1F8 | 5,88:1 · 5,98:1 |

Os outros cinzas quentes (`--accent-soft`, `--tag-*`, `--scrollbar-*`, `--border-strong`) vão para os equivalentes frios de mesma luminosidade. `--segment-track` (#E2E8F0, azulado e sozinho na paleta) vira `--bg-hover`.

**2.2 Tema escuro** (`[data-theme='dark']`, linhas 245–327). Proposta que passa no cálculo, a conferir no olho:

| Token | Hoje | Proposto | Menor contraste |
|---|---|---|---|
| `--bg-primary` · `--bg-secondary` · `--bg-elevated` | #0F0F0E · #161614 · #1B1B19 | #121115 · #18161C · #1D1B22 | — |
| `--surface-subtle` · `--bg-hover` | #1B1B19 · #23231F | #1D1B22 · #26242C | — |
| `--text-primary` · `--accent` | #F5F5F2 | #F4F3F6 | 13,86:1 |
| `--text-secondary` | #A3A39B | #A9A5B0 | 6,34:1 |
| `--border-input` | #737369 | #7A7682 | 3,46:1 |
| `--brand-accent-strong` · `--brand-on-accent` | #E0185A · #FFF | #FF3D81 · #19161D | 5,31:1 |
| `--brand-accent-text` (link e foco) | #FF5C8D | #FF6B9A | 5,70:1 |
| `--brand-accent-soft` | #3D1528 | #3A1626 | 5,91:1 |
| `--success-text` · `--success-bg` | — | #9CD35C · #1E2A12 | 8,67:1 · 8,52:1 |
| `--warning-text` · `--warning-bg` | — | #E2B55E · #2E2412 | 8,03:1 · 7,99:1 |
| `--danger-text` · `--danger-bg` | — | #F2899A · #341A20 | 6,43:1 · 6,71:1 |
| `--info-text` · `--info-bg` | — | #8FB4E0 · #172230 | 7,13:1 · 7,47:1 |

**2.3 Foco rosa.** `--focus-ring-color: var(--brand-accent-text)` no `:root` (linha 199); o escuro herda pelo token. O formato continua o mesmo: folga de 2px na cor do fundo e anel de 2px. `--focus-ring-brand` continua como apelido.

**2.4 Hover do botão principal sem opacidade.** `--brand-accent-hover: color-mix(in srgb, var(--brand-accent-strong) 88%, #fff)` (≈ #FF5490; o texto escuro fica com 5,90:1). Escurecer o rosa derrubaria o contraste do texto escuro. No `AppButton`, `variantClasses.primary` troca `hover:opacity-90` por `hover:bg-brand-hover hover:border-brand-hover`.

**2.5 Teste de contraste** (`src/styles/tokenContrast.test.ts`)
- Texto de estado (`--*-text`) sobre os 5 fundos e sobre o próprio `--*-bg`: ≥ 4,5:1.
- `--border-input` e `--focus-ring-color` sobre os 5 fundos: ≥ 3:1.
- `--brand-on-accent` sobre `--brand-accent-hover`: ≥ 4,5:1 (`color-mix` com branco; a função `mixHex` já existe).
- Rodar o teste de texto tingido (status e cores de pilar). `--tint-text-share` e `--user-tint-text-share` foram calibrados com #111111; com #2D2A32 algum tom pode cair abaixo de 4,5:1. Se cair, baixar a porcentagem até passar.

**2.6 Documentação no mesmo commit.** `DESIGN.md` ("Accent rules", regra 4 de "Leitura, números e acesso", "Focus & motion") e a seção de cor do `BUTTON_SYSTEM.md`.

### Aceite
Teste de contraste verde nos dois temas. Nas fotos, só mudam cores. Botão principal rosa com texto escuro em todas as telas. Tab mostra anel rosa em todo controle.

---

## Fase 3 — Controles: campo, botão, foco e erro (D6)

### Problema
Na mesma tela, botões variam de 26 a 40px e campos de 27 a 52px. O campo tem borda de 1,26:1 e três estilos de foco diferentes. O texto de erro usa a cor pura (4,42:1), e não existe botão destrutivo padrão.

### Mudanças
**3.1 Regra global dos campos** (`src/styles/index.css`)
Os 160 inputs soltos já herdam esta regra, então corrigir aqui corrige todos de uma vez:
- Linhas 546–571 (base): `min-height: var(--control-height)`; recuo `0 12px` (textarea continua com 12px e altura mínima de 120); borda `var(--border-input)`; hover `var(--text-secondary)`; foco `box-shadow: var(--focus-ring)` com a mesma borda. Sai o `--shadow-focus` (halo de 12%).
- Linhas 1533–1539 (até 768px): apagar o foco translúcido. Os 16px de fonte no celular ficam, porque abaixo disso o iPhone dá zoom no campo.
- Linhas 2113–2120 (a partir de 1024px): apagar `padding: 12px`, que deixava o campo com 50px.
- `.property-input:focus` (linhas 1126 e 1183): mesmo anel, sem a borda azul.
- Novos estados: `:disabled` (fundo `--surface-subtle`, texto `--text-secondary`, cursor bloqueado) e `[aria-invalid='true']` (borda `--danger-text`).
- Continuam de fora, como hoje: `.input-plain`, `.filter-bar-search-input`, `.caption-locked`.

**3.2 Altura de controle pelo layout, não pela largura** (`AppButton.tsx`, `index.css`)
- `html.mobile-app-shell { --control-height: 44px; }` (o token `--control-height-mobile` passa a ser só a origem desse valor).
- `AppButton`: sai `responsiveControlHeight`, que trocava em `md:` (768) enquanto o layout troca em 1024. Tamanhos:
  - `md` → `h-control` (40 no desktop, 44 no celular);
  - `sm` → `h-control-sm` (36);
  - `xs` → `h-control-xs` (32, só em grades densas);
  - `lg` (2 usos) → `md`.
- Em toque, todo tamanho vai a 44px (`pointer-coarse:h-11`), como hoje.

**3.3 `FormField`** (`src/components/ui/FormField.tsx`)
- `space-y-1.5` (6px, fora da escala) → 8px.
- Erro em `--danger-text`.
- O componente gera os ids `${htmlFor}-ajuda` e `${htmlFor}-erro`. Quando o filho é um elemento só, recebe `aria-describedby` e `aria-invalid`.

**3.4 Texto de estado** (203 usos; a catraca da Fase 0 conta)
- `text-[var(--danger)]` e `text-[var(--accent-red)]` → `text-danger-ink`.
- `--warning` e `--accent-orange` como texto ou ícone → `text-warning-ink`.
- `--success` e `--accent-green` → `text-success-ink`.
- `--info` e `--accent-blue` → `text-info-ink`.
- `--accent-purple` e `--accent-pink` (cores de categoria) → `tintedTextColor()`, que já existe em `src/lib/utils.ts`.
- Fundo pintado com a cor pura de estado → `bg-*-soft`.
- Começar pelos 31 arquivos de erro e perigo.

**3.5 `AppButton variant="danger"`**
- Texto `--danger-text`, borda `--border-input`, hover `--danger-bg` (o guia restringe o preenchimento à confirmação).
- `variant="dangerSolid"` só no botão de confirmar do `ConfirmModal`: fundo `--danger-text`, texto branco (6,80:1).
- Trocar os 11 arquivos com botão destrutivo feito à mão: `ContentDetailHeader`, `CreationHubPage`*, `DistribuicaoFuncoesPanel`*, `CalendarLayerToggle`, `AnnotationNoteCard`, `ProjetoEventoFields`, `ProjectDetailPage`*, `RecordingBlockEditor`*, `SerieEditForm`*, `MobilePillButton`, `ContentDetailMobileScreen` (* em andamento).

**3.6 Controles fora do `AppButton`**
- `.filter-chip`, `SegmentTabs` e o campo de busca da toolbar → `h-control-sm`.
- `MoreMenu md` → `h-control`; `MoreMenu sm` continua com 32px.
- Rodar `scripts/measure-ui.js` em Hoje, Biblioteca e Planejamento para achar os botões de 26 e 28px e levar cada um para `xs` ou `sm`.

### Aceite
`scripts/measure-ui.js` nas 12 rotas:
- Desktop: botões e campos só em {32 (grade densa), 36, 40}. Campo e botão de uma mesma linha com a mesma altura.
- Celular: tudo com pelo menos 44px.
- Teclado: um estilo de foco só, em botão, campo e card clicável.
- Texto de erro com pelo menos 4,5:1.

---

## Fase 4 — Um corte só entre celular e desktop (D5)

### Problema
Três cortes convivem: o `md:` do Tailwind (768), o CSS em 768/769 e o layout de celular em 1024. Em 900px a tela mostra a barra inferior e o título do celular, mas botão e cards do desktop. Além disso, no celular `p-6`, `gap-8` e `text-sm` não valem o que dizem, porque `index.css` reescreve essas classes.

### Mudanças
**4.1 CSS em 768/769 → o corte do layout de celular**
`max-width: 768px` vira um bloco dentro de `html.mobile-app-shell`. `min-width: 769px` vira `html:not(.mobile-app-shell)`. Assim o CSS segue a mesma regra do `useIsMobile` (`src/shared/breakpoints.ts`, até 1023px). Blocos:
- L809 `.editorial-card`
- L956 `.ds-card`
- L1259 `.surface-quiet`
- L1308 recuo dos `.surface-*`
- L1517 corpo, campos, `.page-container`, `.filter-select`, `.contents-mobile-filter`
- L1566 `.page-container`
- L1788 busca da `filter-bar`
- L1861 `.filter-bar-select`
- L1892 `.filter-bar-toggle`
- L2031 `.desktop-page-header-back`
- L2335 `.grid-form`
- L2388 `.grid-book-hero`
- L2622 `.skeleton-card`

**4.2 `md:` nos componentes (405 usos)**
Onde o `md:` quer dizer "desktop", troca por `lg:` (1024, igual ao layout). Exemplos: `md:px-6` (20), `md:p-6` (12), `md:px-8` (9), `md:p-8` (7). `md:` só continua onde a largura de verdade importa dentro do conteúdo, e aí o certo é o 4.4. Uma pasta por commit, conferindo as fotos de 900px.

**4.3 Apagar as classes reescritas no celular** (`index.css` linhas 400–476)
Uma classe por commit: achar quem usa a classe em tela de celular (`src/mobile`, componentes compartilhados, telas com variante de celular), trocar por um token com o mesmo valor no celular, e só então apagar a regra.
- Espaçamento primeiro (160 usos). Exemplo: o `Surface padding="lg"` deixa de usar `p-6` e passa a usar `p-card-lg` (24 no desktop, 16 no celular). Cards e seções usam os tokens `--card-padding*` e `--page-section-gap`.
- Texto (`text-sm` 334, `text-base` 18, `text-lg` 13, `text-xl` 8, `text-2xl` e `text-3xl` 2 cada) **só depois de D3**: apagar a regra muda o tamanho do texto no celular.

**4.4 Grids que acompanham o painel, não a janela**
- `@container` no painel e `@md:grid-cols-2` / `@lg:grid-cols-3` nos filhos (nativo no Tailwind 4).
- Começar pelo Planejamento (a largura útil muda com o painel lateral) e pela grade da Biblioteca (`grid-catalog`).
- `grid-content` e `grid-form` passam a ler a largura do próprio container.

### Aceite
Em 900px: layout de celular com botões e campos de 44px, cards com recuo de 16 e nada do desktop. `grep` não acha mais `768px`/`769px` no `index.css`. Fotos de 390 e 1440 sem diferença; as de 900 mudam só no esperado.

---

## Fase 5 — Troca mecânica, pasta por pasta

### Problema
O mesmo valor é escrito de dois ou três jeitos. Isso esconde o que é token e o que é valor solto, e impede o lint de separar os dois.

### Mudanças
**5.1 `scripts/codemod-tokens.mjs`**
- Troca com uma tabela fixa e preserva prefixos (`hover:`, `focus-visible:`, `lg:`, `dark:`…).
- Só mexe em texto dentro de `className`, `cn(...)` e constantes de classe; nunca em `style={{}}`.
- Cobre as combinações mais usadas, cerca de 3.600 dos 4.391 usos. O resto fica na catraca.

| De | Para | Usos |
|---|---|---|
| `text-[var(--text-primary)]` | `text-fg` | 502 |
| `border-[var(--border-color)]` | `border-line` | 500 |
| `text-[var(--text-tertiary)]` | `text-fg-subtle` | 478 |
| `text-[var(--text-secondary)]` | `text-fg-muted` | 416 |
| `bg-[var(--bg-hover)]` | `bg-hover` | 329 |
| `rounded-[var(--radius-input)]` | `rounded-control` | 206 |
| `shadow-[var(--focus-ring)]` | `shadow-focus-ring` | 195 |
| `bg-[var(--bg-elevated)]` | `bg-surface` | 188 |
| `rounded-[var(--radius-card)]` · `rounded-[var(--radius-card-mobile)]` | `rounded-panel` | 138 · 89 |
| `bg-[var(--bg-primary)]` | `bg-page` | 118 |
| `bg-[var(--bg-secondary)]` | `bg-page-alt` | 116 |
| `bg-[var(--text-primary)]` · `border-[var(--text-primary)]` | `bg-fg` · `border-fg` | 59 · 47 |
| `border-[var(--border-strong)]` | `border-line-strong` | 57 |
| `text-[var(--bg-primary)]` | `text-page` | 48 |
| `border-[var(--border-input)]` | `border-line-input` | 31 |
| `shadow-[var(--shadow-dropdown)]` | `shadow-overlay` | 28 |
| `bg-[var(--surface-subtle)]` | `bg-subtle` | 21 |
| `text-[var(--brand-accent-text)]` | `text-link` | 18 |
| `text-[var(--brand-on-accent)]` | `text-on-brand` | 16 |

Cores de estado (`--danger`, `--accent-*`) ficam de fora: são trocadas à mão em 3.4, porque cada uso precisa decidir entre `-ink` e `-soft`.

**5.2 Cantos**
- `rounded-lg` (51) → `rounded-control` e `rounded-xl` (64) → `rounded-panel`: mesmo valor, nada muda na tela.
- `rounded-md` (34, 6px) → `rounded-control` (8px): **muda pixel**, conferir nas fotos.
- `rounded-sm` (4) → `rounded-small`.
- Os 12 valores soltos (`rounded-[24px]`, `rounded-[3rem]`…), um por um. Os do teleprompter continuam como exceção.

**5.3 Espaçamento fora da escala**
- `gap-1.5` (74) → `gap-2`, ou `gap-1` quando o par é ícone e número pequeno. O guia aceita 4–8px dentro de um mesmo controle.
- `gap-2.5` (25) → `gap-2` ou `gap-3`.
- Muda pixel: conferir nas fotos.

**Execução**
- Ordem: `src/components/ui` → `src/components` → `src/layouts` → `src/mobile` → cada `src/features/<tela>`.
- Uma pasta por commit, só com arquivos livres (ver Coordenação). Depois de cada uma: `npm run check` e as fotos das rotas afetadas.
- Quando uma regra da catraca chega a zero, ela vira erro (7.1).

### Aceite
Contagens da catraca descendo a cada commit. Fotos idênticas, exceto o que 5.2 e 5.3 avisam.

---

## Fase 6 — Tipos de página e tipografia (D3)

### Problema
Todas as páginas usam a mesma largura (1440) e o mesmo ritmo, seja painel, formulário ou editor. `contentWidth` não faz nada. No celular, o texto encolhe (título 18, item 14), ao contrário do que o guia pede.

### Mudanças
**6.1 `PageLayout` ganha `tipo`** (`src/layouts/page/PageLayout.tsx`)
A opção define largura, ritmo entre seções e cabeçalho. `contentWidth` sai; `narrow` vira `formulario`.

| Tipo | Largura | Entre seções (desktop / celular) | Telas |
|---|---|---|---|
| `painel` | 1440 | 32 / 12 | `DashboardPage` (Hoje), `AnalisesPage`, `AnalyticsPage` (Biblioteca › Análise) |
| `lista` | 1440 | 24 / 12 | `CreationHubPage`, `LibraryPage`, `LibraryAnnotationsPage`, `ProjectsPage`, `SeriesSettingsPage`, `RecordingPage`, `CaptionsPage`, `TemplatesSettingsPage`, `LooksSettingsPage`, `EditorialPage` |
| `detalhe` | 1440 | 16 / 12 | `BookDetailPage`, `ProjectDetailPage`, `SeriesScriptsPage`, `SeriesEditPage` |
| `formulario` | 720 | 24 / 12 | `ProfileSettingsPage`, `PillarEditPage`, `SettingsPage` (índice), `PlatformsSettingsPage`, `PostingTimesSettingsPage` (hoje sem `PageLayout`), `PillarsSettingsPage` (hoje no `SettingsPageScaffold`) |
| `foco` | tela cheia; texto numa coluna de 65–85 caracteres | 16 / — | `ContentDetailPage` (hoje sem `PageLayout`), `RecordingBlockPage`, `TranscriptionPage` |
| `grade` | tela cheia | 0 | `EditorialCalendarPage`, `PlanejamentoPage` |
| `publica` | 480 (login) / 960 | 24 | `LoginPage`, `CampanhaPublicaPage` (layout próprio fora do app, mesmos tokens) |

**Regras que valem para todos os tipos**
- Um título principal à esquerda; à direita, no máximo 1 botão primário e 1 secundário.
- Estados: carregando = `Skeleton` no formato do conteúdo; vazio = `EmptyState` (conta vazia é diferente de busca vazia); erro = `InlineNotice` com "Tentar de novo".
- Cards: `Surface` com `padding` sm/md/lg (12/16/24) e cantos de 12px. Sem card feito à mão com `rounded-[var(--radius-card)] border`.
- No celular, cada tipo muda sempre do mesmo jeito: painel em 1 coluna (números em 2); lista com busca e o botão Filtros abrindo um painel por baixo; formulário em 1 coluna com Salvar no rodapé, acima da área segura da tela; foco sem barra inferior; grade em agenda.

**6.2 Tipografia** (depois de D3; `index.css` linhas 86–127 e 661–790)
Se D3 = guia:
- Celular: `--font-size-page-title-mobile` 18 → 22; `--font-size-item-title` 14 → 16; campos com 16 nos dois.
- Apagar as regras de texto de 4.3.
- Peso do título da página: 700 → 600; entrelinha 1,15 → 1,25 (guia).
- Trocar `font-semibold/bold/medium` soltos (596) por `<Text variant>` **tela por tela** durante o 6.3. Não é troca mecânica: cada uso precisa escolher a variante.

**6.3 Migração por tela**
- Ordem: formulários primeiro (Perfil e Pilar novo foram os mais desalinhados na medição; ambos **em andamento**), depois Hoje, depois Planejamento, depois o resto da tabela.
- Em cada tela: tipo definido, cabeçalho no padrão, `Surface` no lugar de card feito à mão, `Text` no lugar de classe de fonte, os três estados.
- Conferir em 390, 900 e 1440, nos dois temas, e passando por tudo com Tab.

### Aceite
Toda página de `src/features/*/pages` passa um `tipo` ou usa o layout público. Formulários com no máximo 720px. Nenhuma página com dois botões primários. `scripts/measure-ui.js` igual entre páginas do mesmo tipo.

---

## Fase 7 — Proteções finais e documentação

**7.1** Regras da catraca que chegaram a zero passam a erro em `lint-design.mjs`. As outras continuam contando.
**7.2** Reescrever as seções de tokens, foco, cor, tamanhos de controle e tipos de página no `DESIGN.md`. Fundir o `BUTTON_SYSTEM.md` nele ou deixar só um link, para não ter duas fontes de verdade.
**7.3** Documentar no `DESIGN.md` como usar as fotos de referência e `scripts/measure-ui.js`.
**7.4** `graphify update .` depois das fases que mexem em código. Atualizar a memória da direção de design com o que foi aplicado.

---

## Verificação de cada commit

1. `npm run check` (textos, lint de design com catraca, tipos, testes, build).
2. Fotos das rotas afetadas, comparadas com `tmp/design-baseline/`. Toda diferença precisa estar prevista na fase.
3. `scripts/measure-ui.js` nas telas afetadas (fases 3, 4 e 6).
4. Tab do início ao fim da tela: anel de foco visível em todo controle.
5. Tema escuro, mesmo que a mudança pareça ser só do claro.
6. Só navegação no dev: nenhum clique que salve dado real.

## Critério de pronto do projeto

- `npm run check` passa sem avisos das regras novas.
- Catraca zerada nas regras de cor, canto, espaçamento e campo solto; `[var(--x)]` só para tokens que não têm classe equivalente.
- `scripts/measure-ui.js`: no máximo 3 alturas de controle no desktop, 44px no celular, campo e botão iguais na mesma linha.
- Um corte só (1024) no CSS e nos componentes.
- `DESIGN.md` como fonte única, descrevendo o que está no código.

## Riscos

| Risco | Cuidado |
|---|---|
| Outra sessão editando o mesmo arquivo | Conferir `git status` e as sessões abertas antes de cada fase; arquivos em andamento ficam para depois do commit da outra sessão |
| Fase 2 muda a cor do app inteiro de uma vez | Commit isolado, fácil de reverter; conferir as 72 fotos antes |
| Texto tingido calibrado com o preto antigo | O teste de 2.5 acusa; ajustar `--tint-text-share` / `--user-tint-text-share` |
| `md:` → `lg:` mexe no layout entre 768 e 1023 | Uma pasta por commit, conferindo as fotos de 900 |
| Codemod pegando texto que não é classe | Restringir a `className`, `cn()` e constantes de classe; `tsc` e testes depois de cada pasta |
| Nomes repetidos no `@theme` do Tailwind 4 | Teste do mapa (1.3) e a regra dos nomes de 1.2 |
