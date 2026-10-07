import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RECIPE_TOUR_STEPS } from "../recipeTourSteps";
import { translations, type TranslationTree } from "../../../constants/translations";

/* ------------------------------------------------------------------ */
/*  Garde-fous du tuto « Modifier une recette » : chaque étape doit      */
/*  pointer un élément qui existe encore dans le formulaire, et avoir    */
/*  ses textes dans les deux langues. Sans ça, renommer un champ du      */
/*  formulaire ferait silencieusement perdre son étape au tuto.          */
/* ------------------------------------------------------------------ */

const formSource = readFileSync(resolve(__dirname, "../../recipe/RecipeForm.tsx"), "utf8");

function lookup(tree: TranslationTree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as TranslationTree)[key] : undefined), tree);
}

describe("RecipeEditTour", () => {
  it("commence par une étape sans cible, puis cible des champs du formulaire", () => {
    expect(RECIPE_TOUR_STEPS[0].selector).toBeNull();
    expect(RECIPE_TOUR_STEPS.slice(1).every((s) => s.selector)).toBe(true);
  });

  it("chaque cible data-tour existe dans RecipeForm", () => {
    for (const step of RECIPE_TOUR_STEPS) {
      const name = step.selector?.match(/data-tour="([^"]+)"/)?.[1];
      if (!name) continue;
      expect(formSource, `data-tour="${name}" introuvable dans RecipeForm.tsx`).toContain(`data-tour="${name}"`);
    }
  });

  it("chaque étape a un titre et un texte en français et en anglais", () => {
    for (const lang of ["fr", "en"] as const) {
      for (const step of RECIPE_TOUR_STEPS) {
        for (const suffix of ["Title", "Body"]) {
          const value = lookup(translations[lang], `recipeTour.${step.key}${suffix}`);
          expect(typeof value, `${lang}: recipeTour.${step.key}${suffix}`).toBe("string");
          expect((value as string).length).toBeGreaterThan(5);
        }
      }
    }
    for (const lang of ["fr", "en"] as const) {
      for (const key of ["onboarding.gesturesTitle", "onboarding.gesturesBody", "onboarding.recipeTourLink", "settings.replayRecipeTour", "recipeTour.ariaLabel"]) {
        expect(typeof lookup(translations[lang], key), `${lang}: ${key}`).toBe("string");
      }
    }
  });
});
