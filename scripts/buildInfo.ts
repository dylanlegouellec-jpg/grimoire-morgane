import { execSync } from "node:child_process";

/* ------------------------------------------------------------------ */
/*  VERSION DE L'APP — numéro de commit et date de construction,          */
/*  affichés dans le Panneau de Diagnostics (section "Application") et      */
/*  dans le rapport copié. Calculés AU BUILD et injectés comme constante      */
/*  littérale `__GRIMOIRE_BUILD__` via `define` (vite.config.ts ET             */
/*  vitest.config.ts, à garder synchronisés) — l'app servie n'a plus accès      */
/*  à git. Même principe que scripts/countLoc.ts et scripts/codeMap.ts.          */
/* ------------------------------------------------------------------ */

export interface BuildInfo {
  /** Les 7 premiers caractères du commit construit, ou "dev" si inconnu. */
  commit: string;
  /** Instant de construction, ISO 8601 (UTC). */
  builtAt: string;
}

export function getBuildInfo(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): BuildInfo {
  // Sur Vercel, le commit construit est fourni par l'environnement de build
  // (le dossier .git n'y est pas toujours présent) ; en local, on demande à git.
  let commit = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "";
  if (!commit) {
    try {
      commit = execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      commit = "";
    }
  }
  return { commit: commit || "dev", builtAt: now.toISOString() };
}
