export interface DetailBackState {
  from?: string;
}

export const DEFAULT_CONTENT_DETAIL_BACK = '/criacao';

const ALLOWED_BACK_PATHS = [
  '/',
  '/criacao',
  '/calendario',
  '/dashboard',
  '/biblioteca',
  '/gravacao',
  '/projetos',
  '/configuracoes/series',
  '/configuracoes/pilares',
];

const ALLOWED_BACK_PREFIXES = [
  '/biblioteca/',
  '/projetos/',
  '/configuracoes/series/',
  '/configuracoes/pilares/',
];

export function buildDetailBackState(fromPath: string): { state: DetailBackState } {
  return { state: { from: fromPath } };
}

export function withDetailBack(fromPath: string) {
  return buildDetailBackState(fromPath);
}

export function isAllowedDetailBackPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const pathname = path.split('?')[0].split('#')[0];
  if (ALLOWED_BACK_PATHS.includes(pathname)) return true;
  return ALLOWED_BACK_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function resolveContentDetailBack(state: DetailBackState | null | undefined): string {
  const from = state?.from;
  if (from && isAllowedDetailBackPath(from)) {
    return from;
  }
  return DEFAULT_CONTENT_DETAIL_BACK;
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
