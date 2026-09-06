import { useCallback, useState } from "react";
import { nextId, triggerHaptic } from "../utils/helpers";

/* ------------------------------------------------------------------ */
/*  PLAN DE REPAS — état + actions.                                    */
/*  Persisté dans `app_state.meal_plan` (voir hooks/useOfflineSync.js), */
/*  au même titre que `pantry`/`basics` : une donnée de foyer, simple et */
/*  peu volumineuse, qui n'a pas besoin de sa propre table dédiée ni de   */
/*  sa propre file d'attente hors-ligne — elle profite gratuitement de   */
/*  celle déjà en place pour app_state.                                  */
/*  Une entrée : { id, date: "YYYY-MM-DD", mealType, recipeId,           */
/*  customTitle }. `recipeId` XOR `customTitle` : un repas "personnalisé"  */
/*  (texte libre, ex. "Restes", "McDo" — voir AddMealModal.jsx) n'est       */
/*  rattaché à aucune fiche recette, `recipeId` reste alors null et          */
/*  `customTitle` porte le nom saisi ; l'inverse pour un repas normal.        */
/* ------------------------------------------------------------------ */
export default function useMealPlan({ initialMealPlan = [] }) {
  const [mealPlan, setMealPlan] = useState(() => (Array.isArray(initialMealPlan) ? initialMealPlan : []));

  const addMealPlanEntry = useCallback((date, mealType, recipeId, customTitle = null) => {
    triggerHaptic(15);
    setMealPlan((prev) => [...prev, { id: nextId(), date, mealType, recipeId: recipeId || null, customTitle: customTitle || null }]);
  }, []);

  const removeMealPlanEntry = useCallback((id) => {
    triggerHaptic(20);
    setMealPlan((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    mealPlan,
    setMealPlan,
    addMealPlanEntry,
    removeMealPlanEntry,
  };
}
