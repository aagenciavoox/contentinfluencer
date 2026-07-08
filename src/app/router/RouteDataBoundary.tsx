import { Suspense, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import type { AppDataDomain } from '../../lib/database';

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
      <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        Carregando área...
      </p>
    </div>
  );
}

function getRouteDataDomains(pathname: string): AppDataDomain[] {
  if (pathname === '/dashboard' || pathname === '/') {
    return [];
  }
  if (pathname.startsWith('/biblioteca')) return ['library', 'library-generos'];
  if (pathname.startsWith('/conteudos/')) return ['production'];
  if (pathname.startsWith('/conteudos')) return ['production'];
  if (pathname.startsWith('/ideias')) return ['production'];
  if (pathname.startsWith('/calendario')) return ['content-schedule', 'agenda', 'projects'];
  if (pathname.startsWith('/programacao')) return ['content-schedule', 'production'];
  if (pathname.startsWith('/projetos')) return ['content-schedule', 'library'];
  if (pathname.startsWith('/gravacao')) return ['content', 'production', 'recording'];
  if (pathname.startsWith('/configuracoes/pilares/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/pilares')) return ['production'];
  if (pathname.startsWith('/configuracoes/series/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/series')) return ['production'];
  if (pathname.startsWith('/configuracoes/templates')) return ['templates', 'production'];
  if (pathname.startsWith('/configuracoes/plataformas')) return ['bootstrap'];
  if (pathname.startsWith('/configuracoes/aparencia')) return ['production'];
  return [];
}

export function RouteDataBoundary() {
  const { ensureDataDomains } = useAppContext();
  const location = useLocation();
  const routeDataDomains = useMemo(() => getRouteDataDomains(location.pathname), [location.pathname]);

  useEffect(() => {
    if (routeDataDomains.length === 0) return;
    void ensureDataDomains(routeDataDomains);
  }, [ensureDataDomains, routeDataDomains]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}
