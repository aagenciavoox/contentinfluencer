import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { AppProvider } from '../../context/AppContext';
import { AuthProvider } from '../../context/AuthContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppProvider>{children}</AppProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
