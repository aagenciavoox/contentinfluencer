# Auditoria de Design System — Tela Inicial

**Arquivos auditados:**
- `src/features/dashboard/pages/DashboardPage.tsx` (desktop)
- `src/mobile/screens/dashboard/DashboardMobileScreen.tsx` (mobile)
- `src/styles/index.css` (tokens)
- `src/components/ui/Text.tsx`, `AppButton.tsx`

**Data:** 2026-06-23

---

## Resumo

| Métrica | Resultado |
|---------|-----------|
| Componentes revisados | 9 |
| Problemas encontrados | 8 |
| Score estimado | 68/100 |

O sistema de tokens está bem estabelecido (cores, raios, tipografia). Os problemas concentram-se em três áreas: **tipografia paralela** (`notion-title` + `eyebrow-label` fora do `Text`), **botões de card sem padrão unificado** (raw `<button>` com classes manuais), e a **tela mobile ignorando o componente `Text`** por completo.

---

## 1. Cobertura de Tokens

### Cores
| Categoria | Tokens definidos | Valores hardcoded encontrados |
|-----------|-----------------|-------------------------------|
| Background / Surface | ✅ completo | 0 |
| Tipografia | ✅ completo | 1 — `text-sm` (linha 96, mobile) |
| Status | ✅ completo | 0 |
| Status *tints* (fundo) | ❌ não existem | 5 instâncias de `color-mix(in_srgb,var(--status-*),transparent_90%)` |
| Warning tint | ❌ não existe | 2 instâncias de `color-mix(in_srgb,var(--warning),transparent_9X%)` |

**Problema — status tint tokens ausentes.** As variantes de fundo semitransparente dos status são calculadas inline em vez de virem de um token. Exemplo no `SpotlightBlock`:

```tsx
// Atual — cálculo ad-hoc
bg-[color-mix(in_srgb,var(--status-ready),transparent_90%)]

// Melhor — token dedicado
bg-[var(--status-ready-bg)]
```

Sugestão: adicionar no `:root` uma série `--status-*-bg` com `color-mix` pré-calculado.

### Espaçamento
| Token | Valor | Tailwind equivalente | Usado? |
|-------|-------|---------------------|--------|
| `--space-lg` | 16px | `p-4` | ✅ |
| `--space-xl` | 24px | `p-6` | ✅ |
| `--space-2xl` | 32px | `p-8` | ⚠️ usado via Tailwind, não via token |
| *(sem token)* | 20px | `p-5`, `px-5`, `space-y-5` | ❌ |

`px-5` (20px) aparece em 3 lugares no dashboard sem token correspondente. Considerar adicionar `--space-md2: 20px` ou mapear para `--space-xl`.

### Raios
Uso correto em toda a tela — `var(--radius-card)`, `var(--radius-input)`, `var(--radius-pill)`. Exceção no mobile:

```tsx
// DashboardMobileScreen.tsx linha 237 — hardcoded Tailwind
<div className={`mb-3 inline-flex rounded-xl p-2 ${toneClass}`}>
// Deveria ser: rounded-[var(--radius-card)] ou rounded-token-inner
```

---

## 2. Consistência de Tipografia

### Problema crítico: `notion-title` bypassa o `Text`

O componente `Text` com `variant="sectionTitle"` mapeia para `t-section-title` (1.25rem desktop). Mas em todos os 4 casos de `SpotlightBlock`, um `className="notion-title"` é sobreposto, aplicando `2rem / font-weight: 700` — um estilo completamente diferente e não representado em nenhuma variante do `Text`.

```tsx
// Atual — variante inventada inline
<Text variant="sectionTitle" className="notion-title mt-3">

// Melhor — criar variante no Text
<Text variant="display" className="mt-3">
// ou nova variante "spotlightTitle"
```

Isso cria uma terceira escala tipográfica paralela sem documentação. O `Text` tem `display` (`2.5rem`) e `sectionTitle` (`1.25rem`) mas não tem nada em `2rem`.

### Problema: `eyebrow-label` não tem variante no `Text`

A classe `.eyebrow-label` é usada 7 vezes como `<span className="eyebrow-label">` direto no JSX. O componente `Text` não possui uma variante `eyebrow`, então o padrão é aplicado manualmente sem encapsulamento.

```tsx
// Atual — 7x no DashboardPage
<span className="eyebrow-label">Próximo passo</span>

// Melhor — variante no Text
<Text variant="eyebrow">Próximo passo</Text>
```

### Problema: Mobile ignora `Text` por completo

`DashboardMobileScreen.tsx` usa `<p className="t-section-title">`, `<p className="t-secondary">`, `<p className="t-label">` diretamente, sem passar pelo componente `Text`. Isso torna a tela mobile imune a mudanças centralizadas na escala tipográfica.

```tsx
// Mobile — classe utilitária raw
<p className="t-section-title text-[var(--text-primary)]">Resumo do dia</p>

// Padrão correto
<Text variant="sectionTitle">Resumo do dia</Text>
```

| Arquivo | Uso de `Text` | Uso de classes raw |
|---------|--------------|-------------------|
| `DashboardPage.tsx` | ✅ parcial | `eyebrow-label` raw |
| `DashboardMobileScreen.tsx` | ❌ ausente | `t-section-title`, `t-secondary`, `t-label` todos raw |

---

## 3. Completude de Componentes

### Problema: Botões de card sem padrão compartilhado

A tela tem 4 padrões distintos de elemento interativo, todos implementados com raw `<button>` + classes manuais em vez de reutilizar ou estender `AppButton`:

| Padrão | Onde | Classes de hover |
|--------|------|-----------------|
| SpotlightBlock clicável | `SpotlightBlock` | `hover:bg-[var(--bg-hover)]` |
| Project card | grid de urgentProjects | `hover:bg-[var(--bg-hover)]` |
| QuickAction pill | seção Atalhos | `hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]` |
| ContentRow | dentro de `OperationalList` | `hover:bg-[var(--bg-hover)]` |

**Nenhum deles tem `focus-visible:`**, o que é uma lacuna de acessibilidade por teclado. O `AppButton` tem `focus-visible:shadow-[var(--focus-ring)]` definido, mas esses botões ad-hoc não herdam isso.

### Problema: Componentes locais não reaproveitados

`QuickAction`, `OperationalList` e `ContentRow` são definidos no final de `DashboardPage.tsx`. O padrão `OperationalList` (eyebrow + lista + "ver tudo") e `ContentRow` (título + meta + seta) são reutilizáveis em outras listas do produto mas vivem somente na página do dashboard.

### Arquivo duplicado

`src/pages/Dashboard.tsx` e `src/features/dashboard/pages/DashboardPage.tsx` coexistem. O arquivo em `src/pages/` provavelmente é um resquício da arquitetura anterior. Verificar qual o router usa e remover o outro.

---

## 4. Estados de Componente

| Componente | Default | Hover | Focus | Disabled | Loading |
|-----------|---------|-------|-------|----------|---------|
| `SpotlightBlock` (botão) | ✅ | ✅ | ❌ | — | — |
| Project card (botão) | ✅ | ✅ | ❌ | — | — |
| `QuickAction` | ✅ | ✅ | ❌ | — | — |
| `ContentRow` | ✅ | ✅ | ❌ | — | — |
| `OperationalList` footer | ✅ | ✅ | ❌ | — | — |
| `FocusMetric` (mobile) | ✅ | — | — | — | — |
| Warning banner (botão) | ✅ | ✅ | ❌ | — | — |

**Todos os botões de card carecem de estado focus-visible.**

---

## 5. Ações Prioritárias

### P0 — Acessibilidade (crítico)

Adicionar `focus-visible:` a todos os raw `<button>` interativos na página. O token já existe:

```tsx
// Adicionar a todos os <button> card/row/pill:
focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]
```

### P1 — Coesão tipográfica

1. Adicionar variante `eyebrow` ao `Text` componente mapeando `.eyebrow-label`
2. Criar variante `spotlightTitle` (ou usar `display` com tamanho ajustado) e remover o padrão `notion-title` inline no SpotlightBlock
3. Migrar `DashboardMobileScreen` para usar `<Text>` em vez de classes raw

### P2 — Tokens de tint de status

Adicionar tokens pré-computados em `index.css`:

```css
:root {
  --status-ready-bg:     color-mix(in srgb, var(--status-ready), transparent 90%);
  --status-recorded-bg:  color-mix(in srgb, var(--status-recorded), transparent 90%);
  --status-scheduled-bg: color-mix(in srgb, var(--status-scheduled), transparent 90%);
  --warning-bg:          color-mix(in srgb, var(--warning), transparent 94%);
  --warning-bg-hover:    color-mix(in srgb, var(--warning), transparent 88%);
}
```

### P3 — Organização

1. Mover `OperationalList` e `ContentRow` para `src/components/ui/` se reutilizados em outras telas
2. Remover `src/pages/Dashboard.tsx` se o router aponta para `DashboardPage.tsx`
3. Substituir `rounded-xl` hardcoded no `FocusMetric` por `rounded-[var(--radius-card)]`
4. Adicionar token de espaçamento para 20px ou alinhar os `p-5`/`space-y-5` para o token existente mais próximo
