import { describe, it, expect } from "vitest";
import { guessAisle } from "../helpers";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : même bug de sous-chaîne que pantryUtils.js (Mon Frigo) —   */
/*  "œuf" est une SOUS-CHAÎNE de "bœuf" (b-œuf) et "ail" une sous-chaîne     */
/*  de "corail"/"détail" : un article de courses à base de bœuf finissait     */
/*  à tort rangé au rayon "Produits Frais & Crèmerie" au lieu de "Viandes &    */
/*  Poissons" (la première correspondance dans AISLES l'emportant toujours).   */
/* ------------------------------------------------------------------ */

describe("guessAisle — pas de collision de sous-chaîne", () => {
  it("range le bœuf au rayon Viandes & Poissons, jamais Produits Frais (bug : 'œuf' ⊂ 'bœuf')", () => {
    expect(guessAisle("Bœuf haché")).toBe("Viandes & Poissons");
    expect(guessAisle("Boeuf bourguignon")).toBe("Viandes & Poissons");
  });

  it("range une viande hachée générique (sans espèce précisée) au rayon Viandes & Poissons", () => {
    expect(guessAisle("Viande hachée")).toBe("Viandes & Poissons");
  });

  it("ne range pas 'lentilles corail' au rayon Fruits & Légumes (bug : 'ail' ⊂ 'corail')", () => {
    expect(guessAisle("Lentilles corail")).not.toBe("Fruits & Légumes");
  });

  it("range toujours l'ail lui-même au rayon Fruits & Légumes", () => {
    expect(guessAisle("Ail")).toBe("Fruits & Légumes");
    expect(guessAisle("Gousse d'ail")).toBe("Fruits & Légumes");
  });

  it("range toujours l'œuf au rayon Produits Frais & Crèmerie", () => {
    expect(guessAisle("Œufs")).toBe("Produits Frais & Crèmerie");
  });
});
