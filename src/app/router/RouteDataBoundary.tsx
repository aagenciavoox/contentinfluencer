import { Suspense, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { LOADING } from '../../lib/uiCopy';
import {
  getRouteDataDomains,
  getRouteOutletKey,
} from './routeDataDomains';

function RouteFallback({ label = LOADING.area }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
      <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        {label}
      </p>
    </div>
  );
}

export function RouteDataBoundary() {
  const { ensureDataDomains } = useAppContext();
  const location = useLocation();
  const routeDataDomains = useMemo(() => getRouteDataDomains(location.pathname), [location.pathname]);
  const outletKey = getRouteOutletKey(location.pathname);

  useEffect(() => {
    if (routeDataDomains.length === 0) return;
    void ensureDataDomains(routeDataDomains);
  }, [ensureDataDomains, routeDataDomains]);

  // Keep the previous route painted during navigation; only Suspense covers lazy chunks.
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet key={outletKey} />
    </Suspense>
  );
}
