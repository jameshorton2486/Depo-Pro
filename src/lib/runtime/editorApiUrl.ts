function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function resolveEditorApiBaseUrl(input: {
  configBaseUrl: string;
  configuredEditorApiUrl?: string;
  supabaseUrl?: string;
  realApiMode: boolean;
}): string {
  if (!input.realApiMode) {
    return trimTrailingSlash(input.configBaseUrl);
  }

  const configured = trimTrailingSlash(input.configuredEditorApiUrl ?? "");
  if (configured) {
    return configured;
  }

  const supabaseUrl = trimTrailingSlash(input.supabaseUrl ?? "");
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/editor-api`;
  }

  throw new Error("Real API mode requires VITE_EDITOR_API_BASE_URL or VITE_SUPABASE_URL.");
}
