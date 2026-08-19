import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/ingest": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/items": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/query": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
      "/health": { target: "http://127.0.0.1:4000", changeOrigin: true },
    },
  },
});
