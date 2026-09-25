import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@qpdf-engine": path.join(root, "node_modules/@jspawn/qpdf-wasm/qpdf.js"),
    },
  },
  worker: { format: "es" },
  optimizeDeps: {
    include: ["pdfjs-dist", "pdf-lib", "fabric"],
    exclude: ["@jspawn/qpdf-wasm"],
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
});
