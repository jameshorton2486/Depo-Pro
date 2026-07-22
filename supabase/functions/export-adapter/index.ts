import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  bytesToBase64,
  GoogleApiError,
  googleRequest,
  serviceAccountEmail,
} from "./google.ts";
import {
  assertJobTranscript,
  buildFormatterRelayRequest,
  buildStagedFormatterRequest,
  type ExportJob,
  type ExportServiceRequest,
  parseAdapterRequest,
  persistQueuedCancellation,
  shouldPersistCancellationAfterMissingTask,
  shouldRecoverQueuedDispatch,
  type StoredJob,
  type StoredJobVersion,
  validateStoredJob,
} from "./protocol.ts";

type Database = Record<string, never>;

type TranscriptRow = {
  transcript_id: string;
  case_id: string;
  job_id: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const config = {
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  gcpProject: Deno.env.get("EXPORT_GCP_PROJECT") ?? "",
  gcpLocation: Deno.env.get("EXPORT_TASKS_LOCATION") ?? "us-central1",
  queue: Deno.env.get("EXPORT_TASKS_QUEUE") ?? "depo-pro-formatter",
  relayTargetUrl: Deno.env.get("EXPORT_ADAPTER_RELAY_URL") ?? "",
  relayOidcAudience: Deno.env.get("EXPORT_ADAPTER_RELAY_OIDC_AUDIENCE") ?? "",
  bucket: Deno.env.get("EXPORT_ARTIFACT_BUCKET") ?? "",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respond(200, { ok: true });
  }
  if (request.method !== "POST") {
    return respondError(405, "method not allowed");
  }

  try {
    requireConfiguration();
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new AdapterError(401, "unauthorized");
    }

    const supabase = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        global: { headers: { Authorization: authorization } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
    const { error: userError } = await supabase.auth.getUser(
      authorization.slice("Bearer ".length),
    );
    if (userError) {
      throw new AdapterError(401, "unauthorized");
    }

    let payload;
    try {
      payload = parseAdapterRequest(await request.json());
    } catch (error) {
      throw new AdapterError(
        400,
        error instanceof Error ? error.message : "adapter request is invalid",
      );
    }
    if (payload.action === "create") {
      return respond(202, await createExport(supabase, payload.request));
    }

    await requireTranscriptAccess(supabase, payload.transcriptId);
    if (payload.action === "get") {
      return respond(
        200,
        (await requireStoredJob(payload.jobId, payload.transcriptId)).value.job,
      );
    }

    return respond(
      200,
      await cancelExport(payload.jobId, payload.transcriptId),
    );
  } catch (error) {
    if (error instanceof AdapterError) {
      return respondError(error.status, error.message);
    }
    console.error("[export-adapter] unexpected error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected export adapter error");
  }
});

async function createExport(
  supabase: SupabaseClient<Database>,
  request: ExportServiceRequest,
): Promise<ExportJob> {
  const transcript = await requireTranscriptAccess(
    supabase,
    request.transcriptId,
  );
  await requirePersistedCertification(supabase, transcript.case_id);

  const jobId = await deterministicIdentifier(
    "export",
    `${request.transcriptId}:${request.idempotencyKey}`,
  );
  const existing = await readStoredJob(jobId);
  if (existing) {
    try {
      assertJobTranscript(existing.value.job, request.transcriptId);
    } catch {
      throw new AdapterError(
        409,
        "Idempotency key already belongs to another transcript",
      );
    }
    if (shouldRecoverQueuedDispatch(existing.value.job)) {
      await recoverQueuedDispatch(jobId, request);
    }
    return existing.value.job;
  }

  const queued: ExportJob = {
    jobId,
    transcriptId: request.transcriptId,
    status: "QUEUED",
    artifacts: [],
    error: null,
  };
  const stored: StoredJob = {
    job: queued,
    idempotencyKey: request.idempotencyKey,
    retryEligible: true,
    updatedAt: new Date().toISOString(),
  };

  let generation: string;
  try {
    generation = await writeStoredJob(jobId, stored, "0");
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 412) {
      const current = await requireStoredJob(jobId, request.transcriptId);
      if (shouldRecoverQueuedDispatch(current.value.job)) {
        await recoverQueuedDispatch(jobId, request);
      }
      return current.value.job;
    }
    throw error;
  }

  try {
    const requestObjectName = formatterRequestObjectName(jobId);
    const requestGeneration = await writeStagedFormatterRequest(jobId, request);
    try {
      await dispatchFormatterTask(jobId, request.transcriptId, requestObjectName);
    } catch (error) {
      await deleteStorageObject(requestObjectName, requestGeneration);
      throw error;
    }
  } catch (error) {
    await deleteStoredJob(jobId, generation);
    if (error instanceof GoogleApiError) {
      throw new AdapterError(503, "formatter dispatch unavailable");
    }
    throw error;
  }

  return queued;
}

async function recoverQueuedDispatch(
  jobId: string,
  request: ExportServiceRequest,
): Promise<void> {
  const requestObjectName = formatterRequestObjectName(jobId);
  await writeStagedFormatterRequestIfMissing(jobId, request);
  await dispatchFormatterTask(jobId, request.transcriptId, requestObjectName);
}
async function cancelExport(
  jobId: string,
  transcriptId: string,
): Promise<ExportJob> {
  const stored = await requireStoredJob(jobId, transcriptId);
  if (stored.value.job.status !== "QUEUED") {
    throw new AdapterError(409, "only queued exports can be cancelled");
  }

  const taskName = taskResourceName(
    await deterministicIdentifier(
      "export",
      `${transcriptId}:${stored.value.idempotencyKey ?? ""}`,
    ),
  );
  const response = await googleRequest(
    `https://cloudtasks.googleapis.com/v2/${taskName}`,
    { method: "DELETE" },
  );
  if (response.status === 404) {
    const current = await requireStoredJob(jobId, transcriptId);
    if (!shouldPersistCancellationAfterMissingTask(current.value.job)) {
      return current.value.job;
    }
    return persistCancellation(jobId, transcriptId, current);
  }
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }

  return persistCancellation(jobId, transcriptId, stored);
}

async function persistCancellation(
  jobId: string,
  transcriptId: string,
  stored: StoredJobVersion,
): Promise<ExportJob> {
  try {
    return await persistQueuedCancellation(
      stored,
      async (job, generation) => {
        await writeStoredJob(jobId, job, generation);
      },
      () => requireStoredJob(jobId, transcriptId),
      (error) => error instanceof GoogleApiError && error.status === 412,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "CancellationConflictError") {
      throw new AdapterError(409, error.message);
    }
    throw error;
  }
}
async function requireTranscriptAccess(
  supabase: SupabaseClient<Database>,
  routeId: string,
): Promise<TranscriptRow> {
  const fields = "transcript_id, case_id, job_id";
  const byTranscript = await supabase.from("transcripts").select(fields).eq(
    "transcript_id",
    routeId,
  ).maybeSingle();
  if (byTranscript.error) {
    throw new AdapterError(500, "failed to load transcript");
  }
  if (byTranscript.data) {
    return byTranscript.data as TranscriptRow;
  }

  const byJob = await supabase.from("transcripts").select(fields).eq(
    "job_id",
    routeId,
  ).maybeSingle();
  if (byJob.error) {
    throw new AdapterError(500, "failed to load transcript");
  }
  if (!byJob.data) {
    throw new AdapterError(404, "unknown transcript");
  }
  return byJob.data as TranscriptRow;
}

async function requirePersistedCertification(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("case_certifications")
    .select("certification_date")
    .eq("case_id", caseId)
    .maybeSingle();
  if (error) {
    throw new AdapterError(500, "failed to verify certification");
  }
  const certification = data as { certification_date?: string | null } | null;
  if (!certification?.certification_date) {
    throw new AdapterError(
      409,
      "persisted certification is required before export",
    );
  }
}

async function dispatchFormatterTask(
  jobId: string,
  transcriptId: string,
  requestObjectName: string,
): Promise<void> {
  const relayRequest = buildFormatterRelayRequest(
    jobId,
    transcriptId,
    requestObjectName,
  );
  const body = bytesToBase64(
    new TextEncoder().encode(JSON.stringify(relayRequest)),
  );
  const task = {
    task: {
      name: taskResourceName(jobId),
      httpRequest: {
        httpMethod: "POST",
        url: config.relayTargetUrl,
        headers: { "Content-Type": "application/json" },
        body,
        oidcToken: {
          serviceAccountEmail: serviceAccountEmail(),
          audience: config.relayOidcAudience,
        },
      },
    },
  };
  const response = await googleRequest(
    `https://cloudtasks.googleapis.com/v2/projects/${
      encodeURIComponent(config.gcpProject)
    }/locations/${encodeURIComponent(config.gcpLocation)}/queues/${
      encodeURIComponent(config.queue)
    }/tasks`,
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
    throw new GoogleApiError(response.status, await response.text());
  }
}

async function readStoredJob(jobId: string): Promise<StoredJobVersion | null> {
  const response = await googleRequest(storageObjectUrl(jobObjectName(jobId), true));
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const generation = response.headers.get("x-goog-generation");
  if (!generation) {
    throw new AdapterError(502, "export job generation is missing");
  }
  const value = await response.json() as StoredJob;
  validateStoredJob(value);
  return { value, generation };
}

async function requireStoredJob(
  jobId: string,
  transcriptId: string,
): Promise<StoredJobVersion> {
  const stored = await readStoredJob(jobId);
  if (!stored) {
    throw new AdapterError(404, "unknown export job");
  }
  assertJobTranscript(stored.value.job, transcriptId);
  return stored;
}

async function writeStoredJob(
  jobId: string,
  value: StoredJob,
  generation: string,
): Promise<string> {
  return await writeJsonObject(jobObjectName(jobId), value, generation);
}

async function writeStagedFormatterRequest(
  jobId: string,
  request: ExportServiceRequest,
): Promise<string> {
  return await writeJsonObject(
    formatterRequestObjectName(jobId),
    buildStagedFormatterRequest(jobId, request),
    "0",
  );
}

async function writeStagedFormatterRequestIfMissing(
  jobId: string,
  request: ExportServiceRequest,
): Promise<void> {
  try {
    await writeStagedFormatterRequest(jobId, request);
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 412) {
      return;
    }
    throw error;
  }
}
async function writeJsonObject(
  objectName: string,
  value: unknown,
  generation: string,
): Promise<string> {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${
    encodeURIComponent(config.bucket)
  }/o?uploadType=media&name=${
    encodeURIComponent(objectName)
  }&ifGenerationMatch=${encodeURIComponent(generation)}`;
  const response = await googleRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const metadata = await response.json() as { generation?: string };
  if (!metadata.generation) {
    throw new AdapterError(502, "export object generation is missing");
  }
  return metadata.generation;
}

async function deleteStoredJob(
  jobId: string,
  generation: string,
): Promise<void> {
  await deleteStorageObject(jobObjectName(jobId), generation);
}

async function deleteStorageObject(
  objectName: string,
  generation: string,
): Promise<void> {
  const response = await googleRequest(
    `${storageObjectUrl(objectName, false)}&ifGenerationMatch=${
      encodeURIComponent(generation)
    }`,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 404 && response.status !== 412) {
    throw new GoogleApiError(response.status, await response.text());
  }
}

function storageObjectUrl(objectName: string, media: boolean): string {
  return `https://storage.googleapis.com/storage/v1/b/${
    encodeURIComponent(config.bucket)
  }/o/${encodeURIComponent(objectName)}?alt=${
    media ? "media" : "json"
  }`;
}

function jobObjectName(jobId: string): string {
  return `exports/jobs/${jobId}.json`;
}

function formatterRequestObjectName(jobId: string): string {
  return `exports/requests/${jobId}.json`;
}

function taskResourceName(jobId: string): string {
  return `projects/${config.gcpProject}/locations/${config.gcpLocation}/queues/${config.queue}/tasks/${jobId}`;
}

async function deterministicIdentifier(
  prefix: string,
  value: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return `${prefix}-${
    Array.from(new Uint8Array(digest)).map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("").slice(0, 32)
  }`;
}

function requireConfiguration(): void {
  const required = [
    config.supabaseUrl,
    config.supabaseAnonKey,
    config.gcpProject,
    config.gcpLocation,
    config.queue,
    config.relayTargetUrl,
    config.relayOidcAudience,
    config.bucket,
  ];
  if (required.some((value) => !value)) {
    throw new AdapterError(500, "export adapter is not configured");
  }
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function respondError(status: number, message: string): Response {
  return respond(status, { error: message });
}

class AdapterError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}