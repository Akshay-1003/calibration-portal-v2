
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
    resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    // Settings is route-lazy and its laboratory tab is the first place this
    // dependency is discovered. Pre-bundle it at startup so opening Settings
    // does not invalidate Vite's dependency graph with a 504 Outdated
    // Optimize Dep response.
    include: ["country-state-city"],
  },
});



