# ADR-001: Auditoria de Conexões de Dados — O que está mapeado vs o que está faltando

**Status:** Informativo (não é uma decisão, é um mapa de estado atual)
**Data:** 2026-06-13
**Escopo:** `src/lib/database.ts`, `src/context/`, `src/features/analytics/`

---

## Resumo Executivo

O sistema tem uma camada de dados sólida via Supabase com realtime sync. Mas há **4 gaps críticos** e **3 gaps menores** que deixam funcionalidades importantes sem conexão real de dados.

---

## O QUE ESTÁ MAPEADO ✅

Todas as tabelas abaixo têm fetch, save, delete e estão no `REALTIME_TABLES`:

| Domínio | Tabelas |
|---------|---------|
| `bootstrap` | `platforms`, `user_preferences` |
| `voice` | `dna_voz` |
| `production` | `pilares`, `pilar_plataformas`, `series`, `serie_pilares`, `serie_plataformas`, `cenarios`, `looks` |
| `library` | `biblioteca_generos`, `biblioteca_items`, `item_generos`, `anotacoes` |
| `content` | `contents`, `content_plataformas` |
| `ideas` | `ideas` |
| `projects` | `projetos`, `projeto_etapas`, `projeto_conteudos` |
| `recording` | `recording_blocks`, `recording_block_contents` |
| `templates` | `templates` |
| `agenda` | `agenda_items` |
| `rules` | `golden_rules` |
| `analytics` | `content_metrics` |

**Total:** 26 tabelas mapeadas, realtime em todas, fetch lazy por domínio.

---

## GAPS CRÍTICOS ❌

### 1. `EnergyLog` — Interface Órfã

**Onde:** `src/lib/database.ts` linha ~408

```typescript
export interface EnergyLog {
  id: string;
  userId: string;
  date: string;
  level: number;
  notes?: string;
  createdAt?: string;
}
```

**O que falta:**
- Nenhuma função `fetchEnergyLogs()` ou `saveEnergyLog()`
- Não existe `AppDataDomain` para energy (`'bootstrap' | 'content' | ... | 'production'` — sem `'energy'`)
- Não está em `AppData` (o objeto de estado global)
- Não está em `REALTIME_TABLES`
- Nenhum componente da UI referencia este tipo

**Diagnóstico:** A entidade foi planejada e a interface foi criada, mas a implementação nunca aconteceu. O campo `energiaNecessaria` em `Content` (`'baixa' | 'média' | 'alta'`) é o único proxy para energia, mas é por conteúdo, não por dia/log.

**Impacto:** Qualquer feature de "energia do dia" (ex: recomendar gravar com energia alta em dias específicos) não tem dados reais.

---

### 2. Métricas de Plataforma — 100% Manual, Zero API

**Onde:** `src/features/analytics/pages/AnalyticsPage.tsx`, tabela `content_metrics`

O sistema tem um modelo de métricas bem estruturado:

```typescript
export interface ContentMetric {
  views, likes, comments, saves, shares, reposts,
  newFollowers, accountsReached, watchTime,
  retentionRate, completionRate, qualitativeNotes, ...
}
```

**O que falta:** A entrada de dados é **100% manual**. Não há:
- Integração com Instagram Graph API
- Integração com TikTok for Developers API  
- Integração com YouTube Analytics API
- Nenhuma variável de ambiente para tokens OAuth de plataformas
- Nenhum webhook ou cron job de sync

**Diagnóstico:** As plataformas existem só como strings de nome (`'Instagram'`, `'TikTok'`, `'YouTube'`) — não são entidades com tokens de autenticação. A `AnalyticsPage` agrega `state.contentMetrics` (dados manuais) e os exibe como se fossem automáticos.

**Impacto:** Dados de performance ficam desatualizados ou inexistentes a não ser que o usuário entre manualmente. O loop de "postou → viu resultado → aprendeu" está quebrado por fricção.

---

### 3. Horários de Postagem — Preference Blob, Não Tabela

**Onde:** `src/features/settings/lib/postingTimes.ts`

```typescript
// Armazenado como JSON dentro de user_preferences:
// { key: 'posting_times', value: '{"1":["09:00"],"3":["18:00"]}' }
```

**O que falta:**
- Não há tabela `posting_times` — é um blob JSON dentro de `user_preferences`
- Não há diferenciação por plataforma (mesmo horário serve Instagram e TikTok?)
- Não há histórico ou versionamento de horários
- Não há correlação entre horário configurado e performance real (`content_metrics`)
- O componente `PostingTimeSuggestions` sugere horários mas não tem base estatística própria

**Impacto:** O sistema sabe que você quer postar às 18h, mas não consegue calcular se 18h performa melhor que 21h para cada plataforma.

---

### 4. Gemini AI — Chave no `.env`, Zero Uso no Código

**Onde:** `.env.example`

```
GEMINI_API_KEY="sua-gemini-api-key-aqui"
```

**O que falta:** Nenhum arquivo em `src/` importa ou usa o Gemini SDK. A chave existe no `.env.example` mas não há:
- Nenhuma chamada a `@google/generative-ai` ou similar
- Nenhuma feature de geração de roteiro/legenda/ideia com IA
- Nenhum endpoint de backend

**Diagnóstico:** Planejado, não implementado.

---

## GAPS MENORES ⚠️

### 5. `anotacao.destilada` — Campo Não Persistido

**Interface:**
```typescript
export interface Anotacao {
  destilada?: boolean;  // campo existe aqui
  ...
}
```

**Função `saveAnotacao`:** não inclui `destilada` no upsert. O campo nunca vai ao banco.

**Fix:** Adicionar `destilada: anotacao.destilada ?? false` no upsert.

---

### 6. `BibliotecaItemMeta` — Interface Definida, Não Salva

Interface detalhada existe (`editora`, `isbn`, `roteirista`, `duracaoPorEpisodio`, etc.) mas não há coluna `meta` nas queries de `biblioteca_items` nem no `saveBibliotecaItem`. Provavelmente planejado para uma coluna JSONB.

---

### 7. Agenda — Sem Sync de Calendário Externo

`agenda_items` existe no banco, mas não há integração com Google Calendar, Apple Calendar ou iCal. Eventos de publicação no `content_plataformas` (com `publishDate`) não geram automaticamente `agenda_items`.

---

## MAPA VISUAL

```
SUPABASE (mapeado)           GAP (não conectado)
─────────────────────        ──────────────────────────
platforms           ✅       Instagram Graph API    ❌
contents            ✅       TikTok API             ❌
content_metrics     ✅       YouTube Analytics API  ❌
ideas               ✅       Gemini AI              ❌
projetos            ✅       energy_logs (tabela)   ❌
agenda_items        ✅       Google Calendar        ❌
golden_rules        ✅       posting_times (tabela) ❌ (é blob)
dna_voz             ✅       anotacao.destilada     ⚠️ (bug)
...                          BibliotecaItemMeta     ⚠️ (planejado)
```

---

## PRIORIZAÇÃO SUGERIDA

| Prioridade | Gap | Esforço | Impacto |
|-----------|-----|---------|---------|
| 🔴 Alta | `anotacao.destilada` não salva | Baixo (1 linha) | Perda de dado silenciosa |
| 🔴 Alta | `EnergyLog` — implementar ou deletar | Baixo | Clareza do código |
| 🟡 Média | Horários por plataforma (tabela própria) | Médio | Personalização real |
| 🟡 Média | Gemini AI — decidir e implementar ou remover do `.env` | Médio | Features de IA |
| 🟢 Baixa | Instagram/TikTok/YouTube API | Alto | Automação de métricas |
| 🟢 Baixa | Google Calendar sync | Alto | UX de agenda |

---

## AÇÃO IMEDIATA RECOMENDADA

**Sem esforço:** Corrigir o bug do `anotacao.destilada` em `saveAnotacao`:

```typescript
// src/lib/database.ts — função saveAnotacao
export async function saveAnotacao(anotacao: Omit<Anotacao, 'createdAt' | 'deletedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('anotacoes').upsert({
    id: anotacao.id, user_id: anotacao.userId, item_id: anotacao.itemId,
    texto: anotacao.texto, tipo: anotacao.tipo, capitulo_ref: anotacao.capituloRef,
    content_potential: anotacao.contentPotential,
    destilada: anotacao.destilada ?? false,  // ← ADD THIS
  });
  if (error) throw new Error(`anotacoes: ${error.message}`);
}
```

**Limpeza:** Deletar `EnergyLog` de `database.ts` ou criar o domínio completo. Interface órfã gera confusão futura.
