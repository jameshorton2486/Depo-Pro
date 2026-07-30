import { createRoot, type Root } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "./index.css";
import { DepoEditor } from "./components/DepoEditor";
import { configureClient } from "./api/client";
import type { DepoEditorConfig } from "./types";
import { isMockMode, isRealApiMode } from "./lib/runtime/mode";
import { initializeSupabaseSession, supabase } from "./lib/supabase";
import { resolveEditorApiBaseUrl } from "./lib/runtime/editorApiUrl";

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

function redirectToLogin() {
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("redirectTo", window.location.href);
  window.location.assign(loginUrl.toString());
}

function renderEditor(config: DepoEditorConfig, resolvedApiBaseUrl: string, session: Session) {
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

    if (!session) {
      console.warn("[DEPO-PRO] Supabase session cleared after mount; redirecting to login.");
      redirectToLogin();
      return;
    }

    renderEditor(currentConfig, currentApiBaseUrl, session);
  });

  authStateUnsubscribe = () => {
    data.subscription.unsubscribe();
  };
}

export async function mountEditor(config: DepoEditorConfig) {
  const resolvedApiBaseUrl = resolveEditorApiBaseUrl({
    configBaseUrl: config.apiBaseUrl,
    configuredEditorApiUrl: import.meta.env.VITE_EDITOR_API_BASE_URL,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    realApiMode: isRealApiMode(),
  });

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

  if (!isMockMode() && !session) {
    console.warn("[DEPO-PRO] No Supabase session resolved before mount; redirecting to login.");
    redirectToLogin();
    return;
  }

  if (!session) {
    return;
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
