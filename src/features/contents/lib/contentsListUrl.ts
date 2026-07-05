export const CONTENTS_PAGE_SIZE_OPTIONS = [20, 40, 50, 60] as const;
export const DEFAULT_CONTENTS_PAGE_SIZE = 50;

export function parseListPageParam(searchParams: URLSearchParams): number {
  const parsed = Number.parseInt(searchParams.get('page') || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseListLimitParam(searchParams: URLSearchParams): number {
  const parsed = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_CONTENTS_PAGE_SIZE), 10);
  return (CONTENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_CONTENTS_PAGE_SIZE;
}

export function buildListPageSearchParams(
  current: URLSearchParams,
  page: number,
  limit: number = DEFAULT_CONTENTS_PAGE_SIZE,
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (page <= 1) next.delete('page');
  else next.set('page', String(page));
  if (limit === DEFAULT_CONTENTS_PAGE_SIZE) next.delete('limit');
  else next.set('limit', String(limit));
  next.delete('more');
  return next;
}
