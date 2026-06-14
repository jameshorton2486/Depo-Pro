import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
const DEV_AUTH_BYPASS_WARNING = "[DEPO-PRO] DEV AUTH BYPASS ENABLED — not for production.";

export const supabase =
  hasSupabaseEnv
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!hasSupabaseEnv) {
  console.error("Supabase env vars missing — see .env.example");
}

export class AuthRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

type AuthSnapshot = {
  loading: boolean;
  session: Session | null;
};

type DevAuthBypassEnv = {
  DEV?: boolean;
  VITE_DEV_AUTH_BYPASS?: string;
  VITE_DEV_AUTH_BYPASS_EMAIL?: string;
  VITE_DEV_AUTH_BYPASS_PASSWORD?: string;
};

export interface DevAuthBypassConfig {
  enabled: boolean;
  email: string | null;
  password: string | null;
}

const listeners = new Set<() => void>();
let authBootstrapPromise: Promise<Session | null> | null = null;
let authSnapshot: AuthSnapshot = {
  loading: hasSupabaseEnv,
  session: null,
};
let devAuthWarningEmitted = false;

function emitAuthSnapshot() {
  for (const listener of listeners) {
    listener();
  }
}

function setAuthSnapshot(next: AuthSnapshot) {
  authSnapshot = next;
  emitAuthSnapshot();
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthSnapshot({ loading: false, session });
  });
}

export function getAuthSnapshot(): AuthSnapshot {
  return authSnapshot;
}

export function subscribeAuthState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDevAuthBypassConfig(
  env: DevAuthBypassEnv = import.meta.env,
): DevAuthBypassConfig {
  const enabled = env.DEV === true && env.VITE_DEV_AUTH_BYPASS === "true";
  return {
    enabled,
    email: normalizeEnvValue(env.VITE_DEV_AUTH_BYPASS_EMAIL),
    password: normalizeEnvValue(env.VITE_DEV_AUTH_BYPASS_PASSWORD),
  };
}

export async function initializeSupabaseSession(tokens?: {
  accessToken?: string;
  refreshToken?: string;
}) {
  if (!supabase) {
    setAuthSnapshot({ loading: false, session: null });
    return null;
  }

  if (tokens?.accessToken && tokens?.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (error) {
      throw error;
    }
    setAuthSnapshot({ loading: false, session: data.session });
    return data.session;
  }

  return ensureSupabaseSession();
}

async function ensureSupabaseSession(): Promise<Session | null> {
  if (!supabase) {
    setAuthSnapshot({ loading: false, session: null });
    return null;
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const session = sessionData.session ?? null;
      if (!session) {
        return signInWithDevBypass();
      }

      setAuthSnapshot({ loading: false, session });
      return session;
    })().catch((error) => {
      authBootstrapPromise = null;
      setAuthSnapshot({ loading: false, session: null });
      throw error;
    });
  }

  return authBootstrapPromise;
}

export async function signOutSupabaseSession() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") {
  void ensureSupabaseSession();
}

export async function getSupabaseClient(operation: string) {
  if (!supabase) {
    throw new Error(
      `Supabase unavailable for ${operation}. Supabase env vars missing — see .env.example`
    );
  }
  const session = await ensureSupabaseSession();
  if (!session) {
    throw new AuthRequiredError(`Authentication is required for ${operation}.`);
  }
  return supabase;
}

async function signInWithDevBypass(): Promise<Session | null> {
  const config = getDevAuthBypassConfig();
  if (!config.enabled) {
    setAuthSnapshot({ loading: false, session: null });
    return null;
  }

  emitDevAuthBypassWarning();

  if (!config.email || !config.password) {
    throw new Error(
      "VITE_DEV_AUTH_BYPASS is enabled but VITE_DEV_AUTH_BYPASS_EMAIL or VITE_DEV_AUTH_BYPASS_PASSWORD is missing.",
    );
  }

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  if (error) {
    throw error;
  }

  const session = data.session ?? null;
  setAuthSnapshot({ loading: false, session });
  return session;
}

function emitDevAuthBypassWarning() {
  if (devAuthWarningEmitted) {
    return;
  }

  devAuthWarningEmitted = true;
  console.warn(DEV_AUTH_BYPASS_WARNING);
}

function normalizeEnvValue(value: string | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
