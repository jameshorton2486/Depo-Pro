type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

type FinalizeTaskConfig = {
  gcpProject: string;
  gcpLocation: string;
  queue: string;
  targetUrl: string;
  oidcAudience: string;
};

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export class FinalizeTaskDispatchError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function finalizeTaskConfiguration(): FinalizeTaskConfig {
  return {
    gcpProject: Deno.env.get("FINALIZE_GCP_PROJECT") ?? Deno.env.get("EXPORT_GCP_PROJECT") ?? "",
    gcpLocation: Deno.env.get("FINALIZE_TASKS_LOCATION") ?? Deno.env.get("EXPORT_TASKS_LOCATION") ?? "us-central1",
    queue: Deno.env.get("FINALIZE_TASKS_QUEUE") ?? "depo-pro-transcript-finalize",
    targetUrl: Deno.env.get("FINALIZE_WORKER_TASK_URL") ?? "",
    oidcAudience: Deno.env.get("FINALIZE_WORKER_OIDC_AUDIENCE") ?? "",
  };
}

export async function dispatchFinalizeTask(jobId: string): Promise<void> {
  const config = finalizeTaskConfiguration();
  requireFinalizeTaskConfiguration(config);
  const task = {
    task: {
      name: taskResourceName(config, jobId),
      httpRequest: {
        httpMethod: "POST",
        url: config.targetUrl,
        headers: { "Content-Type": "application/json" },
        body: bytesToBase64(new TextEncoder().encode(JSON.stringify({ job_id: jobId }))),
        oidcToken: {
          serviceAccountEmail: serviceAccountEmail(),
          audience: config.oidcAudience,
        },
      },
    },
  };

  const response = await googleRequest(
    `https://cloudtasks.googleapis.com/v2/projects/${encodeURIComponent(config.gcpProject)}/locations/${
      encodeURIComponent(config.gcpLocation)
    }/queues/${encodeURIComponent(config.queue)}/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    },
  );
  if (response.status === 409) {
    return;
  }
  if (!response.ok) {
    throw new FinalizeTaskDispatchError(response.status, await response.text());
  }
}

function requireFinalizeTaskConfiguration(config: FinalizeTaskConfig): void {
  if (!config.gcpProject || !config.gcpLocation || !config.queue || !config.targetUrl || !config.oidcAudience) {
    throw new FinalizeTaskDispatchError(500, "transcript finalizer task dispatch is not configured");
  }
}

function taskResourceName(config: FinalizeTaskConfig, jobId: string): string {
  return `projects/${config.gcpProject}/locations/${config.gcpLocation}/queues/${config.queue}/tasks/${jobId}`;
}

async function googleRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await googleAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      Authorization: `Bearer ${token}`,
    },
  });
}

function serviceAccountEmail(): string {
  return serviceAccount().client_email;
}

async function googleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }
  const account = serviceAccount();
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
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
    throw new FinalizeTaskDispatchError(response.status, await response.text());
  }
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) {
    throw new FinalizeTaskDispatchError(502, "Google access token is missing");
  }
  cachedAccessToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.value;
}

function serviceAccount(): ServiceAccount {
  const raw = Deno.env.get("FINALIZE_GCP_SERVICE_ACCOUNT_JSON") ?? Deno.env.get("EXPORT_GCP_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    throw new FinalizeTaskDispatchError(500, "transcript finalizer credentials are missing");
  }
  const candidate = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!candidate.client_email || !candidate.private_key || !candidate.token_uri) {
    throw new FinalizeTaskDispatchError(500, "transcript finalizer credentials are invalid");
  }
  return candidate as ServiceAccount;
}

function pemPrivateKey(value: string): ArrayBuffer {
  const base64 = value.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
