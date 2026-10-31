import 'server-only';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { LICENSING_CONTRACT_VERSION, licensingConfig } from './config';
import { allowsCloud, effectiveState, type LicensingState } from './state';

export class LicensingServiceError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

const admin = () => createAdminClient();

export async function ensureAccount(userId: string) {
  await admin().from('licensing_accounts').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  await admin().from('licensing_subscriptions').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
}

export async function entitlement(userId: string) {
  await ensureAccount(userId);
  const { data, error } = await admin().from('licensing_subscriptions').select('*').eq('user_id', userId).single();
  if (error || !data) throw new LicensingServiceError('temporary_service_outage', 503, 'Entitlement is unavailable.');
  const state = effectiveState(data as {state:LicensingState;trial_ends_at:string;grace_ends_at:string|null});
  const { data: usage } = await admin().from('licensing_usage_ledger').select('seconds').eq('user_id', userId);
  const used = (usage ?? []).reduce((sum, row) => sum + Number(row.seconds), 0);
  return {
    contract_version: LICENSING_CONTRACT_VERSION, account_id: userId, state,
    can_start_cloud_transcription: allowsCloud(state), existing_files_accessible: true,
    paid_through: data.paid_through, grace_ends_at: data.grace_ends_at,
    device_limit: licensingConfig.deviceLimit, concurrent_session_limit: 1,
    plan: { code:'reporter_monthly', display_name:'Reporter Monthly', monthly_price_cents:licensingConfig.monthlyPriceCents,
      currency:'usd', included_seconds:licensingConfig.includedSeconds, overage_price_cents_per_hour:200,
      overage_billing_enabled:false },
    usage: { used_seconds:used, included_seconds:licensingConfig.includedSeconds, provisional_seconds:0 },
    server_time: new Date().toISOString(),
  };
}

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !licensingConfig.stripePriceId) throw new LicensingServiceError('temporary_service_outage', 503, 'Test billing is not configured.');
  return new Stripe(key);
}

export async function checkout(userId: string, origin: string): Promise<string> {
  await ensureAccount(userId);
  const client = stripe();
  const { data } = await admin().from('licensing_accounts').select('stripe_customer_id').eq('user_id', userId).single();
  let customer = data?.stripe_customer_id as string|null;
  if (!customer) {
    customer = (await client.customers.create({ metadata: { licensing_user_id:userId } })).id;
    await admin().from('licensing_accounts').update({ stripe_customer_id:customer }).eq('user_id',userId);
  }
  const session = await client.checkout.sessions.create({
    mode:'subscription', customer, line_items:[{price:licensingConfig.stripePriceId,quantity:1}],
    success_url:`${origin}/billing?checkout=success`, cancel_url:`${origin}/billing?checkout=cancelled`,
    client_reference_id:userId, subscription_data:{metadata:{licensing_user_id:userId}},
  });
  if (!session.url) throw new LicensingServiceError('temporary_service_outage',503,'Checkout could not be created.');
  return session.url;
}

export async function portal(userId: string, origin: string): Promise<string> {
  const { data } = await admin().from('licensing_accounts').select('stripe_customer_id').eq('user_id', userId).single();
  if (!data?.stripe_customer_id) throw new LicensingServiceError('not_found',404,'No billing customer exists.');
  return (await stripe().billingPortal.sessions.create({customer:data.stripe_customer_id,return_url:`${origin}/billing`})).url;
}

export async function startSession(userId:string, body:Record<string,unknown>) {
  if (!(await entitlement(userId)).can_start_cloud_transcription) throw new LicensingServiceError('payment_required',402,'An active subscription is required.');
  const fingerprint=String(body.device_fingerprint??'');
  if (fingerprint.length<32) throw new LicensingServiceError('invalid_request',400,'Device fingerprint is invalid.');
  const {data:existing}=await admin().from('licensing_devices').select('*').eq('user_id',userId).eq('fingerprint_hash',fingerprint).maybeSingle();
  let device=existing;
  if (!device) {
    const {count}=await admin().from('licensing_devices').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','active');
    if ((count??0)>=licensingConfig.deviceLimit) throw new LicensingServiceError('device_limit',409,'Revoke a device before adding another.');
    const inserted=await admin().from('licensing_devices').insert({user_id:userId,fingerprint_hash:fingerprint,display_name:String(body.device_name??'Windows PC')}).select().single();
    device=inserted.data;
  }
  if (!device || device.status!=='active') throw new LicensingServiceError('invalid_authentication',403,'This device is revoked.');
  const claim=await admin().rpc('licensing_claim_live_session',{p_user_id:userId,p_device_id:device.id,p_idempotency_key:String(body.idempotency_key)});
  if (claim.error) throw new LicensingServiceError(claim.error.message.includes('session_conflict')?'session_conflict':'temporary_service_outage',claim.error.message.includes('session_conflict')?409:503,'A live session could not be authorized.');
  const row=Array.isArray(claim.data)?claim.data[0]:claim.data;
  return {contract_version:'1.0',session_id:row.id,grant_expires_at:row.grant_expires_at,reconnect_until:row.reconnect_until,heartbeat_interval_seconds:60};
}

export async function validateSession(userId:string,sessionId:string,fingerprint:string) {
  const {data}=await admin().from('licensing_live_sessions').select('*,licensing_devices!inner(fingerprint_hash,status)').eq('id',sessionId).eq('user_id',userId).single();
  const device=data?.licensing_devices as unknown as {fingerprint_hash:string;status:string}|undefined;
  if (!data || data.state!=='active' || device?.status!=='active' || device.fingerprint_hash!==fingerprint || new Date(data.reconnect_until)<=new Date())
    throw new LicensingServiceError('invalid_authentication',403,'This session is not authorized for the device.');
}

export async function heartbeat(userId:string,sessionId:string) {
  const result=await admin().from('licensing_live_sessions').update({heartbeat_at:new Date().toISOString()}).eq('id',sessionId).eq('user_id',userId).eq('state','active').select('id');
  if (!result.data?.length) throw new LicensingServiceError('not_found',404,'The live session is not active.');
}

export async function closeSession(userId:string,sessionId:string,body:Record<string,unknown>) {
  await admin().from('licensing_live_sessions').update({state:'closed',closed_at:new Date().toISOString()}).eq('id',sessionId).eq('user_id',userId);
  await admin().from('licensing_usage_ledger').upsert({user_id:userId,session_id:sessionId,idempotency_key:String(body.idempotency_key),seconds:Math.max(0,Number(body.client_recorded_seconds??0))},{onConflict:'idempotency_key',ignoreDuplicates:true});
}
