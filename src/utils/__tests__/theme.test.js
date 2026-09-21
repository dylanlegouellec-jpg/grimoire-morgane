import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyTheme } from "../theme";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : "en haut de mon écran c'est pas la même teinte" — la      */
/*  balise <meta name="theme-color"> (utilisée par iOS/Android pour         */
/*  colorer la barre d'état d'une PWA installée) restait figée à sa           */
/*  valeur statique d'index.html, sans jamais suivre le thème réellement       */
/*  appliqué — ni au changement clair/sombre, ni quand ce choix diverge du      */
/*  thème système (ex. "Sombre" choisi explicitement sur un appareil resté       */
/*  en clair). applyTheme() doit désormais corriger cette balise à chaque         */
/*  appel, vers la même couleur que --parchment pour le thème résolu.             */
/* ------------------------------------------------------------------ */

describe("applyTheme — synchronise <meta name=\"theme-color\">", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#f1e6c8">';
    document.documentElement.removeAttribute("data-theme");
  });
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("pose la couleur claire pour le thème 'light'", () => {
    applyTheme("light");
    expect(document.querySelector('meta[name="theme-color"]').content).toBe("#f1e6c8");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("pose la couleur sombre pour le thème 'dark', même si le système reste clair", () => {
    applyTheme("dark");
    expect(document.querySelector('meta[name="theme-color"]').content).toBe("#1c1917");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("ne casse rien si la balise <meta name=\"theme-color\"> est absente", () => {
    document.head.innerHTML = "";
    expect(() => applyTheme("dark")).not.toThrow();
  });

  it("remplace le nœud <meta> plutôt que de muter son attribut en place (repli iOS PWA)", () => {
    const before = document.querySelector('meta[name="theme-color"]');
    applyTheme("dark");
    const after = document.querySelector('meta[name="theme-color"]');
    expect(after).not.toBe(before);
    expect(after.content).toBe("#1c1917");
    expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(1);
  });
});
