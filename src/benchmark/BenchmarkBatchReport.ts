import { buildBenchmarkReport } from "./BenchmarkReport";
import type { BenchmarkConfiguration, BenchmarkReport, BenchmarkResult } from "./BenchmarkMetrics";
import type { BenchmarkBatchResult } from "./BenchmarkBatchRunner";

export interface ConsolidatedBenchmarkReport extends BenchmarkReport {
  integrity: BenchmarkBatchResult["integrity"];
  failures: BenchmarkBatchResult["failures"];
}

function recommendation(results: readonly BenchmarkResult[]): { setting: string; explanation: string } {
  const ranked = [...results].sort((left, right) => right.metrics.overallScore - left.metrics.overallScore || left.candidate.id.localeCompare(right.candidate.id));
  const top = ranked[0];
  const runnerUp = ranked[1];
  if (!top) return { setting: "none", explanation: "No candidate completed successfully." };
  if (runnerUp && Math.abs(top.metrics.overallScore - runnerUp.metrics.overallScore) < 0.5) {
    const tied = [top, runnerUp].sort((left, right) =>
      left.metrics.reconstructionRepairs - right.metrics.reconstructionRepairs ||
      left.metrics.manualCorrectionEstimate.minutes - right.metrics.manualCorrectionEstimate.minutes ||
      right.metrics.speaker.accuracy - left.metrics.speaker.accuracy ||
      left.candidate.id.localeCompare(right.candidate.id),
    )[0];
    return { setting: tied.candidate.id, explanation: `${top.candidate.id} and ${runnerUp.candidate.id} are within 0.5 points; ${tied.candidate.id} wins the reconstruction, editing-time, and speaker-accuracy tie-break sequence.` };
  }
  return { setting: top.candidate.id, explanation: `${top.candidate.id} has the highest weighted overall score.` };
}

export function buildConsolidatedBenchmarkReport(input: {
  generatedAt: string;
  audioName: string;
  certifiedTranscriptName: string;
  configuration: BenchmarkConfiguration;
  batch: BenchmarkBatchResult;
}): ConsolidatedBenchmarkReport {
  const base = buildBenchmarkReport({
    generatedAt: input.generatedAt,
    provider: input.configuration.provider,
    audioName: input.audioName,
    certifiedTranscriptName: input.certifiedTranscriptName,
    model: String(input.configuration.baseConfiguration.model ?? ""),
    configuration: input.configuration,
    results: input.batch.results,
  });
  const selected = recommendation(base.results);
  return {
    ...base,
    recommendation: { ...base.recommendation, bestOverall: selected.setting, recommendedProductionSetting: selected.setting, explanation: `${selected.explanation} This report is analysis-only and does not alter production configuration.` },
    integrity: input.batch.integrity,
    failures: input.batch.failures,
  };
}

function strengths(result: BenchmarkResult): string[] {
  const values = [
    { label: "word accuracy", value: 100 - result.metrics.wordErrorRate * 100 },
    { label: "speaker accuracy", value: result.metrics.speaker.accuracy },
    { label: "Q/A recovery", value: result.metrics.questionRecovery },
    { label: "paragraph recovery", value: result.metrics.paragraphAccuracy },
  ].sort((left, right) => right.value - left.value);
  return values.slice(0, 2).map((entry) => `${entry.label}: ${entry.value.toFixed(2)}%`);
}

export function consolidatedBenchmarkMarkdown(report: ConsolidatedBenchmarkReport): string {
  const rows = report.results.map((result, index) => `| ${result.candidate.id.replace("utt_split=", "")} | ${result.metrics.overallScore.toFixed(2)} | ${(result.metrics.wordErrorRate * 100).toFixed(2)}% | ${result.metrics.speaker.accuracy.toFixed(2)}% | ${result.metrics.reconstructionRepairs} | ${result.metrics.manualCorrectionEstimate.minutes.toFixed(2)} | ${index + 1} |`);
  const details = report.results.map((result) => `## ${result.candidate.id}\n\n### Configuration\n\n\`\`\`json\n${JSON.stringify(result.effectiveConfiguration, null, 2)}\n\`\`\`\n\n### Metrics\n\n- WER: ${(result.metrics.wordErrorRate * 100).toFixed(2)}%\n- CER: ${(result.metrics.characterErrorRate * 100).toFixed(2)}%\n- Insertions / substitutions / deletions: ${result.metrics.insertions} / ${result.metrics.substitutions} / ${result.metrics.deletions}\n- Alignment score: ${result.metrics.alignmentScore.toFixed(2)}%\n- Speaker accuracy: ${result.metrics.speaker.accuracy.toFixed(2)}%\n- Question accuracy: ${result.metrics.questionRecovery.toFixed(2)}%\n- Answer accuracy: ${result.metrics.answerAccuracy.toFixed(2)}%\n- Objection recovery: ${result.metrics.objectionRecovery.toFixed(2)}%\n- Paragraph recovery: ${result.metrics.paragraphAccuracy.toFixed(2)}%\n\n### Stage S statistics\n\n- Speaker repairs: ${result.metrics.stageS.speakerRepairs}\n- Paragraph repairs: ${result.metrics.stageS.paragraphSplits + result.metrics.stageS.paragraphMerges}\n- Utterance repairs: ${result.metrics.stageS.mergedUtterances + result.metrics.stageS.splitUtterances}\n- Formatting/editorial repairs: ${result.metrics.stageS.formattingRepairs + result.metrics.stageS.editorialCorrections}\n- Objection normalization: ${result.metrics.stageS.objectionNormalizations}\n- Colloquy reconstruction: ${result.metrics.stageS.colloquyReconstructions}\n\n### Transcript statistics\n\n- Utterances: ${result.metrics.utteranceCount}\n- Average words per utterance: ${result.metrics.averageUtteranceLength}\n- Average duration: ${result.metrics.averageDuration}s\n\n### Observed strengths\n\n${strengths(result).map((value) => `- ${value}`).join("\n")}\n\n### Observed weaknesses\n\n- Reconstruction repairs: ${result.metrics.reconstructionRepairs}\n- Estimated editing: ${result.metrics.manualCorrectionEstimate.minutes} minutes\n`);
  const failures = report.failures.length === 0 ? "None." : report.failures.map((failure) => `- ${failure.candidate.id}: ${failure.message}`).join("\n");
  return `# Deepgram Benchmark\n\n## Executive Summary\n\n- Status: **${report.integrity.status}**\n- Best overall: ${report.recommendation.bestOverall}\n- Best WER: ${report.recommendation.bestWer}\n- Best speaker accuracy: ${report.recommendation.bestSpeakerAccuracy}\n- Lowest reconstruction: ${report.recommendation.bestReconstruction}\n- Lowest editing time: ${report.recommendation.bestEditingEfficiency}\n- Recommended production setting: **${report.recommendation.recommendedProductionSetting}**\n\n${report.recommendation.explanation}\n\n## Integrity\n\n- Audio SHA-256: \`${report.integrity.audioSha256}\`\n- Certified transcript SHA-256: \`${report.integrity.certifiedTranscriptSha256}\`\n- Configuration SHA-256: \`${report.integrity.configurationSha256}\`\n- Only ${report.integrity.invariantParameter} varied: ${report.integrity.checks.onlySweptParameterChanged}\n- Production data modified: ${report.integrity.checks.productionDataModified}\n- Application defaults modified: ${report.integrity.checks.applicationDefaultsModified}\n\n## Comparison Table\n\n| Setting | Score | WER | Speaker | Repairs | Editing | Rank |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows.join("\n")}\n\n## Failures\n\n${failures}\n\n${details.join("\n\n")}`;
}

export function consolidatedBenchmarkCsv(report: ConsolidatedBenchmarkReport): string {
  const rows = report.results.map((result) => [result.candidate.id.replace("utt_split=", ""), result.metrics.overallScore, result.metrics.wordErrorRate, result.metrics.reconstructionRepairs, result.metrics.manualCorrectionEstimate.minutes, result.metrics.speaker.accuracy, ((result.metrics.questionRecovery + result.metrics.answerAccuracy) / 2)].join(","));
  return `Setting,OverallScore,WER,Repairs,EditingMinutes,SpeakerAccuracy,QAAccuracy\n${rows.join("\n")}\n`;
}
