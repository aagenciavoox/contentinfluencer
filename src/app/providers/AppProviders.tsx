import type { ReactNode } from 'react';
import { AppProvider } from '../../context/AppContext';
import { AuthProvider } from '../../context/AuthContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}
