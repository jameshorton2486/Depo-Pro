// lib/auth/use-auth.ts
// ═══════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH FOR CLIENT-SIDE AUTH
// ═══════════════════════════════════════════════════════════════
// This is the ONLY way UI components should interact with auth.
// 
// ✅ Uses browser client only (anon key)
// ✅ Client components only
// ✅ One browser client per render tree
// 
// 🚫 UI never calls supabase.auth.* directly
// 🚫 UI only uses useAuth()
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  // Use canonical browser client

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session ?? null,
        loading: false,
      });
    });

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
  }, [supabase]);

  const signIn = useCallback(
    (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    [supabase]
  );

  const signUp = useCallback(
    (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
    [supabase]
  );

  const signOut = useCallback(
    () => supabase.auth.signOut(),
    [supabase]
  );

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}
