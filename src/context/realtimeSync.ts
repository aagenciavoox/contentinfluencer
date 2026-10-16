/** Tabelas espelhadas em AppContext e na migration supabase_realtime. */
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
