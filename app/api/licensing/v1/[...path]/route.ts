import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { licensingUserId } from '@/lib/licensing/auth';
import { mintDeepgramToken } from '@/lib/licensing/deepgram';
import { checkout, closeSession, entitlement, heartbeat, LicensingServiceError, portal, startSession, validateSession } from '@/lib/licensing/service';

function response(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function origin(request:NextRequest){return new URL(request.url).origin;}

async function dispatch(request:NextRequest,parts:string[]){
  const userId=await licensingUserId(request);
  if(!userId) return response({contract_version:'1.0',code:'invalid_authentication',message:'Sign in is required.',retryable:false},401);
  const body=request.method==='POST'?await request.json().catch(()=>({})) as Record<string,unknown>:{};
  if(request.method==='GET'&&parts.join('/')==='entitlement') return response(await entitlement(userId));
  if(request.method==='POST'&&parts.join('/')==='checkout-sessions') return response({contract_version:'1.0',url:await checkout(userId,origin(request)),expires_at:new Date(Date.now()+30*60_000).toISOString(),test_mode:true},201);
  if(request.method==='POST'&&parts.join('/')==='billing-portal-sessions') return response({contract_version:'1.0',url:await portal(userId,origin(request)),expires_at:new Date(Date.now()+30*60_000).toISOString(),test_mode:true},201);
  if(request.method==='POST'&&parts.join('/')==='live-sessions') return response(await startSession(userId,body),201);
  if(request.method==='POST'&&parts.join('/')==='batch-authorizations') {
    if(!(await entitlement(userId)).can_start_cloud_transcription) throw new LicensingServiceError('payment_required',402,'An active subscription is required.');
    const token=await mintDeepgramToken(); return response({contract_version:'1.0',...token,token_type:'bearer'});
  }
  if(request.method==='POST'&&parts[0]==='live-sessions'&&parts.length===3){
    const sessionId=parts[1],action=parts[2];
    if(action==='credentials'){await validateSession(userId,sessionId,String(body.device_fingerprint??''));const token=await mintDeepgramToken();return response({contract_version:'1.0',...token,token_type:'bearer'});}
    if(action==='heartbeat'){await heartbeat(userId,sessionId);return new NextResponse(null,{status:204});}
    if(action==='close'){await closeSession(userId,sessionId,body);return response({contract_version:'1.0',closed:true});}
  }
  throw new LicensingServiceError('not_found',404,'Endpoint not found.');
}

async function handle(request:NextRequest,ctx:{params:Promise<{path:string[]}>}){
  try{return await dispatch(request,(await ctx.params).path??[]);}catch(error){
    const known=error instanceof LicensingServiceError;
    return response({contract_version:'1.0',code:known?error.code:'temporary_service_outage',message:known?error.message:'The licensing service is temporarily unavailable.',retryable:!known||error.status>=500},known?error.status:503);
  }
}
export const GET=handle; export const POST=handle;
