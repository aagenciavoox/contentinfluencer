import type { AppDataDomain } from '../../lib/database';

/** Domains to prefetch for a given pathname (non-blocking). */
export function getRouteDataDomains(pathname: string): AppDataDomain[] {
  if (pathname === '/biblioteca/analise') {
    return ['library'];
  }
  if (pathname === '/hoje' || pathname === '/dashboard') {
    // Critical bootstrap already loads full content + production.
    return ['agenda', 'projects'];
  }
  if (pathname.startsWith('/biblioteca')) return ['library', 'library-generos'];
  if (pathname.startsWith('/criacao')) return ['production', 'content'];
  if (pathname.startsWith('/conteudos/')) return ['production', 'recording'];
  if (pathname.startsWith('/conteudos')) return ['production'];
  if (pathname.startsWith('/ideias')) return ['production'];
  if (pathname.startsWith('/calendario') || pathname.startsWith('/programacao')) {
    return ['content-schedule', 'agenda', 'projects', 'production'];
  }
  if (pathname.startsWith('/projetos')) return ['content-schedule', 'library'];
  if (pathname.startsWith('/gravacao')) return ['content', 'production', 'recording'];
  if (pathname.startsWith('/configuracoes/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/pilares')) return ['production'];
  if (pathname.startsWith('/configuracoes/series/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/series')) return ['production'];
  if (pathname.startsWith('/configuracoes/templates')) return ['templates', 'production'];
  if (pathname.startsWith('/configuracoes/plataformas')) return ['bootstrap'];
  return [];
}

/** Remount key for route outlet — pathname only (preserves query-only navigations). */
export function getRouteOutletKey(pathname: string): string {
  return pathname;
}

/** True when a navigation to a different pathname is in flight. */
export function isPathnameTransitionPending(
  currentPathname: string,
  pendingPathname: string | undefined,
): boolean {
  return Boolean(pendingPathname && pendingPathname !== currentPathname);
}

/** Sequential smoke paths used by navigation remount tests. */
export const NAVIGATION_SEQUENCE_PATHS = [
  '/criacao',
  '/biblioteca',
  '/configuracoes/series',
  '/configuracoes/pilares',
] as const;
