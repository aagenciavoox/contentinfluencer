# Design Fixes — Fase 2
> Problemas sistêmicos. Mesma lógica: arquivo-alvo, o que trocar, por quê.

---

## RAIZ DOS PROBLEMAS DESTA FASE

Oito decisões tomadas de forma isolada, página por página, que juntas criam a sensação de "projetos diferentes":

1. `transition-all` em tudo → interface "treme" em vez de responder
2. 10 valores de hover scale → olho não aprende o padrão
3. Sombras sem sistema de elevação → nada parece no lugar certo
4. `opacity` como cor → tudo parece apagado ao mesmo tempo
5. `italic` sem regra → decorativo e aleatório
6. Títulos de página sem padrão → cada tela parece autoria diferente
7. 12 larguras máximas → conteúdo "salta" entre páginas
8. Dois padrões de aba ativa → sem lógica definida

---

## FIX 1 · Substituir `transition-all` por transições específicas

**Impacto:** alto — resolve o "tremido" visual em toda a interface

**Arquivo:** `src/index.css` — adicionar regra global

```css
/* Substituir comportamento padrão do Tailwind */
.transition-all {
  transition-property: color, background-color, border-color, opacity !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  transition-duration: 150ms !important;
}
```

Isso mantém as classes existentes no JSX sem precisar tocar em nenhum componente, mas restringe o que anima. Só cor, fundo, borda e opacidade — nunca tamanho ou posição por padrão.

**Exceção:** onde escala é intencional (botão primário de ação, cards de ideia), manter `transition-transform` explícito.

---

## FIX 2 · Escala de hover — dois valores, não dez

**Arquivo:** `src/index.css`

Definir dois comportamentos e usar só eles:

```css
/* Hover de card (lista, tabela, item navegável) */
.hover-card:hover {
  background-color: var(--bg-hover);
}

/* Hover de botão de ação primária */
.hover-action:hover  { transform: scale(1.02); }
.hover-action:active { transform: scale(0.97); }
```

**Busca global** — substituir por categoria:

| Situação | Antes | Depois |
|----------|-------|--------|
| Item de lista, row de tabela, card navegável | `hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1` | `hover-card` (só muda fundo) |
| Botão primário (Salvar, Capturar, Novo) | `hover:scale-105 active:scale-95` | `hover-action` |
| Ícone ou avatar | `hover:scale-110` ou `hover:scale-125` | remover — usar `hover:opacity-100` |
| Botão de close, ícone de ação secundária | qualquer scale | remover completamente |

O Notion não escala nada exceto o ícone de emoji de página. Escala cria expectativa de "isso vai acontecer algo grande" — reservar só pra CTA principal.

---

## FIX 3 · Sistema de elevação com 3 níveis de sombra

**Arquivo:** `src/index.css`

```css
/* NÍVEL 0 — superfície base, sem elevação */
/* sem sombra */

/* NÍVEL 1 — cards, inputs, itens de lista */
.elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); }

/* NÍVEL 2 — dropdowns, tooltips, popovers */  
.elevation-2 { box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04); }

/* NÍVEL 3 — modais, drawers, overlays */
.elevation-3 { box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06); }
```

**Mapeamento:**

| Elemento | Antes | Depois |
|----------|-------|--------|
| Cards do Dashboard | `shadow-sm` ou `shadow-xl` | `elevation-1` |
| Sidebar | sem sombra | sem sombra (correto) |
| Dropdown de select | `shadow-lg` | `elevation-2` |
| ContentDetailModal | `shadow-2xl` | `elevation-3` |
| Botão primário em hover | `shadow-xl` | `elevation-1` (sutil) |
| `hover:shadow-2xl` em cards | remover | `hover-card` (só fundo muda) |

---

## FIX 4 · Usar tokens de texto em vez de `opacity`

**Problema:** `text-[var(--text-primary)] opacity-40` ≠ `text-[var(--text-secondary)]`. O primeiro deixa o texto translúcido (mostra fundo). O segundo tem cor própria.

**Arquivo:** `src/index.css` — os tokens já existem, só não estão sendo usados:
```css
/* já definido — só passar a usar */
--text-secondary: rgba(55, 53, 47, 0.65);
--text-tertiary:  rgba(55, 53, 47, 0.4);
```

**Regra de substituição:**

| Padrão atual | Substituir por |
|--------------|----------------|
| `text-[var(--text-primary)] opacity-60` | `text-[var(--text-secondary)]` + remover opacity |
| `text-[var(--text-primary)] opacity-40` | `text-[var(--text-tertiary)]` + remover opacity |
| `text-[var(--text-primary)] opacity-30` | `text-[var(--text-tertiary)]` + remover opacity |
| `text-[var(--text-primary)] opacity-20` | `text-[var(--text-tertiary)] opacity-60` |
| `opacity-100` em hover | `hover:text-[var(--text-primary)]` |

**Atenção:** `opacity` em elementos inteiros (ícones, containers desabilitados) está correto — só substituir quando usado especificamente pra escurecer texto.

---

## FIX 5 · `italic` — duas regras, usar em dois lugares só

**Regra:**
- `italic` em **títulos de página** → intencional, mantém identidade
- `italic` em **estado inativo de nav** → remover, usar `opacity` já definido
- `italic` em **placeholder de input** → manter (já no CSS global)
- `italic` em qualquer outro lugar → remover

**Busca global:**
```
grep -rn "italic" src/ --include="*.tsx"
```

Filtrar e remover todos que não sejam: `<h1>`, `placeholder`, ou nav inativo específico.

---

## FIX 6 · Padrão único de título de página

**Definir um componente:**

```tsx
// src/components/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-10">
      <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-[var(--text-secondary)] font-medium">
          {subtitle}
        </p>
      )}
    </header>
  );
}
```

**Substituir em todos os arquivos de página:**

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `Dashboard.tsx` | `text-3xl md:text-4xl italic` | `<PageHeader title="Command Center" />` |
| `Ideas.tsx` | `text-4xl md:text-5xl italic` | `<PageHeader title="Caixa de Ideias" />` |
| `Agenda.tsx` | `text-4xl md:text-5xl` (sem italic) | `<PageHeader title="Agenda" />` |
| `Results.tsx` | `text-4xl md:text-5xl` (sem italic) | `<PageHeader title="Resultados" />` |
| `settings/DNAVoz.tsx` | `text-4xl` (sem responsive) | `<PageHeader title="DNA da Voz" />` |
| demais pages | variações | `<PageHeader ... />` |

---

## FIX 7 · Dois containers, não doze

**Definir dois max-widths e usar só eles:**

```css
/* src/index.css */
.content-narrow { max-width: 48rem;  /* 768px  — formulários, leituras */ }
.content-wide   { max-width: 80rem;  /* 1280px — tabelas, dashboards  */ }
```

**Mapeamento:**

| Página | Atual | Depois |
|--------|-------|--------|
| Dashboard | `max-w-7xl` | `content-wide` |
| Inventário (tabela) | sem max-w | `content-wide` |
| Ideas (form) | `max-w-3xl` | `content-narrow` |
| Biblioteca | `max-w-5xl` | `content-wide` |
| Settings pages | `max-w-2xl` / `max-w-3xl` | `content-narrow` |
| Modais internos | `max-w-[420px]` etc | manter inline — são casos específicos |

---

## FIX 8 · Padrão único de aba ativa

**Regra:**
- Aba ativa dentro de **modal ou painel** → `bg-[var(--text-primary)] text-[var(--bg-primary)]`
- Aba ativa no **header de página** → `bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm` (fundo mais claro que o container)
- `bg-[var(--accent-blue)]` em aba ativa → **remover** — reservar azul para ações de destaque, não navegação

**Arquivo:** `src/pages/Contents.tsx` — tab "Inventário / Blocos"
```tsx
// ANTES (tab Blocos usa accent-blue)
mainTab === 'recording' ? "bg-[var(--accent-blue)] text-white shadow-lg" : ...

// DEPOIS (mesmo padrão da outra tab)
mainTab === 'recording' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm" : ...
```

---

## Ordem de execução recomendada

```
1. FIX 4 (opacity → tokens)       — maior retorno visual, zero risco
2. FIX 1 (transition-all)         — uma linha no CSS, efeito global
3. FIX 6 (PageHeader component)   — cria consistência imediata entre páginas
4. FIX 8 (tab ativa)              — 2 linhas por arquivo
5. FIX 7 (containers)             — busca/substitui por arquivo
6. FIX 3 (sombras)                — substituir shadow-* pelos níveis
7. FIX 2 (hover scale)            — o mais trabalhoso, fazer por último
8. FIX 5 (italic)                 — revisão manual, arquivo por arquivo
```
