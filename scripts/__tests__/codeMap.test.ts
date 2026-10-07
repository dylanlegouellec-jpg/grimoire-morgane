import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { buildCodeManifest } from "../codeMap";

/* ------------------------------------------------------------------ */
/*  Le constructeur de la carte du code (scripts/codeMap.ts), testé sur  */
/*  un petit projet fabriqué dans un dossier temporaire : liste des       */
/*  fichiers, lignes, liens d'import (statiques, dynamiques, vers un        */
/*  index), exclusion et comptage des tests.                                 */
/* ------------------------------------------------------------------ */

let root: string;

function write(relPath: string, content: string): void {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

function makeProject(): void {
  root = mkdtempSync(join(tmpdir(), "codemap-"));
  write("src/a.ts", 'import { b } from "./b";\nimport "./c";\nconst d = import("./d");\nimport x from "./missing";\nimport react from "react";\n');
  write("src/b.ts", "export const b = 1;\n");
  write("src/c.tsx", "export default 1;\n");
  write("src/d/index.ts", 'export * from "../b";\n');
  write("src/__tests__/a.test.ts", 'import "../a";\n');
  write("src/b.test.ts", 'import "./b";\n');
  write("src/test/setup.ts", "export {};\n");
  write("node_modules/pkg/index.ts", "export {};\n");
  write("package.json", "{}\n");
  write("notes.txt", "pas listé\n");
}

describe("buildCodeManifest", () => {
  it("liste les fichiers du projet, sans les tests ni node_modules, et compte les tests", () => {
    makeProject();
    const { files, testFileCount } = buildCodeManifest(root);
    expect(files.map((f) => f.path)).toEqual(["package.json", "src/a.ts", "src/b.ts", "src/c.tsx", "src/d/index.ts"]);
    expect(testFileCount).toBe(3); // a.test.ts, b.test.ts, test/setup.ts
  });

  it("compte les lignes comme countLoc (nombre de sauts de ligne + 1)", () => {
    makeProject();
    const file = buildCodeManifest(root).files.find((f) => f.path === "src/a.ts");
    expect(file?.lines).toBe(6);
  });

  it("résout les imports statiques, dynamiques, sans variable et vers un index, et ignore le reste", () => {
    makeProject();
    const a = buildCodeManifest(root).files.find((f) => f.path === "src/a.ts");
    // "./missing" (fichier inexistant) et "react" (paquet) n'apparaissent pas.
    expect(a?.imports).toEqual(["src/b.ts", "src/c.tsx", "src/d/index.ts"]);
  });

  it("calcule aussi le sens inverse : qui importe un fichier", () => {
    makeProject();
    const { files } = buildCodeManifest(root);
    const b = files.find((f) => f.path === "src/b.ts");
    // a.ts et d/index.ts importent b.ts ; le test b.test.ts n'est pas listé.
    expect(b?.importedBy).toEqual(["src/a.ts", "src/d/index.ts"]);
    expect(files.find((f) => f.path === "src/a.ts")?.importedBy).toEqual([]);
  });
});
