import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { translations, type TranslationTree } from "../translations";

/* ------------------------------------------------------------------ */
/*  Garde-fous de la traduction : le mode anglais doit être entièrement   */
/*  en anglais. Échoue si une clé manque dans une langue, si le code       */
/*  appelle une clé qui n'existe pas, ou si un texte visible est de        */
/*  nouveau écrit en dur dans un composant.                                 */
/* ------------------------------------------------------------------ */

const SRC = resolve(__dirname, "../..");

function flatKeys(tree: TranslationTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : flatKeys(v, `${prefix}${k}.`)));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === "__tests__" ? [] : sourceFiles(join(dir, e.name));
    return /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [];
  });
}

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

// Textes visibles qui n'ont pas à être traduits (nom de l'app, chiffre).
const ALLOWED = new Set(["Le Grimoire de Morgane", "0"]);

describe("traductions", () => {
  it("le français et l'anglais ont exactement les mêmes clés", () => {
    const fr = flatKeys(translations.fr);
    const en = new Set(flatKeys(translations.en));
    expect(fr.filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !fr.includes(k))).toEqual([]);
  });

  it("chaque clé appelée dans le code existe", () => {
    const fr = new Set(flatKeys(translations.fr));
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\b(?:t|translateCurrent)\(\s*["']([a-zA-Z0-9_.]+)["']/g)) {
        if (!fr.has(m[1])) missing.push(`${m[1]} (${relative(SRC, file)})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("aucun texte visible écrit en dur dans les composants (passer par t())", () => {
    const found: string[] = [];
    for (const file of sourceFiles(SRC).filter((f) => f.endsWith(".tsx"))) {
      const src = stripComments(readFileSync(file, "utf8"));
      // Texte entre balises JSX contenant un mot (au moins deux lettres).
      for (const m of src.matchAll(/>\s*([^<>{}=;()]*[A-Za-zÀ-ÿ]{2}[^<>{}=;()]*?)\s*</g)) {
        const text = m[1].trim();
        // (Les comparaisons du code, ex. « a > 1 && b < 2 », ne sont pas du texte.)
        const looksLikeCode = /&&|\|\||[?"'`!]/.test(text);
        if (text && !looksLikeCode && !ALLOWED.has(text) && !/^[\w.]+$/.test(text)) found.push(`${relative(SRC, file)} : ${text}`);
      }
      // Attributs textuels écrits en dur, y compris dans une condition
      // (aria-label={x ? "Retirer…" : "Ajouter…"}).
      for (const m of src.matchAll(/\b(?:aria-label|placeholder|title|alt)=\{([^}]*)\}/g)) {
        if (/\bt\(|translateCurrent\(/.test(m[1])) continue;
        for (const lit of m[1].matchAll(/"([^"]*[A-Za-zÀ-ÿ]{3}[^"]*)"/g)) found.push(`${relative(SRC, file)} : ${lit[1]}`);
      }
      // Attributs textuels écrits en dur.
      for (const m of src.matchAll(/\b(aria-label|placeholder|title|alt)="([^"]*[A-Za-zÀ-ÿ][^"]*)"/g)) {
        if (!ALLOWED.has(m[2])) found.push(`${relative(SRC, file)} : ${m[1]}="${m[2]}"`);
      }
    }
    expect(found).toEqual([]);
  });
});
