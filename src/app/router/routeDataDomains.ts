import type { AppDataDomain } from '../../lib/database';

/** Domains to prefetch for a given pathname (non-blocking). */
export function getRouteDataDomains(pathname: string): AppDataDomain[] {
  if (pathname === '/biblioteca/analise') {
    return ['library'];
  }
  if (pathname === '/hoje' || pathname === '/dashboard') {
    // Critical bootstrap already loads full content + production.
    return ['agenda', 'projects', 'library'];
  }
  if (pathname.startsWith('/biblioteca')) return ['library', 'library-generos', 'content'];
  if (pathname.startsWith('/criacao')) return ['production', 'content'];
  if (pathname.startsWith('/conteudos/')) return ['production', 'recording', 'library'];
  if (pathname.startsWith('/conteudos')) return ['production'];
  if (pathname.startsWith('/ideias')) return ['production'];
  if (pathname.startsWith('/calendario') || pathname.startsWith('/programacao')) {
    return ['content-schedule', 'agenda', 'projects', 'production'];
  }
  if (pathname.startsWith('/projetos')) return ['content-schedule', 'library'];
  if (pathname.startsWith('/gravacao')) return ['content', 'production', 'recording'];
  if (pathname.startsWith('/editorial/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/editorial/series/')) return ['production', 'content', 'bootstrap', 'templates'];
  if (pathname.startsWith('/editorial')) return ['production', 'content', 'bootstrap', 'schedule'];
  if (pathname.startsWith('/configuracoes/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/pilares')) return ['production'];
  if (pathname.startsWith('/series/')) return ['production', 'content', 'bootstrap', 'templates'];
  if (pathname === '/series') return ['production'];
  if (pathname.startsWith('/configuracoes/plataformas') || pathname.startsWith('/configuracoes/horarios')) {
    return ['bootstrap', 'schedule'];
  }
  return [];
}

const DETAIL_PATH = /^\/(?:conteudos|projetos|gravacao|series|configuracoes\/pilares|editorial\/pilares|editorial\/series)\/.+|^\/biblioteca\/(?!analise$)[^/]+$/;

/**
 * List screens share one outlet key so moving between them does not remount
 * Suspense and flash the loading fallback. Detail URLs stay unique so the
 * editor resets when the id changes. Query strings are ignored.
 */
export function getRouteOutletKey(pathname: string): string {
  return DETAIL_PATH.test(pathname) ? pathname : 'section';
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
  '/series',
  '/editorial',
] as const;
