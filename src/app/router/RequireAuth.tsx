import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NavigationBlockerProvider } from '../../lib/navigation/NavigationBlockerContext';
import { Login } from '../../pages/Login';

export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }

  return (
    <NavigationBlockerProvider>
      <Outlet />
    </NavigationBlockerProvider>
  );
}

function destinoInterno(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/criacao';
  }
  return value;
}

export function LoginRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={destinoInterno(from)} replace />;
  }

  return <Login />;
}
