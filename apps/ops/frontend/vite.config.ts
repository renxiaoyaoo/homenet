import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../static",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/homenet-ops-[hash].js",
        chunkFileNames: "assets/homenet-ops-[name]-[hash].js",
        assetFileNames: "assets/homenet-ops-[hash][extname]"
      }
    }
  }
});
