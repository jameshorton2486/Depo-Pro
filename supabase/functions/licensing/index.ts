import { createClient } from "npm:@supabase/supabase-js@2";

const VERSION = "1.0";
const MONTHLY_CENTS = Number(Deno.env.get("LICENSING_MONTHLY_PRICE_CENTS") || 4900);
const INCLUDED_SECONDS = Number(Deno.env.get("LICENSING_INCLUDED_SECONDS") || 108000);
const GRACE_DAYS = Number(Deno.env.get("LICENSING_GRACE_DAYS") || 5);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY") || "";
const PUBLIC_APP_URL = (Deno.env.get("LICENSING_PUBLIC_APP_URL") || "http://localhost:5173").replace(/\/$/, "");
const ALLOWED_ORIGINS = (Deno.env.get("LICENSING_ALLOWED_ORIGINS") || "http://localhost:5173").split(",").map(v => v.trim());
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const table = (name: string) => admin.from(`licensing_${name}`);

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], "Access-Control-Allow-Headers": "authorization, content-type, apikey, stripe-signature, x-client-info", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", Vary: "Origin" };
}
function json(request: Request, body: unknown, status = 200, extra: Record<string,string> = {}) { return new Response(JSON.stringify(body), { status, headers: { ...cors(request), "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } }); }
function failure(request: Request, code: string, message: string, status = 400, retryable = false) { return json(request, { contract_version: VERSION, code, message, retryable, request_id: crypto.randomUUID() }, status); }
const iso = (date = new Date()) => date.toISOString();
function addDays(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate() + days); return date; }
function addHours(hours: number) { const date = new Date(); date.setUTCHours(date.getUTCHours() + hours); return date; }

async function authenticatedUser(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data } = await admin.auth.getUser(bearer);
  return data.user || null;
}
async function ensureAccount(userId: string) {
  await table("accounts").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  await table("subscriptions").upsert({ user_id: userId, state: "trial", trial_ends_at: iso(addDays(7)) }, { onConflict: "user_id", ignoreDuplicates: true });
}
function currentPeriod() { const start = new Date(); start.setUTCDate(1); start.setUTCHours(0,0,0,0); const end = new Date(start); end.setUTCMonth(end.getUTCMonth()+1); return { start, end }; }
async function usage(userId: string) {
  const { start, end } = currentPeriod();
  const { data } = await table("usage_ledger").select("seconds").eq("user_id", userId).gte("recorded_at", start.toISOString()).lt("recorded_at", end.toISOString());
  return { period_start: iso(start), period_end: iso(end), included_seconds: INCLUDED_SECONDS, used_seconds: (data||[]).reduce((n,r)=>n+r.seconds,0), provisional_seconds: 0, last_updated: iso() };
}
async function entitlement(userId: string) {
  const { data: subscription } = await table("subscriptions").select("*").eq("user_id", userId).single();
  let state = subscription?.state || "trial";
  if (state === "trial" && new Date(subscription?.trial_ends_at || 0) <= new Date()) state = "expired";
  if (state === "grace" && new Date(subscription?.grace_ends_at || 0) <= new Date()) state = "expired";
  return { contract_version: VERSION, account_id: userId, state, can_start_cloud_transcription: ["trial","active","grace","canceled_at_period_end"].includes(state), existing_files_accessible: true, paid_through: subscription?.paid_through || null, grace_ends_at: subscription?.grace_ends_at || null, device_limit: 2, concurrent_session_limit: 1, plan: { code: "reporter_monthly", display_name: "Reporter Monthly (proposal)", monthly_price_cents: MONTHLY_CENTS, currency: "usd", included_seconds: INCLUDED_SECONDS, overage_price_cents_per_hour: 0, overage_billing_enabled: false }, usage: await usage(userId), server_time: iso() };
}
async function stripe(path: string, values: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: values });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Stripe rejected the test request.");
  return body;
}
async function verifyStripe(raw: string, header: string) {
  const pieces = Object.fromEntries(header.split(",").map(part => part.split("=", 2)));
  const timestamp = pieces.t; const signature = pieces.v1;
  if (!timestamp || !signature || Math.abs(Date.now()/1000-Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
  return expected.length === signature.length && expected.split("").every((char, i) => char === signature[i]);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  const path = new URL(request.url).pathname.replace(/^\/licensing/, "");
  if (path === "/v1/stripe/webhook" && request.method === "POST") {
    const raw = await request.text();
    if (!STRIPE_WEBHOOK_SECRET || !await verifyStripe(raw, request.headers.get("stripe-signature") || "")) return failure(request, "invalid_request", "Stripe signature verification failed.", 400);
    const event = JSON.parse(raw); const object = event.data?.object || {};
    const accountId = object.metadata?.account_id || object.subscription_details?.metadata?.account_id;
    if (accountId) {
      const { data: existing } = await table("subscriptions").select("last_stripe_event_created").eq("user_id", accountId).maybeSingle();
      if (Number(event.created) >= Number(existing?.last_stripe_event_created || 0)) {
        const patch: Record<string,unknown> = { last_stripe_event_created: event.created, updated_at: iso() };
        if (["checkout.session.completed","invoice.paid"].includes(event.type)) Object.assign(patch, { state: "active", first_failure_at: null, grace_ends_at: null, stripe_subscription_id: object.subscription || object.parent?.subscription_details?.subscription || undefined });
        if (event.type === "invoice.payment_failed") Object.assign(patch, { state: "grace", first_failure_at: iso(), grace_ends_at: iso(addDays(GRACE_DAYS)) });
        if (event.type === "customer.subscription.deleted") Object.assign(patch, { state: "expired" });
        if (event.type === "customer.subscription.updated") Object.assign(patch, { state: object.cancel_at_period_end ? "canceled_at_period_end" : (["active","trialing"].includes(object.status) ? "active" : "suspended"), paid_through: object.current_period_end ? iso(new Date(object.current_period_end*1000)) : null });
        await table("subscriptions").update(patch).eq("user_id", accountId);
      }
    }
    await table("webhook_events").upsert({ stripe_event_id: event.id, event_type: event.type, event_created: event.created });
    return json(request, { received: true });
  }
  const user = await authenticatedUser(request);
  if (!user) return failure(request, "invalid_authentication", "Sign in is required.", 401);
  await ensureAccount(user.id);
  if (path === "/v1/entitlement" && request.method === "GET") return json(request, await entitlement(user.id));
  if (path === "/v1/checkout-sessions" && request.method === "POST") {
    if (!STRIPE_KEY.startsWith("sk_test_")) return failure(request, "temporary_service_outage", "Stripe test mode is not configured.", 503, true);
    const body = await request.json();
    const values = new URLSearchParams({ mode: "subscription", success_url: `${PUBLIC_APP_URL}${body.return_path}?checkout=success`, cancel_url: `${PUBLIC_APP_URL}${body.return_path}?checkout=cancelled`, "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": String(MONTHLY_CENTS), "line_items[0][price_data][recurring][interval]": "month", "line_items[0][price_data][product_data][name]": "Depo-Pro Reporter Monthly", "subscription_data[metadata][account_id]": user.id, "metadata[account_id]": user.id, customer_email: user.email || "" });
    const session = await stripe("checkout/sessions", values);
    return json(request, { url: session.url, expires_at: iso(new Date(session.expires_at*1000)), test_mode: true }, 201);
  }
  if (path === "/v1/live-sessions" && request.method === "POST") {
    const access = await entitlement(user.id); if (!access.can_start_cloud_transcription) return failure(request, "payment_required", "An active subscription or trial is required for cloud transcription.", 402);
    const body = await request.json(); const hash = body.device_fingerprint;
    let { data: device } = await table("devices").select("*").eq("user_id", user.id).eq("fingerprint_hash", hash).maybeSingle();
    if (!device) { const { count } = await table("devices").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"); if ((count||0)>=2) return failure(request,"device_limit","Revoke a device before adding another.",409); const inserted = await table("devices").insert({ user_id:user.id, fingerprint_hash:hash, display_name:body.device_name }).select().single(); device=inserted.data; }
    await table("live_sessions").update({ state:"stale" }).eq("user_id",user.id).eq("state","active").lte("grant_expires_at",iso());
    const { data: active } = await table("live_sessions").select("id").eq("user_id",user.id).eq("state","active").maybeSingle(); if(active) return failure(request,"session_conflict","Another live session is active.",409);
    const expires=addHours(24); const reconnect=new Date(expires.getTime()+10*60*1000);
    const { data, error } = await table("live_sessions").insert({ user_id:user.id, device_id:device.id, state:"active", idempotency_key:body.idempotency_key, grant_expires_at:iso(expires), reconnect_until:iso(reconnect) }).select().single(); if(error) throw error;
    return json(request,{ contract_version:VERSION, session_id:data.id, grant_expires_at:data.grant_expires_at, reconnect_until:data.reconnect_until, heartbeat_interval_seconds:60 },201);
  }
  const match = path.match(/^\/v1\/live-sessions\/([0-9a-f-]+)\/(credentials|heartbeat|close)$/);
  if (match) {
    const id = match[1]; const action = match[2]; const { data: session } = await table("live_sessions").select("*,licensing_devices!inner(fingerprint_hash,status)").eq("id",id).eq("user_id",user.id).maybeSingle(); if(!session) return failure(request,"not_found","Session not found.",404);
    if (action === "credentials") { if(!DEEPGRAM_KEY) return failure(request,"temporary_service_outage","Transcription provider is unavailable.",503,true); const body=await request.json(); if(body.device_fingerprint!==session.licensing_devices.fingerprint_hash) return failure(request,"invalid_authentication","This session belongs to another device.",403); const response=await fetch("https://api.deepgram.com/v1/auth/grant",{method:"POST",headers:{Authorization:`Token ${DEEPGRAM_KEY}`}}); if(!response.ok) return failure(request,"temporary_service_outage","Temporary transcription credential could not be issued.",503,true); const grant=await response.json(); return json(request,{contract_version:VERSION,access_token:grant.access_token,token_type:"bearer",expires_in_seconds:30}); }
    if (action === "heartbeat") { await table("live_sessions").update({heartbeat_at:iso()}).eq("id",id); return new Response(null,{status:204,headers:cors(request)}); }
    const body=await request.json(); await table("live_sessions").update({state:"closed",closed_at:iso()}).eq("id",id); await table("usage_ledger").upsert({user_id:user.id,session_id:id,idempotency_key:body.idempotency_key,seconds:Math.max(0,Math.round(body.client_recorded_seconds))},{onConflict:"idempotency_key"}); return json(request,await usage(user.id));
  }
  return failure(request,"not_found","Licensing route not found.",404);
});
