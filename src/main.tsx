import { createRoot } from "react-dom/client";
import "./index.css";
import { DepoEditor } from "./components/DepoEditor";
import { configureClient } from "./api/client";
import type { DepoEditorConfig } from "./types";
import { isMockMode } from "./lib/runtime/mode";
import { initializeSupabaseSession } from "./lib/supabase";

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

export async function mountEditor(config: DepoEditorConfig) {
  configureClient(config.apiBaseUrl);
  await initializeSupabaseSession({
    accessToken: config.supabaseAccessToken,
    refreshToken: config.supabaseRefreshToken,
  });

  const el = document.querySelector(config.mountSelector);
  if (!el) {
    console.error(`[DEPO-PRO] Mount selector "${config.mountSelector}" not found.`);
    return;
  }

  console.info("[DEPO-PRO] Mounting editor with config:", {
    ...config,
    supabaseAccessToken: config.supabaseAccessToken ? "[redacted]" : undefined,
    supabaseRefreshToken: config.supabaseRefreshToken ? "[redacted]" : undefined,
  });
  createRoot(el as HTMLElement).render(<DepoEditor config={config} />);
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
