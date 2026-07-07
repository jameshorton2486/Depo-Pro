import { createRoot, type Root } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "./index.css";
import { DepoEditor } from "./components/DepoEditor";
import { configureClient } from "./api/client";
import type { DepoEditorConfig } from "./types";
import { isMockMode, isRealApiMode } from "./lib/runtime/mode";
import { initializeSupabaseSession, supabase } from "./lib/supabase";

declare global {
  interface Window {
    DEPO_EDITOR_CONFIG?: DepoEditorConfig;
    mountEditor?: (config: DepoEditorConfig) => void;
  }
}

async function startMocks() {
  if (isMockMode()) {
    try {
      const { worker } = await import("./mocks/browser");
      await Promise.race([
        worker.start({
          quiet: true,
          onUnhandledRequest: "bypass",
          serviceWorker: { url: "/mockServiceWorker.js" },
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (err) {
      // Service worker registration may fail in sandboxed preview environments.
      // The app still mounts; API calls will 404 but the error UI will show.
      console.warn("[DEPO-PRO] MSW could not start:", err);
    }
  }
}

let editorRoot: Root | null = null;
let mountedElement: HTMLElement | null = null;
let currentConfig: DepoEditorConfig | null = null;
let currentApiBaseUrl: string | null = null;
let authStateUnsubscribe: (() => void) | null = null;
let lastRenderedSessionKey: string | null = null;

export function buildSessionRenderKey(session: Session | null): string {
  if (!session) {
    return "anonymous";
  }

  return `${session.user.id}:${session.refresh_token ?? ""}`;
}

function buildMountedConfig(config: DepoEditorConfig, session: Session | null): DepoEditorConfig {
  if (!session) {
    return config;
  }

  return {
    ...config,
    supabaseAccessToken: session.access_token,
    supabaseRefreshToken: session.refresh_token,
  };
}

function renderEditor(config: DepoEditorConfig, resolvedApiBaseUrl: string, session: Session | null) {
  const mountedConfig = buildMountedConfig(config, session);
  const el = document.querySelector(mountedConfig.mountSelector);
  if (!el) {
    console.error(`[DEPO-PRO] Mount selector "${mountedConfig.mountSelector}" not found.`);
    return;
  }

  if (mountedElement !== el) {
    editorRoot = createRoot(el as HTMLElement);
    mountedElement = el as HTMLElement;
  }

  lastRenderedSessionKey = buildSessionRenderKey(session);
  console.info("[DEPO-PRO] Mounting editor with config:", {
    ...mountedConfig,
    apiBaseUrl: resolvedApiBaseUrl,
    supabaseAccessToken: mountedConfig.supabaseAccessToken ? "[redacted]" : undefined,
    supabaseRefreshToken: mountedConfig.supabaseRefreshToken ? "[redacted]" : undefined,
  });
  editorRoot?.render(<DepoEditor config={mountedConfig} />);
}

function subscribeToAuthChanges() {
  authStateUnsubscribe?.();
  authStateUnsubscribe = null;

  if (!supabase || isMockMode()) {
    return;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!currentConfig || !currentApiBaseUrl) {
      return;
    }

    if (buildSessionRenderKey(session) === lastRenderedSessionKey) {
      return;
    }

    renderEditor(currentConfig, currentApiBaseUrl, session);
  });

  authStateUnsubscribe = () => {
    data.subscription.unsubscribe();
  };
}

export async function mountEditor(config: DepoEditorConfig) {
  const resolvedApiBaseUrl =
    isRealApiMode() && import.meta.env.VITE_EDITOR_API_BASE_URL
      ? String(import.meta.env.VITE_EDITOR_API_BASE_URL)
      : config.apiBaseUrl;

  currentConfig = config;
  currentApiBaseUrl = resolvedApiBaseUrl;
  configureClient(resolvedApiBaseUrl);
  let session: Session | null = null;
  try {
    session = await initializeSupabaseSession({
      accessToken: config.supabaseAccessToken,
      refreshToken: config.supabaseRefreshToken,
    });
  } catch (error) {
    console.warn("[DEPO-PRO] Supabase session bootstrap failed before mount.", error);
  }

  renderEditor(config, resolvedApiBaseUrl, session);
  subscribeToAuthChanges();
}

// Public API exposed on window — host page calls this after injecting the script.
window.mountEditor = async (config: DepoEditorConfig) => {
  await startMocks();
  await mountEditor(config);
};

// Auto-mount from window.DEPO_EDITOR_CONFIG when running standalone (dev + Bolt preview).
const cfg = window.DEPO_EDITOR_CONFIG;
if (cfg) {
  startMocks().then(() => mountEditor(cfg));
}
