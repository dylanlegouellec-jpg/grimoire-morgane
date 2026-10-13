import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const THEME_CSS = readFileSync(resolve(__dirname, "../theme.css"), "utf8");

describe("page (CSS)", () => {
  it("désactive l'effet élastique de la page, qui laissait un grand vide au-dessus de l'en-tête sur iPhone", () => {
    const start = THEME_CSS.indexOf("html, body {");
    expect(start).toBeGreaterThan(-1);
    const rule = THEME_CSS.slice(start, THEME_CSS.indexOf("}", start));
    expect(rule).toContain("overscroll-behavior-y: none");
  });
});
