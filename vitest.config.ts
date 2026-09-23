import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { countGrimoireLoc } from "./scripts/countLoc";

/* ------------------------------------------------------------------ */
/*  CONFIGURATION VITEST — séparée de vite.config.ts (qui porte le       */
/*  plugin PWA/Workbox, sans rapport avec les tests et qui n'a pas de     */
/*  raison de tourner pendant `npm test`).                                */
/* ------------------------------------------------------------------ */

// Même `define` que vite.config.ts (voir scripts/countLoc.ts) : sans lui,
// `__GRIMOIRE_LOC__` (DiagnosticsPanelModal.jsx) serait une variable non
// définie pendant les tests — les deux configs doivent rester synchronisées.
const GRIMOIRE_LOC = countGrimoireLoc(fileURLToPath(new URL("./src", import.meta.url)));

export default defineConfig({
  define: {
    __GRIMOIRE_LOC__: JSON.stringify(GRIMOIRE_LOC),
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
