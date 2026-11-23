import { Suspense, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Text } from '../../components/ui/Text';
import { useAppContext } from '../../context/AppContext';
import { LOADING } from '../../lib/uiCopy';
import { getRouteDataDomains } from './routeDataDomains';

function RouteFallback({ label = LOADING.area }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
      <Text variant="eyebrow" as="p">
        {label}
      </Text>
    </div>
  );
}

export function RouteDataBoundary() {
  const { ensureDataDomains } = useAppContext();
  const location = useLocation();
  const routeDataDomains = useMemo(() => getRouteDataDomains(location.pathname), [location.pathname]);

  useEffect(() => {
    if (routeDataDomains.length === 0) return;
    void ensureDataDomains(routeDataDomains);
  }, [ensureDataDomains, routeDataDomains]);

  // The address bar updates before React commits the next screen. A Suspense
  // boundary that already resolved keeps the previous page for the whole
  // transition, so a shared outlet key left the old screen in place after a
  // sidebar click. A new boundary per pathname paints the destination.
  // Search stays out of the key: tabs like /editorial?aba= and /gravacao?tab=
  // are the same screen.
  return (
    <Suspense key={location.pathname} fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}
