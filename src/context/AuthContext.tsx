import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session) return;

      void supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) {
          setUser(null);
          setSession(null);
          return;
        }
        setUser(data.user);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextSession) return;

      void supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) {
          setUser(null);
          setSession(null);
          return;
        }
        setUser(data.user);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  const ensureAuthAvailable = () => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Serviço de autenticação indisponível.');
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
