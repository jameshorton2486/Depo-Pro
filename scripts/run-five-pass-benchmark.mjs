import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import mammoth from "mammoth";
import { createServer } from "vite";

function parseArguments(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || !value) throw new Error(`Invalid argument near ${name ?? "end of command"}.`);
    parsed.set(name.slice(2), value);
  }
  return parsed;
}

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    values.set(name, value);
  }
  return values;
}

async function certifiedText(path) {
  if (extname(path).toLowerCase() === ".docx") {
    return (await mammoth.extractRawText({ path })).value;
  }
  return readFile(path, "utf8");
}

const args = parseArguments(process.argv.slice(2));
const audioPath = resolve(args.get("audio") ?? "");
const certifiedPath = resolve(args.get("certified") ?? "");
const configurationPath = resolve(args.get("configuration") ?? "benchmark.json");
const outputDirectory = resolve(args.get("output") ?? "C:/tmp/depo-pro-five-pass-benchmark");
if (!args.get("audio") || !args.get("certified")) throw new Error("Usage: --audio <path> --certified <path> [--configuration benchmark.json] [--output directory]");

const envPath = resolve(args.get("env") ?? ".env");
const env = parseEnv(await readFile(envPath, "utf8"));
const credential = process.env.DEEPGRAM_API_KEY ?? env.get("DEEPGRAM_API_KEY") ?? env.get("VITE_DEEPGRAM_API_KEY") ?? "";
if (!credential) throw new Error(`DEEPGRAM_API_KEY is not configured in ${envPath}.`);

const configuration = JSON.parse(await readFile(configurationPath, "utf8"));
const audioBytes = await readFile(audioPath);
const transcript = await certifiedText(certifiedPath);
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const [{ BenchmarkBatchRunner }, { DeepgramBenchmark }, reportModule] = await Promise.all([
    server.ssrLoadModule("/src/benchmark/BenchmarkBatchRunner.ts"),
    server.ssrLoadModule("/src/benchmark/DeepgramBenchmark.ts"),
    server.ssrLoadModule("/src/benchmark/BenchmarkBatchReport.ts"),
  ]);
  const batch = await new BenchmarkBatchRunner([new DeepgramBenchmark()]).run({
    audio: new Blob([audioBytes], { type: "audio/mp4" }),
    certifiedTranscript: transcript,
    credential,
    configuration,
    onProgress: ({ completed, total, candidate }) => console.log(`[${completed}/${total}] ${candidate.id} complete`),
  });
  const report = reportModule.buildConsolidatedBenchmarkReport({
    generatedAt: new Date().toISOString(),
    audioName: basename(audioPath),
    certifiedTranscriptName: basename(certifiedPath),
    configuration,
    batch,
  });
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory, "DeepgramBenchmark.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDirectory, "DeepgramBenchmark.md"), reportModule.consolidatedBenchmarkMarkdown(report), "utf8"),
    writeFile(resolve(outputDirectory, "benchmark_scores.csv"), reportModule.consolidatedBenchmarkCsv(report), "utf8"),
  ]);
  console.log(`Status: ${report.integrity.status}`);
  console.log(`Recommendation: ${report.recommendation.recommendedProductionSetting}`);
  console.log(`Reports: ${outputDirectory}`);
  if (report.integrity.status !== "PASSED") process.exitCode = 1;
} finally {
  await server.close();
}