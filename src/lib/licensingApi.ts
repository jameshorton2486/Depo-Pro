import { supabase } from "./supabase";

const functionUrl = `${String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")}/functions/v1/licensing`;

export type Entitlement = {
  state: string;
  can_start_cloud_transcription: boolean;
  existing_files_accessible: boolean;
  usage?: { included_seconds: number; used_seconds: number; provisional_seconds: number };
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in before using cloud transcription.");
  const response = await fetch(`${functionUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message ?? `Subscription service returned ${response.status}.`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const licensingApi = {
  entitlement: () => request<Entitlement>("/v1/entitlement"),
  checkout: (returnPath = "/account") => request<{ url: string }>("/v1/checkout-sessions", { method: "POST", body: JSON.stringify({ return_path: returnPath }) }),
  startSession: (fingerprint: string) => request<{ session_id: string; grant_expires_at: string; heartbeat_interval_seconds: number }>("/v1/live-sessions", { method: "POST", body: JSON.stringify({ device_fingerprint: fingerprint, device_name: navigator.userAgent.slice(0, 120), idempotency_key: crypto.randomUUID(), requested_model: "nova-3", channels: 1, overage_consent_cents: 0 }) }),
  credential: (sessionId: string, fingerprint: string) => request<{ access_token: string; expires_in_seconds: number }>(`/v1/live-sessions/${sessionId}/credentials`, { method: "POST", body: JSON.stringify({ device_fingerprint: fingerprint, request_id: crypto.randomUUID() }) }),
  heartbeat: (sessionId: string) => request<void>(`/v1/live-sessions/${sessionId}/heartbeat`, { method: "POST", body: "{}" }),
  close: (sessionId: string, seconds: number) => request(`/v1/live-sessions/${sessionId}/close`, { method: "POST", body: JSON.stringify({ idempotency_key: crypto.randomUUID(), client_recorded_seconds: Math.max(0, Math.round(seconds)) }) }),
};

export async function browserFingerprint(): Promise<string> {
  const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
