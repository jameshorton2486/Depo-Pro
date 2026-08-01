import { useState } from "react";
import defaultConfiguration from "../../benchmark.json";
import { DeepgramBenchmark } from "../benchmark/DeepgramBenchmark";
import { BenchmarkBatchRunner } from "../benchmark/BenchmarkBatchRunner";
import { buildConsolidatedBenchmarkReport, consolidatedBenchmarkCsv, consolidatedBenchmarkMarkdown, type ConsolidatedBenchmarkReport } from "../benchmark/BenchmarkBatchReport";
import type { BenchmarkConfiguration, BenchmarkProgress } from "../benchmark/BenchmarkMetrics";
import { extractDocumentText } from "../lib/parsing/documentText";

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BenchmarkScreen({ onClose }: { onClose: () => void }) {
  const [audio, setAudio] = useState<File | null>(null);
  const [certified, setCertified] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [configText, setConfigText] = useState(() => JSON.stringify(defaultConfiguration, null, 2));
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [report, setReport] = useState<ConsolidatedBenchmarkReport | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const result = report?.results.find((item) => item.candidate.id === selected) ?? report?.results[0];

  async function run() {
    if (!audio || !certified) {
      setError("Select the matching audio and certified transcript.");
      return;
    }
    setRunning(true);
    setError("");
    try {
      const configuration = JSON.parse(configText) as BenchmarkConfiguration;
      const batch = await new BenchmarkBatchRunner([new DeepgramBenchmark()]).run({
        audio,
        certifiedTranscript: await extractDocumentText(certified),
        credential: key,
        configuration,
        onProgress: setProgress,
      });
      const next = buildConsolidatedBenchmarkReport({
        generatedAt: new Date().toISOString(),
        audioName: audio.name,
        certifiedTranscriptName: certified.name,
        configuration,
        batch,
      });
      setReport(next);
      setSelected(next.recommendation.recommendedProductionSetting);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  }

  return <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex items-center justify-between rounded-2xl border bg-white p-5">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Developer tools</p><h1 className="text-2xl font-semibold">Transcription Benchmark</h1><p className="text-sm text-slate-600">Analysis only. Results never change production settings.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-semibold">Back to cases</button>
      </header>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <label className="block text-sm font-semibold">Audio<input type="file" accept="audio/*,video/*" onChange={(event) => setAudio(event.target.files?.[0] ?? null)} className="mt-2 block w-full" /></label>
          <label className="block text-sm font-semibold">Certified transcript<input type="file" accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => setCertified(event.target.files?.[0] ?? null)} className="mt-2 block w-full" /></label>
          <label className="block text-sm font-semibold">Deepgram API key<input type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-mono" /><span className="block text-xs font-normal text-slate-500">Memory only; never saved or exported.</span></label>
          <label className="block text-sm font-semibold">Configuration<textarea rows={16} value={configText} onChange={(event) => setConfigText(event.target.value)} spellCheck={false} className="mt-2 w-full rounded-lg border p-2 font-mono text-xs" /></label>
          <button type="button" disabled={running} onClick={() => void run()} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{running ? "Running five-pass benchmark..." : "Run Five-Pass Benchmark"}</button>
          {progress ? <p className="text-sm">Completed {progress.completed} of {progress.total}: {progress.candidate.id}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        </section>
        <section className="space-y-4">
          {report ? <>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><strong>Recommended: {report.recommendation.recommendedProductionSetting}</strong><p className="text-sm">{report.recommendation.explanation}</p></div>
            <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Setting</th><th>Overall</th><th>WER</th><th>Speaker</th><th>Repairs</th><th>Editing</th></tr></thead><tbody>{report.results.map((item) => <tr key={item.candidate.id} onClick={() => setSelected(item.candidate.id)} className="cursor-pointer border-t hover:bg-blue-50"><td className="p-3 font-mono text-xs">{item.candidate.id}</td><td>{item.metrics.overallScore}</td><td>{(item.metrics.wordErrorRate * 100).toFixed(2)}%</td><td>{item.metrics.speaker.accuracy.toFixed(2)}%</td><td>{item.metrics.reconstructionRepairs}</td><td>{item.metrics.manualCorrectionEstimate.minutes} min</td></tr>)}</tbody></table></div>
            <div className="flex gap-2"><button type="button" onClick={() => download("DeepgramBenchmark.json", "application/json", `${JSON.stringify(report, null, 2)}\n`)} className="rounded-lg border bg-white px-3 py-2">JSON</button><button type="button" onClick={() => download("DeepgramBenchmark.md", "text/markdown", consolidatedBenchmarkMarkdown(report))} className="rounded-lg border bg-white px-3 py-2">Markdown</button><button type="button" onClick={() => download("benchmark_scores.csv", "text/csv", consolidatedBenchmarkCsv(report))} className="rounded-lg border bg-white px-3 py-2">CSV</button></div>
            {result ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border bg-white p-5 text-xs">{result.transcript.text}</pre> : null}
          </> : <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">Results appear here after a run.</div>}
        </section>
      </div>
    </div>
  </main>;
}
