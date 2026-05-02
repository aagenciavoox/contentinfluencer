export const LOCAL_REALTIME_SUPPRESSION_MS = 1200;

export function shouldSkipRealtimeRefresh(
  lastLocalMutationAt: number | null,
  now: number,
  suppressionMs = LOCAL_REALTIME_SUPPRESSION_MS
): boolean {
  if (lastLocalMutationAt === null) return false;
  return now - lastLocalMutationAt < suppressionMs;
}
