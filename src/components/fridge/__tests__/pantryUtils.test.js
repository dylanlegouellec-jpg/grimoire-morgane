import { describe, it, expect } from "vitest";
import { normalizeIngredientLabel, categorizeIngredient, collectPantryOptions } from "../pantryUtils";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : nettoyage de la liste "Mon Frigo" — signalé par           */
/*  l'utilisateur via des captures d'écran montrant, entre autres,          */
/*  "Œufs"/"Œufs extra-frais"/"Blancs d'oeuf"/"Jaunes d'oeuf" comme QUATRE    */
/*  options distinctes, "Colorant"/"Colorant en poudre" en double, et         */
/*  "Les graines d'une gousse de vanille fendue et grattée (facultatif)"        */
/*  affiché tel quel comme libellé de pilule. Verrouille aussi deux bugs de       */
/*  catégorisation trouvés en creusant la cause réelle : "œuf" est une           */
/*  SOUS-CHAÎNE de "bœuf" (b-œuf) et "ail" une sous-chaîne de "corail"/"détail",   */
/*  ce qui rangeait à tort tout ingrédient à base de bœuf dans "Frais &            */
/*  Crèmerie" au lieu de "Viandes & Poissons".                                      */
/* ------------------------------------------------------------------ */

describe("normalizeIngredientLabel — fusion des variantes", () => {
  it("fusionne toutes les déclinaisons d'œuf, apostrophe courbe (iOS) incluse", () => {
    expect(normalizeIngredientLabel("Œufs")).toBe("Œufs");
    expect(normalizeIngredientLabel("Œufs extra-frais")).toBe("Œufs");
    expect(normalizeIngredientLabel("Blancs d’oeuf")).toBe("Œufs"); // apostrophe courbe
    expect(normalizeIngredientLabel("Jaunes d'oeuf")).toBe("Œufs"); // apostrophe droite
  });

  it("ne confond jamais le bœuf (viande) avec l'œuf, malgré la sous-chaîne partagée", () => {
    expect(normalizeIngredientLabel("Bœuf haché")).toBe("Bœuf haché");
    expect(normalizeIngredientLabel("Boeuf bourguignon")).toBe("Boeuf bourguignon");
  });

  it("retire les notes entre parenthèses avant tout regroupement", () => {
    expect(normalizeIngredientLabel("Viande hachée (bœuf ou mélange bœuf/porc)")).toBe("Viande hachée");
    expect(normalizeIngredientLabel("Viande hachée (bœuf ou mélange bœuf/porc)"))
      .toBe(normalizeIngredientLabel("Viande hachée")); // même clé que la variante déjà propre
  });

  it("fusionne toute mention de vanille, y compris une saisie mal formée ou verbeuse", () => {
    expect(normalizeIngredientLabel("Gousse de vanille")).toBe("Vanille");
    expect(normalizeIngredientLabel("Ousse de vanille")).toBe("Vanille"); // coquille réelle observée ("G" perdu)
    expect(normalizeIngredientLabel("Les graines d’une gousse de vanille fendue et grattée (facultatif)")).toBe("Vanille");
  });

  it("fusionne les variantes de colorant", () => {
    expect(normalizeIngredientLabel("Colorant")).toBe("Colorant");
    expect(normalizeIngredientLabel("Colorant en poudre")).toBe("Colorant");
  });
});

describe("categorizeIngredient — pas de collision de sous-chaîne", () => {
  it("range le bœuf dans Viandes & Poissons, jamais Frais & Crèmerie (bug : 'œuf' ⊂ 'bœuf')", () => {
    expect(categorizeIngredient("Bœuf haché")).toBe("viandes-poissons");
    expect(categorizeIngredient("Boeuf bourguignon")).toBe("viandes-poissons");
  });

  it("range une viande hachée générique (sans espèce précisée) dans Viandes & Poissons", () => {
    expect(categorizeIngredient("Viande hachée")).toBe("viandes-poissons");
  });

  it("ne range pas 'lentilles corail' dans Fruits & Légumes (bug : 'ail' ⊂ 'corail')", () => {
    expect(categorizeIngredient("Lentilles corail")).not.toBe("fruits-legumes");
  });

  it("range toujours l'ail lui-même dans Fruits & Légumes", () => {
    expect(categorizeIngredient("Ail")).toBe("fruits-legumes");
  });

  it("range toujours l'œuf dans Frais & Crèmerie", () => {
    expect(categorizeIngredient("Œufs")).toBe("frais");
  });
});

describe("collectPantryOptions — une seule option par ingrédient réel", () => {
  const recipeWithVariants = (ingredientNames) => ({
    id: "r1",
    ingredients: ingredientNames.map((name, i) => ({ id: `i${i}`, name })),
  });

  it("ne produit qu'une seule option 'Œufs' pour toutes les déclinaisons présentes dans les recettes", () => {
    const recipes = [
      recipeWithVariants(["Œufs", "Œufs extra-frais", "Blancs d’oeuf", "Jaunes d'oeuf"]),
    ];
    const options = collectPantryOptions(recipes);
    const eggOptions = options.filter((o) => o.label === "Œufs");
    expect(eggOptions).toHaveLength(1);
    expect(eggOptions[0].category).toBe("frais");
  });

  it("ne produit qu'une seule option 'Vanille', peu importe la formulation d'origine", () => {
    const recipes = [
      recipeWithVariants(["Gousse de vanille", "Ousse de vanille", "Les graines d’une gousse de vanille fendue et grattée (facultatif)"]),
    ];
    const options = collectPantryOptions(recipes);
    expect(options.filter((o) => o.label === "Vanille")).toHaveLength(1);
  });
});
