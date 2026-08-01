import { describe, expect, it } from "vitest";

import { resolveEditorApiBaseUrl } from "./editorApiUrl";

describe("resolveEditorApiBaseUrl", () => {
  it("uses the explicit editor API URL in real mode", () => {
    expect(resolveEditorApiBaseUrl({
      configBaseUrl: "/mock",
      configuredEditorApiUrl: "https://example.supabase.co/functions/v1/editor-api/",
      supabaseUrl: "https://ignored.supabase.co",
      realApiMode: true,
    })).toBe("https://example.supabase.co/functions/v1/editor-api");
  });

  it("derives the editor function URL from Supabase when the optional override is absent", () => {
    expect(resolveEditorApiBaseUrl({
      configBaseUrl: "/mock",
      supabaseUrl: "https://example.supabase.co/",
      realApiMode: true,
    })).toBe("https://example.supabase.co/functions/v1/editor-api");
  });

  it("keeps the host-provided URL in mock mode", () => {
    expect(resolveEditorApiBaseUrl({ configBaseUrl: "/mock/", realApiMode: false })).toBe("/mock");
  });

  it("fails clearly when real mode has no API origin", () => {
    expect(() => resolveEditorApiBaseUrl({ configBaseUrl: "/mock", realApiMode: true }))
      .toThrow("VITE_EDITOR_API_BASE_URL or VITE_SUPABASE_URL");
  });
});
