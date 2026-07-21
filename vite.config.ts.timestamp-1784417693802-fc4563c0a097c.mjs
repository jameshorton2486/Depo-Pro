// vite.config.ts
import { defineConfig } from "file:///C:/Users/james/Projects/Depo-Pro/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/james/Projects/Depo-Pro/node_modules/@vitejs/plugin-react/dist/index.mjs";
function manualChunks(id) {
  if (!id.includes("node_modules")) {
    return void 0;
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
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  test: {
    exclude: ["reference/**"]
  },
  build: {
    // The app shell currently lands just over Vite's default 500 kB warning
    // threshold after existing manual chunking. Keep the warning floor aligned
    // to observed output until a larger runtime-validated split is scheduled.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYW1lc1xcXFxQcm9qZWN0c1xcXFxEZXBvLVByb1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcamFtZXNcXFxcUHJvamVjdHNcXFxcRGVwby1Qcm9cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2phbWVzL1Byb2plY3RzL0RlcG8tUHJvL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3QvY29uZmlnXCIgLz5cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcblxyXG5mdW5jdGlvbiBtYW51YWxDaHVua3MoaWQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIGlmIChpZC5pbmNsdWRlcyhcInBkZmpzLWRpc3RcIikpIHtcclxuICAgIHJldHVybiBcInBkZlwiO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlkLmluY2x1ZGVzKFwiQHRpcHRhcFwiKSB8fCBpZC5pbmNsdWRlcyhcInByb3NlbWlycm9yXCIpKSB7XHJcbiAgICByZXR1cm4gXCJlZGl0b3ItY29yZVwiO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlkLmluY2x1ZGVzKFwiQHN1cGFiYXNlXCIpKSB7XHJcbiAgICByZXR1cm4gXCJzdXBhYmFzZVwiO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlkLmluY2x1ZGVzKFwid2F2ZXN1cmZlci5qc1wiKSkge1xyXG4gICAgcmV0dXJuIFwiYXVkaW9cIjtcclxuICB9XHJcblxyXG4gIGlmIChpZC5pbmNsdWRlcyhcImx1Y2lkZS1yZWFjdFwiKSkge1xyXG4gICAgcmV0dXJuIFwiaWNvbnNcIjtcclxuICB9XHJcblxyXG4gIGlmIChpZC5pbmNsdWRlcyhcIm1hbW1vdGhcIikpIHtcclxuICAgIHJldHVybiBcImRvYy1pbXBvcnRcIjtcclxuICB9XHJcblxyXG4gIGlmIChpZC5pbmNsdWRlcyhcInJlYWN0XCIpIHx8IGlkLmluY2x1ZGVzKFwic2NoZWR1bGVyXCIpKSB7XHJcbiAgICByZXR1cm4gXCJyZWFjdC12ZW5kb3JcIjtcclxuICB9XHJcblxyXG4gIHJldHVybiBcInZlbmRvclwiO1xyXG59XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXHJcbiAgfSxcclxuICB0ZXN0OiB7XHJcbiAgICBleGNsdWRlOiBbJ3JlZmVyZW5jZS8qKiddLFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcbiAgICAvLyBUaGUgYXBwIHNoZWxsIGN1cnJlbnRseSBsYW5kcyBqdXN0IG92ZXIgVml0ZSdzIGRlZmF1bHQgNTAwIGtCIHdhcm5pbmdcbiAgICAvLyB0aHJlc2hvbGQgYWZ0ZXIgZXhpc3RpbmcgbWFudWFsIGNodW5raW5nLiBLZWVwIHRoZSB3YXJuaW5nIGZsb29yIGFsaWduZWRcbiAgICAvLyB0byBvYnNlcnZlZCBvdXRwdXQgdW50aWwgYSBsYXJnZXIgcnVudGltZS12YWxpZGF0ZWQgc3BsaXQgaXMgc2NoZWR1bGVkLlxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTUwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MsXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUVsQixTQUFTLGFBQWEsSUFBZ0M7QUFDcEQsTUFBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDaEMsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUFJLEdBQUcsU0FBUyxZQUFZLEdBQUc7QUFDN0IsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUFJLEdBQUcsU0FBUyxTQUFTLEtBQUssR0FBRyxTQUFTLGFBQWEsR0FBRztBQUN4RCxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksR0FBRyxTQUFTLFdBQVcsR0FBRztBQUM1QixXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksR0FBRyxTQUFTLGVBQWUsR0FBRztBQUNoQyxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksR0FBRyxTQUFTLFNBQVMsR0FBRztBQUMxQixXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsV0FBVyxHQUFHO0FBQ3BELFdBQU87QUFBQSxFQUNUO0FBRUEsU0FBTztBQUNUO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlMLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
