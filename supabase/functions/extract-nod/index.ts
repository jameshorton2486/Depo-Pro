import { normalizeFields } from "./normalization.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-haiku-4-5";
const MAX_TEXT_CHARS = 50_000;
const MAX_OUTPUT_TOKENS = 8192;
const ANTHROPIC_VERSION = "2023-06-01";
const EXTRACTION_TOOL_NAME = "emit_extraction";

type DocType = "nod" | "order" | "jobsheet";

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string; name?: string; input?: unknown }>;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  stop_reason?: string | null;
  stop_sequence?: string | null;
  error?: {
    type?: string;
    message?: string;
  };
}

type JsonSchema = Record<string, unknown>;

const STRING_FIELD_SCHEMA = confidenceFieldSchema({ type: "string" });
const BOOLEAN_FIELD_SCHEMA = confidenceFieldSchema({ type: "boolean" });
const STRING_ARRAY_FIELD_SCHEMA = confidenceFieldSchema({
  type: "array",
  items: { type: "string" },
});
const WITNESS_NAME_FIELD_SCHEMA = {
  ...STRING_FIELD_SCHEMA,
  description:
    "Populate this with the person being deposed. If the document says Deponent: NAME, person to be deposed, oral deposition of NAME, or to take the deposition of NAME, use that NAME here even when the word witness never appears.",
};
const WITNESS_ROLE_FIELD_SCHEMA = {
  ...STRING_FIELD_SCHEMA,
  description:
    "Role or title of the person being deposed, such as corporate representative, custodian of records, treating physician, or expert. Leave empty if no such role is stated.",
};

const EXTRACTION_TOOL_SCHEMA = objectSchema({
  cause_number: STRING_FIELD_SCHEMA,
  case_style: STRING_FIELD_SCHEMA,
  plaintiff: STRING_FIELD_SCHEMA,
  defendants: STRING_ARRAY_FIELD_SCHEMA,
  court_name: STRING_FIELD_SCHEMA,
  district: STRING_FIELD_SCHEMA,
  division: STRING_FIELD_SCHEMA,
  county: STRING_FIELD_SCHEMA,
  state: STRING_FIELD_SCHEMA,
  jurisdiction_type: STRING_FIELD_SCHEMA,
  deposition_date: STRING_FIELD_SCHEMA,
  start_time: STRING_FIELD_SCHEMA,
  end_time: STRING_FIELD_SCHEMA,
  location: objectSchema({
    address: STRING_FIELD_SCHEMA,
    city: STRING_FIELD_SCHEMA,
    state: STRING_FIELD_SCHEMA,
    zip: STRING_FIELD_SCHEMA,
  }),
  remote: objectSchema({
    is_remote: BOOLEAN_FIELD_SCHEMA,
    platform: STRING_FIELD_SCHEMA,
  }),
  reporting_method: STRING_FIELD_SCHEMA,
  witness: objectSchema({
    name: WITNESS_NAME_FIELD_SCHEMA,
    role: WITNESS_ROLE_FIELD_SCHEMA,
    party_affiliation: STRING_FIELD_SCHEMA,
    read_and_sign: STRING_FIELD_SCHEMA,
    interpreter_required: BOOLEAN_FIELD_SCHEMA,
    videographer_required: BOOLEAN_FIELD_SCHEMA,
  }),
  parties: {
    type: "array",
    items: objectSchema({
      name: STRING_FIELD_SCHEMA,
      role: STRING_FIELD_SCHEMA,
      role_modifier: STRING_FIELD_SCHEMA,
      entity_type: STRING_FIELD_SCHEMA,
      fka_or_dba: STRING_FIELD_SCHEMA,
    }),
  },
  attorneys: {
    type: "array",
    items: objectSchema({
      name: STRING_FIELD_SCHEMA,
      firm: STRING_FIELD_SCHEMA,
      representing: STRING_FIELD_SCHEMA,
      address: STRING_FIELD_SCHEMA,
      city: STRING_FIELD_SCHEMA,
      state: STRING_FIELD_SCHEMA,
      zip: STRING_FIELD_SCHEMA,
      phone: STRING_FIELD_SCHEMA,
      email: STRING_FIELD_SCHEMA,
      bar_number: STRING_FIELD_SCHEMA,
      side: STRING_FIELD_SCHEMA,
    }),
  },
  law_firms: {
    type: "array",
    items: objectSchema({
      name: STRING_FIELD_SCHEMA,
      address: STRING_FIELD_SCHEMA,
      city: STRING_FIELD_SCHEMA,
      state: STRING_FIELD_SCHEMA,
      zip: STRING_FIELD_SCHEMA,
      phone: STRING_FIELD_SCHEMA,
      fax: STRING_FIELD_SCHEMA,
      email: STRING_FIELD_SCHEMA,
      represented_party: STRING_FIELD_SCHEMA,
    }),
  },
  scheduling: objectSchema({
    proceeding_type: STRING_FIELD_SCHEMA,
    remote_platform: STRING_FIELD_SCHEMA,
    noticing_party: STRING_FIELD_SCHEMA,
    ordered_by: STRING_FIELD_SCHEMA,
    scheduler: STRING_FIELD_SCHEMA,
    scheduling_contact: STRING_FIELD_SCHEMA,
    service_type: STRING_FIELD_SCHEMA,
    time_zone: STRING_FIELD_SCHEMA,
    remote_location: STRING_FIELD_SCHEMA,
  }),
  service: objectSchema({
    certificate_of_service: BOOLEAN_FIELD_SCHEMA,
    service_date: STRING_FIELD_SCHEMA,
    served_parties: STRING_ARRAY_FIELD_SCHEMA,
    service_emails: STRING_ARRAY_FIELD_SCHEMA,
  }),
  reporter_requests: objectSchema({
    certified_reporter_required: BOOLEAN_FIELD_SCHEMA,
    stenographic_recording: BOOLEAN_FIELD_SCHEMA,
    audiovisual_recording: BOOLEAN_FIELD_SCHEMA,
    realtime_requested: BOOLEAN_FIELD_SCHEMA,
    expedited_delivery: BOOLEAN_FIELD_SCHEMA,
    rush_delivery: BOOLEAN_FIELD_SCHEMA,
    daily_copy: BOOLEAN_FIELD_SCHEMA,
    rough_draft: BOOLEAN_FIELD_SCHEMA,
  }),
  other_participants: {
    type: "array",
    items: objectSchema({
      name: STRING_FIELD_SCHEMA,
      role: STRING_FIELD_SCHEMA,
    }),
  },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respond({ ok: true }, 200);
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 200);
  }

  try {
    const body = await request.json() as { text?: unknown; docType?: unknown; debug?: unknown };
    const text = typeof body.text === "string" ? body.text : "";
    const docType = isDocType(body.docType) ? body.docType : "nod";
    const debug = body.debug === true;

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

    const result = await requestStructuredExtraction(anthropicApiKey, docType, truncatedText);
    if (!result.ok) {
      return respond({ error: "Anthropic returned JSON that did not match the extraction schema." }, 200);
    }

    const fields = normalizeFields(result.parsed, truncatedText);

    return respond({
      fields,
      model: result.payload.model ?? MODEL,
      usage: result.payload.usage ?? null,
      debug: debug
        ? {
            docType,
            textLength: text.length,
            rawModelOutput: result.parsed,
          }
        : undefined,
    }, 200);
  } catch (error) {
    return respond({
      error: error instanceof Error ? error.message : "Extraction failed.",
    }, 200);
  }
});

async function requestStructuredExtraction(
  anthropicApiKey: string,
  docType: DocType,
  truncatedText: string,
): Promise<
  | { ok: true; parsed: Record<string, unknown>; payload: AnthropicResponse }
  | { ok: false }
> {
  let lastPayload: AnthropicResponse | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildAnthropicRequest(docType, truncatedText)),
    });

    const payload = await anthropicResponse.json() as AnthropicResponse;
    if (!anthropicResponse.ok) {
      throw new Error(payload.error?.message ?? "Anthropic extraction request failed.");
    }

    lastPayload = payload;
    const extracted = extractStructuredPayload(payload);
    if (extracted.ok) {
      return { ok: true, parsed: extracted.parsed, payload };
    }

    console.error(JSON.stringify({
      scope: "extract-nod",
      message: "Structured extraction parse failure",
      attempt,
      docType,
      docLength: truncatedText.length,
      stopReason: payload.stop_reason ?? null,
      stopSequence: payload.stop_sequence ?? null,
      error: extracted.error,
    }));
  }

  if (lastPayload) {
    console.error(JSON.stringify({
      scope: "extract-nod",
      message: "Structured extraction failed after retry",
      docType,
      docLength: truncatedText.length,
      stopReason: lastPayload.stop_reason ?? null,
      stopSequence: lastPayload.stop_sequence ?? null,
    }));
  }

  return { ok: false };
}

function buildAnthropicRequest(docType: DocType, truncatedText: string) {
  return {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [
      "You extract structured legal deposition metadata for a Texas court reporter.",
      "The input may contain a worksheet cover sheet, scheduling notes, or other boilerplate before the actual notice or order.",
      "Prefer the actual notice, order, or operative legal document over internal worksheet content.",
      "When a worksheet or cover sheet contains explicit structured scheduling metadata that supplements the operative notice, you may extract it if the operative notice does not state that field and there is no conflict.",
      "Worksheet or cover-sheet metadata may supplement ordered_by, scheduler, scheduling_contact, service_type, read_and_sign, videographer_required, interpreter_required, remote_platform, and reporter request fields, but must not override caption, court, party, deponent, date, time, or location values stated in the operative notice.",
      "Use empty strings for missing scalar values, empty arrays for missing list values, and false only when the document explicitly indicates a boolean no.",
      "Never fabricate values not supported by the document.",
      "If a value is explicitly stated, return it with high confidence.",
      "If a value is not explicitly stated but is reasonably inferable from context, you may return it with inferred=true and confidence no greater than 0.6.",
      "If a value is truly absent, leave it empty instead of inferring.",
      "Per-field confidence must be between 0 and 1 and should reflect how explicit the source text was.",
      "Preserve full cause numbers including judge suffixes such as -OLG.",
      "Extract the defendants array explicitly from the case caption when defendants are named there.",
      "Extract structured parties from the caption when available, including role, role modifier, entity type, and DBA/FKA fragments.",
      "Extract law firms separately when they are apparent from attorney signature or service blocks, including represented party when apparent.",
      "Return deposition_date as YYYY-MM-DD.",
      "Return start_time and end_time as HH:MM 24-hour time.",
      "Return reporting_method as exactly one of: machine_shorthand, zoom, in_person, audio_recording.",
      "For remote proceedings, set remote.is_remote true, identify the platform when stated, and leave street address, city, state, and zip as empty strings unless expressly stated.",
      "Return jurisdiction_type as texas_state, federal, state, or other.",
      "The person being deposed is the witness. Populate witness.name with the deponent's name whether the document calls them the witness, the deponent, the person to be deposed, or names them in a phrase like oral deposition of NAME or to take the deposition of NAME.",
      "If the document gives a title or role for the deponent, such as corporate representative, custodian of records, treating physician, or expert, set witness.role accordingly. Otherwise leave witness.role empty rather than guessing.",
      "For witness read and sign, use exactly read_and_sign or waived when explicitly stated.",
      "County may be inferred with inferred=true and confidence no greater than 0.6 when a named Texas division or city makes the county reasonably clear, such as San Antonio Division implying Bexar County.",
      "An attorney side may be inferred with inferred=true and confidence no greater than 0.6 from context such as certificate-of-service position, the party they represent, or caption alignment.",
      `Always call the ${EXTRACTION_TOOL_NAME} tool with the completed extraction.`,
    ].join(" "),
    tools: [{
      name: EXTRACTION_TOOL_NAME,
      description: "Return the structured deposition metadata for the supplied document.",
      input_schema: EXTRACTION_TOOL_SCHEMA,
    }],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Document type: ${docType}`,
              "",
              "Extract the deposition metadata from this document and return it through the required tool.",
              "",
              "Document text:",
              truncatedText,
            ].join("\n"),
          },
        ],
      },
    ],
  };
}

function extractStructuredPayload(payload: AnthropicResponse):
  | { ok: true; parsed: Record<string, unknown> }
  | { ok: false; error: string } {
  const toolUse = payload.content?.find((item) =>
    item.type === "tool_use" && item.name === EXTRACTION_TOOL_NAME && isObject(item.input)
  );
  if (toolUse && isStructuredPayload(toolUse.input)) {
    return { ok: true, parsed: toolUse.input };
  }
  if (toolUse) {
    return { ok: false, error: "Tool call input did not match schema." };
  }

  const textBlock = payload.content?.find((item) => item.type === "text" && typeof item.text === "string");
  if (!textBlock?.text) {
    return { ok: false, error: "Anthropic returned no structured output." };
  }

  try {
    const parsed = parseStructuredText(textBlock.text);
    if (isStructuredPayload(parsed)) {
      return { ok: true, parsed };
    }
    return { ok: false, error: "Fallback text parse did not match schema." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Fallback text parse failed." };
  }
}

function parseStructuredText(text: string): unknown {
  const trimmed = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const withObjectBounds = extractOutermostObject(trimmed);
  const repaired = withObjectBounds.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(repaired);
}

function extractOutermostObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Anthropic text response.");
  }
  return text.slice(start, end + 1);
}

function isStructuredPayload(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  return (
    isObject(value.location) &&
    isObject(value.remote) &&
    isObject(value.witness) &&
    Array.isArray(value.parties) &&
    Array.isArray(value.attorneys) &&
    Array.isArray(value.law_firms) &&
    isObject(value.scheduling) &&
    isObject(value.service) &&
    isObject(value.reporter_requests) &&
    Array.isArray(value.other_participants)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function objectSchema(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function confidenceFieldSchema(valueSchema: JsonSchema): JsonSchema {
  return objectSchema({
    value: valueSchema,
    confidence: { type: "number" },
    inferred: { type: "boolean" },
  });
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
