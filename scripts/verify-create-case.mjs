import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = fs.readFileSync(envPath, "utf8");
  const vars = {};

  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) {
      continue;
    }
    vars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }

  return vars;
}

function logPass(label, payload) {
  console.log(`PASS ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

function logFail(label, error) {
  console.error(`FAIL ${label}`);
  console.error(JSON.stringify(error, null, 2));
}

async function main() {
  const vars = readEnv();
  const client = createClient(vars.VITE_SUPABASE_URL, vars.VITE_SUPABASE_ANON_KEY);
  const caseId = `case_verify_create_${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    version: "1.0",
    case_id: caseId,
    created_at: now,
    updated_at: now,
    proceeding_type: "freelance_deposition",
    stage: "intake",
    notes: "",
  };

  try {
    const auth = await client.auth.signInAnonymously();
    if (auth.error) throw auth.error;

    const beforeCountResult = await client
      .from("cases")
      .select("case_id", { count: "exact", head: true });
    if (beforeCountResult.error) throw beforeCountResult.error;
    logPass("count before createCase-equivalent insert", { count: beforeCountResult.count ?? 0 });

    const insertResult = await client.from("cases").insert({
      case_id: caseId,
      version: "1.0",
      proceeding_type: "freelance_deposition",
      stage: "intake",
      notes: "",
      payload,
    });
    if (insertResult.error) throw insertResult.error;
    logPass("insert createCase-equivalent row", { case_id: caseId });

    const readResult = await client
      .from("cases")
      .select("case_id, stage, payload, updated_at")
      .eq("case_id", caseId)
      .single();
    if (readResult.error) throw readResult.error;
    logPass("read created row", readResult.data);

    const afterCountResult = await client
      .from("cases")
      .select("case_id", { count: "exact", head: true });
    if (afterCountResult.error) throw afterCountResult.error;
    if ((afterCountResult.count ?? 0) !== (beforeCountResult.count ?? 0) + 1) {
      throw {
        expected: (beforeCountResult.count ?? 0) + 1,
        actual: afterCountResult.count ?? 0,
      };
    }
    logPass("count after createCase-equivalent insert", { count: afterCountResult.count ?? 0 });

    const archivedPayload = {
      ...readResult.data.payload,
      archived: true,
      updated_at: new Date().toISOString(),
    };
    const archiveResult = await client
      .from("cases")
      .update({
        payload: archivedPayload,
        notes: "",
        stage: "intake",
        proceeding_type: "freelance_deposition",
      })
      .eq("case_id", caseId);
    if (archiveResult.error) throw archiveResult.error;

    const archivedRead = await client
      .from("cases")
      .select("case_id, payload, updated_at")
      .eq("case_id", caseId)
      .single();
    if (archivedRead.error) throw archivedRead.error;
    logPass("archive verification row", archivedRead.data);
  } catch (error) {
    logFail("verify-create-case", error);
    process.exit(1);
  }
}

void main();
