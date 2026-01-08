// ═══════════════════════════════════════════════════════════════
// USE AUTH HOOK
// ═══════════════════════════════════════════════════════════════
// Client-side auth state hook using Supabase
// Replaces NextAuth's useSession()

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/constants';

interface Profile {
  id: string;
  email: string;
  role: Role;
  first_name?: string;
  last_name?: string;
  firm_id?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Client-side auth state hook
 * Provides reactive auth state for client components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, profile, isLoading, signOut } = useAuth();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!user) return <div>Not logged in</div>;
 *   
 *   return <div>Welcome, {profile?.first_name}!</div>;
 * }
 * ```
 */
export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
        return;
      }

      if (session?.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isLoading: false,
        }));

        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (!profileError && profile) {
              setState(prev => ({ ...prev, profile }));
            }
          });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isLoading: false,
        }));

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setState(prev => ({ ...prev, profile }));
        }
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
          error: null,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setState(prev => ({
          ...prev,
          session,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return {
    ...state,
    signOut,
    isAuthenticated: !!state.user,
  };
}
