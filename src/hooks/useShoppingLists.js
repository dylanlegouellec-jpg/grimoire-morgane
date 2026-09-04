import { useCallback, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { nextId, guessAisle, ingredientKey, triggerHaptic } from "../utils/helpers";
import { insertRow, updateRow, deleteRow, mapShoppingListToRow } from "../utils/supabase";

/* ------------------------------------------------------------------ */
/*  LISTES DE COURSES — état + actions                                 */
/* ------------------------------------------------------------------ */
export default function useShoppingLists({ householdId, initialLists = [], initialActiveListId = null, showToast }) {
  const [shoppingLists, setShoppingLists] = useState(initialLists);
  const [activeListId, setActiveListId] = useState(initialActiveListId);

  const listsRef = useRef(shoppingLists);
  listsRef.current = shoppingLists;
  const activeListIdRef = useRef(activeListId);
  activeListIdRef.current = activeListId;

  const nextListName = useCallback(() => {
    const nums = listsRef.current.map((l) => {
      const m = l.name.match(/^Liste (\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    return `Liste ${max + 1}`;
  }, []);

  const createShoppingList = useCallback(async () => {
    const id = nextId();
    const name = nextListName();
    const newList = { id, name, items: [] };
    setShoppingLists((prev) => [...prev, newList]);
    setActiveListId(id);
    triggerHaptic(15);
    if (SUPABASE_READY) {
      try {
        await insertRow("shopping_lists", mapShoppingListToRow(newList, householdId));
      } catch (err) {
        console.error(err);
        showToast("Échec de la création de la liste.");
      }
    }
    return id;
  }, [householdId, nextListName, showToast]);

  const renameShoppingList = useCallback(async (id, name) => {
    setShoppingLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    if (SUPABASE_READY) {
      try {
        await updateRow("shopping_lists", id, { name });
      } catch (err) {
        console.error(err);
        showToast("Échec du renommage.");
      }
    }
  }, [showToast]);

  const deleteShoppingList = useCallback(async (id) => {
    setShoppingLists((prev) => prev.filter((l) => l.id !== id));
    setActiveListId((cur) => (cur === id ? null : cur));
    triggerHaptic(30);
    if (SUPABASE_READY) {
      try {
        await deleteRow("shopping_lists", id);
      } catch (err) {
        console.error(err);
        showToast("Échec de la suppression.");
      }
    }
  }, [showToast]);

  // Applique une mutation à la liste active, en la créant d'abord si
  // besoin — c'est le point de passage commun de toutes les actions
  // ci-dessous, ce qui garantit qu'aucune ne peut désynchroniser l'état
  // local de ce qui part vers Supabase.
  const withActiveList = useCallback(async (mutateFn) => {
    let listId = activeListIdRef.current;
    if (!listId) listId = await createShoppingList();
    setShoppingLists((prev) => {
      const next = prev.map((l) => (l.id === listId ? { ...l, items: mutateFn(l.items) } : l));
      const target = next.find((l) => l.id === listId);
      if (target && SUPABASE_READY) {
        updateRow("shopping_lists", listId, { items: target.items }).catch((err) => console.error(err));
      }
      return next;
    });
  }, [createShoppingList]);

  const addManualItem = useCallback((name) => {
    return withActiveList((items) => [{ id: nextId(), name, qty: 1, unit: "", checked: false, aisle: guessAisle(name) }, ...items]);
  }, [withActiveList]);

  const toggleShoppingItem = useCallback((id) => {
    triggerHaptic(12);
    withActiveList((items) => items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  }, [withActiveList]);

  // Suppression d'un seul article — geste de swipe gauche sur une ligne
  // (voir ShoppingItemRow.jsx), à distinguer de resetActiveList (vide
  // toute la liste).
  const deleteShoppingItem = useCallback((id) => {
    triggerHaptic(20);
    withActiveList((items) => items.filter((it) => it.id !== id));
  }, [withActiveList]);

  const adjustShoppingQty = useCallback((id, delta) => {
    triggerHaptic(10);
    withActiveList((items) => items.map((it) => (it.id === id ? { ...it, qty: Math.max(0, Math.round((it.qty + delta) * 100) / 100) } : it)));
  }, [withActiveList]);

  // `unit` optionnel : la molette de portions (une seule valeur) ne le
  // passe jamais, la nouvelle feuille de quantité des courses (voir
  // QuantitySheet.jsx) le passe toujours, puisqu'elle laisse aussi choisir
  // l'unité.
  const setShoppingItemQty = useCallback((id, value, unit) => {
    withActiveList((items) => items.map((it) => (
      it.id === id ? { ...it, qty: Math.max(0, value), ...(unit !== undefined ? { unit } : {}) } : it
    )));
  }, [withActiveList]);

  // Fusion "intelligente" : on regroupe par nom normalisé (accents/casse/
  // pluriel ignorés — voir ingredientKey) + unité, pas par simple texte
  // brut en minuscules. "Tomate" (déjà dans la liste) et "tomates" (dans
  // une nouvelle recette) sont ainsi reconnus comme le même article et
  // additionnés, plutôt que de créer une deuxième ligne en double.
  //
  // `recipeIds` peut contenir des doublons (ex. la Planification envoie
  // le même id plusieurs fois si une recette est planifiée deux fois dans
  // la semaine) — on résout donc chaque id un par un plutôt que de passer
  // par recipes.filter(), qui ne garderait chaque recette qu'une seule
  // fois quel que soit le nombre de répétitions dans recipeIds.
  const generateShoppingList = useCallback((recipes, recipeIds) => {
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    withActiveList((items) => {
      const map = new Map(items.map((it) => [`${ingredientKey(it.name)}__${it.unit}`, { ...it }]));
      recipeIds.forEach((id) => {
        const r = recipeById.get(id);
        if (!r) return;
        r.ingredients.forEach((ing) => {
          if (ing.isSection) return;
          const key = `${ingredientKey(ing.name)}__${ing.unit}`;
          if (map.has(key)) {
            map.get(key).qty += Number(ing.qty) || 0;
          } else {
            map.set(key, { id: nextId(), name: ing.name, unit: ing.unit, qty: Number(ing.qty) || 0, checked: false, aisle: guessAisle(ing.name) });
          }
        });
      });
      return Array.from(map.values());
    });
    showToast("Liste de courses générée !");
    triggerHaptic(15);
  }, [withActiveList, showToast]);

  const resetActiveList = useCallback(() => {
    if (!activeListIdRef.current) return;
    withActiveList(() => []);
    showToast("Liste réinitialisée !");
    triggerHaptic([60, 30, 60]);
  }, [withActiveList, showToast]);

  return {
    shoppingLists,
    setShoppingLists,
    activeListId,
    setActiveListId,
    createShoppingList,
    renameShoppingList,
    deleteShoppingList,
    addManualItem,
    toggleShoppingItem,
    deleteShoppingItem,
    adjustShoppingQty,
    setShoppingItemQty,
    generateShoppingList,
    resetActiveList,
  };
}
