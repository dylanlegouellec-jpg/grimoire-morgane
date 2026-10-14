import type { Recipe } from "../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  DONNÉES D'UNE PAGE DE FICHE RECETTE (portions, ingrédients)         */
/*  Partagées par RecipePage.tsx (affichage) et RecipeDetail.tsx         */
/*  (partage de la recette aux portions choisies).                        */
/* ------------------------------------------------------------------ */

// Formes d'ingrédient/étape gérées défensivement ci-dessous, en plus de
// NormalizedIngredient/StepEntry "propres" (déjà normalisés à l'écriture,
// voir utils/ingredients.ts) — jamais supprimées ici pour ne pas changer le
// comportement existant face à d'éventuelles données plus anciennes/moins
// strictes (ex. `amount` au lieu de `qty`, une étape `{ text }` plutôt
// qu'une simple chaîne).
interface LooseIngredient {
  isSection?: boolean;
  title?: string;
  qty?: number | string | null;
  amount?: number | string | null;
  unit?: string;
  name?: string;
}
export type FlexibleIngredient = string | LooseIngredient;

export interface LooseStep {
  text?: string;
  title?: string;
}
export type FlexibleStep = string | LooseStep;

/** Ingrédients de la recette, toujours sous forme de tableau. */
export function rawIngredientsOf(recipe: Recipe): FlexibleIngredient[] {
  return Array.isArray(recipe.ingredients) ? (recipe.ingredients as unknown as FlexibleIngredient[]) : [];
}

/** Quantités recalculées pour `ratio` (portions voulues / portions de la recette). */
export function scaleIngredients(raw: FlexibleIngredient[], ratio: number): FlexibleIngredient[] {
  return raw.map((ing) => {
    if (typeof ing === "string") return ing;
    if (ing?.isSection) return ing;
    const qty = Number(ing?.qty || ing?.amount) || 0;
    return { ...ing, qty: qty ? Math.round(qty * ratio * 100) / 100 : "" };
  });
}

/** Portions de base de la recette (1 si absentes ou invalides). */
export function baseServingsOf(recipe: Recipe | null | undefined): number {
  return Number(recipe?.servings) || 1;
}
