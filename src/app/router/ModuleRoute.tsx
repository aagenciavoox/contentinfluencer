import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getModuleFlags, type ModuleFlagKey } from '../../features/settings/lib/moduleFlags';

interface ModuleRouteProps {
  module: ModuleFlagKey;
  children: ReactNode;
}

export function ModuleRoute({ module, children }: ModuleRouteProps) {
  const { state } = useAppContext();
  const moduleFlags = getModuleFlags(state.preferences);

  if (!moduleFlags[module]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
