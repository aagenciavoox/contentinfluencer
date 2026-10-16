import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAuthRetryableFetchError, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  backendReady: boolean;
  signOut: () => Promise<void>;
  updateProfile: (input: { fullName: string }) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      // Mesmo usuário sem alteração → mantém a referência. Várias telas refazem buscas quando o user muda.
      setUser(current => {
        const nextUser = nextSession?.user ?? null;
        return current && nextUser && current.id === nextUser.id && current.updated_at === nextUser.updated_at
          ? current
          : nextUser;
      });
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      if (!session) return;

      // Confere uma vez no servidor se a sessão salva ainda vale. Com o token explícito o
      // getUser não pega o lock de auth, então as consultas iniciais não esperam essa ida à rede.
      void supabase.auth.getUser(session.access_token).then(({ data, error }) => {
        // Sem rede: mantém a sessão local em vez de deslogar.
        if (error && isAuthRetryableFetchError(error)) return;
        if (error || !data.user) {
          setUser(null);
          setSession(null);
          return;
        }
        setUser(current => (current?.id === data.user.id ? current : data.user));
      });
    });

    // Este callback roda dentro do lock de auth, e o Supabase dispara SIGNED_IN toda vez que a aba
    // volta a ficar visível. Só atualiza o estado: chamar a API de auth daqui segura o lock durante
    // uma ida à rede, e as outras consultas estouram a espera ("Lock ... was not released within 5000ms").
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  const ensureAuthAvailable = () => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Não foi possível conectar agora. Tente novamente em alguns minutos.');
    }
  };

  const updateProfile = async ({ fullName }: { fullName: string }) => {
    ensureAuthAvailable();

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user?.user_metadata ?? {}),
        full_name: fullName.trim(),
      },
    });

    if (error) throw error;

    if (data.user) {
      setUser(data.user);
      setSession((currentSession) =>
        currentSession ? { ...currentSession, user: data.user } : currentSession
      );
    }
  };

  const updateEmail = async (email: string) => {
    ensureAuthAvailable();

    const { data, error } = await supabase.auth.updateUser({
      email: email.trim(),
    });

    if (error) throw error;

    if (data.user) {
      setUser(data.user);
      setSession((currentSession) =>
        currentSession ? { ...currentSession, user: data.user } : currentSession
      );
    }
  };

  const updatePassword = async (password: string) => {
    ensureAuthAvailable();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        backendReady: isSupabaseConfigured,
        signOut,
        updateProfile,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
