import { describe, it, expect } from "vitest";
import { THEME_CSS } from "../theme.css";

describe("page (CSS)", () => {
  it("désactive l'effet élastique de la page, qui laissait un grand vide au-dessus de l'en-tête sur iPhone", () => {
    const start = THEME_CSS.indexOf("html, body {");
    expect(start).toBeGreaterThan(-1);
    const rule = THEME_CSS.slice(start, THEME_CSS.indexOf("}", start));
    expect(rule).toContain("overscroll-behavior-y: none");
  });
});
