/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_USE_REAL_API?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_EDITOR_API_BASE_URL?: string;
  readonly VITE_REQUIRE_BINDING_CONFIRM?: string;
  readonly VITE_TRANSCRIPTION_PROVIDER?: string;
  readonly VITE_DEEPGRAM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
