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

// .ts/.tsx ajoutés avec la migration TypeScript de tout src/ — sans eux,
// ce compteur ne voyait plus que les quelques fichiers de test restés en
// .js/.jsx (~2100 lignes), la quasi-totalité de l'app étant devenue
// invisible pour lui du jour au lendemain malgré un vrai code qui, lui,
// continuait de grossir normalement.
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
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
