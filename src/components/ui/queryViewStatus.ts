export type QueryViewStatus = 'loading' | 'empty' | 'error' | 'ready';

export type ResolveQueryViewStatusInput = {
  /** Auth or gate still loading — treat as loading. */
  authLoading?: boolean;
  /** Primary fetch in flight (no usable result yet). */
  loading: boolean;
  /** Background refresh; does not block empty/ready if we already have a settled result. */
  refreshing?: boolean;
  /** Fetch failed after attempt. */
  error?: string | null;
  /** True when at least one fetch cycle finished (success or error). */
  fetchAttempted?: boolean;
  /** Whether the query is enabled (e.g. user present). When false and auth not loading → loading. */
  enabled?: boolean;
  /** Item count for the current view (after filters). */
  itemCount: number;
  /**
   * When true, empty cache during refresh still shows loading if we never settled.
   * Prefer keeping prior items visible while refreshing.
   */
  treatRefreshingAsLoading?: boolean;
};

/**
 * Derive explicit query UI status.
 * Empty and error only after the query has settled (not while loading / before first attempt).
 */
export function resolveQueryViewStatus(input: ResolveQueryViewStatusInput): QueryViewStatus {
  const {
    authLoading = false,
    loading,
    refreshing = false,
    error = null,
    fetchAttempted,
    enabled = true,
    itemCount,
    treatRefreshingAsLoading = false,
  } = input;

  if (authLoading || !enabled) return 'loading';
  if (loading) return 'loading';
  if (treatRefreshingAsLoading && refreshing && fetchAttempted === false) return 'loading';

  const settled = fetchAttempted !== false && !loading;
  if (!settled && fetchAttempted === false) return 'loading';

  // Prefer showing cached data over a full-page error when items exist.
  if (error && settled && itemCount === 0) return 'error';
  if (itemCount > 0) return 'ready';
  if (itemCount === 0 && settled) return 'empty';

  return 'empty';
}
