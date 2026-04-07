import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type UserRecord } from '../lib/supabase';

interface AuthContextValue {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  account: UserRecord | null;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildFallbackUserRecord(user: User): UserRecord {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email ?? '',
    plan: 'free',
    comped: false,
    onboarded: false,
    created_at: now,
    updated_at: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<UserRecord | null>(null);

  const syncUserRecord = useCallback(async (nextUser: User | null) => {
    if (!supabase || !nextUser) {
      setAccount(null);
      return;
    }

    const fallback = buildFallbackUserRecord(nextUser);
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: nextUser.id,
          email: nextUser.email ?? '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (error) {
      console.warn('Auth user record sync failed:', error.message);
      setAccount(fallback);
      return;
    }

    setAccount((data as UserRecord | null) ?? fallback);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await syncUserRecord(data.session?.user ?? null);
      if (active) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void syncUserRecord(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncUserRecord]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase auth is not configured.') };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/app` : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      setAccount(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAccount(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled: isSupabaseConfigured,
      loading,
      session,
      user,
      account,
      signInWithMagicLink,
      signOut,
    }),
    [account, loading, session, signInWithMagicLink, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
