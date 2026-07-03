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
    // The app shell currently lands just over Vite's default 500 kB warning
    // threshold after existing manual chunking. Keep the warning floor aligned
    // to observed output until a larger runtime-validated split is scheduled.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
