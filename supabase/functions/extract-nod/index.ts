import { normalizeFields } from "./normalization.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-haiku-4-5";
const MAX_TEXT_CHARS = 50_000;
const ANTHROPIC_VERSION = "2023-06-01";

type DocType = "nod" | "order" | "jobsheet";

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    type?: string;
    message?: string;
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respond({ ok: true }, 200);
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 200);
  }

  try {
    const body = await request.json() as { text?: unknown; docType?: unknown };
    const text = typeof body.text === "string" ? body.text : "";
    const docType = isDocType(body.docType) ? body.docType : "nod";

    if (!text.trim()) {
      return respond({ error: "No document text was provided." }, 200);
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return respond({ error: "ANTHROPIC_API_KEY is not set in Supabase secrets." }, 200);
    }

    const truncatedText = text.length > MAX_TEXT_CHARS
      ? `${text.slice(0, MAX_TEXT_CHARS)}\n\n[TRUNCATED AFTER ${MAX_TEXT_CHARS} CHARACTERS]`
      : text;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: [
          "You extract structured legal deposition metadata for a Texas court reporter.",
          "The input may contain a worksheet cover sheet, scheduling notes, or other boilerplate before the actual notice or order.",
          "Prefer the actual notice, order, or operative legal document over internal worksheet content.",
          "Return only valid JSON matching the supplied shape.",
          "Use empty strings for missing scalar values, empty arrays for missing list values, and false only when the document explicitly indicates a boolean no.",
          "Never fabricate values not supported by the document.",
          "If a value is explicitly stated, return it with high confidence.",
          "If a value is not explicitly stated but is reasonably inferable from context, you may return it with inferred=true and confidence no greater than 0.6.",
          "If a value is truly absent, leave it empty instead of inferring.",
          "Per-field confidence must be between 0 and 1 and should reflect how explicit the source text was.",
          "Preserve full cause numbers including judge suffixes such as -OLG.",
          "Extract the defendants array explicitly from the case caption when defendants are named there.",
          "Return deposition_date as YYYY-MM-DD.",
          "Return start_time and end_time as HH:MM 24-hour time.",
          "Return reporting_method as exactly one of: machine_shorthand, zoom, in_person, audio_recording.",
          "For remote proceedings, set remote.is_remote true, identify the platform when stated, and leave street address, city, state, and zip as empty strings unless expressly stated.",
          "County may be inferred with inferred=true and confidence no greater than 0.6 when a named Texas division or city makes the county reasonably clear, such as San Antonio Division implying Bexar County.",
          "An attorney side may be inferred with inferred=true and confidence no greater than 0.6 from context such as certificate-of-service position, the party they represent, or caption alignment.",
          "Return exactly one JSON object and no markdown fences or commentary.",
        ].join(" "),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Document type: ${docType}`,
                  "",
                  "Return JSON with this exact shape:",
                  "{\"cause_number\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"case_style\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"plaintiff\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"defendants\":{\"value\":[],\"confidence\":0,\"inferred\":false},\"court_name\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"district\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"division\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"county\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"state\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"deposition_date\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"start_time\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"end_time\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"location\":{\"address\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"city\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"state\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"zip\":{\"value\":\"\",\"confidence\":0,\"inferred\":false}},\"remote\":{\"is_remote\":{\"value\":false,\"confidence\":0,\"inferred\":false},\"platform\":{\"value\":\"\",\"confidence\":0,\"inferred\":false}},\"reporting_method\":{\"value\":\"in_person\",\"confidence\":0,\"inferred\":false},\"witness\":{\"name\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"party_affiliation\":{\"value\":\"\",\"confidence\":0,\"inferred\":false}},\"attorneys\":[{\"name\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"firm\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"representing\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"address\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"city\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"state\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"zip\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"phone\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"email\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"bar_number\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"side\":{\"value\":\"plaintiff\",\"confidence\":0,\"inferred\":false}}],\"other_participants\":[{\"name\":{\"value\":\"\",\"confidence\":0,\"inferred\":false},\"role\":{\"value\":\"\",\"confidence\":0,\"inferred\":false}}]}",
                  "",
                  "Document text:",
                  truncatedText,
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    });

    const payload = await anthropicResponse.json() as AnthropicResponse;
    if (!anthropicResponse.ok) {
      return respond({ error: payload.error?.message ?? "Anthropic extraction request failed." }, 200);
    }

    const textBlock = payload.content?.find((item) => item.type === "text" && typeof item.text === "string");
    if (!textBlock?.text) {
      return respond({ error: "Anthropic returned no structured output." }, 200);
    }

    const parsed = parseStructuredText(textBlock.text);
    if (!isStructuredPayload(parsed)) {
      return respond({ error: "Anthropic returned JSON that did not match the extraction schema." }, 200);
    }

    const fields = normalizeFields(parsed, truncatedText);

    return respond({
      fields,
      model: payload.model ?? MODEL,
      usage: payload.usage ?? null,
    }, 200);
  } catch (error) {
    return respond({
      error: error instanceof Error ? error.message : "Extraction failed.",
    }, 200);
  }
});

function parseStructuredText(text: string): unknown {
  const trimmed = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function isStructuredPayload(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  return (
    isObject(value.location) &&
    isObject(value.remote) &&
    isObject(value.witness) &&
    Array.isArray(value.attorneys) &&
    Array.isArray(value.other_participants)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDocType(value: unknown): value is DocType {
  return value === "nod" || value === "order" || value === "jobsheet";
}

function respond(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
  });
}
