import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripeState } from '@/lib/licensing/state';

const graceDays=()=>Number(process.env.LICENSING_GRACE_DAYS??5);

export async function POST(request:NextRequest){
  const key=process.env.STRIPE_SECRET_KEY,secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!key||!secret) return NextResponse.json({error:'Test billing is not configured.'},{status:503});
  const signature=request.headers.get('stripe-signature');
  if(!signature) return NextResponse.json({error:'Missing signature.'},{status:401});
  let event:Stripe.Event;
  try{event=new Stripe(key).webhooks.constructEvent(await request.text(),signature,secret);}catch{return NextResponse.json({error:'Invalid signature.'},{status:401});}
  const db=createAdminClient();
  const inserted=await db.from('licensing_webhook_events').insert({stripe_event_id:event.id,event_type:event.type,event_created:event.created});
  if(inserted.error?.code==='23505') return NextResponse.json({received:true,duplicate:true});
  if(inserted.error) return NextResponse.json({error:'Webhook storage failed.'},{status:503});

  const object=event.data.object as unknown as Record<string,unknown>;
  const customer=typeof object.customer==='string'?object.customer:null;
  if(!customer) return NextResponse.json({received:true});
  const account=(await db.from('licensing_accounts').select('user_id').eq('stripe_customer_id',customer).maybeSingle()).data;
  if(!account) return NextResponse.json({received:true});
  const current=(await db.from('licensing_subscriptions').select('*').eq('user_id',account.user_id).single()).data;
  if(current&&Number(current.last_stripe_event_created)>event.created) return NextResponse.json({received:true,out_of_order:true});

  const update:Record<string,unknown>={last_stripe_event_created:event.created,updated_at:new Date().toISOString()};
  if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){
    update.stripe_subscription_id=String(object.id);
    update.state=stripeState(String(object.status??''),Boolean(object.cancel_at_period_end));
    const periodEnd=Number(object.current_period_end??0); if(periodEnd) update.paid_through=new Date(periodEnd*1000).toISOString();
    if(update.state==='active'){update.first_failure_at=null;update.grace_ends_at=null;}
  }else if(event.type==='customer.subscription.deleted'){
    update.state='expired';
  }else if(event.type==='invoice.payment_failed'){
    const first=current?.first_failure_at??new Date().toISOString();
    update.state='grace';update.first_failure_at=first;update.grace_ends_at=new Date(new Date(first).getTime()+graceDays()*86400_000).toISOString();
  }else if(event.type==='invoice.paid'){
    update.state='active';update.first_failure_at=null;update.grace_ends_at=null;
  }
  await db.from('licensing_subscriptions').update(update).eq('user_id',account.user_id);
  return NextResponse.json({received:true});
}
