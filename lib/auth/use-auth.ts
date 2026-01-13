// lib/auth/use-auth.ts
// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE AUTH HOOK - With fixed dependencies
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session ?? null,
        loading: false,
      });
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
        });
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []); // ✅ Empty dependency array - client is lazy singleton

  const signIn = useCallback(
    (email: string, password: string) => {
      const supabase = getSupabaseBrowserClient();
      return supabase.auth.signInWithPassword({ email, password });
    },
    [] // ✅ Empty - getSupabaseBrowserClient is stable
  );

  const signUp = useCallback(
    (email: string, password: string) => {
      const supabase = getSupabaseBrowserClient();
      return supabase.auth.signUp({ email, password });
    },
    []
  );

  const signOut = useCallback(() => {
    const supabase = getSupabaseBrowserClient();
    return supabase.auth.signOut();
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}
