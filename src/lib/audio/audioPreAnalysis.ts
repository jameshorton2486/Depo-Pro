import { AUTO_CHUNK_THRESHOLD_SECONDS, TARGET_CHUNK_DURATION_SECONDS } from "../transcript/autoChunking";

export interface AudioRisk {
  severity: "info" | "warning" | "critical";
  code: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface AudioPreAnalysisReport {
  audio_id: string;
  filename: string;
  file_size_bytes: number | null;
  mime_type: string;
  duration_seconds: number | null;
  duration_source: "db_metadata" | "unknown";
  duration_minutes_display: string;
  estimated_bitrate_kbps: number | null;
  estimated_quality: "low" | "acceptable" | "good" | "high";
  risks: AudioRisk[];
  overall_risk: "low" | "medium" | "high" | "critical";
  chunking_recommended: boolean;
  chunk_count_estimate: number | null;
  chunking_reason: string | null;
  recommended_keyterms: string[];
  keyterms_source: string;
  proceed_recommended: boolean;
  gate_action: "proceed" | "warn_proceed" | "confirm_required" | "block";
  gate_message: string;
  generated_at: string;
}

export interface AudioPreAnalysisInput {
  audio_id: string;
  original_filename: string;
  file_size_bytes: number | null;
  mime_type: string;
  duration_seconds: number | null;
  recommended_keyterms?: string[];
  keyterms_source?: string;
}

const SUPPORTED_MIME_TYPES = new Set([
  "audio/mp4",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/quicktime",
]);

function estimateBitrateKbps(fileSizeBytes: number | null, durationSeconds: number | null): number | null {
  if (!fileSizeBytes || !durationSeconds || durationSeconds <= 0) {
    return null;
  }

  return Number((((fileSizeBytes * 8) / durationSeconds) / 1000).toFixed(1));
}

function estimateQuality(bitrateKbps: number | null): AudioPreAnalysisReport["estimated_quality"] {
  if (bitrateKbps == null || bitrateKbps < 32) {
    return "low";
  }
  if (bitrateKbps < 64) {
    return "acceptable";
  }
  if (bitrateKbps < 128) {
    return "good";
  }
  return "high";
}

function buildRisks(audio: AudioPreAnalysisInput, bitrateKbps: number | null): AudioRisk[] {
  const risks: AudioRisk[] = [];

  if (audio.duration_seconds == null) {
    risks.push({
      severity: "warning",
      code: "DURATION_UNKNOWN",
      title: "Duration unknown",
      description: "File duration could not be determined from metadata.",
      recommendation: "Transcription will proceed but chunking cannot be applied automatically.",
    });
  }

  if ((audio.duration_seconds ?? 0) > 7200) {
    risks.push({
      severity: "warning",
      code: "VERY_LONG_FILE",
      title: "Very long audio file",
      description: "Files over 2 hours have higher risk of Deepgram timing errors.",
      recommendation: "Auto-chunking will be applied. Consider splitting manually if quality is critical.",
    });
  } else if ((audio.duration_seconds ?? 0) > AUTO_CHUNK_THRESHOLD_SECONDS) {
    risks.push({
      severity: "info",
      code: "LONG_FILE",
      title: "Long audio file (>75 minutes)",
      description: "Auto-chunking will be applied to improve transcription accuracy.",
      recommendation: "Chunking is handled automatically. No action needed.",
    });
  }

  if (bitrateKbps != null && bitrateKbps < 32) {
    risks.push({
      severity: "warning",
      code: "LOW_BITRATE",
      title: "Low audio bitrate",
      description: "Audio bitrate is below 32kbps which may affect transcription accuracy.",
      recommendation: "Transcription accuracy may be reduced. Consider re-recording at higher quality.",
    });
  }

  if ((audio.file_size_bytes ?? 0) > 500_000_000 && audio.duration_seconds == null) {
    risks.push({
      severity: "warning",
      code: "LARGE_FILE_NO_DURATION",
      title: "Large file with unknown duration",
      description: "File is over 500MB but duration is unknown — chunking cannot be auto-applied.",
      recommendation: "Manually verify the file length before transcribing.",
    });
  }

  if (!SUPPORTED_MIME_TYPES.has(audio.mime_type)) {
    risks.push({
      severity: "critical",
      code: "UNSUPPORTED_FORMAT",
      title: "Unsupported audio format",
      description: `Format "${audio.mime_type}" may not be supported by Deepgram.`,
      recommendation: "Convert to MP3, M4A, or WAV before transcribing.",
    });
  }

  if (audio.duration_seconds !== null && audio.duration_seconds < 10) {
    risks.push({
      severity: "critical",
      code: "ZERO_DURATION",
      title: "File too short",
      description: "Audio is less than 10 seconds — likely an empty or corrupt file.",
      recommendation: "Verify the file uploaded correctly and re-upload if needed.",
    });
  }

  return risks;
}

function determineGateAction(risks: AudioRisk[]): AudioPreAnalysisReport["gate_action"] {
  if (risks.some((risk) => risk.severity === "critical")) {
    return "block";
  }
  if (risks.some((risk) => risk.severity === "warning" && risk.code === "DURATION_UNKNOWN")) {
    return "confirm_required";
  }
  if (risks.some((risk) => risk.severity === "warning")) {
    return "warn_proceed";
  }
  return "proceed";
}

function determineOverallRisk(risks: AudioRisk[]): AudioPreAnalysisReport["overall_risk"] {
  if (risks.some((risk) => risk.severity === "critical")) {
    return "critical";
  }
  if (risks.filter((risk) => risk.severity === "warning").length >= 2) {
    return "high";
  }
  if (risks.some((risk) => risk.severity === "warning")) {
    return "medium";
  }
  return "low";
}

function formatDuration(durationSeconds: number | null): string {
  if (durationSeconds == null) {
    return "Unknown duration";
  }

  const rounded = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function buildGateMessage(gateAction: AudioPreAnalysisReport["gate_action"], risks: AudioRisk[]): string {
  switch (gateAction) {
    case "block":
      return risks.find((risk) => risk.severity === "critical")?.description ?? "Transcription is blocked until this audio issue is resolved.";
    case "confirm_required":
      return "Audio analysis found warnings that require confirmation before transcription starts.";
    case "warn_proceed":
      return "Audio analysis found warnings. Review before proceeding.";
    case "proceed":
      return "Audio analysis passed. Ready to transcribe.";
  }
}

export function buildAudioPreAnalysisReport(
  audio: AudioPreAnalysisInput,
  now = new Date(),
): AudioPreAnalysisReport {
  const estimatedBitrateKbps = estimateBitrateKbps(audio.file_size_bytes, audio.duration_seconds);
  const risks = buildRisks(audio, estimatedBitrateKbps);
  const gateAction = determineGateAction(risks);
  const chunkingRecommended = (audio.duration_seconds ?? 0) > AUTO_CHUNK_THRESHOLD_SECONDS;
  const chunkCountEstimate = audio.duration_seconds != null && chunkingRecommended
    ? Math.ceil(audio.duration_seconds / TARGET_CHUNK_DURATION_SECONDS)
    : null;

  return {
    audio_id: audio.audio_id,
    filename: audio.original_filename,
    file_size_bytes: audio.file_size_bytes,
    mime_type: audio.mime_type,
    duration_seconds: audio.duration_seconds,
    duration_source: audio.duration_seconds == null ? "unknown" : "db_metadata",
    duration_minutes_display: formatDuration(audio.duration_seconds),
    estimated_bitrate_kbps: estimatedBitrateKbps,
    estimated_quality: estimateQuality(estimatedBitrateKbps),
    risks,
    overall_risk: determineOverallRisk(risks),
    chunking_recommended: chunkingRecommended,
    chunk_count_estimate: chunkCountEstimate,
    chunking_reason: chunkingRecommended
      ? "Audio duration exceeds 75 minutes, so auto-chunking is recommended."
      : null,
    recommended_keyterms: audio.recommended_keyterms ?? [],
    keyterms_source: audio.keyterms_source ?? "case_record",
    proceed_recommended: gateAction !== "block",
    gate_action: gateAction,
    gate_message: buildGateMessage(gateAction, risks),
    generated_at: now.toISOString(),
  };
}
