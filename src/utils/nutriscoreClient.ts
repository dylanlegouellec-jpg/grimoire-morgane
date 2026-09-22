import { estimateNutriscoreLocal } from "./nutriscore";
import type { NormalizedIngredient } from "./ingredients";

/* ------------------------------------------------------------------ */
/*  NUTRI-SCORE — APPEL SERVEUR (une fois, à la création/édition)      */
/*                                                                      */
/*  Ancien anti-pattern : chaque carte de la grille interrogeait Open   */
/*  Food Facts directement depuis le navigateur pour chacun de ses      */
/*  ingrédients (voir hooks/useNutriscore.js, supprimé) — CORS/429      */
/*  garantis dès que la bibliothèque dépasse quelques recettes.         */
/*                                                                      */
/*  Nouveau flux : cette fonction n'est appelée QUE depuis RecipeForm,  */
/*  au moment où l'utilisateur valide la création/édition d'une         */
/*  recette. Elle relaie la requête vers /api/nutriscore (fonction      */
/*  serverless Vercel, voir api/nutriscore.js), qui interroge Open Food */
/*  Facts elle-même côté serveur — donc jamais de CORS côté client, et  */
/*  jamais qu'UN SEUL calcul par recette plutôt qu'un par affichage.    */
/*  Le résultat est stocké dans recipe.nutriscoreGrade (colonne         */
/*  nutriscore_grade côté Supabase) et ne sera plus jamais recalculé    */
/*  tant que la recette n'est pas modifiée.                             */
/* ------------------------------------------------------------------ */

const ENDPOINT = import.meta.env.VITE_NUTRISCORE_ENDPOINT || "/api/nutriscore";
const TIMEOUT_MS = 6000;

// Reflète scoreToGradeLocal (utils/nutriscore.js) — pas encore un type
// exporté depuis ce fichier, resté en .js pour l'instant, d'où la
// duplication assumée ici (première étape de la migration : le fichier
// source de vérité viendra plus tard sans que ce type ait à bouger).
export type NutriscoreGrade = "A" | "B" | "C" | "D" | "E";

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Ne lève jamais d'exception : toute défaillance (hors-ligne, timeout,
// endpoint indisponible, réponse invalide) retombe silencieusement sur
// l'heuristique locale plutôt que de bloquer l'enregistrement d'une
// recette — le Nutri-Score est une aide visuelle, jamais une condition
// de sauvegarde.
export async function fetchNutriscoreGrade(
  ingredients: NormalizedIngredient[],
  category: string
): Promise<NutriscoreGrade> {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return estimateNutriscoreLocal(ingredients, category);
    }
    const res = await fetchWithTimeout(
      ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, category }),
      },
      TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`nutriscore API ${res.status}`);
    const data = await res.json();
    if (!data || !data.grade) throw new Error("Réponse nutriscore invalide");
    return data.grade;
  } catch (err) {
    console.error("Calcul Nutri-Score en ligne indisponible, repli local :", err);
    return estimateNutriscoreLocal(ingredients, category);
  }
}
