import { Navigate, useLocation } from 'react-router-dom';
import {
  buildLegacyCreationTarget,
  type LegacyCreationSource,
} from '../lib/legacyCreationRoute';

interface LegacyCreationRedirectProps {
  source: LegacyCreationSource;
}

export function LegacyCreationRedirect({ source }: LegacyCreationRedirectProps) {
  const location = useLocation();
  return (
    <Navigate
      to={buildLegacyCreationTarget(source, location.pathname, location.search)}
      replace
    />
  );
}
