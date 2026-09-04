import { useCallback, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { nextId, triggerHaptic } from "../utils/helpers";
import { normalizeIngredientList } from "../utils/ingredients";
import { resolveIllustrationKey } from "../components/art";
import { insertRow, updateRow, deleteRow, mapRecipeToRow } from "../utils/supabase";

/* ------------------------------------------------------------------ */
/*  RECETTES — état + actions CRUD                                     */
/*  Écriture optimiste sur l'état local, puis synchronisation Supabase  */
/*  (déjà résiliente : timeout + repli file hors-ligne, voir            */
/*  utils/supabase.js). En cas d'échec définitif (erreur serveur, pas    */
/*  seulement réseau), l'état local est annulé et l'utilisateur prévenu. */
/* ------------------------------------------------------------------ */
export default function useRecipes({ householdId, initialRecipes = [], showToast }) {
  const [recipes, setRecipes] = useState(initialRecipes);

  // Miroir synchrone de `recipes`, lu par les actions ci-dessous : permet
  // de garder des callbacks à référence stable (deps réduites) sans lire
  // un état React potentiellement périmé dans une closure.
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;

  const saveRecipe = useCallback(async (recipe) => {
    const exists = recipesRef.current.some((r) => r.id === recipe.id);
    setRecipes((prev) => (exists ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev]));
    if (!SUPABASE_READY) return;
    try {
      const row = mapRecipeToRow(recipe, householdId);
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

  const importRecipe = useCallback((parsed, successMessage) => {
    const category = parsed.category === "Sucré" ? "Sucré" : "Salé";
    const title = parsed.title;
    saveRecipe({
      id: nextId(),
      title,
      category,
      time: Number(parsed.time) || 30,
      servings: Number(parsed.servings) || 4,
      carbs: parsed.carbs != null && !Number.isNaN(Number(parsed.carbs)) ? Number(parsed.carbs) : null,
      notes: parsed.notes || null,
      illustrationKey: resolveIllustrationKey({ title, category, illustrationKey: parsed.illustrationKey }),
      favorite: false,
      ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length
        ? normalizeIngredientList(
            parsed.ingredients.map((i) =>
              i && i.isSection
                ? { isSection: true, title: String(i.title || "").trim() }
                : { qty: Number(i.qty) || 0, unit: i.unit || "", name: String(i.name || "").trim() }
            )
          )
        : [{ qty: 1, unit: "", name: "Ingrédient à préciser" }],
      steps: Array.isArray(parsed.steps) && parsed.steps.length
        ? parsed.steps
            .map((s) => (s && typeof s === "object" && s.isSection) ? { isSection: true, title: String(s.title || "").trim() } : String(s).trim())
            .filter((s) => (typeof s === "object" ? true : s))
        : ["Étape à préciser"],
    });
    showToast(successMessage);
  }, [saveRecipe, showToast]);

  const deleteRecipe = useCallback(async (id) => {
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

  const toggleFavorite = useCallback(async (id) => {
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

  const handleImportFile = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [data];
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
