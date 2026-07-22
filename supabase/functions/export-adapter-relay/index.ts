import {
  GoogleApiError,
  googleIdentityToken,
  googleRequest,
  verifyGoogleOidcToken,
} from "../export-adapter/google.ts";
import {
  parseFormatterRelayRequest,
  validateStagedFormatterRequest,
  type StagedFormatterRequest,
  validateStoredJob,
} from "../export-adapter/protocol.ts";

const config = {
  bucket: Deno.env.get("EXPORT_ARTIFACT_BUCKET") ?? "",
  relayOidcAudience: Deno.env.get("EXPORT_ADAPTER_RELAY_OIDC_AUDIENCE") ?? "",
  formatterTaskUrl: Deno.env.get("EXPORT_FORMATTER_TASK_URL") ?? "",
  formatterOidcAudience: Deno.env.get("EXPORT_FORMATTER_OIDC_AUDIENCE") ?? "",
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return respond(405, { error: "method not allowed" });
  }

  try {
    requireConfiguration();
    await requireGoogleTaskIdentity(request);
    const relay = parseFormatterRelayRequest(await request.json());
    const staged = await requireStagedFormatterRequest(relay.requestObjectName);
    validateStagedFormatterRequest(staged, relay);

    const formatterResponse = await invokeFormatter(staged);
    const body = await formatterResponse.text();
    if (formatterResponse.status < 500) {
      await deleteStagedRequest(relay.requestObjectName).catch((error) => {
        console.error("[export-adapter-relay] staged request cleanup failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return new Response(body, {
      status: formatterResponse.status,
      headers: {
        "Content-Type": formatterResponse.headers.get("Content-Type") ??
          "application/json",
      },
    });
  } catch (error) {
    if (error instanceof RelayError) {
      return respond(error.status, { error: error.message });
    }
    if (error instanceof GoogleApiError) {
      console.error("[export-adapter-relay] Google API error", {
        status: error.status,
        message: error.message,
      });
      return respond(error.status >= 500 ? 503 : error.status, {
        error: "formatter relay unavailable",
      });
    }
    console.error("[export-adapter-relay] unexpected error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return respond(500, { error: "unexpected export adapter relay error" });
  }
});

async function requireGoogleTaskIdentity(request: Request): Promise<void> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new RelayError(401, "unauthorized");
  }
  try {
    await verifyGoogleOidcToken(
      authorization.slice("Bearer ".length),
      config.relayOidcAudience,
    );
  } catch (error) {
    if (error instanceof GoogleApiError) {
      throw new RelayError(401, "unauthorized");
    }
    throw error;
  }
}

async function requireStagedFormatterRequest(
  objectName: string,
): Promise<StagedFormatterRequest> {
  const response = await googleRequest(storageObjectUrl(objectName, true));
  if (response.status === 404) {
    const jobId = jobIdFromRequestObjectName(objectName);
    if (jobId) {
      const stored = await readStoredJob(jobId);
      if (stored?.job.status === "COMPLETED" || stored?.job.status === "FAILED") {
        throw new RelayError(200, "export already reached a terminal state");
      }
    }
    throw new RelayError(404, "staged formatter request is missing");
  }
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  return await response.json() as StagedFormatterRequest;
}

async function invokeFormatter(staged: StagedFormatterRequest): Promise<Response> {
  const identityToken = await googleIdentityToken(config.formatterOidcAudience);
  return await fetch(config.formatterTaskUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${identityToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId: staged.jobId, request: staged.request }),
  });
}

async function readStoredJob(jobId: string): Promise<{ job: { status: string } } | null> {
  const response = await googleRequest(storageObjectUrl(`exports/jobs/${jobId}.json`, true));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GoogleApiError(response.status, await response.text());
  }
  const value = await response.json();
  validateStoredJob(value);
  return value;
}

async function deleteStagedRequest(objectName: string): Promise<void> {
  const response = await googleRequest(storageObjectUrl(objectName, false), {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new GoogleApiError(response.status, await response.text());
  }
}

function storageObjectUrl(objectName: string, media: boolean): string {
  return `https://storage.googleapis.com/storage/v1/b/${
    encodeURIComponent(config.bucket)
  }/o/${encodeURIComponent(objectName)}?alt=${media ? "media" : "json"}`;
}

function jobIdFromRequestObjectName(objectName: string): string | null {
  const match = /^exports\/requests\/(export-[a-f0-9]{32})\.json$/.exec(objectName);
  return match?.[1] ?? null;
}

function requireConfiguration(): void {
  const required = [
    config.bucket,
    config.relayOidcAudience,
    config.formatterTaskUrl,
    config.formatterOidcAudience,
  ];
  if (required.some((value) => !value)) {
    throw new RelayError(500, "export adapter relay is not configured");
  }
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

class RelayError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}