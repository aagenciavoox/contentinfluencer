import { AlertTriangle, Loader2 } from 'lucide-react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers/AppProviders';
import { appRouter } from './app/router/appRouter';
import { useAuth } from './context/AuthContext';
import { supabaseConfigStatus } from './lib/supabase';

function AppRouter() {
  const { loading, backendReady } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--text-primary)]" />
      </div>
    );
  }

  if (!backendReady) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-[var(--radius-card-mobile)] border border-red-500/20 bg-[var(--bg-secondary)] p-8 shadow-none">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-red-500/10 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold t-label-uppercase">Backend obrigatorio</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
            Este app nao opera mais em modo offline. Preencha o arquivo <code>.env.local</code> na raiz do projeto e reinicie o servidor (<code>npm run dev</code>).
          </p>
          <ul className="mt-4 stack-sm text-sm font-mono">
            <li className={supabaseConfigStatus.url ? 'text-emerald-500' : 'text-red-400'}>
              {supabaseConfigStatus.url ? '✔' : '✗'} VITE_SUPABASE_URL
            </li>
            <li className={supabaseConfigStatus.anonKey ? 'text-emerald-500' : 'text-red-400'}>
              {supabaseConfigStatus.anonKey ? '✔' : '✗'} VITE_SUPABASE_ANON_KEY
            </li>
          </ul>
          {!supabaseConfigStatus.anonKey && (
            <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
              Copie a chave <strong>anon public</strong> em{' '}
              <a
                href="https://supabase.com/dashboard/project/aftffcaychrfffefkeoj/settings/api"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Supabase → Settings → API
              </a>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  return <RouterProvider router={appRouter} />;
}

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
