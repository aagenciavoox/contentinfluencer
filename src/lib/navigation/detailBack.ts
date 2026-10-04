export interface DetailBackState {
  from?: string;
}

export const DEFAULT_CONTENT_DETAIL_BACK = '/criacao';

const ALLOWED_BACK_PATHS = [
  '/',
  '/hoje',
  '/criacao',
  '/criacao/legendas',
  '/calendario',
  '/planejamento',
  '/programacao',
  '/dashboard',
  '/biblioteca',
  '/gravacao',
  '/projetos',
  '/series',
  '/editorial',
  '/configuracoes/pilares',
];

const ALLOWED_BACK_PREFIXES = [
  '/biblioteca/',
  '/projetos/',
  '/series/',
  '/editorial/',
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

/** Visible name for a stored back target. Creation paths keep the caller's label. */
export function labelForDetailBack(path: string, fallback: string): string {
  const pathname = path.split('?')[0].split('#')[0];
  if (pathname === '/hoje' || pathname === '/' || pathname === '/dashboard') return 'Hoje';
  if (pathname.startsWith('/criacao')) return fallback;
  if (pathname.startsWith('/calendario')) return 'Calendário';
  if (pathname.startsWith('/planejamento') || pathname.startsWith('/programacao')) return 'Planejamento';
  if (pathname.startsWith('/biblioteca')) return 'Biblioteca';
  if (pathname.startsWith('/gravacao')) return 'Gravação';
  if (pathname.startsWith('/projetos')) return 'Projetos';
  if (pathname.startsWith('/series')) return 'Séries';
  if (pathname.startsWith('/editorial')) return 'Editorial';
  if (pathname.startsWith('/configuracoes/pilares')) return 'Pilares';
  return 'Voltar';
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
