import { describe, it, expect } from "vitest";
import { guessAisle, formatDurationMinutes, buildRecipeShareLink, decodeRecipeCode } from "../helpers";

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

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur — un temps de repos long (ex.  */
/*  1440 min pour un tiramisu à réserver une nuit) s'affichait tel quel     */
/*  ("1440 min") sur la page recette du livre de cuisine, au lieu d'un        */
/*  format lisible en heures/jours.                                            */
/* ------------------------------------------------------------------ */
describe("formatDurationMinutes", () => {
  it("affiche les minutes seules en dessous d'une heure", () => {
    expect(formatDurationMinutes(45)).toBe("45 min");
    expect(formatDurationMinutes(0)).toBe("0 min");
  });

  it("affiche heures + minutes entre 1h et 24h", () => {
    expect(formatDurationMinutes(90)).toBe("1 h 30 min");
    expect(formatDurationMinutes(120)).toBe("2 h");
  });

  it("bascule en jours à partir de 24h (1440 min), sans revenir à un total de minutes", () => {
    expect(formatDurationMinutes(1440)).toBe("1 j");
    expect(formatDurationMinutes(1500)).toBe("1 j 1 h");
    expect(formatDurationMinutes(2 * 1440 + 90)).toBe("2 j 1 h");
  });
});

/* ------------------------------------------------------------------ */
/*  Lien de partage PUBLIC d'une recette (voir PublicRecipeView.jsx) —    */
/*  verrouille l'aller-retour encodage/décodage dont dépend tout ce         */
/*  mécanisme : le paramètre doit s'appeler `recette` (jamais `import`,       */
/*  qui déclenche un tout autre flux, voir useOfflineSync.js) et la recette     */
/*  décodée doit être identique à celle passée à l'encodage.                     */
/* ------------------------------------------------------------------ */
describe("buildRecipeShareLink", () => {
  it("produit un lien ?recette=... (jamais ?import=...) décodable en la même recette", () => {
    const recipe = { title: "Tarte aux pommes", category: "Sucré", time: 45, servings: 6, ingredients: [{ qty: 3, unit: "", name: "pommes" }], steps: ["Éplucher", "Cuire"] };
    const link = buildRecipeShareLink(recipe);

    expect(link).toContain("?recette=");
    expect(link).not.toContain("?import=");

    const code = new URL(link).searchParams.get("recette");
    expect(decodeRecipeCode(code)).toEqual(recipe);
  });

  it("renvoie une chaîne vide si la recette ne peut pas être encodée", () => {
    const circular = {};
    circular.self = circular; // JSON.stringify lève sur une référence circulaire
    expect(buildRecipeShareLink(circular)).toBe("");
  });
});
