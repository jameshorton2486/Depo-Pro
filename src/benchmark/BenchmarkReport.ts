import type {
  BenchmarkRecommendation,
  BenchmarkReport,
  BenchmarkResult,
} from "./BenchmarkMetrics";

function best(results: readonly BenchmarkResult[], score: (result: BenchmarkResult) => number, lower = false): string {
  return [...results].sort((left, right) => {
    const difference = lower ? score(left) - score(right) : score(right) - score(left);
    return difference || left.candidate.id.localeCompare(right.candidate.id);
  })[0]?.candidate.id ?? "none";
}

export function recommendBenchmarkResult(results: readonly BenchmarkResult[]): BenchmarkRecommendation {
  const bestOverall = best(results, (result) => result.metrics.overallScore);
  const bestSpeakerAccuracy = best(results, (result) => result.metrics.speaker.accuracy);
  const bestReconstruction = best(results, (result) => result.metrics.reconstructionRepairs, true);
  const bestEditingEfficiency = best(results, (result) => result.metrics.manualCorrectionEstimate.minutes, true);
  const bestWer = best(results, (result) => result.metrics.wordErrorRate, true);
  return {
    bestOverall,
    bestSpeakerAccuracy,
    bestReconstruction,
    bestEditingEfficiency,
    bestWer,
    recommendedProductionSetting: bestOverall,
    explanation: `${bestOverall} has the highest weighted score. This is an analysis recommendation only and does not alter production configuration.`,
  };
}

export function buildBenchmarkReport(input: {
  generatedAt: string;
  provider: string;
  audioName: string;
  certifiedTranscriptName: string;
  model: string;
  configuration: BenchmarkReport["configuration"];
  results: BenchmarkResult[];
}): BenchmarkReport {
  const results = [...input.results].sort((left, right) =>
    right.metrics.overallScore - left.metrics.overallScore || left.candidate.id.localeCompare(right.candidate.id),
  );
  return {
    schemaVersion: "1.0",
    generatedAt: input.generatedAt,
    provider: input.provider,
    audioName: input.audioName,
    certifiedTranscriptName: input.certifiedTranscriptName,
    model: input.model,
    configuration: input.configuration,
    settingsTested: results.map((result) => result.candidate.id),
    results,
    recommendation: recommendBenchmarkResult(results),
  };
}

export function benchmarkReportJson(report: BenchmarkReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function benchmarkReportMarkdown(report: BenchmarkReport): string {
  const rows = report.results.map((result, index) =>
    `| ${result.candidate.id} | ${result.metrics.overallScore.toFixed(2)} | ${(result.metrics.wordErrorRate * 100).toFixed(2)}% | ${result.metrics.reconstructionRepairs} | ${result.metrics.manualCorrectionEstimate.minutes.toFixed(2)} min | ${index + 1} |`,
  );
  const details = report.results.map((result) =>
    `## ${result.candidate.id}\n\n- Speaker accuracy: ${result.metrics.speaker.accuracy.toFixed(2)}%\n- Q/A recovery: ${result.metrics.questionRecovery.toFixed(2)}%\n- Paragraph accuracy: ${result.metrics.paragraphAccuracy.toFixed(2)}%\n- Objection recovery: ${result.metrics.objectionRecovery.toFixed(2)}%\n- Colloquy recovery: ${result.metrics.colloquyRecovery.toFixed(2)}%\n- Stage S repairs: ${result.metrics.stageS.totalRepairs}\n`,
  ).join("\n");
  return `# Deepgram Benchmark Report

- Audio: ${report.audioName}
- Certified transcript: ${report.certifiedTranscriptName}
- Model: ${report.model}
- Configuration: ${JSON.stringify(report.configuration)}
- Settings tested: ${report.settingsTested.join(", ")}

| Setting | Overall | WER | Repairs | Editing | Rank |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows.join("\n")}

## Recommendation

${report.recommendation.explanation}

${details}`;
}

export function benchmarkReportCsv(report: BenchmarkReport): string {
  const header = "setting,overall_score,wer,speaker_accuracy,qa_recovery,repairs,editing_minutes,rank";
  const rows = report.results.map((result, index) => [
    JSON.stringify(result.candidate.id),
    result.metrics.overallScore,
    result.metrics.wordErrorRate,
    result.metrics.speaker.accuracy,
    result.metrics.questionRecovery,
    result.metrics.reconstructionRepairs,
    result.metrics.manualCorrectionEstimate.minutes,
    index + 1,
  ].join(","));
  return `${header}\n${rows.join("\n")}\n`;
}
