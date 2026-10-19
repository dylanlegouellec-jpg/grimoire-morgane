import { normalizeIngredientList, parseQuantity } from "../../../utils/ingredients";
import { DEFAULT_UNITS, preferredDefaultUnit } from "../../../utils/units";
import type { Recipe } from "../../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  RANGÉES DU FORMULAIRE DE RECETTE — données pures                    */
/*  Unités proposées, forme des rangées d'ingrédients/étapes, et        */
/*  passage recette <-> rangées (création, enregistrement, détection   */
/*  des modifications non enregistrées). Aucune dépendance à React.     */
/* ------------------------------------------------------------------ */

// Unités de BASE (avant réglages du foyer) — la liste réellement proposée
// dans le menu vient de buildUnitOptions (utils/units.ts : unités de base
// non masquées + unités ajoutées dans Réglages > Unités des ingrédients).
// Gardé ici pour les anciens imports (components/recipe/index.ts).
export const UNIT_OPTIONS = DEFAULT_UNITS;

// Libellé AFFICHÉ de chaque unité selon la langue active — la `value`
// enregistrée avec la recette (ci-dessus) ne change jamais. Les unités
// absentes de cette table (g, kg, ml..., et les unités ajoutées par le
// foyer) s'affichent telles quelles.
export const UNIT_LABEL_KEYS: Record<string, string> = {
  "pièce": "recipeUi.form.units.piece",
  "pincée": "recipeUi.form.units.pinch",
  "c. à soupe": "recipeUi.form.units.tbsp",
  "c. à café": "recipeUi.form.units.tsp",
  "": "recipeUi.form.units.none",
};

export interface IngredientSectionRow {
  id: string;
  isSection: true;
  title: string;
}
export interface IngredientDataRow {
  id: string;
  isSection?: false;
  qty: string | number;
  unit: string;
  name: string;
}
export type IngredientRowT = IngredientSectionRow | IngredientDataRow;

export interface StepSectionRow {
  id: string;
  isSection: true;
  title: string;
}
export interface StepDataRow {
  id: string;
  isSection?: false;
  text: string;
}
export type StepRowT = StepSectionRow | StepDataRow;

/** Fabrique d'identifiants de rangée (clés React, jamais enregistrées avec la recette). */
export function makeRowIdFactory(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-${n++}`;
}

// Unité pré-remplie : « g », sauf si le foyer l'a masquée (voir
// preferredDefaultUnit, utils/units.ts) — alors la première proposée.
export function newIngredientRow(id: string, unit: string = preferredDefaultUnit()): IngredientDataRow {
  return { id, qty: "", unit, name: "" };
}

export function ingredientRowsFromRecipe(recipe: Recipe | null | undefined, newId: () => string): IngredientRowT[] {
  if (!recipe || !recipe.ingredients.length) return [newIngredientRow(newId())];
  return recipe.ingredients.map((i): IngredientRowT =>
    "isSection" in i
      ? { id: newId(), isSection: true, title: i.title }
      : { id: newId(), qty: i.qty ?? "", unit: i.unit, name: i.name }
  );
}

export function stepRowsFromRecipe(recipe: Recipe | null | undefined, newId: () => string): StepRowT[] {
  if (!recipe || !recipe.steps.length) return [{ id: newId(), text: "" }];
  return recipe.steps.map((s): StepRowT =>
    typeof s === "object" && s.isSection
      ? { id: newId(), isSection: true, title: s.title }
      : { id: newId(), text: s as string }
  );
}

// Partagé entre l'enregistrement et le bouton "Estimer la nutrition" : les
// deux ont besoin de la même liste d'ingrédients normalisée à partir des
// rangées du formulaire, l'un pour enregistrer la recette, l'autre pour
// l'envoyer à /api/nutrition-estimate.
export function ingredientsFromRows(rows: IngredientRowT[]) {
  return normalizeIngredientList(
    rows
      .filter((r) => (r.isSection ? r.title.trim() : r.name.trim()))
      .map((r) =>
        r.isSection
          ? { isSection: true, title: r.title.trim() }
          : { qty: parseQuantity(r.qty), unit: r.unit, name: r.name.trim() }
      )
  );
}

export function stepsFromRows(rows: StepRowT[]) {
  return rows
    .filter((r) => (r.isSection ? r.title.trim() : r.text.trim()))
    .map((r) => (r.isSection ? { isSection: true as const, title: r.title.trim() } : r.text.trim()));
}

// Contenu des rangées pour la détection "modifié" : jamais les `id` internes
// (juste des clés React, pas une donnée de la recette), sinon un simple
// réordonnancement identique au contenu original se signalerait à tort
// comme une modification.
export function rowsSnapshot(ingredientRows: IngredientRowT[], stepRows: StepRowT[]) {
  return {
    ingredients: ingredientRows.map((r) => (r.isSection ? { isSection: true, title: r.title } : { qty: r.qty, unit: r.unit, name: r.name })),
    steps: stepRows.map((r) => (r.isSection ? { isSection: true, title: r.title } : { text: r.text })),
  };
}

/* --- Valeurs nutritionnelles (texte saisi, converti à l'enregistrement) --- */

export interface NutritionValues {
  calories: string | number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
}

export function nutritionFromRecipe(recipe: Recipe | null | undefined): NutritionValues {
  return {
    calories: recipe?.calories || "",
    protein: recipe?.protein || "",
    carbs: recipe?.carbs || "",
    fat: recipe?.fat || "",
  };
}
