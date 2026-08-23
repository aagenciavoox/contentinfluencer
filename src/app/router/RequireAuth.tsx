import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NavigationBlockerProvider } from '../../lib/navigation/NavigationBlockerContext';
import { Login } from '../../pages/Login';

export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <NavigationBlockerProvider>
      <Outlet />
    </NavigationBlockerProvider>
  );
}

export function LoginRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/criacao" replace />;
  }

  return <Login />;
}
