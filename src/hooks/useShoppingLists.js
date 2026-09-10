import { useCallback, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { nextId, guessAisle, ingredientKey, triggerHaptic } from "../utils/helpers";
import { insertRow, updateRow, deleteRow, mapShoppingListToRow } from "../utils/supabase";
import { getStoredShoppingScope, storeShoppingScope, getStoredActiveShoppingListId, storeActiveShoppingListId } from "../utils/localSettings";

/* ------------------------------------------------------------------ */
/*  LISTES DE COURSES — état + actions                                 */
/*  `userId` : propriétaire des listes "personal" (voir `scope` sur      */
/*  chaque liste, colonne Supabase `shopping_lists.scope`/`user_id`).     */
/*  La portée AFFICHÉE (household/personal) reste une préférence locale   */
/*  à l'appareil (voir utils/localSettings.js), mais filtre ici un vrai    */
/*  champ de données, contrairement au plan de repas.                      */
/* ------------------------------------------------------------------ */
export default function useShoppingLists({ householdId, userId, initialLists = [], initialActiveListId = null, showToast }) {
  const [shoppingLists, setShoppingLists] = useState(initialLists);
  const [activeListId, setActiveListId] = useState(initialActiveListId);
  const [shoppingScope, setShoppingScopeState] = useState(() => getStoredShoppingScope());

  const listsRef = useRef(shoppingLists);
  listsRef.current = shoppingLists;
  const activeListIdRef = useRef(activeListId);
  activeListIdRef.current = activeListId;
  const shoppingScopeRef = useRef(shoppingScope);
  shoppingScopeRef.current = shoppingScope;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const isListInScope = useCallback((list, scope) => (
    scope === "personal" ? list.scope === "personal" && list.userId === userIdRef.current : list.scope !== "personal"
  ), []);

  const visibleShoppingLists = shoppingLists.filter((l) => isListInScope(l, shoppingScope));

  // Ouvre une liste ET mémorise, PAR PORTÉE, qu'elle est la dernière
  // consultée sur cet appareil (voir getStoredActiveShoppingListId) — pour
  // qu'un aller-retour household -> personal -> household retombe sur la
  // même liste de chaque côté plutôt que sur la première trouvée.
  const openShoppingList = useCallback((id) => {
    setActiveListId(id);
    storeActiveShoppingListId(shoppingScopeRef.current, id);
  }, []);

  // Change l'onglet affiché et fait immédiatement basculer la liste active
  // sur la dernière liste connue de cette portée (mémoire ci-dessus), sinon
  // la première liste existante de cette portée, sinon aucune (l'utilisateur
  // devra en créer une — voir ShoppingView.jsx, état "aucune liste").
  const setShoppingScope = useCallback((next) => {
    const scope = next === "personal" ? "personal" : "household";
    setShoppingScopeState(scope);
    storeShoppingScope(scope);
    const candidates = listsRef.current.filter((l) => isListInScope(l, scope));
    const remembered = getStoredActiveShoppingListId(scope);
    const nextActive = (remembered && candidates.some((l) => l.id === remembered))
      ? remembered
      : (candidates[0] ? candidates[0].id : null);
    setActiveListId(nextActive);
  }, [isListInScope]);

  const nextListName = useCallback(() => {
    const nums = listsRef.current.map((l) => {
      const m = l.name.match(/^Liste (\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    return `Liste ${max + 1}`;
  }, []);

  // `scope`/`ownerId` optionnels : par défaut, une nouvelle liste prend la
  // portée actuellement affichée (voir shoppingScopeRef) — c'est le cas de
  // la création explicite (bouton "+" du gestionnaire) comme de la création
  // implicite (withActiveList ci-dessous, quand on ajoute un article sans
  // liste active : sinon elle serait TOUJOURS créée en "household", même
  // si l'onglet "personal" est actif).
  const createShoppingList = useCallback(async (scopeArg, ownerIdArg) => {
    const scope = (scopeArg || shoppingScopeRef.current) === "personal" ? "personal" : "household";
    const ownerId = scope === "personal" ? (ownerIdArg || userIdRef.current) : null;
    const id = nextId();
    const name = nextListName();
    const newList = { id, name, items: [], scope, userId: ownerId };
    setShoppingLists((prev) => [...prev, newList]);
    setActiveListId(id);
    storeActiveShoppingListId(scope, id);
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
    visibleShoppingLists,
    activeListId,
    setActiveListId,
    openShoppingList,
    shoppingScope,
    setShoppingScope,
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
