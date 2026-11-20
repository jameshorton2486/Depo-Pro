import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const localEnv = Object.fromEntries(envText.split(/\r?\n/).filter(Boolean).map(line => {
  const split = line.indexOf("=");
  return [line.slice(0, split), line.slice(split + 1)];
}));
const url = localEnv.VITE_SUPABASE_URL;
const key = localEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!url || !key || !email || !password) throw new Error("Preview Supabase settings and E2E_EMAIL/E2E_PASSWORD are required.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.session) throw authError || new Error("Test sign-in did not return a session.");
const headers = { Authorization: `Bearer ${auth.session.access_token}`, apikey: key, "Content-Type": "application/json" };
const endpoint = `${url}/functions/v1/licensing`;

async function request(path, init = {}) {
  const response = await fetch(`${endpoint}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body?.message || text}`);
  return { response, body };
}

const entitlement = await request("/v1/entitlement");
if (!entitlement.body.existing_files_accessible) throw new Error("Existing-file access must remain available.");

const checkout = await request("/v1/checkout-sessions", { method: "POST", body: JSON.stringify({ return_path: "/account" }) });
if (!checkout.body.test_mode || !String(checkout.body.url).startsWith("https://checkout.stripe.com/")) throw new Error("A Stripe test Checkout URL was not created.");

const idempotencyKey = crypto.randomUUID();
const fingerprint = "hosted-integration-verifier-v1";
const opened = await request("/v1/live-sessions", { method: "POST", body: JSON.stringify({ device_fingerprint: fingerprint, device_name: "Hosted integration verifier", idempotency_key: idempotencyKey }) });
const sessionId = opened.body.session_id;
const credentials = await request(`/v1/live-sessions/${sessionId}/credentials`, { method: "POST", body: JSON.stringify({ device_fingerprint: fingerprint }) });
if (!credentials.body.access_token || credentials.body.expires_in_seconds > 60) throw new Error("Temporary transcription credential was not issued safely.");
await request(`/v1/live-sessions/${sessionId}/heartbeat`, { method: "POST", body: "{}" });
await request(`/v1/live-sessions/${sessionId}/close`, { method: "POST", body: JSON.stringify({ idempotency_key: crypto.randomUUID(), client_recorded_seconds: 3 }) });

console.log(JSON.stringify({
  authenticated: true,
  entitlement_state: entitlement.body.state,
  local_files_accessible: entitlement.body.existing_files_accessible,
  checkout_test_mode: checkout.body.test_mode,
  stripe_checkout_created: true,
  live_session_created: true,
  temporary_deepgram_credential_created: true,
  heartbeat_accepted: true,
  session_closed_and_usage_recorded: true,
}, null, 2));

await supabase.auth.signOut();
