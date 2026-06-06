import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { DepoEditorConfig } from "../../types";
import {
  getAuthSnapshot,
  initializeSupabaseSession,
  signOutSupabaseSession,
  subscribeAuthState,
  supabase,
} from "../../lib/supabase";

function useAuthSessionState() {
  return useSyncExternalStore(subscribeAuthState, getAuthSnapshot, getAuthSnapshot);
}

function isGateBypassed() {
  return import.meta.env.DEV && import.meta.env.VITE_USE_REAL_API !== "1";
}

export function AuthGate({
  config,
  children,
}: {
  config: DepoEditorConfig;
  children: ReactNode;
}) {
  const authState = useAuthSessionState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initializeSupabaseSession({
      accessToken: config.supabaseAccessToken,
      refreshToken: config.supabaseRefreshToken,
    }).catch((sessionError) => {
      setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
    });
  }, [config.supabaseAccessToken, config.supabaseRefreshToken]);

  if (isGateBypassed()) {
    return <>{children}</>;
  }

  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-sm text-slate-500">
        Checking authentication...
      </div>
    );
  }

  if (authState.session) {
    return <>{children}</>;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw signInError;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          throw signUpError;
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Authentication Required</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {mode === "signin" ? "Sign in to Depo-Pro" : "Create your Depo-Pro account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Real Supabase data is now owner-scoped. Sign in with email and password to open, save, and edit your cases.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          {mode === "signin" ? "Need an account? Create one." : "Already have an account? Sign in."}
        </button>
      </div>
    </div>
  );
}

export function AuthStatusChip() {
  const authState = useAuthSessionState();
  const email = authState.session?.user.email ?? "Signed in";

  if (isGateBypassed() || !authState.session) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-300">{email}</span>
      <button
        type="button"
        onClick={() => void signOutSupabaseSession()}
        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
      >
        Sign Out
      </button>
    </div>
  );
}
