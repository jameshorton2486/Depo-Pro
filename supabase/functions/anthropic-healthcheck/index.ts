const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnthropicErrorPayload {
  type?: string;
  error?: {
    type?: string;
    message?: string;
  };
  request_id?: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return json({
      ok: false,
      secretPresent: false,
      error: "ANTHROPIC_API_KEY is not set",
    }, 500);
  }

  const model = "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json() as AnthropicErrorPayload;
    return json({
      ok: false,
      secretPresent: true,
      status: response.status,
      type: errorPayload.error?.type ?? errorPayload.type ?? "unknown_error",
      message: errorPayload.error?.message ?? "Anthropic request failed",
      requestId: errorPayload.request_id ?? null,
    }, response.status);
  }

  const payload = await response.json() as { id?: string; model?: string };
  return json({
    ok: true,
    secretPresent: true,
    status: response.status,
    id: payload.id ?? null,
    model: payload.model ?? model,
  }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
  });
}
