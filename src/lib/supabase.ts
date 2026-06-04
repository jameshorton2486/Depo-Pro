import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase =
  hasSupabaseEnv
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!hasSupabaseEnv) {
  console.error("Supabase env vars missing — see .env.example");
}

let authBootstrapPromise: Promise<void> | null = null;
let authBootstrapErrorLogged = false;

async function ensureSupabaseSession() {
  if (!supabase) {
    return;
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (sessionData.session) {
        return;
      }

      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        throw signInError;
      }
    })().catch((error) => {
      authBootstrapPromise = null;
      if (!authBootstrapErrorLogged) {
        authBootstrapErrorLogged = true;
        console.error("[DEPO-PRO] Supabase anonymous sign-in failed", {
          operation: "auth.signInAnonymously",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    });
  }

  await authBootstrapPromise;
}

void ensureSupabaseSession();

export async function getSupabaseClient(operation: string) {
  if (!supabase) {
    throw new Error(
      `Supabase unavailable for ${operation}. Supabase env vars missing — see .env.example`
    );
  }
  await ensureSupabaseSession();
  return supabase;
}
