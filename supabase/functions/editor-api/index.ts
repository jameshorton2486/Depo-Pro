import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Database = Record<string, never>;

type RouteContext = {
  supabase: SupabaseClient<Database>;
  jobId: string;
  suggestionId?: string;
  request: Request;
};

type RouteMatch =
  | { kind: "document"; jobId: string }
  | { kind: "working"; jobId: string }
  | { kind: "review"; jobId: string }
  | { kind: "speakers"; jobId: string }
  | { kind: "suggestions"; jobId: string }
  | { kind: "resolveSuggestion"; jobId: string; suggestionId: string }
  | { kind: "exhibits"; jobId: string }
  | { kind: "certifyStatus"; jobId: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }

  const match = matchRoute(request);
  if (!match) {
    return respondError(404, "not found");
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return respondError(401, "unauthorized");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[editor-api] missing supabase env", {
      route: match.kind,
      jobId: match.jobId,
    });
    return respondError(500, "server misconfigured");
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    await requireTranscript(supabase, match.jobId);

    const context: RouteContext = {
      supabase,
      jobId: match.jobId,
      suggestionId: "suggestionId" in match ? match.suggestionId : undefined,
      request,
    };

    switch (match.kind) {
      case "document":
        return routeNotImplemented("GET /:jobId/document", context);
      case "working":
        return routeNotImplemented("PUT /:jobId/working", context);
      case "review":
        return routeNotImplemented("PUT /:jobId/review", context);
      case "speakers":
        return routeNotImplemented("PUT /:jobId/speakers", context);
      case "suggestions":
        return routeNotImplemented("GET /:jobId/suggestions", context);
      case "resolveSuggestion":
        return routeNotImplemented("POST /:jobId/suggestions/:suggestionId/resolve", context);
      case "exhibits":
        return routeNotImplemented("GET /:jobId/exhibits", context);
      case "certifyStatus":
        return routeNotImplemented("GET /:jobId/certify/status", context);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return respondError(error.status, error.message);
    }

    console.error("[editor-api] unexpected error", {
      route: match.kind,
      jobId: match.jobId,
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected server error");
  }
});

async function routeNotImplemented(route: string, context: RouteContext): Promise<Response> {
  console.error("[editor-api] route not implemented", {
    route,
    jobId: context.jobId,
  });
  return respondError(500, "route not implemented");
}

async function requireTranscript(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("transcript_id")
    .eq("transcript_id", jobId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to load transcript");
  }

  if (!data) {
    throw new HttpError(404, "unknown jobId");
  }
}

function matchRoute(request: Request): RouteMatch | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const functionsIndex = parts.indexOf("editor-api");
  const routeParts = functionsIndex >= 0 ? parts.slice(functionsIndex + 1) : parts;

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "document") {
    return { kind: "document", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "working") {
    return { kind: "working", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "review") {
    return { kind: "review", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "speakers") {
    return { kind: "speakers", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "suggestions") {
    return { kind: "suggestions", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 4
    && request.method === "POST"
    && routeParts[1] === "suggestions"
    && routeParts[3] === "resolve"
  ) {
    return {
      kind: "resolveSuggestion",
      jobId: routeParts[0],
      suggestionId: routeParts[2],
    };
  }

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "exhibits") {
    return { kind: "exhibits", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "GET"
    && routeParts[1] === "certify"
    && routeParts[2] === "status"
  ) {
    return { kind: "certifyStatus", jobId: routeParts[0] };
  }

  return null;
}

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function respondError(status: number, error: string): Response {
  return respondJson(status, { error });
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
