type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export class GoogleApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}


export async function googleRequest(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await googleAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function googleIdentityToken(audience: string): Promise<string> {
  const account = serviceAccount();
  const response = await googleRequest(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${
      encodeURIComponent(account.client_email)
    }:generateIdToken`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, includeEmail: true }),
    },
  );
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const body = await response.json() as { token?: string };
  if (!body.token) {
    throw new GoogleApiError(502, "Google identity token is missing");
  }
  return body.token;
}

export async function verifyGoogleOidcToken(
  token: string,
  audience: string,
): Promise<{ email: string }> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${
      encodeURIComponent(token)
    }`,
  );
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const claims = await response.json() as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
  };
  if (claims.aud !== audience) {
    throw new GoogleApiError(401, "Google OIDC audience mismatch");
  }
  if (!claims.email || claims.email !== serviceAccount().client_email) {
    throw new GoogleApiError(401, "Google OIDC identity mismatch");
  }
  if (claims.email_verified !== true && claims.email_verified !== "true") {
    throw new GoogleApiError(401, "Google OIDC identity is unverified");
  }
  return { email: claims.email };
}

export function serviceAccountEmail(): string {
  return serviceAccount().client_email;
}

async function googleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }
  const account = serviceAccount();
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: account.token_uri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemPrivateKey(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const token = await response.json() as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token) {
    throw new GoogleApiError(502, "Google access token is missing");
  }
  cachedAccessToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.value;
}

function serviceAccount(): ServiceAccount {
  const raw = Deno.env.get("EXPORT_GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    throw new GoogleApiError(500, "export adapter credentials are missing");
  }
  const candidate = JSON.parse(raw) as Partial<ServiceAccount>;
  if (
    !candidate.client_email || !candidate.private_key || !candidate.token_uri
  ) {
    throw new GoogleApiError(500, "export adapter credentials are invalid");
  }
  return candidate as ServiceAccount;
}

function pemPrivateKey(value: string): ArrayBuffer {
  const base64 = value.replace(
    /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
    "",
  );
  const bytes = Uint8Array.from(
    atob(base64),
    (character) => character.charCodeAt(0),
  );
  return bytes.buffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/g,
    "",
  );
}
