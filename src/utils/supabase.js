import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_READY } from "../constants";
import { enqueueOfflineAction, getOfflineQueue, removeFromOfflineQueue } from "./offlineQueue";
import { normalizeIngredientList } from "./ingredients";
import { getSupabaseClient } from "./supabaseClient";

/* ------------------------------------------------------------------ */
/*  SUPABASE (REST / PostgREST — aucun SDK externe requis)             */
/*  Module d'appels API                                                */
/* ------------------------------------------------------------------ */

// Au-delà de ce délai, une requête est considérée comme perdue plutôt que
// simplement lente — typiquement un réseau de supermarché en 1 barre qui
// ne va nulle part. On préfère basculer vite sur le mode hors-ligne que
// de laisser l'utilisateur fixer un bouton qui ne répond pas pendant une
// minute entière (comportement par défaut de fetch(), sans timeout).
const REQUEST_TIMEOUT_MS = 6000;

// Budget pour le health-check de connectivité (pingSupabase ci-dessous).
// 4s à l'origine : trop court sur un vrai réseau mobile (4G/5G avec
// latence variable, notamment Android) — un ping qui prend simplement
// 4-6s pour répondre (réseau lent, pas coupé) se faisait classer "hors
// ligne" à tort, déclenchant le bandeau alors que la connexion
// fonctionnait. 8s laisse une vraie marge à un réseau lent mais fonctionnel
// sans pour autant tolérer une coupure réelle pendant une minute entière.
const PING_TIMEOUT_MS = 8000;

/* ------------------------------------------------------------------ */
/*  SÉLECTION DE COLONNES                                              */
/*  Toujours nommer les colonnes utiles plutôt que `select=*` : ça      */
/*  évite de rapatrier des colonnes lourdes ou obsolètes (cf. le        */
/*  nettoyage de app_state) à chaque démarrage de l'app.                */
/* ------------------------------------------------------------------ */
export const RECIPE_COLUMNS =
  "id,title,category,time,servings,carbs,calories,protein,fat,notes,illustration_key,is_favorite,ingredients,steps,image_url,image_source,nutriscore_grade,created_at";
export const SHOPPING_LIST_COLUMNS = "id,name,items,created_at";
export const APP_STATE_COLUMNS = "household_id,pantry,basics,meal_plan,updated_at";

// Dernier statut de connectivité RÉEL connu, mesuré par un ping Supabase
// (voir pingSupabase ci-dessous et hooks/useConnectionStatus.js) — `null`
// tant qu'aucun ping n'a encore eu lieu. `navigator.onLine` seul est un
// faux positif classique : certaines combinaisons OS/VPN/proxy le
// rapportent à `false` alors que Supabase reste parfaitement joignable
// (l'app se déclarait alors "hors-ligne" à tort, sans même essayer). Dès
// qu'un vrai ping a répondu au moins une fois, son résultat prime.
let lastKnownReachable = null;

function isOffline() {
  if (lastKnownReachable !== null) return !lastKnownReachable;
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// Health-check ultra-léger : une simple lecture d'une ligne, pas plus
// coûteuse qu'un ping. Contrairement à supabaseRequest(), ne court-circuite
// JAMAIS sur navigator.onLine — c'est justement lui qui doit vérifier si
// ce signal est fiable ou non en ce moment, pas s'y fier aveuglément.
export async function pingSupabase() {
  if (!SUPABASE_READY) return false;
  let reachable = false;
  try {
    const token = await getAuthToken();
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/recipes?select=id&limit=1`,
      { method: "GET", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
      PING_TIMEOUT_MS
    );
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  lastKnownReachable = reachable;
  return reachable;
}

// Le token de session de l'utilisateur connecté (JWT), indispensable dès
// que les policies RLS s'appuient sur auth.uid() — la clé anonyme seule
// ne résout à aucun utilisateur et se ferait systématiquement refuser
// par RLS. Sans session (déconnecté), on retombe sur la clé anonyme :
// la requête part quand même, mais RLS la bloquera — c'est voulu.
async function getAuthToken() {
  const client = getSupabaseClient();
  if (!client) return SUPABASE_ANON_KEY;
  const { data } = await client.auth.getSession();
  return (data && data.session && data.session.access_token) || SUPABASE_ANON_KEY;
}

// fetch() avec un budget de temps strict : au-delà de `ms`, la requête
// est abandonnée (AbortController) plutôt que laissée pendante — le même
// pattern déjà utilisé côté Nutri-Score (voir utils/nutriscore.js), porté
// ici pour couvrir aussi les écritures/lectures Supabase.
async function fetchWithTimeout(url, options, ms) {
  if (typeof fetch !== "function") throw new Error("fetch indisponible");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_READY) throw new Error("Supabase non configuré");
  if (isOffline()) {
    const err = new Error(`Hors-ligne : ${path}`);
    err.offline = true;
    throw err;
  }

  const token = await getAuthToken();
  let res;
  try {
    res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        ...options,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(options.headers || {}),
        },
      },
      REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    // AbortError = notre propre timeout ; toute autre exception ici est
    // une vraie coupure réseau (DNS, TLS, connexion refusée...). Dans les
    // deux cas, on classe l'erreur comme "réseau" pour que les fonctions
    // d'écriture sachent qu'elles peuvent basculer sur la file hors-ligne
    // plutôt que de la traiter comme une erreur applicative définitive.
    const networkErr = new Error(
      err && err.name === "AbortError"
        ? `Délai dépassé (>${REQUEST_TIMEOUT_MS}ms) : ${path}`
        : `Réseau indisponible : ${path}`
    );
    networkErr.timeout = err && err.name === "AbortError";
    networkErr.networkError = true;
    throw networkErr;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const httpErr = new Error(`Supabase ${res.status} : ${text}`);
    httpErr.status = res.status;
    throw httpErr;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchTable(table, query = `select=*`) {
  return supabaseRequest(`${table}?${query}`, { method: "GET" });
}

// Une erreur est "récupérable hors-ligne" si elle vient du réseau (coupure,
// timeout) — pas si le serveur a répondu avec un vrai statut d'erreur
// (400, 403 RLS, 409...) qui, lui, se reproduira à l'identique si on le
// rejoue plus tard : mieux vaut le remonter tout de suite à l'appelant.
function isRecoverableOffline(err) {
  return Boolean(err && (err.offline || err.networkError));
}

// Exécute une écriture, et si elle échoue pour une raison réseau (hors-
// ligne détecté à l'avance OU coupure/latence découverte pendant la
// requête elle-même), l'empile pour rejeu automatique au retour du réseau
// plutôt que de faire échouer l'action de l'utilisateur.
async function withOfflineFallback(action, run, optimisticResult) {
  try {
    return await run();
  } catch (err) {
    if (!isRecoverableOffline(err)) throw err;
    enqueueOfflineAction(action);
    return optimisticResult;
  }
}

export async function insertRow(table, row) {
  return withOfflineFallback(
    { table, type: "insert", payload: row },
    async () => {
      const data = await supabaseRequest(table, { method: "POST", body: JSON.stringify([row]) });
      return data && data[0];
    },
    row
  );
}
export async function updateRow(table, id, patch) {
  return withOfflineFallback(
    { table, type: "update", recordId: id, payload: patch },
    async () => {
      const data = await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      return data && data[0];
    },
    { id, ...patch }
  );
}
export async function deleteRow(table, id) {
  return withOfflineFallback(
    { table, type: "delete", recordId: id },
    async () => {
      await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    undefined
  );
}

// Rejoue, dans l'ordre, chaque action mise en file pendant une coupure
// réseau (appelé par l'écouteur "online" — voir hooks/useOfflineSync.js).
// Chaque action réussie est retirée de la file ; on s'arrête à la
// première erreur pour ne pas rejouer la suite dans le désordre — elle
// sera retentée au prochain retour réseau.
export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  let flushed = 0;
  for (const action of queue) {
    try {
      if (action.type === "insert") {
        await supabaseRequest(action.table, { method: "POST", body: JSON.stringify([action.payload]) });
      } else if (action.type === "update") {
        await supabaseRequest(`${action.table}?id=eq.${encodeURIComponent(action.recordId)}`, {
          method: "PATCH",
          body: JSON.stringify(action.payload),
        });
      } else if (action.type === "delete") {
        await supabaseRequest(`${action.table}?id=eq.${encodeURIComponent(action.recordId)}`, { method: "DELETE" });
      }
      removeFromOfflineQueue(action.id);
      flushed += 1;
    } catch (err) {
      console.error("Échec de la resynchronisation d'une action hors-ligne :", err);
      break;
    }
  }
  return flushed;
}

export async function loadAppState(householdId) {
  if (!householdId) return null;
  const rows = await fetchTable(
    "app_state",
    `select=${APP_STATE_COLUMNS}&household_id=eq.${encodeURIComponent(householdId)}`
  );
  return rows && rows[0];
}
export async function saveAppState(householdId, patch) {
  if (!householdId) return;
  try {
    const rows = await supabaseRequest(`app_state?household_id=eq.${encodeURIComponent(householdId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!rows || !rows.length) throw new Error("Aucune ligne app_state pour ce foyer");
  } catch {
    try {
      await supabaseRequest("app_state", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ household_id: householdId, ...patch }),
      });
    } catch {
      /* silencieux : le grimoire continue de fonctionner en mémoire */
    }
  }
}


/* ------------------------------------------------------------------ */
/*  MAPPING LIGNES SQL <-> OBJETS APPLICATIFS                          */
/* ------------------------------------------------------------------ */

export function mapRowToRecipe(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    time: row.time,
    servings: row.servings,
    carbs: row.carbs,
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    notes: row.notes || null,
    illustrationKey: row.illustration_key || null,
    favorite: !!row.is_favorite,
    ingredients: normalizeIngredientList(row.ingredients),
    steps: Array.isArray(row.steps) ? row.steps : [],
    // Photo personnalisée ou illustration générée par IA : une URL de
    // bucket Supabase Storage (voir utils/imageUpload.js) — plus de
    // base64 stocké en base depuis le nettoyage des images.
    imageUrl: row.image_url || null,
    imageSource: row.image_source || null,
    // Calculé une seule fois à la création/édition (voir utils/nutriscoreClient.js
    // + api/nutriscore.js) — jamais recalculé à l'affichage.
    nutriscoreGrade: row.nutriscore_grade || null,
  };
}
export function mapRecipeToRow(recipe, householdId) {
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    time: recipe.time,
    servings: recipe.servings,
    carbs: recipe.carbs,
    calories: recipe.calories,
    protein: recipe.protein,
    fat: recipe.fat,
    notes: recipe.notes || null,
    illustration_key: recipe.illustrationKey || null,
    is_favorite: !!recipe.favorite,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    image_url: recipe.imageUrl || null,
    image_source: recipe.imageSource || null,
    nutriscore_grade: recipe.nutriscoreGrade || null,
    ...(householdId ? { household_id: householdId } : {}),
  };
}
export function mapRowToShoppingList(row) {
  return {
    id: row.id,
    name: row.name,
    items: Array.isArray(row.items) ? row.items : [],
  };
}
export function mapShoppingListToRow(list, householdId) {
  return {
    id: list.id,
    name: list.name,
    items: list.items,
    ...(householdId ? { household_id: householdId } : {}),
  };
}
