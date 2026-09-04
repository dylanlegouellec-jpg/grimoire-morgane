import { useCallback, useState } from "react";
import { DEFAULT_BASICS } from "../constants";
import { ingredientKey, triggerHaptic } from "../utils/helpers";

/* ------------------------------------------------------------------ */
/*  FRIGO — pantry (ingrédients variables), basiques, durée d'appui     */
/*  État + actions uniquement. La persistance vers app_state (Supabase)  */
/*  est centralisée dans hooks/useOfflineSync.js, qui est le seul point  */
/*  du code à savoir quand l'app est "ready" pour écrire sans écraser    */
/*  un état serveur pas encore chargé — voir ce fichier pour le détail.  */
/* ------------------------------------------------------------------ */
export default function usePantry({ initialPantry, initialBasics, showToast, addManualItemToShoppingList }) {
  const [pantry, setPantry] = useState(() => (Array.isArray(initialPantry) ? initialPantry : []));
  const [basics, setBasics] = useState(() => (Array.isArray(initialBasics) ? initialBasics : DEFAULT_BASICS));

  const moveBasicToVariable = useCallback((name) => {
    const key = ingredientKey(name);
    setBasics((prev) => prev.filter((b) => b !== name));
    setPantry((prev) => (prev.includes(key) ? prev : [...prev, key]));
    showToast(`${name} déplacé vers les ingrédients variables.`);
    triggerHaptic(15);
  }, [showToast]);

  const removeBasic = useCallback(async (name) => {
    setBasics((prev) => prev.filter((b) => b !== name));
    if (addManualItemToShoppingList) await addManualItemToShoppingList(name);
    showToast(`${name} retiré des basiques et ajouté à la liste de courses.`);
    triggerHaptic(20);
  }, [showToast, addManualItemToShoppingList]);

  const resetPantry = useCallback(() => {
    setPantry([]);
    showToast("Frigo réinitialisé !");
    triggerHaptic([60, 30, 60]);
  }, [showToast]);

  return {
    pantry,
    setPantry,
    basics,
    setBasics,
    moveBasicToVariable,
    removeBasic,
    resetPantry,
  };
}
