import { describe, expect, it } from "vitest";

import { classifyStaleJob, type WatchdogJobView, type WatchdogPolicy } from "./watchdogPolicy";

const NOW = Date.parse("2026-07-24T12:00:00.000Z");

const POLICY: WatchdogPolicy = {
  nowMs: NOW,
  staleTranscribeMs: 20 * 60_000,
  staleFinalizeMs: 15 * 60_000,
  maxDeepgramAttempts: 2,
  maxFinalizeAttempts: 5,
};

function job(overrides: Partial<WatchdogJobView>): WatchdogJobView {
  return {
    status: "processing",
    updated_at: new Date(NOW).toISOString(),
    finalize_started_at: null,
    watchdog_attempts: 0,
    finalize_attempts: 0,
    ...overrides,
  };
}

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

describe("classifyStaleJob", () => {
  it("skips a queued/processing job still within the stale timeout", () => {
    expect(classifyStaleJob(job({ status: "processing", updated_at: minutesAgo(5) }), POLICY))
      .toEqual({ kind: "skip", reason: "transcription still within timeout" });
  });

  it("resubmits to Deepgram a stalled queued/processing job under the attempt cap", () => {
    expect(classifyStaleJob(job({ status: "queued", updated_at: minutesAgo(25), watchdog_attempts: 1 }), POLICY))
      .toEqual({ kind: "resubmit_deepgram" });
  });

  it("fails a stalled transcription once resubmit attempts are exhausted", () => {
    const action = classifyStaleJob(job({ status: "processing", updated_at: minutesAgo(25), watchdog_attempts: 2 }), POLICY);
    expect(action.kind).toBe("fail");
    expect(action.kind === "fail" && action.reason).toContain("no Deepgram callback after 2 automatic resubmits");
  });

  it("skips a finalizing job whose finalize lease is still active", () => {
    expect(classifyStaleJob(job({ status: "finalizing", finalize_started_at: minutesAgo(5), finalize_attempts: 1 }), POLICY))
      .toEqual({ kind: "skip", reason: "finalize lease still active" });
  });

  it("re-drives a finalizing job whose lease has expired and is under the attempt cap", () => {
    expect(classifyStaleJob(job({ status: "finalizing", finalize_started_at: minutesAgo(20), finalize_attempts: 1 }), POLICY))
      .toEqual({ kind: "redrive_finalize" });
  });

  it("re-drives a finalizing job with no finalize_started_at (dispatch dropped before start)", () => {
    expect(classifyStaleJob(job({ status: "finalizing", finalize_started_at: null, finalize_attempts: 0 }), POLICY))
      .toEqual({ kind: "redrive_finalize" });
  });

  it("fails a finalizing job once finalize attempts are exhausted", () => {
    const action = classifyStaleJob(
      job({ status: "finalizing", finalize_started_at: minutesAgo(20), finalize_attempts: 5 }),
      POLICY,
    );
    expect(action.kind).toBe("fail");
    expect(action.kind === "fail" && action.reason).toContain("did not complete after 5 attempts");
  });

  it("skips terminal jobs", () => {
    expect(classifyStaleJob(job({ status: "complete" }), POLICY)).toEqual({ kind: "skip", reason: "job is terminal" });
    expect(classifyStaleJob(job({ status: "failed" }), POLICY)).toEqual({ kind: "skip", reason: "job is terminal" });
  });

  it("treats an unparseable updated_at as stale rather than skipping it", () => {
    expect(classifyStaleJob(job({ status: "processing", updated_at: "not-a-date", watchdog_attempts: 0 }), POLICY))
      .toEqual({ kind: "resubmit_deepgram" });
  });
});
