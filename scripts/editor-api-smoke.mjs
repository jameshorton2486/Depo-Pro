import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = await loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const baseUrl = env.VITE_EDITOR_API_BASE_URL
  ?? env.EDITOR_API_BASE_URL
  ?? (supabaseUrl ? `${supabaseUrl}/functions/v1/editor-api` : undefined);

const smokeUserEmail = env.SMOKE_USER_EMAIL;
const smokeUserPassword = env.SMOKE_USER_PASSWORD;
const smokeUser2Email = env.SMOKE_USER2_EMAIL;
const smokeUser2Password = env.SMOKE_USER2_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !baseUrl) {
  throw new Error("VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_EDITOR_API_BASE_URL are required for editor-api-smoke.mjs.");
}

if (!smokeUserEmail || !smokeUserPassword || !smokeUser2Email || !smokeUser2Password) {
  throw new Error("SMOKE_USER_EMAIL, SMOKE_USER_PASSWORD, SMOKE_USER2_EMAIL, and SMOKE_USER2_PASSWORD are required.");
}

const seedPath = env.EDITOR_API_SEED_PATH ?? path.join(os.tmpdir(), "depo-pro-editor-api-seed.json");
const seed = JSON.parse(await readFile(seedPath, "utf8"));

const supabaseUser1 = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const supabaseUser2 = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const supabaseAnonymous = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const session1 = await ensurePasswordSession(supabaseUser1, smokeUserEmail, smokeUserPassword);
const session2 = await ensurePasswordSession(supabaseUser2, smokeUser2Email, smokeUser2Password);
const authHeadersUser1 = buildAuthHeaders(session1.access_token);
const authHeadersUser2 = buildAuthHeaders(session2.access_token);

let cachedDocument = null;
let acceptedSuggestion = null;

await step("unauthorized", async () => {
  const response = await fetch(`${baseUrl}/${seed.routeJobId}/document`);
  assert(response.status === 401, `unauthenticated request should return 401, got ${response.status}`);
  return { status: response.status };
});

await step("document", async () => {
  const document = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/document`, undefined, authHeadersUser1);
  cachedDocument = document;

  assert(document.job_id === seed.routeJobId, "document job_id should use transcript route key");
  assert(Array.isArray(document.words) && document.words.length > 0, "document words missing");
  assert(typeof document.media_url === "string" && document.media_url.length > 0, "document media_url missing");

  return {
    job_id: document.job_id,
    words: document.words.length,
    utterances: document.utterances.length,
    speakers: document.speakers.length,
  };
});

await step("working", async () => {
  const utterance = cachedDocument.utterances[0];
  const originalWords = utterance.word_ids.map((wordId) => cachedDocument.words.find((word) => word.word_id === wordId));
  const originalRawTexts = originalWords.map((word) => word.raw_text);
  const newText = "WORD_1_TEST WORD_2_TEST WORD_3_TEST WORD_4_TEST WORD_5_TEST WORD_6_TEST WORD_7_TEST WORD_8_TEST";

  const saved = await requestJson(
    "PUT",
    `${baseUrl}/${seed.routeJobId}/working`,
    {
      source: "editor",
      changes: [{ utterance_id: utterance.utterance_id, working_text: newText }],
    },
    authHeadersUser1,
  );
  assert(saved.saved === 1, "working save count mismatch");

  const refreshed = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/document`, undefined, authHeadersUser1);
  const updatedWords = utterance.word_ids.map((wordId) => refreshed.words.find((word) => word.word_id === wordId));
  const updatedTexts = updatedWords.map((word) => word.text);
  const refreshedRawTexts = updatedWords.map((word) => word.raw_text);

  assert(updatedTexts.join(" ") === newText, "working text did not persist");
  assert(JSON.stringify(originalRawTexts) === JSON.stringify(refreshedRawTexts), "raw_text changed after working save");
  cachedDocument = refreshed;

  return { saved: saved.saved, utterance_id: utterance.utterance_id };
});

await step("review", async () => {
  const wordIds = cachedDocument.words.slice(0, 2).map((word) => word.word_id);
  const review = await requestJson(
    "PUT",
    `${baseUrl}/${seed.routeJobId}/review`,
    {
      reviewed_word_ids: wordIds,
      unreviewed_word_ids: [],
    },
    authHeadersUser1,
  );
  assert(review.ok === true, "review response not ok");

  const refreshed = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/document`, undefined, authHeadersUser1);
  assert(refreshed.words.slice(0, 2).every((word) => word.reviewed), "review flags did not persist");
  cachedDocument = refreshed;

  return { reviewed: wordIds.length };
});

await step("speakers", async () => {
  const targetSpeaker = cachedDocument.speakers[1];
  const firstUtterance = cachedDocument.utterances[0];
  const save = await requestJson(
    "PUT",
    `${baseUrl}/${seed.routeJobId}/speakers`,
    {
      speakers: cachedDocument.speakers.map((speaker) => (
        speaker.speaker_id === targetSpeaker.speaker_id
          ? { ...speaker, display_name: "WITNESS TEST", role: "WITNESS" }
          : speaker
      )),
      utterance_speaker_map: [{ utterance_id: firstUtterance.utterance_id, speaker_id: targetSpeaker.speaker_id }],
    },
    authHeadersUser1,
  );
  assert(save.ok === true, "speaker save response not ok");

  const refreshed = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/document`, undefined, authHeadersUser1);
  const updatedSpeaker = refreshed.speakers.find((speaker) => speaker.speaker_id === targetSpeaker.speaker_id);
  const reassignedUtterance = refreshed.utterances.find((utterance) => utterance.utterance_id === firstUtterance.utterance_id);
  const reassignedWords = refreshed.words.filter((word) => word.utterance_id === firstUtterance.utterance_id);

  assert(updatedSpeaker.display_name === "WITNESS TEST", "speaker display name did not persist");
  assert(reassignedUtterance.speaker_id === targetSpeaker.speaker_id, "utterance speaker reassignment did not persist");
  assert(reassignedWords.every((word) => word.speaker_id === targetSpeaker.speaker_id), "word speaker reassignment did not persist");
  cachedDocument = refreshed;

  return { speaker_id: targetSpeaker.speaker_id, utterance_id: firstUtterance.utterance_id };
});

await step("suggestions", async () => {
  const suggestions = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/suggestions`, undefined, authHeadersUser1);
  assert(Array.isArray(suggestions) && suggestions.length >= 3, "suggestions missing");
  acceptedSuggestion = suggestions[0];
  return { suggestions: suggestions.length, first: acceptedSuggestion.suggestion_id };
});

await step("resolve", async () => {
  const result = await requestJson(
    "POST",
    `${baseUrl}/${seed.routeJobId}/suggestions/${acceptedSuggestion.suggestion_id}/resolve`,
    { action: "accept" },
    authHeadersUser1,
  );
  assert(result.ok === true, "resolve response not ok");

  const refreshedSuggestions = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/suggestions`, undefined, authHeadersUser1);
  const updatedSuggestion = refreshedSuggestions.find((suggestion) => suggestion.suggestion_id === acceptedSuggestion.suggestion_id);
  const refreshedDocument = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/document`, undefined, authHeadersUser1);
  const updatedWord = refreshedDocument.words.find((word) => word.word_id === acceptedSuggestion.word_id);

  assert(updatedSuggestion.status === "accepted", "suggestion status did not persist");
  assert(updatedWord.text === acceptedSuggestion.suggested_text, "accept did not mutate target word text");
  assert(updatedWord.raw_text === acceptedSuggestion.original_text, "raw_text changed during suggestion resolve");
  cachedDocument = refreshedDocument;

  return { suggestion_id: acceptedSuggestion.suggestion_id, word_id: acceptedSuggestion.word_id };
});

await step("exhibits", async () => {
  const exhibits = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/exhibits`, undefined, authHeadersUser1);
  assert(Array.isArray(exhibits) && exhibits.length === 2, "exhibit count mismatch");
  assert(exhibits.every((exhibit) => typeof exhibit.file_url === "string" && exhibit.file_url.length > 0), "signed exhibit url missing");
  return { exhibits: exhibits.length };
});

await step("certify", async () => {
  const certify = await requestJson("GET", `${baseUrl}/${seed.routeJobId}/certify/status`, undefined, authHeadersUser1);
  assert(typeof certify.review_complete === "boolean", "certify review_complete missing");
  assert(typeof certify.speaker_mapping_complete === "boolean", "certify speaker_mapping_complete missing");
  assert(typeof certify.confidence_review_complete === "boolean", "certify confidence_review_complete missing");
  return certify;
});

await step("cross-user direct select", async () => {
  const { data, error } = await supabaseUser2
    .from("cases")
    .select("case_id")
    .eq("case_id", seed.caseId);

  if (error) {
    throw error;
  }

  assert(Array.isArray(data) && data.length === 0, `second user should see zero case rows, got ${data.length}`);
  return { visibleRows: data.length };
});

await step("cross-user function access", async () => {
  const response = await fetch(`${baseUrl}/${seed.routeJobId}/document`, {
    headers: authHeadersUser2,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  assert(response.status === 404, `second user document request should return 404, got ${response.status}`);
  return { status: response.status, error: json?.error ?? null };
});

await step("anonymous access", async () => {
  const anonymousResult = await tryAnonymousSession(supabaseAnonymous);

  if (!anonymousResult.session) {
    return { status: "anonymous_disabled" };
  }

  const { data, error } = await supabaseAnonymous
    .from("cases")
    .select("case_id")
    .eq("case_id", seed.caseId);

  if (error) {
    throw error;
  }

  assert(Array.isArray(data) && data.length === 0, `anonymous session should see zero case rows, got ${data.length}`);
  return { status: "anonymous_allowed_zero_rows", visibleRows: data.length };
});

async function requestJson(method, url, body, headers) {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${response.statusText} ${text}`);
  }

  return json;
}

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${label}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`FAIL ${label}`);
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function ensurePasswordSession(client, email, password) {
  let signInData = null;
  let signInError = null;

  try {
    const result = await client.auth.signInWithPassword({ email, password });
    signInData = result.data;
    signInError = result.error;
  } catch (error) {
    signInError = error;
  }

  if (!signInError && signInData?.session) {
    return signInData.session;
  }

  let signUpData = null;
  let signUpError = null;

  try {
    const result = await client.auth.signUp({ email, password });
    signUpData = result.data;
    signUpError = result.error;
  } catch (error) {
    signUpError = error;
  }

  if (signUpError) {
    throw signInError ?? signUpError;
  }

  if (signUpData?.session) {
    return signUpData.session;
  }

  let retryData = null;
  let retryError = null;

  try {
    const result = await client.auth.signInWithPassword({ email, password });
    retryData = result.data;
    retryError = result.error;
  } catch (error) {
    retryError = error;
  }

  if (retryError || !retryData?.session) {
    throw retryError ?? new Error("Sign-up succeeded but no password session was established.");
  }

  return retryData.session;
}

async function tryAnonymousSession(client) {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    return { session: null, error };
  }

  return { session: data.session, error: null };
}

async function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = { ...process.env };

  try {
    const file = await readFile(envPath, "utf8");
    for (const line of file.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) {
        continue;
      }
      const separator = line.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const key = line.slice(0, separator).trim();
      const rawValue = line.slice(separator + 1).trim();
      if (!(key in env)) {
        env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // process env only
  }

  return env;
}

function buildAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
