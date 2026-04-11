# Design Fixes — Content OS
> Ordem de prioridade. Sem refactor estrutural. Só troca de classes e tokens.

---

## RAIZ DO PROBLEMA — Por que parece dois projetos diferentes

O projeto tem **dois sistemas tipográficos paralelos** que nunca conversam:

```
Sistema A — "micro"     → text-[9px/10px/11px] font-black uppercase tracking-widest
Sistema B — "display"   → text-lg / text-2xl / text-3xl / text-4xl font-black
```

**A zona morta:** não existe quase nada em 12–16px com peso normal.
Isso é exatamente onde o Notion vive — é o "corpo" da interface.

```
Escala real do projeto hoje:
7px  ████░░░░░░░░░░░░░░░░░░░░░░░░░░  (6×)    ← invisível
8px  ████████░░░░░░░░░░░░░░░░░░░░░░  (30×)   ← quase invisível
9px  ████████████████████████████░░  (197×)  ← mais usado — labels
10px ████████████████████████████████(277×)  ← mais usado — labels
11px ████████████░░░░░░░░░░░░░░░░░░  (57×)   ← labels maiores
12px ████████████████████░░░░░░░░░░  (143×)  ← text-xs
14px ████████████████████░░░░░░░░░░  (156×)  ← text-sm
──── VAZIO ────────────────────────────────── ← aqui deveria estar o corpo
18px ████░░░░░░░░░░░░░░░░░░░░░░░░░░  (16×)   ← text-lg
20px ████░░░░░░░░░░░░░░░░░░░░░░░░░░  (23×)   ← text-xl
24px ████░░░░░░░░░░░░░░░░░░░░░░░░░░  (23×)   ← text-2xl (KPIs)
36px █████████████████████░░░░░░░░░  (20×)   ← text-4xl (títulos de página)
```

O olho não tem referência de "normal". Tudo é ou grito ou sussurro.

---

## FIX 0 · Escala tipográfica unificada (aplicar ANTES dos outros fixes)

**Arquivo:** `src/index.css` — adicionar as classes utilitárias abaixo

```css
/* ── TYPE SCALE — substituir o caos atual ──────────────────────── */

/* DISPLAY: títulos de página */
.t-display {
  font-size: 1.75rem;     /* 28px — era text-3xl/4xl (36-48px) */
  font-weight: 900;
  letter-spacing: -0.02em;
  font-style: italic;
}

/* HEADING: títulos de seção, card headers */
.t-heading {
  font-size: 0.9375rem;   /* 15px — era text-lg/xl (18-20px) */
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* BODY: texto de conteúdo principal */
.t-body {
  font-size: 0.875rem;    /* 14px = text-sm — ERA ZERO, ZONA MORTA */
  font-weight: 400;
  line-height: 1.6;
}

/* LABEL: labels de seção, cabeçalhos de coluna */
.t-label {
  font-size: 0.6875rem;   /* 11px — era text-[10px/11px] */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* META: datas, contagens, info secundária */
.t-meta {
  font-size: 0.75rem;     /* 12px = text-xs — ERA QUASE ZERO */
  font-weight: 400;
  opacity: 0.5;
}

/* TAG: badges de status, pills — MANTER CORES ATUAIS */
.t-tag {
  font-size: 0.6875rem;   /* 11px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

### Mapeamento direto — o que trocar por quê

| Situação | Antes | Depois |
|----------|-------|--------|
| Título da página (ex: "Inventário") | `text-3xl font-black italic` | `t-display` |
| Título de card/seção | `text-sm font-black` ou `text-lg font-black` | `t-heading` |
| Título de conteúdo na tabela | `text-sm font-bold` | `t-body` (weight 500) |
| Nome de série, autor de livro | `text-[10px] font-black uppercase` | `t-meta` |
| Labels de coluna (Título, Status…) | `text-[10px] font-black uppercase tracking-[0.2em]` | `t-label` |
| Label de nav sidebar | `text-[11px] font-black uppercase tracking-widest` | `t-label` |
| Badges de status coloridos | `text-[9px] font-black uppercase` | `t-tag` |
| Datas, "há X dias", contadores | `text-[9px] font-black` | `t-meta` |
| KPI números grandes (postados/ideias) | `text-2xl font-black` | manter — é intencional |

### Por que o Notion parece "certo"

Notion usa basicamente **3 tamanhos** na interface (sem contar títulos de página):
- `14px / weight 400` — corpo de qualquer coisa
- `12px / weight 500 / opacity 0.6` — metadata e labels secundárias
- `11px / weight 600 / uppercase` — rótulos de seção

Nada usa `font-black` fora de títulos de página e números de KPI.
O peso pesado **só aparece quando tem algo importante para dizer.**

---

---

## FIX 1 · Sidebar — unificar estado ativo
**Arquivo:** `src/components/Sidebar.tsx`

**Problema:** 3 padrões de ativo coexistindo. Padronizar tudo no modelo `border-l`.

**Padrão único a adotar:**
```ts
// ATIVO
'bg-[var(--bg-hover)] text-[var(--text-primary)] border-l-2 border-[var(--text-primary)]'

// INATIVO
'text-[var(--text-primary)] opacity-50 hover:opacity-80 hover:bg-[var(--bg-hover)] italic'
```

**Remover** o `scale-[1.02]` e `shadow-xl` dos links Home/Biblioteca — cria inconsistência de elevação.

**Subitens** (Results, Settings items): trocar `underline` por:
```ts
'text-[var(--text-primary)] opacity-100 bg-[var(--bg-hover)] rounded-md'
```

---

## FIX 2 · Tokens de status — centralizar no CSS
**Arquivo:** `src/index.css`

Adicionar ao `:root` e `[data-theme='dark']`:
```css
/* STATUS TOKENS — adicionar em :root */
--status-idea:      rgba(156,163,175,1);
--status-ready:     var(--accent-orange);
--status-recorded:  var(--accent-purple);
--status-editing:   #F59E0B;
--status-edited:    var(--accent-blue);
--status-scheduled: #06B6D4;
--status-posted:    var(--accent-green);

/* [data-theme='dark'] — mesmo mapa, cores já ajustam via accent vars */
```

**Arquivo:** `src/pages/Dashboard.tsx`

Trocar o objeto `STATUS_CONFIG` — substituir Tailwind hardcoded por inline style com os tokens:
```ts
// ANTES (hardcoded Tailwind)
'Postado': { color: 'text-green-500', bg: 'bg-green-500/10', ... }

// DEPOIS (usar CSS var via style prop)
'Postado': { cssVar: '--status-posted' }
// No JSX: style={{ color: `var(--status-posted)`, background: `color-mix(in srgb, var(--status-posted), transparent 88%)` }}
```

**Arquivo:** `src/components/contents/ContentTable.tsx`

Mesma substituição no objeto `statusColors`:
```ts
// ANTES
const statusColors: Record<string, string> = {
  'Postado': 'bg-green-500',
  ...
}

// DEPOIS
const statusVars: Record<string, string> = {
  'Ideia':              '--status-idea',
  'Pronto para Gravar': '--status-ready',
  'Gravado':            '--status-recorded',
  'A Editar':           '--status-editing',
  'Editado':            '--status-edited',
  'Programado':         '--status-scheduled',
  'Postado':            '--status-posted',
}
// Uso: style={{ background: `var(${statusVars[content.status]})` }}
```

---

## FIX 3 · Border-radius — escala consistente
**Arquivo:** `src/index.css`

```css
/* SUBSTITUIR no bloco de inputs globais */
border-radius: 1rem;   /* ← REMOVER */
border-radius: 0.5rem; /* ← COLOCAR (rounded-lg = 8px) */
```

**Arquivos:** todos os componentes

Busca global e substituição (não mexe em tags de status que usam `rounded-full`):

| Trocar | Por | Onde |
|--------|-----|------|
| `rounded-3xl` | `rounded-2xl` | Cards do Dashboard, modais |
| `rounded-2xl` em botões/inputs | `rounded-lg` | Nav items, buttons, inputs |
| `rounded-2xl` em NavLink | `rounded-lg` | Sidebar NavLinks |

> **Manter `rounded-full`** nas tags de status e badges de contagem — é intencional.

---

## FIX 4 · Tipografia — aliviar body text
**Arquivos:** `Dashboard.tsx`, `ContentTable.tsx`, `ContentDetailModal.tsx`

Regra geral — aplicar onde o texto é **conteúdo** (não label de seção ou botão de ação):

```ts
// Labels de seção → MANTER como está
'text-[10px] font-black uppercase tracking-widest'

// Texto de item (título de conteúdo, nome de série) → MUDAR
'text-sm font-medium'  // era: 'text-[11px] font-black uppercase tracking-widest'

// Metadados auxiliares (datas, contagens) → MUDAR
'text-xs font-medium opacity-50'  // era: 'text-[9px] font-black opacity-60'
```

---

## FIX 5 · Separadores de seção no Dashboard
**Arquivo:** `src/pages/Dashboard.tsx`

Adicionar este componente local antes de cada bloco principal:
```tsx
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-color)]" />
    </div>
  );
}
```

Inserir antes de: Pipeline, Próximos 3 dias, Atenção, KPIs.

---

## FIX 6 · Estados vazios
**Arquivos:** `Dashboard.tsx` (colunas do pipeline), `Ideas.tsx`, `ContentTable.tsx`

```tsx
// ANTES
<p className="text-[9px] opacity-40 italic">Vazio</p>

// DEPOIS
<div className="flex flex-col items-center gap-1.5 py-3 opacity-25">
  <div className="w-4 h-4 rounded-full border-2 border-dashed border-[var(--text-tertiary)]" />
  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
    Vazio
  </p>
</div>
```

---

## FIX 7 · Inputs em modais — variante inline
**Arquivo:** `src/index.css`

Adicionar classe utilitária (não afeta inputs globais):
```css
.input-inline {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--border-color) !important;
  border-radius: 0 !important;
  padding: 0.375rem 0 !important;
  font-weight: 500 !important;
  box-shadow: none !important;
}
.input-inline:focus {
  border-bottom-color: var(--accent-blue) !important;
  box-shadow: none !important;
}
```

**Arquivo:** `src/components/ContentDetailModal.tsx`

Adicionar `input-inline` nos campos de título, notas e referências dentro do modal (não nos selects de status/plataforma — esses mantêm estilo atual).

---

## Ordem de execução recomendada

```
1. FIX 2 (tokens CSS) — base para os demais
2. FIX 1 (sidebar) — impacto visual imediato, zero risco
3. FIX 3 (border-radius) — busca/substitui, testar visual
4. FIX 4 (tipografia) — ajuste fino por arquivo
5. FIX 5 (separadores) — adicionar componente, inserir nos pontos certos
6. FIX 6 (estados vazios) — busca por "Vazio" no projeto
7. FIX 7 (input-inline) — último, só em ContentDetailModal
```
