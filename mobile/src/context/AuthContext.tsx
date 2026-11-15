import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Result of a login / register attempt. error is a message to show under the form.
type AuthResult = { error?: string; needsEmailConfirm?: boolean };

type AuthState = {
  session: Session | null; // null = not logged in (or demo mode)
  loading: boolean; // true while the saved login is being read at app start
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const NOT_SET = 'Login is not set up yet. Add the Supabase keys to mobile/.env.';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;

    // read the saved login, then keep listening for login / logout
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { error: NOT_SET };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    } catch {
      return { error: 'Could not reach the server. Check your internet and try again.' };
    }
  }

  async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { error: NOT_SET };
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) return { error: error.message };
      // no session yet means Supabase sent a confirmation email first
      return data.session ? {} : { needsEmailConfirm: true };
    } catch {
      return { error: 'Could not reach the server. Check your internet and try again.' };
    }
  }

  async function signOut() {
    await supabase?.auth.signOut().catch(() => {});
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
