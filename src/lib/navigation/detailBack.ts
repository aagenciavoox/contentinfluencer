export interface DetailBackState {
  from?: string;
}

export function buildDetailBackState(fromPath: string): { state: DetailBackState } {
  return { state: { from: fromPath } };
}

export function resolveContentDetailBack(state: DetailBackState | null | undefined): string {
  const from = state?.from;
  if (from && isConteudosListPath(from)) {
    return from;
  }
  return '/conteudos';
}

function isConteudosListPath(path: string) {
  const pathname = path.split('?')[0];
  return pathname === '/conteudos';
}

export function resolveRouteBack(
  pathname: string,
  state: DetailBackState | null | undefined,
  fallback: string,
): string {
  if (pathname.startsWith('/conteudos/')) {
    return resolveContentDetailBack(state);
  }
  return fallback;
}
