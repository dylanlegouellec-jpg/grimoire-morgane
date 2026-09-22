import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BASICS, SUPABASE_READY, demoRecipes } from "../constants";
import { decodeRecipeCode, isShoppingListInScope } from "../utils/helpers";
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
import { prefetchRecipeImages } from "../utils/imageCache";
import type { Dispatch, SetStateAction } from "react";
import type { LocalCacheData } from "../utils/localCache";
import type { ConnectionStatus } from "./useConnectionStatus";
import type { Recipe } from "./useRecipes";
import type { ShoppingList } from "./useShoppingLists";
import type { MealPlanEntry } from "./useMealPlan";

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
// `lastSyncedXRef.current` est stocké déjà sérialisé (comparaison JSON
// bon marché à chaque rendu, voir les effets de sauvegarde plus bas) —
// reparsé seulement ici, au moment de construire une baseline de conflit,
// jamais dans le chemin chaud. `undefined` avant le tout premier
// chargement (voir l'effet de chargement initial) : pas de baseline dans
// ce cas, `saveAppState` traite alors cette écriture comme avant ce
// correctif (aucune détection de conflit possible sans valeur de départ).
function parseBaseline(serialized: string | undefined): unknown {
  if (serialized == null) return undefined;
  try {
    return JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

interface UseOfflineSyncParams {
  authLoading: boolean;
  user: { id: string } | null;
  householdId: string | null;
  localCache: LocalCacheData;
  connectionStatus: ConnectionStatus;
  recipes: Recipe[];
  setRecipes: Dispatch<SetStateAction<Recipe[]>>;
  pantry: string[];
  setPantry: Dispatch<SetStateAction<string[]>>;
  basics: string[];
  setBasics: Dispatch<SetStateAction<string[]>>;
  mealPlan: MealPlanEntry[];
  setMealPlan: Dispatch<SetStateAction<MealPlanEntry[]>>;
  shoppingLists: ShoppingList[];
  setShoppingLists: Dispatch<SetStateAction<ShoppingList[]>>;
  activeListId: string | null;
  setActiveListId: Dispatch<SetStateAction<string | null>>;
  shoppingScope: string;
  showToast: (msg: string) => void;
}

export default function useOfflineSync({
  authLoading,
  user,
  householdId,
  localCache,
  connectionStatus,
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
  shoppingScope,
  showToast,
}: UseOfflineSyncParams) {
  const [ready, setReady] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(() => getOfflineQueueSize());
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  // uuid du foyer à rejoindre (lien/QR d'invitation, ?join_household=...) —
  // en attente de confirmation utilisateur, voir l'effet ci-dessous et
  // JoinHouseholdConfirmModal.jsx.
  const [pendingHouseholdJoin, setPendingHouseholdJoin] = useState<string | null>(null);

  // Boucle d'écho app_state ↔ Realtime (voir les 2 useEffect plus bas +
  // le canal Realtime) : une sauvegarde locale de `pantry`/`basics`/
  // `mealPlan` déclenche un PATCH, qui déclenche un événement Realtime
  // "postgres_changes" sur app_state POUR CE MÊME client (Realtime ne
  // distingue pas "changé par moi" de "changé par un autre appareil"),
  // qui appelle setPantry/... avec une NOUVELLE référence de tableau
  // (JSON fraîchement désérialisé) même quand le contenu est strictement
  // identique — React voit alors `pantry` "changer" et le useEffect de
  // sauvegarde repart, qui redéclenche l'écho Realtime, indéfiniment.
  // Ces refs retiennent le dernier contenu (sérialisé) connu du serveur,
  // mis à jour à la fois après une sauvegarde locale ET après réception
  // Realtime, pour que l'effet de sauvegarde puisse distinguer une VRAIE
  // modification locale d'un simple écho et ignorer ce dernier.
  const lastSyncedPantryRef = useRef<string | undefined>(undefined);
  const lastSyncedBasicsRef = useRef<string | undefined>(undefined);
  const lastSyncedMealPlanRef = useRef<string | undefined>(undefined);

  // Bug réel corrigé ici (pas juste théorique — "je coche un ingrédient du
  // frigo et parfois ça le décoche tout seul, je dois recliquer") : entre
  // le moment où une modification locale est PROGRAMMÉE (debounce
  // SAVE_DEBOUNCE_MS) et celui où son PATCH a effectivement abouti,
  // `lastSyncedXRef` pointe encore vers l'ANCIENNE valeur serveur. Si un
  // événement Realtime arrive dans cette fenêtre (l'écho du PATCH d'UNE
  // modification précédente, encore en vol, pas forcément celle-ci) AVANT
  // que le PATCH de la modification la plus récente ne soit parti, le
  // handler Realtime écrasait `pantry`/`basics`/`mealPlan` avec cette
  // valeur PÉRIMÉE — et mettait à jour `lastSyncedXRef` en conséquence, ce
  // qui faisait ensuite croire à l'effet de sauvegarde que la modification
  // qu'il s'apprêtait à envoyer était "déjà synchronisée" (comparaison
  // sérialisée égale) : il l'annulait silencieusement sans jamais l'écrire
  // en base. Deux coches rapprochées sur des ingrédients différents (le cas
  // d'usage normal de cet écran) suffisaient à déclencher la course. Ces
  // refs retiennent qu'une modification locale est en attente d'envoi (du
  // clic jusqu'à la résolution du PATCH) : tant que c'est le cas, le
  // handler Realtime ignore ce qu'il reçoit pour CETTE tranche plutôt que
  // d'écraser une valeur locale plus récente que celle du serveur — au pire
  // une modification concurrente d'un autre appareil est retardée jusqu'à
  // la prochaine sauvegarde locale, jamais silencieusement perdue.
  const pantryDirtyRef = useRef(false);
  const basicsDirtyRef = useRef(false);
  const mealPlanDirtyRef = useRef(false);

  // Second filet de sécurité (indépendant du mécanisme d'écho ci-dessus) :
  // un vrai debounce sur l'envoi réseau lui-même. Quelle qu'en soit la
  // cause exacte, aucun PATCH vers app_state ne peut plus partir moins de
  // SAVE_DEBOUNCE_MS après le précédent pour une même tranche d'état — une
  // rafale de changements (légitime ou non) se résout en UN seul envoi,
  // celui de la toute dernière valeur, une fois la rafale terminée.
  const SAVE_DEBOUNCE_MS = 400;
  const pantrySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const basicsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mealPlanSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cadence du filet de sécurité périodique de rejeu de la file hors-ligne
  // (voir l'effet plus bas) — alignée sur PING_INTERVAL_MS de
  // useConnectionStatus.js : inutile de retenter plus souvent que la
  // fréquence à laquelle ce hook lui-même revérifie Supabase.
  const PENDING_QUEUE_RETRY_MS = 30000;

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
          setRecipes(demoRecipes() as unknown as Recipe[]);
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
        const loadedPantry = (state && state.pantry) || [];
        const loadedBasics = (state && state.basics) || DEFAULT_BASICS;
        const loadedMealPlan = (state && state.meal_plan) || [];
        setPantry(loadedPantry);
        setBasics(loadedBasics);
        setMealPlan(loadedMealPlan);
        // Ce qu'on vient de charger EST déjà l'état du serveur — inutile
        // que l'effet de sauvegarde le renvoie une première fois pour
        // rien dès que `ready` passe à true juste en dessous.
        lastSyncedPantryRef.current = JSON.stringify(loadedPantry);
        lastSyncedBasicsRef.current = JSON.stringify(loadedBasics);
        lastSyncedMealPlanRef.current = JSON.stringify(loadedMealPlan);
        const mappedLists = (listRows || []).map(mapRowToShoppingList) as ShoppingList[];
        setShoppingLists(mappedLists);
        // Filtrée par la portée AFFICHÉE (préférence locale à l'appareil,
        // voir useShoppingLists.js) avant de choisir la dernière créée —
        // sans ça, la dernière liste créée tous scopes confondus pouvait
        // être personnelle alors que l'onglet "Foyer" restait sélectionné,
        // affichant son contenu sous le mauvais bouton de portée au tout
        // premier chargement.
        const listsInScope = mappedLists.filter((l) => isShoppingListInScope(l, shoppingScope, user && user.id));
        setActiveListId(listsInScope.length ? listsInScope[listsInScope.length - 1].id : null);
      } catch (err) {
        console.error(err);
        if (hasCache) {
          showToast("Hors-ligne — dernières données synchronisées affichées.");
        } else {
          showToast("Connexion Supabase impossible — mode démo en mémoire.");
          setRecipes(demoRecipes() as unknown as Recipe[]);
        }
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, householdId]);

  // Import par lien (?import=...) et invitation de foyer
  // (?join_household=...), tous deux indépendants de l'authentification —
  // la demande d'adhésion réelle (voir requestJoinHousehold côté
  // useSupabaseAuth) attend elle une session active, mais on capture
  // l'intention dès l'arrivée sur l'URL, avant même que la connexion ne
  // soit résolue.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("import");
      const joinHouseholdId = params.get("join_household");
      if (code) {
        const parsed = decodeRecipeCode(code);
        if (parsed) setPendingImport(parsed);
      }
      if (joinHouseholdId) {
        setPendingHouseholdJoin(joinHouseholdId);
      }
      if (code || joinHouseholdId) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      /* pas d'URL exploitable, tant pis */
    }
  }, []);

  // Précharge les photos de recettes dans le cache du service worker (voir
  // utils/imageCache.js) dès que la liste de recettes est connue — sans
  // attendre qu'une carte particulière soit scrollée à l'écran (voir
  // DishArt.jsx, `loading="lazy"`). Sans ça, une recette jamais affichée
  // pendant qu'on était en ligne perdait sa photo dès le premier passage
  // hors-ligne, alors que l'image existait bel et bien côté serveur.
  useEffect(() => {
    if (!ready || !SUPABASE_READY) return;
    prefetchRecipeImages(recipes);
  }, [ready, recipes]);

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
  useEffect(() => {
    if (!ready || !SUPABASE_READY || !householdId) return undefined;
    const serialized = JSON.stringify(pantry);
    if (serialized === lastSyncedPantryRef.current) return undefined; // écho Realtime d'une sauvegarde qu'on vient de faire, pas une vraie modification
    pantryDirtyRef.current = true; // voir pantryDirtyRef plus haut : bloque le handler Realtime tant que ceci n'est pas retombé à false
    if (pantrySaveTimerRef.current) clearTimeout(pantrySaveTimerRef.current);
    pantrySaveTimerRef.current = setTimeout(() => {
      // La ref n'est mise à jour qu'APRÈS coup (succès direct OU mise en
      // file hors-ligne réussie — saveAppState ne résout normalement que
      // dans ces deux cas) : la marquer avant, comme c'était le cas
      // auparavant, faisait croire cette sauvegarde "faite" même quand
      // elle avait échoué en silence, et aucun mécanisme ne la reprenait
      // jamais ensuite (voir utils/supabase.js, saveAppState).
      // `lastSyncedPantryRef.current` n'est pas encore mis à jour à cet
      // instant (voir le commentaire juste au-dessus) : il porte encore la
      // dernière valeur que CE client croit être sur le serveur, exactement
      // la baseline qu'il faut pour détecter un conflit si cette écriture
      // finit mise en file hors-ligne (voir findAppStateConflicts,
      // utils/supabase.js).
      saveAppState(householdId, { pantry }, { pantry: parseBaseline(lastSyncedPantryRef.current) })
        .then(() => { lastSyncedPantryRef.current = serialized; pantryDirtyRef.current = false; })
        .catch((err) => {
          console.error("Échec de sauvegarde du frigo :", err);
          showToast("Impossible d'enregistrer le frigo — réessaie plus tard.");
          // pantryDirtyRef reste à true : cette modification locale n'a
          // jamais été confirmée en base, un écho Realtime ne doit donc
          // toujours pas pouvoir l'écraser (voir le commentaire plus haut).
        });
    }, SAVE_DEBOUNCE_MS);
    return () => { if (pantrySaveTimerRef.current) clearTimeout(pantrySaveTimerRef.current); };
  }, [pantry, ready, householdId, showToast]);
  useEffect(() => {
    if (!ready || !SUPABASE_READY || !householdId) return undefined;
    const serialized = JSON.stringify(basics);
    if (serialized === lastSyncedBasicsRef.current) return undefined;
    basicsDirtyRef.current = true;
    if (basicsSaveTimerRef.current) clearTimeout(basicsSaveTimerRef.current);
    basicsSaveTimerRef.current = setTimeout(() => {
      saveAppState(householdId, { basics }, { basics: parseBaseline(lastSyncedBasicsRef.current) })
        .then(() => { lastSyncedBasicsRef.current = serialized; basicsDirtyRef.current = false; })
        .catch((err) => {
          console.error("Échec de sauvegarde des basiques :", err);
          showToast("Impossible d'enregistrer les basiques — réessaie plus tard.");
        });
    }, SAVE_DEBOUNCE_MS);
    return () => { if (basicsSaveTimerRef.current) clearTimeout(basicsSaveTimerRef.current); };
  }, [basics, ready, householdId, showToast]);
  useEffect(() => {
    if (!ready || !SUPABASE_READY || !householdId) return undefined;
    const serialized = JSON.stringify(mealPlan);
    if (serialized === lastSyncedMealPlanRef.current) return undefined;
    mealPlanDirtyRef.current = true;
    if (mealPlanSaveTimerRef.current) clearTimeout(mealPlanSaveTimerRef.current);
    mealPlanSaveTimerRef.current = setTimeout(() => {
      saveAppState(householdId, { meal_plan: mealPlan }, { meal_plan: parseBaseline(lastSyncedMealPlanRef.current) })
        .then(() => { lastSyncedMealPlanRef.current = serialized; mealPlanDirtyRef.current = false; })
        .catch((err) => {
          console.error("Échec de sauvegarde du plan de repas :", err);
          showToast("Impossible d'enregistrer le plan de repas — réessaie plus tard.");
        });
    }, SAVE_DEBOUNCE_MS);
    return () => { if (mealPlanSaveTimerRef.current) clearTimeout(mealPlanSaveTimerRef.current); };
  }, [mealPlan, ready, householdId, showToast]);

  // Rejoue la file d'attente hors-ligne, puis rafraîchit depuis Supabase —
  // no-op immédiat si la file est déjà vide (appelé aussi bien à chaque
  // reconnexion détectée qu'en filet de sécurité périodique ci-dessous,
  // la plupart de ces appels ne trouvent donc rien à faire).
  const attemptFlush = useCallback(async () => {
    if (getOfflineQueueSize() === 0) return;
    const { flushed, dropped, conflicts } = await flushOfflineQueue();
    // Fait immédiatement disparaître le bandeau "N modification(s) en
    // attente" (voir AppShell.jsx) dès que la file est vide — jamais
    // laissé en l'état tant qu'un signal de reconnexion fiable est arrivé
    // jusqu'ici, que la tentative ait réussi, échoué, ou abandonné
    // certaines actions (voir dropped ci-dessous et MAX_ACTION_RETRIES
    // dans utils/supabase.js : une action qui échoue sans cesse ne peut
    // plus bloquer indéfiniment tout le reste derrière elle).
    setOfflineQueueSize(getOfflineQueueSize());
    // Un vrai conflit (voir findAppStateConflicts, utils/supabase.js) :
    // un autre appareil a modifié le MÊME champ pendant que celui-ci était
    // hors-ligne. La version locale vient d'être abandonnée plutôt que
    // d'écraser la sienne — l'écran affiche donc encore, à cet instant,
    // une valeur qui ne correspond plus à ce qui est réellement en base.
    // Rafraîchir immédiatement depuis le serveur évite de laisser
    // l'utilisateur continuer à agir sur une donnée fantôme.
    if (conflicts && conflicts.length && householdId) {
      try {
        const state = await loadAppState(householdId);
        if (state) {
          if (Array.isArray(state.pantry)) { setPantry(state.pantry); lastSyncedPantryRef.current = JSON.stringify(state.pantry); }
          if (state.basics) { setBasics(state.basics); lastSyncedBasicsRef.current = JSON.stringify(state.basics); }
          if (Array.isArray(state.meal_plan)) { setMealPlan(state.meal_plan); lastSyncedMealPlanRef.current = JSON.stringify(state.meal_plan); }
        }
      } catch (err) {
        console.error("Rafraîchissement après conflit impossible :", err);
      }
    }
    // Un seul appel à showToast : useToast.js n'affiche qu'un message à la
    // fois (pas de file d'attente) — appeler showToast deux fois de suite
    // ici aurait fait disparaître le premier message avant même qu'il ait
    // pu s'afficher, jamais vu par l'utilisateur.
    if (flushed > 0 || dropped > 0 || (conflicts && conflicts.length)) {
      const parts: string[] = [];
      if (flushed > 0) parts.push(`${flushed} modification(s) resynchronisée(s)`);
      if (dropped > 0) {
        parts.push(
          dropped > 1
            ? `${dropped} abandonnées après plusieurs échecs`
            : "1 abandonnée après plusieurs échecs"
        );
      }
      if (conflicts && conflicts.length) {
        const labels: Record<string, string> = { pantry: "le frigo", basics: "les basiques", meal_plan: "le plan de repas" };
        const fields = [...new Set(conflicts.flatMap((c) => c.keys))].map((k) => labels[k] || k);
        parts.push(`ta modification hors-ligne de ${fields.join(" et ")} n'a pas pu être conservée (modifié ailleurs entre-temps)`);
      }
      showToast(`${parts.join(", ")}.`);
    }
    if (!householdId) return;
    try {
      const [rows, listRows] = await Promise.all([
        fetchTable("recipes", `select=${RECIPE_COLUMNS}&household_id=eq.${householdId}&order=created_at.desc`),
        fetchTable("shopping_lists", `select=${SHOPPING_LIST_COLUMNS}&household_id=eq.${householdId}&order=created_at.asc`),
      ]);
      setRecipes((rows || []).map(mapRowToRecipe) as Recipe[]);
      setShoppingLists((listRows || []).map(mapRowToShoppingList) as ShoppingList[]);
    } catch (err) {
      console.error("Rafraîchissement après reconnexion impossible :", err);
    }
  }, [householdId, showToast, setRecipes, setShoppingLists, setPantry, setBasics, setMealPlan]);

  // Réaction à un changement de statut de connexion RÉEL (voir
  // `connectionStatus`, hooks/useConnectionStatus.js — un vrai ping
  // Supabase à intervalle régulier, pas seulement l'événement natif
  // "online"/navigator.onLine du navigateur). Remplace l'ancienne version
  // de cet effet, qui n'écoutait QUE cet événement natif : il ne se
  // déclenche qu'au moment précis d'une bascule matérielle détectée par le
  // NAVIGATEUR, jamais si l'appareil se croyait déjà "en ligne" pendant que
  // Supabase restait injoignable pour une tout autre raison (panne
  // ponctuelle, faux positif navigator.onLine notoire sur Android — voir le
  // commentaire de fichier de useConnectionStatus.js) — dans ce cas précis,
  // la file restait bloquée et le bandeau "N modification(s) en attente"
  // ne disparaissait jamais, même une fois Supabase réellement de nouveau
  // joignable.
  const prevConnectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    const prevStatus = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;
    if (!SUPABASE_READY) return;
    if (connectionStatus === "offline") {
      // Annoncé une seule fois PAR coupure (pas à chaque ping raté déjà
      // comptabilisé dans la même coupure) — voir useConnectionStatus.js,
      // qui ne passe déjà lui-même à "offline" qu'après deux échecs
      // consécutifs, jamais sur un simple aléa réseau isolé.
      if (prevStatus !== "offline") {
        showToast("Connexion perdue — les modifications seront synchronisées au retour du réseau.");
      }
      return;
    }
    if (connectionStatus !== "online") return; // "checking" : rien à faire tant que non conclu
    attemptFlush();
  }, [connectionStatus, attemptFlush, showToast]);

  // Filet de sécurité périodique, tant que le statut reste "online" : au
  // cas où la toute première tentative ci-dessus échoue pour une raison
  // NON réseau (ex. un conflit Supabase transitoire déjà résolu depuis),
  // rien d'autre ne la relancerait tant que `connectionStatus` ne change
  // pas de valeur (React ne redéclenche pas un effet dont la dépendance
  // est retombée sur la même valeur). `attemptFlush` ne fait rien tant que
  // la file est vide, donc ce filet est un no-op la quasi-totalité du
  // temps.
  useEffect(() => {
    if (!SUPABASE_READY || connectionStatus !== "online") return undefined;
    const interval = setInterval(attemptFlush, PENDING_QUEUE_RETRY_MS);
    return () => clearInterval(interval);
  }, [connectionStatus, attemptFlush]);

  // Filet de sécurité supplémentaire : relance un flush au retour de l'onglet
  // au premier plan si on est déjà "online". Sans lui, une mise en arrière-
  // plan prolongée peut voir le minuteur périodique ci-dessus throttlé/
  // suspendu par le navigateur (comportement standard iOS/Android) — revenir
  // au premier plan ne redéclenche alors qu'un ping (voir
  // useConnectionStatus.js), qui reconfirme "online" SANS FAIRE CHANGER cette
  // valeur, donc sans redéclencher l'effet basé sur `connectionStatus`
  // au-dessus : jusqu'à PENDING_QUEUE_RETRY_MS de retard restait alors
  // possible avant qu'une modification en attente ne reparte. Gated sur
  // `connectionStatus === "online"` (pas seulement "visible") pour ne jamais
  // gaspiller un essai de la file (voir MAX_ACTION_RETRIES, utils/supabase.js)
  // sur une tentative perdue d'avance pendant qu'on est réellement hors-ligne.
  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && connectionStatus === "online") attemptFlush();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [connectionStatus, attemptFlush]);

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
        const incoming = mapRowToRecipe(payload.new) as Recipe;
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
        const incoming = mapRowToShoppingList(payload.new) as ShoppingList;
        setShoppingLists((prev) => {
          const exists = prev.some((l) => l.id === incoming.id);
          return exists ? prev.map((l) => (l.id === incoming.id ? incoming : l)) : [...prev, incoming];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state", filter: householdFilter }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new;
        // La ref est mise à jour AVANT setX : quand l'effet de sauvegarde
        // ci-dessus se redéclenchera (nouvelle référence de tableau), il
        // trouvera déjà la bonne valeur sérialisée et n'enverra pas de
        // PATCH en retour pour ce qui vient tout juste d'arriver du
        // serveur — voir le commentaire détaillé plus haut sur la boucle
        // d'écho.
        // *DirtyRef.current === true : une modification locale de cette
        // même tranche est en attente d'envoi (debounce pas encore écoulé,
        // ou PATCH déjà parti mais pas encore résolu) — voir le
        // commentaire détaillé sur ces refs plus haut. Cet événement
        // Realtime peut alors être l'écho d'un PATCH ANTÉRIEUR, déjà
        // dépassé par cette modification locale plus récente : l'appliquer
        // écraserait silencieusement ce que l'utilisateur vient de faire.
        // On l'ignore, la sauvegarde locale en cours écrira de toute façon
        // l'état à jour dès qu'elle aboutira.
        if (Array.isArray(row.pantry) && !pantryDirtyRef.current) {
          lastSyncedPantryRef.current = JSON.stringify(row.pantry);
          setPantry(row.pantry);
        }
        if (Array.isArray(row.basics) && !basicsDirtyRef.current) {
          lastSyncedBasicsRef.current = JSON.stringify(row.basics);
          setBasics(row.basics);
        }
        if (Array.isArray(row.meal_plan) && !mealPlanDirtyRef.current) {
          lastSyncedMealPlanRef.current = JSON.stringify(row.meal_plan);
          setMealPlan(row.meal_plan);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, householdId]);

  return { ready, offlineQueueSize, pendingImport, setPendingImport, pendingHouseholdJoin, setPendingHouseholdJoin };
}
