import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const A11Y_CSS = readFileSync(resolve(__dirname, "../a11y.css"), "utf8");
const THEME_CSS = readFileSync(resolve(__dirname, "../theme.css"), "utf8");
const INDEX_CSS = readFileSync(resolve(__dirname, "../index.css"), "utf8");

const STYLES_DIR = resolve(__dirname, "..");
// Tout le CSS de l'app (tous les fichiers de src/styles).
const ALL_CSS = readdirSync(STYLES_DIR).filter((f) => f.endsWith(".css")).map((f) => readFileSync(resolve(STYLES_DIR, f), "utf8")).join("\n");

/* Garde-fous de l'audit d'accessibilité : zoom autorisé, contour clavier,
   zones tactiles, contraste du texte doré et des boutons principaux. */

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function lightToken(name: string): string {
  const light = THEME_CSS.slice(0, THEME_CSS.indexOf('[data-theme="dark"]'));
  const m = light.match(new RegExp(`--${name}: (#[0-9a-fA-F]{6})`));
  expect(m, `--${name} introuvable`).toBeTruthy();
  return m![1];
}

describe("accessibilité", () => {
  it("n'empêche plus le zoom à deux doigts", () => {
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    const viewportTags = html.match(/<meta name="viewport"[^>]*>/g) ?? [];
    expect(viewportTags).toHaveLength(1);
    expect(viewportTags[0]).not.toMatch(/user-scalable|maximum-scale/);
    expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1.0" \/>/);
  });

  it("charge les règles d'accessibilité en dernier", () => {
    const imports = [...INDEX_CSS.matchAll(/@import "\.\/([\w]+\.css)";/g)].map((m) => m[1]);
    expect(imports[imports.length - 1]).toBe("a11y.css");
  });

  it("montre un contour au clavier et agrandit les petites zones tactiles", () => {
    expect(A11Y_CSS).toContain(":focus-visible");
    for (const sel of [".qty-stepper button::after", ".portions-stepper button::after", ".fav-btn::after", ".modal-close::after"]) {
      expect(A11Y_CSS).toContain(sel);
    }
  });

  it("le texte doré et le texte des boutons principaux restent lisibles en thème clair (≥ 4,4:1)", () => {
    const parchment = lightToken("parchment");
    expect(contrast(lightToken("gold-text"), parchment)).toBeGreaterThanOrEqual(4.5);
    const seal = THEME_CSS.match(/--seal-bg: linear-gradient\(180deg, (#[0-9a-f]{6}), (#[0-9a-f]{6})\)/);
    expect(seal).toBeTruthy();
    const text = lightToken("seal-text");
    expect(contrast(text, seal![1])).toBeGreaterThanOrEqual(4.4);
    expect(contrast(text, seal![2])).toBeGreaterThanOrEqual(4.5);
  });

  it("n'utilise plus --gold comme couleur de texte (seulement --gold-text)", () => {
    expect(ALL_CSS).not.toMatch(/(?<![-\w])color: var\(--gold\)/);
  });
});
