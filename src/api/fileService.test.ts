import { describe, expect, it } from "vitest";

import {
  buildAudioLimitErrorMessage,
  buildStoragePath,
  computeChecksum,
  createFileId,
  isAudioUploadWithinLimit,
  MAX_AUDIO_BYTES,
  SIGNED_URL_TTL_SECONDS,
  normalizeAudioUploadError,
  sanitizeFilename,
  validateCaseAudioUpload,
  validateCaseFileUpload,
} from "./fileService";

describe("SIGNED_URL_TTL_SECONDS", () => {
  it("keeps initial media links valid for two hours before the player refreshes them", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(2 * 60 * 60);
  });
});

describe("sanitizeFilename", () => {
  it("strips path separators and collapses whitespace", () => {
    expect(sanitizeFilename("  folder\\sub/Notice  Of   Deposition .pdf  ")).toBe("folder_sub_Notice_Of_Deposition_.pdf");
  });

  it("removes non-ascii glyphs but preserves basic filename punctuation", () => {
    expect(sanitizeFilename("García Exhibit #1!.png")).toBe("Garcia_Exhibit_1.png");
  });

  it("falls back to file when everything is stripped", () => {
    expect(sanitizeFilename("////")).toBe("file");
  });
});

describe("validateCaseFileUpload", () => {
  it("accepts supported notice documents", () => {
    expect(() => validateCaseFileUpload("notice", new File(["a"], "notice.pdf", { type: "application/pdf" }))).not.toThrow();
  });

  it("rejects oversized supporting files", () => {
    expect(() => validateCaseFileUpload("supporting", new File(["a"], "photo.jpg", { type: "image/jpeg" , }))).not.toThrow();
    expect(() =>
      validateCaseFileUpload("supporting", {
        name: "photo.jpg",
        type: "image/jpeg",
        size: 50 * 1024 * 1024 + 1,
      } as File),
    ).toThrow("Documents must be PDF, DOCX, TXT, PNG, or JPG and no larger than 50 MB.");
  });

  it("accepts transcript source json but rejects unsupported extensions", () => {
    expect(() =>
      validateCaseFileUpload("transcript_source", {
        name: "raw.json",
        type: "application/json",
        size: 1024,
      } as File),
    ).not.toThrow();
    expect(() =>
      validateCaseFileUpload("transcript_source", {
        name: "raw.csv",
        type: "text/csv",
        size: 1024,
      } as File),
    ).toThrow("Transcript source files must be JSON or TXT and no larger than 100 MB.");
  });
});

describe("validateCaseAudioUpload", () => {
  it("accepts supported audio types", () => {
    expect(() =>
      validateCaseAudioUpload({
        name: "audio.m4a",
        type: "audio/mp4",
        size: 1024,
      } as File),
    ).not.toThrow();
  });

  it("rejects unsupported audio types", () => {
    expect(() =>
      validateCaseAudioUpload({
        name: "audio.ogg",
        type: "audio/ogg",
        size: 1024,
      } as File),
    ).toThrow("Audio must be WAV, MP3, M4A, MP4, or WEBM and no larger than 2 GB.");
  });

  it("rejects oversized audio with a friendly size message before upload", () => {
    expect(() =>
      validateCaseAudioUpload({
        name: "audio.mp3",
        type: "audio/mpeg",
        size: MAX_AUDIO_BYTES + 1,
      } as File),
    ).toThrow(buildAudioLimitErrorMessage(MAX_AUDIO_BYTES + 1));
  });
});

describe("isAudioUploadWithinLimit", () => {
  it("accepts a 134.85 MB file", () => {
    const bytes134_85Mb = Math.round(134.85 * 1024 * 1024);
    expect(isAudioUploadWithinLimit(bytes134_85Mb)).toBe(true);
  });

  it("accepts a file exactly at the 2 GB limit", () => {
    expect(isAudioUploadWithinLimit(MAX_AUDIO_BYTES)).toBe(true);
  });

  it("rejects a 2.5 GB file", () => {
    const bytes2_5Gb = 2.5 * 1024 * 1024 * 1024;
    expect(isAudioUploadWithinLimit(bytes2_5Gb)).toBe(false);
  });
});

describe("normalizeAudioUploadError", () => {
  it("maps Supabase maximum-size errors to the friendly limit message", () => {
    const error = new Error("The object exceeded the maximum allowed size");
    expect(normalizeAudioUploadError(error, MAX_AUDIO_BYTES + 1024).message).toBe(
      buildAudioLimitErrorMessage(MAX_AUDIO_BYTES + 1024),
    );
  });

  it("preserves server maximum-size errors for files that are still within the 2 GB client limit", () => {
    const error = new Error("The object exceeded the maximum allowed size");
    const bytes134_85Mb = Math.round(134.85 * 1024 * 1024);
    expect(normalizeAudioUploadError(error, bytes134_85Mb).message).toBe(
      "The object exceeded the maximum allowed size",
    );
  });

  it("preserves unrelated upload errors", () => {
    const error = new Error("network failed");
    expect(normalizeAudioUploadError(error).message).toBe("network failed");
  });
});

describe("buildStoragePath", () => {
  it("uses the owner/case/category/file_id filename convention", () => {
    expect(buildStoragePath("user_123", "case_20260605_abcd12", "notice", "f_1234_abcd", "Notice Of Deposition.pdf")).toBe(
      "user_123/case_20260605_abcd12/notice/f_1234_abcd_Notice_Of_Deposition.pdf",
    );
  });
});

describe("createFileId", () => {
  it("creates stable deterministic ids when inputs are provided", () => {
    expect(createFileId(1234567890, 0.5)).toBe("f_1234567890_i000");
  });
});

describe("computeChecksum", () => {
  it("is stable for identical blobs", async () => {
    const blob = new Blob(["same bytes"]);
    const first = await computeChecksum(blob);
    const second = await computeChecksum(blob);
    expect(first).toBe(second);
  });
});
