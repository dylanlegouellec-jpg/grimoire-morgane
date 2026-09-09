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
/*  customTitle, scope, userId }. `recipeId` XOR `customTitle` : un repas   */
/*  "personnalisé" (texte libre, ex. "Restes", "McDo" — voir                */
/*  AddMealModal.jsx) n'est rattaché à aucune fiche recette, `recipeId`      */
/*  reste alors null et `customTitle` porte le nom saisi ; l'inverse pour     */
/*  un repas normal.                                                          */
/*  `scope` ("household" | "personal") + `userId` : voir PlanningView.jsx,   */
/*  qui filtre l'affichage selon la portée active. Reste stocké dans le       */
/*  MÊME tableau partagé de foyer plutôt qu'une colonne séparée — donc         */
/*  visible de tout le foyer au niveau des données (RLS reste au niveau        */
/*  du foyer, pas de l'utilisateur), même si l'interface ne montre à           */
/*  chacun que SES propres entrées "personal" par défaut. `scope` absent       */
/*  (entrées existantes créées avant ce champ) est traité comme "household"    */
/*  par PlanningView, jamais comme "personal" — rétrocompatible sans            */
/*  migration nécessaire. */
/* ------------------------------------------------------------------ */
export default function useMealPlan({ initialMealPlan = [] }) {
  const [mealPlan, setMealPlan] = useState(() => (Array.isArray(initialMealPlan) ? initialMealPlan : []));

  const addMealPlanEntry = useCallback((date, mealType, recipeId, customTitle = null, scope = "household", userId = null) => {
    triggerHaptic(15);
    setMealPlan((prev) => [
      ...prev,
      {
        id: nextId(),
        date,
        mealType,
        recipeId: recipeId || null,
        customTitle: customTitle || null,
        scope: scope === "personal" ? "personal" : "household",
        userId: scope === "personal" ? userId : null,
      },
    ]);
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
