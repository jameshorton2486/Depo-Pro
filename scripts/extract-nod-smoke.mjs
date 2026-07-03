import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const fixturePath = path.join(root, "scripts", "fixtures", "novak-buildright.txt");

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

if (!response.ok) {
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
      label: "Witness is Jordan Pike",
      pass: fields.witness?.name?.value === "Jordan Pike",
      actual: fields.witness?.name?.value ?? null,
      expected: "Jordan Pike",
    },
    {
      label: "Cause number preserves -OLG suffix",
      pass: fields.cause_number?.value === "26-cv-00421-OLG",
      actual: fields.cause_number?.value ?? null,
      expected: "26-cv-00421-OLG",
    },
    {
      label: "Case style contains Ariana Flores and BuildRight",
      pass: typeof fields.case_style?.value === "string"
        && fields.case_style.value.includes("Ariana Flores")
        && fields.case_style.value.includes("BuildRight"),
      actual: fields.case_style?.value ?? null,
      expected: "contains Ariana Flores and BuildRight",
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
        "Paula Owens",
        "Taylor Mercer",
        "Dana Kline",
        "Marisol Vega",
      ].every((name) => attorneyByName.has(name)),
      actual: [...attorneyByName.keys()],
      expected: [
        "Paula Owens",
        "Taylor Mercer",
        "Dana Kline",
        "Marisol Vega",
      ],
    },
    {
      label: "Defendants fallback populated from case style",
      pass: JSON.stringify(fields.defendants?.value ?? null) === JSON.stringify([
        "BuildRight Retail U.S.A., Inc. A/K/A BuildRight",
        "Mason Drake",
      ]),
      actual: fields.defendants?.value ?? null,
      expected: ["BuildRight Retail U.S.A., Inc. A/K/A BuildRight", "Mason Drake"],
    },
    {
      label: "County normalized to Bexar County",
      pass: fields.county?.value === "Bexar County",
      actual: fields.county?.value ?? null,
      expected: "Bexar County",
    },
    {
      label: "Paula side is defense only when inferred with <=0.5 confidence, otherwise null",
      pass: (() => {
        const side = attorneyByName.get("Paula Owens")?.side ?? null;
        if (!side || side.value == null) {
          return true;
        }
        return side.value === "defense"
          && side.inferred === true
          && typeof side.confidence === "number"
          && side.confidence <= 0.5;
      })(),
      actual: attorneyByName.get("Paula Owens")?.side ?? null,
      expected: {
        value: "defense",
        confidence_lte: 0.5,
        inferred: true,
      },
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
