import { describe, it, expect } from "vitest";
import { guessCategoryFromText, parseRecipeTemplate } from "../templateParser";

/* Fiche « libre » : titre seul en première ligne, « Procédé : », sous-   */
/* sections, quantités collées (« 150g ») ou doublées (« 60g (6cl) »).    */
const BUCHE = `Bûche chocolat / caramel passion

Ingrédients : 

Mousse : 
150g de lait entier
2 feuilles de gélatine
190g de chocolat au lait de couverture (40 à 46 % de cacao)
30cl de crème liquide entière à 35% de MG bien froide

Insert : 
60g (6cl) de crème liquide entière à 35% de MG
25g de beurre demi-sel (coupé en petits dés)
1,5 feuille de gélatine

Croustillant : 
4 paquets de 2 crêpes dentelle
Eclats de noisette





Procédé : 

Insert : 
Préparer les bases : réhydrater la gélatine pendant 10min dans un grand bol d'eau très froide.
Couler et congeler : laisser tiédir vers 35-40 °C.

Biscuit : 
Faire fondre le beurre
Cuire 10min à 200°C
`;

describe("parseRecipeTemplate — fiche sans « Recette de : »", () => {
  const parsed = parseRecipeTemplate(BUCHE)!;

  it("prend la première ligne comme titre", () => {
    expect(parsed.title).toBe("Bûche chocolat / caramel passion");
  });

  it("reconnaît les sous-sections et les quantités collées ou doublées", () => {
    expect(parsed.ingredients).toEqual([
      expect.objectContaining({ isSection: true, title: "Mousse" }),
      expect.objectContaining({ qty: 150, unit: "g", name: "lait entier" }),
      expect.objectContaining({ qty: 2, unit: "", name: "feuilles de gélatine" }),
      expect.objectContaining({ qty: 190, unit: "g", name: "chocolat au lait de couverture (40 à 46 % de cacao)" }),
      expect.objectContaining({ qty: 30, unit: "cl", name: "crème liquide entière à 35% de MG bien froide" }),
      expect.objectContaining({ isSection: true, title: "Insert" }),
      expect.objectContaining({ qty: 60, unit: "g", name: "crème liquide entière à 35% de MG" }),
      expect.objectContaining({ qty: 25, unit: "g", name: "beurre demi-sel (coupé en petits dés)" }),
      expect.objectContaining({ qty: 1.5, unit: "", name: "feuille de gélatine" }),
      expect.objectContaining({ isSection: true, title: "Croustillant" }),
      expect.objectContaining({ qty: 4, unit: "", name: "paquets de 2 crêpes dentelle" }),
      expect.objectContaining({ name: "Eclats de noisette" }),
    ]);
  });

  it("lit « Procédé : » comme la préparation, avec ses sous-sections", () => {
    expect(parsed.steps).toEqual([
      { isSection: true, title: "Insert" },
      "Préparer les bases : réhydrater la gélatine pendant 10min dans un grand bol d'eau très froide.",
      "Couler et congeler : laisser tiédir vers 35-40 °C.",
      { isSection: true, title: "Biscuit" },
      "Faire fondre le beurre",
      "Cuire 10min à 200°C",
    ]);
  });

  it("classe la bûche en Sucré malgré le beurre demi-sel", () => {
    expect(parsed.category).toBe("Sucré");
  });
});

describe("parseRecipeTemplate — garde-fous", () => {
  it("refuse toujours un texte sans titre ni ingrédients", () => {
    expect(parseRecipeTemplate("Juste une phrase au hasard.")).toBeNull();
  });

  it("garde le format « Recette de : » d'origine", () => {
    const parsed = parseRecipeTemplate("Recette de : Tarte\nIngrédients :\n200 g farine\nPréparation :\nCuire.")!;
    expect(parsed.title).toBe("Tarte");
    expect(parsed.steps).toEqual(["Cuire."]);
  });

  it("ne coupe plus un mot qui commence comme une unité", () => {
    const parsed = parseRecipeTemplate("Gigot\nIngrédients :\n2 gousses d'ail\n1 lime\n150g farine\nÉtapes :\nRôtir.")!;
    expect(parsed.ingredients).toEqual([
      expect.objectContaining({ qty: 2, unit: "", name: "gousses d'ail" }),
      expect.objectContaining({ qty: 1, unit: "", name: "lime" }),
      expect.objectContaining({ qty: 150, unit: "g", name: "farine" }),
    ]);
    expect(parsed.steps).toEqual(["Rôtir."]);
  });

  it("ne prend pas une étape commençant par « Réalisation » pour un titre", () => {
    const parsed = parseRecipeTemplate("Recette de : Pain\nIngrédients :\n500 g farine\nPréparation :\nRéalisation du levain la veille.")!;
    expect(parsed.steps).toEqual(["Réalisation du levain la veille."]);
  });
});

describe("guessCategoryFromText", () => {
  it("une pincée de sel ne fait pas basculer un dessert en Salé", () => {
    expect(guessCategoryFromText("Cookies 200 g sucre 150 g chocolat 1 pincée de sel")).toBe("Sucré");
  });
  it("un plat salé reste Salé", () => {
    expect(guessCategoryFromText("Gratin dauphinois pommes de terre fromage ail sel poivre")).toBe("Salé");
  });
  it("« ail » n'est plus trouvé dans « détail »", () => {
    expect(guessCategoryFromText("Tarte au chocolat, voir le détail")).toBe("Sucré");
  });
});
