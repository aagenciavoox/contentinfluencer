/** Tabelas espelhadas em AppContext e na migration supabase_realtime. */
export const REALTIME_TABLES = [
  'agenda_items',
  'anotacoes',
  'biblioteca_generos',
  'biblioteca_items',
  'content_metrics',
  'content_plataformas',
  'contents',
  'cenarios',
  'dna_voz',
  'golden_rules',
  'ideas',
  'item_generos',
  'looks',
  'pilar_plataformas',
  'pilares',
  'platforms',
  'projeto_conteudos',
  'projeto_etapas',
  'projetos',
  'recording_block_contents',
  'recording_blocks',
  'serie_pilares',
  'serie_plataformas',
  'series',
  'templates',
  'user_preferences',
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
