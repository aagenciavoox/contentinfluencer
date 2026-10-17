/** Tabelas cujas gravações avisam as outras abas e aparelhos (Broadcast em AppContext). */
export const REALTIME_TABLES = [
  'agenda_items',
  'planejamento_postits',
  'anotacoes',
  'biblioteca_generos',
  'biblioteca_items',
  'content_metrics',
  'content_plataformas',
  'content_temas',
  'contents',
  'cenarios',
  'golden_rules',
  'ideas',
  'item_generos',
  'looks',
  'pilar_plataformas',
  'pilares',
  'platforms',
  'posting_times',
  'projeto_conteudos',
  'projeto_etapas',
  'projeto_livros',
  'projetos',
  'recording_block_contents',
  'recording_blocks',
  'serie_pilares',
  'serie_plataformas',
  'series',
  'templates',
  'temas',
  'user_preferences',
  'editorial_conta',
  'editorial_visao',
  'editorial_destino_padrao',
  'editorial_limite_hashtag',
  'decisao_periodo',
  'ajuste_semana',
] as const;

const REALTIME_TABLE_SET: ReadonlySet<string> = new Set(REALTIME_TABLES);

// O MCP manda o aviso no mesmo canal e evento (mcp/src/avisoSync.ts): mudar aqui é mudar lá.
export const SYNC_EVENT = 'tabelas-mudaram';

export function syncChannelName(userId: string): string {
  return `content-os-sync:${userId}`;
}

/** Tabelas conhecidas de um aviso recebido; o resto é ignorado. */
export function changedTablesFromPayload(payload: unknown): string[] {
  const tables = (payload as { tables?: unknown } | null)?.tables;
  if (!Array.isArray(tables)) return [];
  return [...new Set(tables.filter((table): table is string =>
    typeof table === 'string' && REALTIME_TABLE_SET.has(table)
  ))];
}

export const SYNC_ANNOUNCE_DELAY_MS = 1000;

/**
 * Junta as tabelas gravadas num intervalo curto e manda um aviso só: o autosave grava a cada
 * pausa na digitação, e quem recebe recarrega no máximo a cada 30 s.
 */
export function createTableAnnouncer(
  send: (tables: string[]) => void,
  delayMs = SYNC_ANNOUNCE_DELAY_MS
) {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0) return;
    const tables = [...pending];
    pending.clear();
    send(tables);
  };

  return {
    add(table: string) {
      if (!REALTIME_TABLE_SET.has(table)) return;
      pending.add(table);
      if (!timer) timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}

export const REALTIME_REFRESH_DEBOUNCE_MS = 1500;

/**
 * Quanto esperar para recarregar o que um aviso pediu: a folga de sempre depois do último aviso e,
 * se a última recarga foi há pouco, o resto da janela mínima. Antes, o pedido dentro da janela era
 * descartado e a mudança só aparecia na recarga seguinte.
 */
export function realtimeRefreshDelay(
  lastRefreshAt: number,
  now: number,
  minIntervalMs: number,
  debounceMs = REALTIME_REFRESH_DEBOUNCE_MS
): number {
  const windowLeft = lastRefreshAt > 0 ? lastRefreshAt + minIntervalMs - now : 0;
  return Math.max(debounceMs, windowLeft);
}

export const LOCAL_REALTIME_SUPPRESSION_MS = 3000;

export function shouldSkipRealtimeRefresh(
  lastLocalMutationAt: number | null,
  now: number,
  pendingPersistCount = 0,
  suppressionMs = LOCAL_REALTIME_SUPPRESSION_MS
): boolean {
  if (pendingPersistCount > 0) return true;
  if (lastLocalMutationAt === null) return false;
  return now - lastLocalMutationAt < suppressionMs;
}
