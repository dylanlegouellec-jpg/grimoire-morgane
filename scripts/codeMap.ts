import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, posix } from "node:path";

/* ------------------------------------------------------------------ */
/*  CARTE DU CODE — liste des fichiers du projet, leur taille et les     */
/*  liens d'import entre eux. Affichée dans le Panneau de Diagnostics       */
/*  (Réglages > Développeur > "Code de l'app", components/diagnostics/       */
/*  CodeExplorer.tsx). Calculée AU BUILD, comme scripts/countLoc.ts — le      */
/*  code source n'est pas accessible à l'app une fois servie — et injectée      */
/*  comme constante littérale `__GRIMOIRE_CODE__` via `define` (voir               */
/*  vite.config.ts ET vitest.config.ts, à garder synchronisés).                     */
/*                                                                                    */
/*  Ce qui est calculé ici : chemin, nombre de lignes, fichiers importés,               */
/*  fichiers importeurs. Ce qui NE l'est PAS : la description de chaque fichier            */
/*  (à quoi il sert) — écrite à la main dans src/constants/codeMap.ts, avec un test         */
/*  (codeMap.test.ts) qui échoue si un fichier listé ici n'y est pas décrit.                  */
/* ------------------------------------------------------------------ */

export interface CodeFileInfo {
  /** Chemin depuis la racine du projet, séparateurs "/" (ex. "src/hooks/useToast.ts"). */
  path: string;
  lines: number;
  /** Fichiers du projet que celui-ci importe (chemins, triés). */
  imports: string[];
  /** Fichiers du projet qui importent celui-ci (chemins, triés). */
  importedBy: string[];
}

export interface CodeManifest {
  files: CodeFileInfo[];
  /** Fichiers de tests, non listés (voir isTestPath) mais comptés pour l'affichage. */
  testFileCount: number;
}

// Dossiers parcourus à partir de la racine, plus quelques fichiers de
// configuration posés directement à la racine.
const SCAN_DIRS = ["src", "api", "scripts", "supabase"];
const ROOT_FILES = [
  "index.html",
  "package.json",
  "vite.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
  "eslint.config.ts",
  "vercel.json",
];
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const LISTED_EXTENSIONS = new Set([...CODE_EXTENSIONS, ".html", ".json", ".md", ".sql"]);
const IGNORED_DIRS = new Set(["node_modules", "dist"]);

// Les tests (dossiers __tests__ / src/test, fichiers *.test.*) ne sont pas
// listés : ce sont des fichiers d'appoint, pas du code applicatif.
function isTestPath(path: string): boolean {
  return /(^|\/)__tests__\//.test(path) || path.startsWith("src/test/") || /\.test\.[jt]sx?$/.test(path);
}

// "../foo" ou "./foo" entre guillemets après from / import / import(...).
const LOCAL_IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g;

function resolveImport(fromFile: string, specifier: string, known: Set<string>): string | null {
  const base = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  const candidates = [
    base,
    ...CODE_EXTENSIONS.map((ext) => base + ext),
    ...CODE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];
  return candidates.find((c) => known.has(c)) ?? null;
}

export function buildCodeManifest(rootDir: string): CodeManifest {
  const listed: string[] = [];
  let testFileCount = 0;

  function consider(relPath: string): void {
    if (!LISTED_EXTENSIONS.has(extname(relPath))) return;
    if (isTestPath(relPath)) {
      testFileCount += 1;
      return;
    }
    listed.push(relPath);
  }

  function walk(relDir: string): void {
    const absDir = join(rootDir, relDir);
    if (!existsSync(absDir)) return;
    for (const entry of readdirSync(absDir).sort()) {
      if (IGNORED_DIRS.has(entry)) continue;
      const relPath = posix.join(relDir, entry);
      if (statSync(join(rootDir, relPath)).isDirectory()) walk(relPath);
      else consider(relPath);
    }
  }

  SCAN_DIRS.forEach(walk);
  ROOT_FILES.forEach((f) => {
    if (existsSync(join(rootDir, f))) listed.push(f);
  });

  const known = new Set(listed);
  const importsOf = new Map<string, Set<string>>();
  const importedByOf = new Map<string, Set<string>>();
  listed.forEach((p) => {
    importsOf.set(p, new Set());
    importedByOf.set(p, new Set());
  });

  const lineCount = new Map<string, number>();
  for (const path of listed) {
    const source = readFileSync(join(rootDir, path), "utf8");
    lineCount.set(path, source.split("\n").length);
    if (!CODE_EXTENSIONS.includes(extname(path))) continue;
    for (const match of source.matchAll(LOCAL_IMPORT_RE)) {
      const target = resolveImport(path, match[1], known);
      if (!target || target === path) continue;
      importsOf.get(path)!.add(target);
      importedByOf.get(target)!.add(path);
    }
  }

  const sorted = (s: Set<string>) => [...s].sort();
  const files = [...listed].sort().map((path) => ({
    path,
    lines: lineCount.get(path)!,
    imports: sorted(importsOf.get(path)!),
    importedBy: sorted(importedByOf.get(path)!),
  }));
  return { files, testFileCount };
}
