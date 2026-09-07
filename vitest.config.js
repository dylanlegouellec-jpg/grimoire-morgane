import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/* ------------------------------------------------------------------ */
/*  CONFIGURATION VITEST — séparée de vite.config.js (qui porte le       */
/*  plugin PWA/Workbox, sans rapport avec les tests et qui n'a pas de     */
/*  raison de tourner pendant `npm test`).                                */
/* ------------------------------------------------------------------ */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
  },
});
