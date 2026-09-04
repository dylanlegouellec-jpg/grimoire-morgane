import { useEffect, useState } from "react";
import { DEFAULT_BASICS, SUPABASE_READY, demoRecipes } from "../constants";
import { decodeRecipeCode } from "../utils/helpers";
import {
  fetchTable,
  loadAppState,
  saveAppState,
  mapRowToRecipe,
  mapRowToShoppingList,
  flushOfflineQueue,
  RECIPE_COLUMNS,
  SHOPPING_LIST_COLUMNS,
} from "../utils/supabase";
import { getSupabaseClient } from "../utils/supabaseClient";
import { getOfflineQueueSize } from "../utils/offlineQueue";
import { saveLocalCache } from "../utils/localCache";

/* ------------------------------------------------------------------ */
/*  SYNCHRONISATION — hors-ligne, chargement initial, Realtime          */
/*                                                                      */
/*  Ce hook est le seul point du code qui a besoin de voir toutes les    */
/*  tranches d'état à la fois (recettes, frigo, listes) : c'est          */
/*  précisément son rôle de coordinateur (chargement initial, miroir     */
/*  localStorage, rejeu de la file hors-ligne, Realtime) — à distinguer  */
/*  de useRecipes/usePantry/useShoppingLists, qui eux ne connaissent      */
/*  chacun que leur propre tranche et ses actions CRUD.                  */
/* ------------------------------------------------------------------ */
export default function useOfflineSync({
  authLoading,
  user,
  householdId,
  localCache,
  recipes,
  setRecipes,
  pantry,
  setPantry,
  basics,
  setBasics,
  mealPlan,
  setMealPlan,
  shoppingLists,
  setShoppingLists,
  activeListId,
  setActiveListId,
  showToast,
}) {
  const [ready, setReady] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(() => getOfflineQueueSize());
  const [pendingImport, setPendingImport] = useState(null);

  // Chargement initial : cache local en priorité (offline-first), puis
  // rafraîchissement Supabase en tâche de fond dès que la session/le
  // foyer sont connus.
  useEffect(() => {
    const hasCache = Array.isArray(localCache.recipes) && localCache.recipes.length > 0;
    if (hasCache) setReady(true);

    if (SUPABASE_READY && (authLoading || !user)) {
      if (!hasCache) setReady(true);
      return;
    }

    (async () => {
      if (!SUPABASE_READY) {
        if (!hasCache) {
          setRecipes(demoRecipes());
          setPantry([]);
          setBasics(DEFAULT_BASICS);
          setMealPlan([]);
          setShoppingLists([]);
          setActiveListId(null);
          showToast("Supabase non configuré — mode démo en mémoire.");
        }
        setReady(true);
        return;
      }
      if (!householdId) {
        setReady(true);
        return;
      }
      try {
        const [rows, state, listRows] = await Promise.all([
          fetchTable("recipes", `select=${RECIPE_COLUMNS}&household_id=eq.${householdId}&order=created_at.desc`),
          loadAppState(householdId),
          fetchTable("shopping_lists", `select=${SHOPPING_LIST_COLUMNS}&household_id=eq.${householdId}&order=created_at.asc`),
        ]);
        setRecipes((rows || []).map(mapRowToRecipe));
        setPantry((state && state.pantry) || []);
        setBasics((state && state.basics) || DEFAULT_BASICS);
        setMealPlan((state && state.meal_plan) || []);
        const mappedLists = (listRows || []).map(mapRowToShoppingList);
        setShoppingLists(mappedLists);
        setActiveListId(mappedLists.length ? mappedLists[mappedLists.length - 1].id : null);
      } catch (err) {
        console.error(err);
        if (hasCache) {
          showToast("Hors-ligne — dernières données synchronisées affichées.");
        } else {
          showToast("Connexion Supabase impossible — mode démo en mémoire.");
          setRecipes(demoRecipes());
        }
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, householdId]);

  // Import par lien (?import=...), indépendant de l'authentification.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("import");
      if (code) {
        const parsed = decodeRecipeCode(code);
        if (parsed) setPendingImport(parsed);
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      /* pas d'URL exploitable, tant pis */
    }
  }, []);

  // Miroir local (offline-first) : recopié dans localStorage à chaque
  // changement significatif — relu au prochain lancement, avec ou sans
  // réseau (voir GrimoireDeMorgane.jsx). `householdId` y est inclus
  // spécifiquement pour que useSupabaseAuth puisse retrouver le dernier
  // foyer actif connu au tout prochain démarrage hors-ligne, avant même
  // qu'une session ou une liste de foyers n'ait pu être vérifiée en
  // ligne (voir hooks/useSupabaseAuth.js, getStoredActiveHouseholdId).
  useEffect(() => {
    if (!ready) return;
    saveLocalCache({ recipes, pantry, basics, mealPlan, shoppingLists, activeListId, householdId });
    setOfflineQueueSize(getOfflineQueueSize());
  }, [ready, recipes, pantry, basics, mealPlan, shoppingLists, activeListId, householdId]);

  // Persistance du frigo/basiques/plan de repas dans app_state. Gatée sur
  // `ready` : tant que le chargement initial n'est pas terminé, on ne veut
  // surtout pas réécrire l'état serveur avec les valeurs par défaut du
  // cache local — ce hook est le seul à connaître ce timing. `press_duration`
  // n'est plus concerné : c'est désormais un réglage local à l'appareil,
  // jamais synchronisé (voir utils/localSettings.js). Le plan de repas suit
  // le même principe que pantry/basics : une donnée de foyer simple, sans
  // avoir besoin d'une table dédiée ni de sa propre file hors-ligne.
  useEffect(() => { if (ready && SUPABASE_READY && householdId) saveAppState(householdId, { pantry }); }, [pantry, ready, householdId]);
  useEffect(() => { if (ready && SUPABASE_READY && householdId) saveAppState(householdId, { basics }); }, [basics, ready, householdId]);
  useEffect(() => { if (ready && SUPABASE_READY && householdId) saveAppState(householdId, { meal_plan: mealPlan }); }, [mealPlan, ready, householdId]);

  // Retour du réseau : rejoue la file d'attente hors-ligne, puis
  // rafraîchit depuis Supabase.
  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    const handleOnline = async () => {
      const flushed = await flushOfflineQueue();
      setOfflineQueueSize(getOfflineQueueSize());
      if (flushed > 0) showToast(`${flushed} modification(s) resynchronisée(s) !`);
      if (!householdId) return;
      try {
        const [rows, listRows] = await Promise.all([
          fetchTable("recipes", `select=${RECIPE_COLUMNS}&household_id=eq.${householdId}&order=created_at.desc`),
          fetchTable("shopping_lists", `select=${SHOPPING_LIST_COLUMNS}&household_id=eq.${householdId}&order=created_at.asc`),
        ]);
        setRecipes((rows || []).map(mapRowToRecipe));
        setShoppingLists((listRows || []).map(mapRowToShoppingList));
      } catch (err) {
        console.error("Rafraîchissement après reconnexion impossible :", err);
      }
    };
    const handleOffline = () => showToast("Connexion perdue — les modifications seront synchronisées au retour du réseau.");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  // Supabase Realtime : synchronise en direct les changements faits
  // depuis un autre appareil connecté au même grimoire.
  useEffect(() => {
    if (!ready || !SUPABASE_READY || !householdId) return undefined;
    const client = getSupabaseClient();
    if (!client) return undefined;

    const householdFilter = `household_id=eq.${householdId}`;

    const channel = client
      .channel("grimoire_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes", filter: householdFilter }, (payload) => {
        if (payload.eventType === "DELETE") {
          setRecipes((prev) => prev.filter((r) => r.id !== payload.old.id));
          return;
        }
        const incoming = mapRowToRecipe(payload.new);
        setRecipes((prev) => {
          const exists = prev.some((r) => r.id === incoming.id);
          return exists ? prev.map((r) => (r.id === incoming.id ? incoming : r)) : [incoming, ...prev];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_lists", filter: householdFilter }, (payload) => {
        if (payload.eventType === "DELETE") {
          setShoppingLists((prev) => prev.filter((l) => l.id !== payload.old.id));
          return;
        }
        const incoming = mapRowToShoppingList(payload.new);
        setShoppingLists((prev) => {
          const exists = prev.some((l) => l.id === incoming.id);
          return exists ? prev.map((l) => (l.id === incoming.id ? incoming : l)) : [...prev, incoming];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state", filter: householdFilter }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new;
        if (Array.isArray(row.pantry)) setPantry(row.pantry);
        if (Array.isArray(row.basics)) setBasics(row.basics);
        if (Array.isArray(row.meal_plan)) setMealPlan(row.meal_plan);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, householdId]);

  return { ready, offlineQueueSize, pendingImport, setPendingImport };
}
