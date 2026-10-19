import { describe, it, expect } from "vitest";
import { normalizeServingsUnit, servingsUnitFor, unitServingsText } from "../servingsUnit";
import { mapRecipeToRow, mapRowToRecipe, RECIPE_COLUMNS } from "../supabase";
import { parseRecipeTemplate } from "../templateParser";
import { decodeRecipeCode, encodeRecipeCode } from "../helpers";
import { translate } from "../i18n";
import { translations } from "../../constants/translations";

/* Unité des portions (« pour 20 cookies ») : nettoyage, accord, aller-retour
   Supabase, import texte et compatibilité des anciens codes de partage. */

const t = (key: string, vars?: Record<string, unknown>) => translate(translations.fr, key, vars);

describe("normalizeServingsUnit", () => {
  it("garde l'unité saisie, resserrée et bornée", () => {
    expect(normalizeServingsUnit("  petits   pots ")).toBe("petits pots");
    expect(normalizeServingsUnit("x".repeat(40))).toHaveLength(24);
  });
  it("ramène vide, absent et les synonymes de « personnes » à null", () => {
    for (const raw of [null, undefined, "", "   ", 3, "personnes", "Personne", "pers.", "people", "convives"]) {
      expect(normalizeServingsUnit(raw)).toBeNull();
    }
  });
});

describe("servingsUnitFor (accord simple)", () => {
  it("plus d'une portion : telle qu'écrite", () => {
    expect(servingsUnitFor("cookies", 20)).toBe("cookies");
    expect(servingsUnitFor("cookie", 20)).toBe("cookie");
  });
  it("une seule : pluriel final retiré avant le mot de liaison", () => {
    expect(servingsUnitFor("cookies", 1)).toBe("cookie");
    expect(servingsUnitFor("tranches de cakes", 1)).toBe("tranche de cakes");
    expect(servingsUnitFor("petits pots", 1)).toBe("petit pot");
    expect(servingsUnitFor("gâteaux", 1)).toBe("gâteau");
    expect(servingsUnitFor("verre", 1)).toBe("verre");
  });
  it("texte complet, ou null pour une recette en personnes", () => {
    expect(unitServingsText(t, 20, "cookies", "fr")).toBe("20 cookies");
    expect(unitServingsText(t, 1, "cookies", "fr")).toBe("1 cookie");
    expect(unitServingsText(t, 4, null, "fr")).toBeNull();
  });
});

describe("Supabase — colonne servings_unit", () => {
  it("est lue et écrite (aller-retour)", () => {
    expect(RECIPE_COLUMNS.split(",")).toContain("servings_unit");
    const row = mapRecipeToRow({ id: "r1", title: "Cookies", servings: 20, servingsUnit: " cookies ", ingredients: [], steps: [] }, "h1");
    expect(row.servings_unit).toBe("cookies");
    expect(mapRowToRecipe({ ...row, ingredients: [], steps: [] }).servingsUnit).toBe("cookies");
  });
  it("recette en personnes : null dans les deux sens (anciennes lignes comprises)", () => {
    expect(mapRecipeToRow({ id: "r2", title: "Crêpes", servings: 4 }).servings_unit).toBeNull();
    expect(mapRowToRecipe({ id: "r2", title: "Crêpes", servings: 4 }).servingsUnit).toBeNull();
  });
});

describe("Import texte", () => {
  it("« Pour : 20 cookies » -> 20 portions, unité cookies", () => {
    const parsed = parseRecipeTemplate("Recette de : Cookies\nPour : 20 cookies\nIngrédients :\n200 g farine\nPréparation :\nMélanger.");
    expect(parsed).toMatchObject({ servings: 20, servingsUnit: "cookies" });
  });
  it("« 4 personnes » ou un simple nombre restent en personnes", () => {
    expect(parseRecipeTemplate("Recette de : Gratin\nNombre de parts : 4 personnes")).toMatchObject({ servings: 4, servingsUnit: null });
    expect(parseRecipeTemplate("Recette de : Gratin\nNombre de parts : 8")).toMatchObject({ servings: 8, servingsUnit: null });
    expect(parseRecipeTemplate("Recette de : Gratin\nPour 6 personnes")).toMatchObject({ servings: 6, servingsUnit: null });
  });
  it("« Pour la pâte : » reste un titre de sous-section, une étape « Pour 4 personnes, … » reste une étape", () => {
    const parsed = parseRecipeTemplate(
      "Recette de : Tarte\nNombre de parts : 6\nIngrédients :\nPour la pâte :\n200 g farine\nPréparation :\nPour 4 personnes, réduire le beurre.\nCuire."
    )!;
    expect(parsed.servingsUnit).toBeNull();
    expect(parsed.ingredients[0]).toMatchObject({ isSection: true, title: "Pour la pâte" });
    expect(parsed.steps).toEqual(["Pour 4 personnes, réduire le beurre.", "Cuire."]);
  });
});

describe("Codes de partage", () => {
  it("l'unité voyage dans le code ; un ancien code sans elle reste lisible", () => {
    expect(decodeRecipeCode(encodeRecipeCode({ title: "Cookies", servings: 20, servingsUnit: "cookies" }))).toMatchObject({ servingsUnit: "cookies" });
    const old = decodeRecipeCode(encodeRecipeCode({ title: "Crêpes", servings: 4 }))!;
    expect(normalizeServingsUnit(old.servingsUnit)).toBeNull();
  });
});
