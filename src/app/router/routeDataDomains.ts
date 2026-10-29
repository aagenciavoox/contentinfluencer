import type { AppDataDomain } from '../../lib/database';

/**
 * Domínios do menu que o bootstrap não traz. O shell já pintou; buscá-los no ócio evita skeleton
 * no primeiro clique em Hoje, Gravação, Análises, Contas e Planejamento.
 * A biblioteca paginada segue na própria tela — a lista completa com anotações
 * entra aqui porque Hoje não abre sem ela.
 */
export const NAV_IDLE_DATA_DOMAINS = [
  'library',
  'library-generos',
  'recording',
  'analytics',
  'schedule',
  'planejamento',
  'agenda',
  'projects',
] as const satisfies readonly AppDataDomain[];

/** Domains to prefetch for a given pathname (non-blocking). Query e hash são ignorados. */
export function getRouteDataDomains(href: string): AppDataDomain[] {
  const pathname = href.split('#')[0].split('?')[0];
  if (pathname === '/biblioteca/analise') {
    return ['library'];
  }
  if (pathname === '/hoje' || pathname === '/dashboard') {
    // Critical bootstrap already loads full content + production.
    // Blocos de gravação também: sem eles, roteiro que já está num bloco contava como pronto.
    return ['agenda', 'projects', 'library', 'recording'];
  }
  if (pathname.startsWith('/biblioteca')) return ['library', 'library-generos', 'content'];
  if (pathname.startsWith('/criacao')) return ['production', 'content'];
  if (pathname.startsWith('/conteudos/')) return ['production', 'recording', 'library', 'templates'];
  if (pathname.startsWith('/conteudos')) return ['production'];
  if (pathname.startsWith('/ideias')) return ['production'];
  if (pathname.startsWith('/calendario')) {
    return ['content-schedule', 'agenda', 'projects', 'production', 'library'];
  }
  if (pathname.startsWith('/planejamento') || pathname.startsWith('/programacao')) {
    return ['content', 'planejamento'];
  }
  if (pathname.startsWith('/projetos')) return ['content-schedule', 'library'];
  if (pathname.startsWith('/gravacao')) return ['content', 'production', 'recording'];
  if (pathname.startsWith('/editorial/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/editorial/series/')) return ['production', 'content', 'bootstrap', 'templates'];
  if (pathname.startsWith('/editorial')) return ['production', 'content', 'bootstrap', 'schedule'];
  if (pathname.startsWith('/configuracoes/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/pilares')) return ['production'];
  if (pathname.startsWith('/series/') || pathname.startsWith('/configuracoes/series/')) {
    return ['production', 'content', 'bootstrap', 'templates'];
  }
  if (pathname === '/series') return ['production'];
  if (pathname === '/contas') {
    return ['bootstrap', 'schedule', 'content', 'production', 'analytics'];
  }
  if (pathname === '/analises') {
    return ['bootstrap', 'content', 'production', 'analytics'];
  }
  if (pathname.startsWith('/configuracoes/plataformas') || pathname.startsWith('/configuracoes/horarios')) {
    return ['bootstrap', 'schedule'];
  }
  return [];
}

const DETAIL_PATH = /^\/(?:conteudos|projetos|gravacao|series|configuracoes\/pilares|editorial\/pilares|editorial\/series)\/.+|^\/biblioteca\/(?!analise$|anotacoes$)[^/]+$/;

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
