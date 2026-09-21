import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/* ------------------------------------------------------------------ */
/*  COMPTEUR DE LIGNES DE CODE — "pour le kiff", affiché dans le          */
/*  Panneau de Diagnostics (Réglages > Développeur). Calculé une seule     */
/*  fois AU BUILD (ici, jamais dans le navigateur : le code source n'est     */
/*  pas accessible à l'app une fois servie) et injecté comme constante         */
/*  littérale via `define` (voir vite.config.js ET vitest.config.js — les       */
/*  deux doivent rester synchronisés, sans quoi `__GRIMOIRE_LOC__` serait          */
/*  une variable non définie pendant les tests).                                    */
/* ------------------------------------------------------------------ */

const EXTENSIONS = new Set([".js", ".jsx"]);
const IGNORE_DIRS = new Set(["node_modules", "dist"]);

export function countGrimoireLoc(rootDir) {
  let total = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (IGNORE_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (EXTENSIONS.has(extname(entry))) {
        total += readFileSync(fullPath, "utf8").split("\n").length;
      }
    }
  }
  walk(rootDir);
  return total;
}
