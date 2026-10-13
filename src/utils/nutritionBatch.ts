/* ------------------------------------------------------------------ */
/*  ESTIMATION NUTRITIONNELLE EN LOT — logique pure, sans React           */
/*                                                                        */
/*  Utilisée par l'écran « Estimer la nutrition des recettes » des         */
/*  Réglages (components/common/NutritionBatchModal.tsx). Deux règles       */
/*  qui ne doivent jamais céder :                                           */
/*   - seules les recettes SANS AUCUNE valeur nutritionnelle sont           */
/*     concernées (même définition du « vide » que NutritionSection :       */
/*     calories, protéines, glucides et lipides tous absents ou à 0) —      */
/*     une recette qui a déjà ne serait-ce qu'une valeur n'est JAMAIS        */
/*     modifiée, même si elle en a reçu une pendant le traitement ;          */
/*   - une estimation à la fois, jamais en parallèle (petite pause entre     */
/*     deux appels pour ménager l'API Open Food Facts derrière                */
/*     /api/nutrition-estimate), avec arrêt possible entre deux recettes.     */
/*  Seuls calories/protein/carbs/fat changent : le reste de la recette        */
/*  (dont le Nutri-Score, calculé d'après les ingrédients et non d'après      */
/*  ces macros) reste intact.                                                  */
/* ------------------------------------------------------------------ */

import type { NormalizedIngredient } from "./ingredients";
import type { NutritionEstimate } from "./nutritionClient";

// Forme minimale d'une recette dont ce module a besoin — générique pour
// rendre la recette d'origine COMPLÈTE (tous ses autres champs) à `save`.
export interface NutritionBatchRecipe {
  id: string;
  title: string;
  servings?: number | null;
  ingredients?: NormalizedIngredient[] | null;
  calories?: number | string | null;
  protein?: number | string | null;
  carbs?: number | string | null;
  fat?: number | string | null;
}

export type NutritionBatchStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface NutritionBatchItem {
  id: string;
  title: string;
  status: NutritionBatchStatus;
  estimate?: NutritionEstimate;
}

export interface NutritionBatchSummary {
  estimated: number;
  failed: number;
  skipped: number;
  stopped: boolean;
}

const NUTRITION_KEYS = ["calories", "protein", "carbs", "fat"] as const;

// Une valeur « renseignée » : même règle que NutritionSection (le volet
// s'ouvre si l'une des quatre valeurs est vraie) — null, undefined, "",
// 0 ou une valeur non numérique comptent comme vides.
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0;
}

export function hasNoNutrition(recipe: NutritionBatchRecipe): boolean {
  return NUTRITION_KEYS.every((key) => !isFilled(recipe[key]));
}

export function selectRecipesWithoutNutrition<R extends NutritionBatchRecipe>(recipes: R[]): R[] {
  return recipes.filter(hasNoNutrition);
}

// Au moins un vrai ingrédient nommé (pas seulement des titres de section) :
// sans lui, inutile de solliciter l'API, l'estimation échouerait de toute façon.
export function hasEstimableIngredients(recipe: NutritionBatchRecipe): boolean {
  return (recipe.ingredients || []).some((ing) => !("isSection" in ing && ing.isSection) && "name" in ing && ing.name.trim() !== "");
}

export function initialBatchItems(recipes: NutritionBatchRecipe[]): NutritionBatchItem[] {
  return recipes.map((r) => ({ id: r.id, title: r.title, status: "pending" }));
}

// Signature de saveRecipe (hooks/useRecipes.ts), réutilisée par les Réglages.
export type SaveRecipeFn<R> = (recipe: R) => void | Promise<void>;

export interface RunNutritionBatchOptions<R extends NutritionBatchRecipe> {
  // Même appel que le bouton du formulaire (utils/nutritionClient.ts).
  estimate: (ingredients: NormalizedIngredient[], servings: number) => Promise<NutritionEstimate | null>;
  // Enregistre la recette complète (saveRecipe de hooks/useRecipes.ts).
  save: SaveRecipeFn<R>;
  // Version la plus récente d'une recette au moment d'enregistrer (elle a pu
  // être modifiée ou supprimée pendant le lot) — sinon, la copie de départ.
  getCurrent?: (id: string) => R | undefined;
  onItem?: (index: number, item: NutritionBatchItem) => void;
  shouldStop?: () => boolean;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runNutritionBatch<R extends NutritionBatchRecipe>(
  recipes: R[],
  { estimate, save, getCurrent, onItem, shouldStop = () => false, delayMs = 400, sleep = defaultSleep }: RunNutritionBatchOptions<R>
): Promise<NutritionBatchSummary> {
  const summary: NutritionBatchSummary = { estimated: 0, failed: 0, skipped: 0, stopped: false };
  const report = (index: number, item: NutritionBatchItem) => { if (onItem) onItem(index, item); };

  for (let i = 0; i < recipes.length; i += 1) {
    if (shouldStop()) { summary.stopped = true; break; }
    const recipe = recipes[i];
    const base = { id: recipe.id, title: recipe.title };

    if (!hasEstimableIngredients(recipe)) {
      summary.failed += 1;
      report(i, { ...base, status: "failed" });
      continue;
    }

    report(i, { ...base, status: "running" });
    let result: NutritionEstimate | null;
    try {
      result = await estimate(recipe.ingredients || [], Number(recipe.servings) || 4);
    } catch {
      result = null;
    }

    if (!result) {
      summary.failed += 1;
      report(i, { ...base, status: "failed" });
    } else {
      const current = getCurrent ? getCurrent(recipe.id) : recipe;
      // Supprimée entre-temps, ou a reçu une valeur à la main : on n'y touche pas.
      if (!current || !hasNoNutrition(current)) {
        summary.skipped += 1;
        report(i, { ...base, status: "skipped" });
      } else {
        try {
          await save({ ...current, calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat });
          summary.estimated += 1;
          report(i, { ...base, status: "done", estimate: result });
        } catch {
          summary.failed += 1;
          report(i, { ...base, status: "failed" });
        }
      }
    }

    if (i < recipes.length - 1 && delayMs > 0 && !shouldStop()) await sleep(delayMs);
  }
  return summary;
}
