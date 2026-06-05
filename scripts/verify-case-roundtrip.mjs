import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const env = parseEnv(await readFile(envPath, "utf8"));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
await ensureAnonymousSession(supabase);

const caseId = `case_verify_${Date.now()}`;
const createdAt = new Date().toISOString();
const initialPayload = {
  verification: true,
  case_id: caseId,
  created_at: createdAt,
};

let failed = false;
let insertedRow = null;
let updatedRow = null;

await step("insert row", async () => {
  const row = {
    case_id: caseId,
    proceeding_type: "freelance_deposition",
    stage: "intake",
    notes: "",
    payload: initialPayload,
  };
  const { data, error } = await supabase
    .from("cases")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  insertedRow = data;
  return data;
});

await step("read row back", async () => {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (error) {
    throw error;
  }

  assertDeepEqual(data.payload, initialPayload, "payload mismatch after insert");
  return data;
});

await step("update payload", async () => {
  const touched = new Date().toISOString();
  const nextPayload = {
    verification: true,
    case_id: caseId,
    created_at: createdAt,
    touched,
  };

  const { data, error } = await supabase
    .from("cases")
    .update({ payload: nextPayload })
    .eq("case_id", caseId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  updatedRow = data;
  assertTimestampAdvanced(insertedRow?.updated_at, data.updated_at);
  return data;
});

await step("read updated row", async () => {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (error) {
    throw error;
  }

  assertDeepEqual(data.payload, updatedRow.payload, "payload mismatch after update");
  assertTimestampAdvanced(insertedRow?.updated_at, data.updated_at);
  return data;
});

await step("mark archived", async () => {
  const archivedPayload = {
    ...updatedRow.payload,
    archived: true,
  };

  const { data, error } = await supabase
    .from("cases")
    .update({ payload: archivedPayload })
    .eq("case_id", caseId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  assertDeepEqual(data.payload.archived, true, "archived flag was not persisted");
  return data;
});

if (failed) {
  process.exitCode = 1;
}

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${label}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    failed = true;
    console.log(`FAIL ${label}`);
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function ensureAnonymousSession(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session) {
    return sessionData.session;
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return data.session;
}

function assertDeepEqual(actual, expected, message) {
  const normalizedActual = normalizeJson(actual);
  const normalizedExpected = normalizeJson(expected);

  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new Error(`${message}\nexpected: ${JSON.stringify(normalizedExpected)}\nactual:   ${JSON.stringify(normalizedActual)}`);
  }
}

function normalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeJson(value[key]);
        return result;
      }, {});
  }

  return value;
}

function assertTimestampAdvanced(before, after) {
  if (!before || !after) {
    throw new Error(`updated_at missing\nbefore: ${before}\nafter: ${after}`);
  }

  if (new Date(after).getTime() <= new Date(before).getTime()) {
    throw new Error(`updated_at did not advance\nbefore: ${before}\nafter: ${after}`);
  }
}

function parseEnv(contents) {
  const result = {};
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    result[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return result;
}
