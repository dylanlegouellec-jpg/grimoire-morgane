import { useCallback, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { nextId } from "../utils/helpers";
import { normalizeIngredientList } from "../utils/ingredients";
import { resolveIllustrationKey } from "../components/art";
import { insertRow, updateRow, deleteRow, mapRecipeToRow } from "../utils/supabase";
import type { NormalizedIngredient } from "../utils/ingredients";
import type { StepEntry } from "../utils/helpers";
import type { ChangeEvent } from "react";

// Recette telle que manipulée par ce hook — pas encore un type Recipe
// partagé plus largement dans le code (même choix que ProfileRow,
// utils/profile.ts, ou RecipeRow, utils/supabase.ts).
export interface Recipe {
  id: string;
  title: string;
  category: string;
  time: number;
  servings: number;
  carbs: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  notes: string | null;
  illustrationKey: string | null;
  favorite: boolean;
  ingredients: NormalizedIngredient[];
  steps: StepEntry[];
  imageUrl?: string | null;
  imageSource?: string | null;
  nutriscoreGrade?: string | null;
}

// Recette telle qu'extraite par un import (fiche texte, lien, fichier) —
// volontairement permissif : selon la source (parseRecipeTemplate,
// extraction IA...), certains champs peuvent être absents, mal typés ou
// non encore validés — d'où les conversions défensives (Number(...) || ...)
// déjà en place ci-dessous, préservées telles quelles.
interface ImportedRecipeInput {
  category?: string;
  title?: string;
  time?: unknown;
  servings?: unknown;
  carbs?: unknown;
  calories?: unknown;
  protein?: unknown;
  fat?: unknown;
  notes?: string | null;
  illustrationKey?: string;
  ingredients?: unknown[];
  steps?: unknown[];
}

interface UseRecipesParams {
  householdId?: string | null;
  initialRecipes?: Recipe[];
  showToast: (msg: string) => void;
}

/* ------------------------------------------------------------------ */
/*  RECETTES — état + actions CRUD                                     */
/*  Écriture optimiste sur l'état local, puis synchronisation Supabase  */
/*  (déjà résiliente : timeout + repli file hors-ligne, voir            */
/*  utils/supabase.js). En cas d'échec définitif (erreur serveur, pas    */
/*  seulement réseau), l'état local est annulé et l'utilisateur prévenu. */
/* ------------------------------------------------------------------ */
export default function useRecipes({ householdId, initialRecipes = [], showToast }: UseRecipesParams) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  // Miroir synchrone de `recipes`, lu par les actions ci-dessous : permet
  // de garder des callbacks à référence stable (deps réduites) sans lire
  // un état React potentiellement périmé dans une closure.
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const exists = recipesRef.current.some((r) => r.id === recipe.id);
    setRecipes((prev) => (exists ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev]));
    if (!SUPABASE_READY) return;
    try {
      const row = mapRecipeToRow(recipe as unknown as Record<string, unknown>, householdId);
      if (exists) {
        await updateRow("recipes", recipe.id, row);
      } else {
        await insertRow("recipes", row);
      }
    } catch (err) {
      console.error(err);
      showToast("Échec de la sauvegarde en base Supabase.");
    }
  }, [householdId, showToast]);

  const importRecipe = useCallback((parsed: ImportedRecipeInput, successMessage: string) => {
    const category = parsed.category === "Sucré" ? "Sucré" : "Salé";
    const title = parsed.title || "";
    saveRecipe({
      id: nextId(),
      title,
      category,
      time: Number(parsed.time) || 30,
      servings: Number(parsed.servings) || 4,
      carbs: parsed.carbs != null && !Number.isNaN(Number(parsed.carbs)) ? Number(parsed.carbs) : null,
      calories: parsed.calories != null && !Number.isNaN(Number(parsed.calories)) ? Number(parsed.calories) : null,
      protein: parsed.protein != null && !Number.isNaN(Number(parsed.protein)) ? Number(parsed.protein) : null,
      fat: parsed.fat != null && !Number.isNaN(Number(parsed.fat)) ? Number(parsed.fat) : null,
      notes: parsed.notes || null,
      illustrationKey: resolveIllustrationKey({ title, category, illustrationKey: parsed.illustrationKey }),
      favorite: false,
      ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length
        ? normalizeIngredientList(
            parsed.ingredients.map((raw) => {
              const i = raw as Record<string, unknown> | null;
              return i && i.isSection
                ? { isSection: true, title: String(i.title || "").trim() }
                : { qty: Number(i && i.qty) || 0, unit: (i && i.unit) || "", name: String((i && i.name) || "").trim() };
            })
          )
        : [{ qty: 1, unit: "", name: "Ingrédient à préciser" }],
      steps: Array.isArray(parsed.steps) && parsed.steps.length
        ? (parsed.steps
            .map((raw) => {
              const s = raw as Record<string, unknown> | null;
              return s && typeof s === "object" && s.isSection
                ? { isSection: true as const, title: String(s.title || "").trim() }
                : String(s).trim();
            })
            .filter((s) => (typeof s === "object" ? true : s)) as StepEntry[])
        : ["Étape à préciser"],
    });
    showToast(successMessage);
  }, [saveRecipe, showToast]);

  const deleteRecipe = useCallback(async (id: string) => {
    const previous = recipesRef.current;
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (!SUPABASE_READY) return;
    try {
      await deleteRow("recipes", id);
    } catch (err) {
      console.error(err);
      setRecipes(previous);
      showToast("Suppression impossible en base Supabase.");
    }
  }, [showToast]);

  const toggleFavorite = useCallback(async (id: string) => {
    const target = recipesRef.current.find((r) => r.id === id);
    if (!target) return;
    const nextFav = !target.favorite;
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: nextFav } : r)));
    if (!SUPABASE_READY) return;
    try {
      await updateRow("recipes", id, { is_favorite: nextFav });
    } catch (err) {
      console.error(err);
      setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !nextFav } : r)));
      showToast("Échec de la mise à jour du favori.");
    }
  }, [showToast]);

  const exportGrimoire = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(recipesRef.current, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grimoire-de-morgane.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Grimoire exporté !");
    } catch {
      showToast("Export impossible sur cet appareil.");
    }
  }, [showToast]);

  const handleImportFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data: any = JSON.parse(reader.result as string);
        const list: any[] = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [data];
        const imported = list.filter((r) => r && r.title).map((r) => ({ ...r, id: nextId(), favorite: false, ingredients: normalizeIngredientList(r.ingredients) }));
        setRecipes((prev) => [...imported, ...prev]);
        if (SUPABASE_READY) {
          for (const r of imported) {
            try { await insertRow("recipes", mapRecipeToRow(r, householdId)); } catch { /* on continue les autres */ }
          }
        }
        showToast(`${imported.length} recette(s) importée(s) !`);
      } catch {
        showToast("Fichier de grimoire illisible.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [householdId, showToast]);

  return {
    recipes,
    setRecipes,
    saveRecipe,
    importRecipe,
    deleteRecipe,
    toggleFavorite,
    exportGrimoire,
    handleImportFile,
  };
}
