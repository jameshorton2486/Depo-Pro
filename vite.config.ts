/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("pdfjs-dist")) {
    return "pdf";
  }

  if (id.includes("@tiptap") || id.includes("prosemirror")) {
    return "editor-core";
  }

  if (id.includes("@supabase")) {
    return "supabase";
  }

  if (id.includes("wavesurfer.js")) {
    return "audio";
  }

  if (id.includes("lucide-react")) {
    return "icons";
  }

  if (id.includes("mammoth")) {
    return "doc-import";
  }

  if (id.includes("react") || id.includes("scheduler")) {
    return "react-vendor";
  }

  return "vendor";
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    exclude: ['reference/**'],
  },
  build: {
    // Stage screens are lazy-loaded (see DepoEditor.tsx), so the app-shell
    // entry chunk is small (~200 kB). The remaining large chunks are all
    // deferred vendor bundles (editor-core/TipTap, pdf, doc-import) that load
    // on demand. Keep a 550 kB floor as a regression guard on those bundles.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
