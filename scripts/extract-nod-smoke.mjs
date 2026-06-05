import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const fixturePath = path.join(root, "scripts", "fixtures", "garza-home-depot.txt");

const env = parseEnv(await readFile(envPath, "utf8"));
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env.");
}

const text = await readFile(fixturePath, "utf8");
const response = await fetch(`${supabaseUrl}/functions/v1/extract-nod`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    apikey: supabaseAnonKey,
    authorization: `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({
    text,
    docType: "nod",
  }),
});

const body = await response.json();

if (!response.ok || body.error) {
  console.log(JSON.stringify({
    status: response.status,
    ok: response.ok,
    body,
  }, null, 2));
  process.exitCode = 1;
} else {
  const fields = body.fields;
  const attorneys = Array.isArray(fields.attorneys) ? fields.attorneys : [];
  const attorneyByName = new Map(attorneys.map((attorney) => [attorney.name?.value, attorney]));

  const checks = [
    {
      label: "Witness is Heath Thomas",
      pass: fields.witness?.name?.value === "Heath Thomas",
      actual: fields.witness?.name?.value ?? null,
      expected: "Heath Thomas",
    },
    {
      label: "Cause number preserves -OLG suffix",
      pass: fields.cause_number?.value === "25-cv-00598-OLG",
      actual: fields.cause_number?.value ?? null,
      expected: "25-cv-00598-OLG",
    },
    {
      label: "Case style contains Delia Garza and Home Depot",
      pass: typeof fields.case_style?.value === "string"
        && fields.case_style.value.includes("Delia Garza")
        && fields.case_style.value.includes("Home Depot"),
      actual: fields.case_style?.value ?? null,
      expected: "contains Delia Garza and Home Depot",
    },
    {
      label: "Court/district/division are clean and non-duplicated",
      pass: fields.court_name?.value === "United States District Court"
        && fields.district?.value === "Western District of Texas"
        && fields.division?.value === "San Antonio Division",
      actual: {
        court_name: fields.court_name?.value ?? null,
        district: fields.district?.value ?? null,
        division: fields.division?.value ?? null,
      },
      expected: {
        court_name: "United States District Court",
        district: "Western District of Texas",
        division: "San Antonio Division",
      },
    },
    {
      label: "Remote Zoom recognized with no garbage location",
      pass: fields.remote?.is_remote?.value === true
        && fields.remote?.platform?.value === "Zoom"
        && fields.location?.address?.value == null,
      actual: {
        is_remote: fields.remote?.is_remote?.value ?? null,
        platform: fields.remote?.platform?.value ?? null,
        address: fields.location?.address?.value ?? null,
      },
      expected: {
        is_remote: true,
        platform: "Zoom",
        address: null,
      },
    },
    {
      label: "All four attorneys found",
      pass: [
        "Karen M. Alvarado",
        "Jacob D. Cukjati",
        "Curtis L. Cukjati",
        "Steven A. Nunez",
      ].every((name) => attorneyByName.has(name)),
      actual: [...attorneyByName.keys()],
      expected: [
        "Karen M. Alvarado",
        "Jacob D. Cukjati",
        "Curtis L. Cukjati",
        "Steven A. Nunez",
      ],
    },
    {
      label: "Defendants fallback populated from case style",
      pass: JSON.stringify(fields.defendants?.value ?? null) === JSON.stringify([
        "Home Depot U.S.A., Inc. A/K/A The Home Depot",
        "Shawn Herber",
      ]),
      actual: fields.defendants?.value ?? null,
      expected: ["Home Depot U.S.A., Inc. A/K/A The Home Depot", "Shawn Herber"],
    },
    {
      label: "County normalized to Bexar County",
      pass: fields.county?.value === "Bexar County",
      actual: fields.county?.value ?? null,
      expected: "Bexar County",
    },
    {
      label: "Karen side inferred as defense or null only if heuristic fails",
      pass: (() => {
        const side = attorneyByName.get("Karen M. Alvarado")?.side?.value ?? null;
        return side === "defense" || side === null;
      })(),
      actual: attorneyByName.get("Karen M. Alvarado")?.side?.value ?? null,
      expected: "defense",
    },
    {
      label: "Deposition date normalized to ISO",
      pass: fields.deposition_date?.value === "2026-04-30",
      actual: fields.deposition_date?.value ?? null,
      expected: "2026-04-30",
    },
    {
      label: "Start time normalized to 24h",
      pass: fields.start_time?.value === "13:30",
      actual: fields.start_time?.value ?? null,
      expected: "13:30",
    },
    {
      label: "Reporting method mapped to machine_shorthand",
      pass: fields.reporting_method?.value === "machine_shorthand",
      actual: fields.reporting_method?.value ?? null,
      expected: "machine_shorthand",
    },
  ];

  let failed = false;
  console.log(`HTTP ${response.status}`);
  console.log(`Model ${body.model}`);
  for (const check of checks) {
    console.log(`${check.pass ? "PASS" : "FAIL"} ${check.label}`);
    if (!check.pass) {
      failed = true;
      console.log(`  expected: ${JSON.stringify(check.expected)}`);
      console.log(`  actual:   ${JSON.stringify(check.actual)}`);
    }
  }

  if (failed) {
    process.exitCode = 1;
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
