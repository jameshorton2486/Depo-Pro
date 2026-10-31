import 'server-only';

export async function mintDeepgramToken(ttlSeconds = 30): Promise<{access_token:string;expires_in_seconds:number}> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('provider_not_configured');
  const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl_seconds: Math.min(3600, Math.max(30, ttlSeconds)) }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('provider_credential_failed');
  const value = await response.json() as {access_token:string;expires_in:number};
  return { access_token: value.access_token, expires_in_seconds: value.expires_in };
}
