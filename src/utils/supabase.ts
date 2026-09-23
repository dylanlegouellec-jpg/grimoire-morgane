import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_READY } from "../constants";
import { enqueueOfflineAction, getOfflineQueue, removeFromOfflineQueue, incrementOfflineActionFailCount } from "./offlineQueue";
import { normalizeIngredientList } from "./ingredients";
import { getSupabaseClient } from "./supabaseClient";
import type { NewOfflineAction } from "./offlineQueue";

// Marqueurs posés sur de vraies instances Error (jamais un type d'erreur à
// part) pour que isRecoverableOffline/runFlushOfflineQueue ci-dessous
// sachent, sans avoir à re-parser un message, si une erreur vient d'une
// coupure réseau (offline/networkError/timeout) ou d'un vrai statut HTTP
// (status) — mêmes champs qu'avant la conversion TypeScript, juste nommés.
interface SupabaseRequestError extends Error {
  offline?: boolean;
  networkError?: boolean;
  timeout?: boolean;
  status?: number;
}

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
export const SHOPPING_LIST_COLUMNS = "id,name,items,scope,user_id,created_at";
export const APP_STATE_COLUMNS = "household_id,pantry,basics,meal_plan,updated_at";

// Dernier statut de connectivité RÉEL connu, mesuré par un ping Supabase
// (voir pingSupabase ci-dessous et hooks/useConnectionStatus.js) — `null`
// tant qu'aucun ping n'a encore eu lieu. `navigator.onLine` seul est un
// faux positif classique : certaines combinaisons OS/VPN/proxy le
// rapportent à `false` alors que Supabase reste parfaitement joignable
// (l'app se déclarait alors "hors-ligne" à tort, sans même essayer). Dès
// qu'un vrai ping a répondu au moins une fois, son résultat prime.
let lastKnownReachable: boolean | null = null;

// Bascule de simulation pour le Panneau de Diagnostics ("simuler le mode
// hors-ligne") — jamais persistée (en mémoire seulement) : un rechargement
// de page repart toujours en mode réel, pour ne jamais bloquer
// durablement l'app sur un faux hors-ligne oublié après une session de
// test.
let forceOfflineForDebug = false;

export function setForceOfflineForDebug(value: unknown): void {
  forceOfflineForDebug = Boolean(value);
}

export function isForceOfflineForDebug(): boolean {
  return forceOfflineForDebug;
}

function isOffline(): boolean {
  if (forceOfflineForDebug) return true;
  if (lastKnownReachable !== null) return !lastKnownReachable;
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// Health-check ultra-léger : une simple lecture d'une ligne, pas plus
// coûteuse qu'un ping. Contrairement à supabaseRequest(), ne court-circuite
// JAMAIS sur navigator.onLine — c'est justement lui qui doit vérifier si
// ce signal est fiable ou non en ce moment, pas s'y fier aveuglément.
//
// Correctif : "joignable" ne veut PAS dire "a répondu 2xx". Un token de
// session expiré (401) ou une policy RLS qui refuse (403) prouve au
// contraire que la requête EST bien arrivée jusqu'à Supabase — le réseau
// fonctionne, c'est un problème d'autorisation, pas de connectivité. En ne
// retenant que `res.ok`, un token périmé faisait passer la pastille au
// rouge "hors ligne" alors que la connexion était parfaitement valide.
// Seul un fetch qui échoue/expire (DNS, coupure réseau réelle) doit
// compter comme injoignable.
export async function pingSupabase(): Promise<boolean> {
  if (!SUPABASE_READY) return false;
  if (forceOfflineForDebug) {
    lastKnownReachable = false;
    return false;
  }
  let reachable = false;
  try {
    const token = await getAuthToken();
    // `#_conncheck=1` (fragment, PAS un paramètre de requête `?...`) :
    // sans un marqueur quelconque, cette URL tombe sous la même règle du
    // service worker que toute autre lecture Supabase (NetworkFirst, voir
    // vite.config.js) — un fetch() servi depuis SON cache résout
    // normalement, sans jamais lever d'exception. pingSupabase() ne
    // pouvait alors plus jamais détecter une vraie coupure réseau dès
    // qu'une réponse Supabase avait été mise en cache une fois (quasi
    // toujours vrai après le tout premier chargement de l'app) : la
    // pastille restait verte indéfiniment même hors ligne. Ce marqueur
    // fait correspondre la requête à une règle dédiée, ajoutée AVANT la
    // règle générale, qui force NetworkOnly — jamais de repli sur le
    // cache pour un ping, par définition.
    //
    // REGRESSION corrigée : c'était `?_conncheck=1` (vrai paramètre de
    // requête) à l'origine — reconnu par le service worker (voir
    // `url.hash` vs `url.searchParams` dans vite.config.js), mais AUSSI
    // transmis tel quel jusqu'à PostgREST, qui interprète tout paramètre
    // non reconnu comme un filtre sur une colonne du même nom
    // (`colonne=valeur`) : `_conncheck` n'étant pas une colonne de
    // `recipes`, chaque ping renvoyait un vrai 400 Bad Request, visible
    // dans les logs du Panneau de Diagnostics. Un fragment d'URL
    // (`#...`) n'est en revanche JAMAIS envoyé par le navigateur dans la
    // requête HTTP réelle (c'est une convention universelle du protocole,
    // pas spécifique à fetch()) — tout en restant lisible par le service
    // worker, qui voit l'URL complète de la Request AVANT son départ sur
    // le réseau.
    await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/recipes?select=id&limit=1#_conncheck=1`,
      { method: "GET", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
      PING_TIMEOUT_MS
    );
    reachable = true;
  } catch (err) {
    reachable = false;
    // Journalisé (jamais montré à l'utilisateur) pour pouvoir distinguer,
    // depuis la console DevTools, une VRAIE coupure réseau (TypeError:
    // Failed to fetch / NetworkError, y compris un rejet CORS — qui prend
    // exactement la même forme côté JS qu'une coupure) d'un autre souci —
    // c'est la seule façon de savoir laquelle des deux se produit
    // réellement sans accès aux outils réseau du navigateur de
    // l'utilisateur.
    console.warn("[pingSupabase] Ping Supabase en échec :", err);
  }
  lastKnownReachable = reachable;
  return reachable;
}

// Le token de session de l'utilisateur connecté (JWT), indispensable dès
// que les policies RLS s'appuient sur auth.uid() — la clé anonyme seule
// ne résout à aucun utilisateur et se ferait systématiquement refuser
// par RLS. Sans session (déconnecté), on retombe sur la clé anonyme :
// la requête part quand même, mais RLS la bloquera — c'est voulu.
async function getAuthToken(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return SUPABASE_ANON_KEY;
  const { data } = await client.auth.getSession();
  return (data && data.session && data.session.access_token) || SUPABASE_ANON_KEY;
}

// fetch() avec un budget de temps strict : au-delà de `ms`, la requête
// est abandonnée (AbortController) plutôt que laissée pendante — le même
// pattern déjà utilisé côté Nutri-Score (voir utils/nutriscore.js), porté
// ici pour couvrir aussi les écritures/lectures Supabase.
async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  if (typeof fetch !== "function") throw new Error("fetch indisponible");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Retour volontairement non typé : cette couche REST générique renvoie
// aussi bien un tableau de lignes qu'un objet unique ou `null` selon
// l'appelant (fetchTable, insertRow, updateRow...) — chaque appelant
// connaît la forme exacte de ce qu'il demande (voir mapRowToRecipe et
// consorts plus bas, ainsi que profile.ts/auth.ts/planning.ts qui
// indexent directement le résultat). `unknown` casserait tous ces
// appelants (indexation directe sans re-narrowage) pour un gain nul —
// la vraie sûreté de type est déjà côté appelant, pas ici.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function supabaseRequest(path: string, options: RequestInit = {}): Promise<any> {
  if (!SUPABASE_READY) throw new Error("Supabase non configuré");
  if (isOffline()) {
    const err: SupabaseRequestError = new Error(`Hors-ligne : ${path}`);
    err.offline = true;
    throw err;
  }

  const token = await getAuthToken();
  let res: Response;
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
    const isAbort = err instanceof Error && err.name === "AbortError";
    const networkErr: SupabaseRequestError = new Error(
      isAbort
        ? `Délai dépassé (>${REQUEST_TIMEOUT_MS}ms) : ${path}`
        : `Réseau indisponible : ${path}`
    );
    networkErr.timeout = isAbort;
    networkErr.networkError = true;
    throw networkErr;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const httpErr: SupabaseRequestError = new Error(`Supabase ${res.status} : ${text}`);
    httpErr.status = res.status;
    throw httpErr;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Même choix volontaire que supabaseRequest ci-dessus (voir son commentaire).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTable(table: string, query: string = `select=*`): Promise<any> {
  return supabaseRequest(`${table}?${query}`, { method: "GET" });
}

// Compte approximatif de lignes d'une table — pour la volumétrie Supabase
// du Panneau de Diagnostics. Une requête HEAD ne rapatrie aucune ligne :
// seul l'en-tête `Content-Range` renvoyé par PostgREST avec
// `Prefer: count=exact` ("0-0/42") donne le total exact, sans le coût
// d'un `select=*` complet. Ne lève jamais : `null` signifie simplement
// "indisponible" (hors-ligne, RLS, table absente...), un panneau de debug
// n'a pas à faire planter le reste de l'app pour une métrique accessoire.
export async function countTableRows(table: string): Promise<number | null> {
  if (!SUPABASE_READY || isOffline()) return null;
  try {
    const token = await getAuthToken();
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
      {
        method: "HEAD",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
      },
      REQUEST_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const range = res.headers.get("content-range");
    if (!range) return null;
    const total = range.split("/")[1];
    return total === "*" ? null : Number(total);
  } catch {
    return null;
  }
}

// Une erreur est "récupérable hors-ligne" si elle vient du réseau (coupure,
// timeout) — pas si le serveur a répondu avec un vrai statut d'erreur
// (400, 403 RLS, 409...) qui, lui, se reproduira à l'identique si on le
// rejoue plus tard : mieux vaut le remonter tout de suite à l'appelant.
function isRecoverableOffline(err: unknown): boolean {
  const e = err as SupabaseRequestError | null | undefined;
  return Boolean(e && (e.offline || e.networkError));
}

// Exécute une écriture, et si elle échoue pour une raison réseau (hors-
// ligne détecté à l'avance OU coupure/latence découverte pendant la
// requête elle-même), l'empile pour rejeu automatique au retour du réseau
// plutôt que de faire échouer l'action de l'utilisateur.
async function withOfflineFallback<T>(action: NewOfflineAction, run: () => Promise<T>, optimisticResult: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isRecoverableOffline(err)) throw err;
    enqueueOfflineAction(action);
    return optimisticResult;
  }
}

export async function insertRow(table: string, row: Record<string, unknown>) {
  return withOfflineFallback(
    { table, type: "insert", payload: row },
    async () => {
      const data = await supabaseRequest(table, { method: "POST", body: JSON.stringify([row]) });
      return data && data[0];
    },
    row
  );
}
export async function updateRow(table: string, id: string, patch: Record<string, unknown>) {
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
export async function deleteRow(table: string, id: string): Promise<void> {
  return withOfflineFallback(
    { table, type: "delete", recordId: id },
    async () => {
      await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    undefined
  );
}

// PATCH d'abord (foyer déjà connu, cas quasi systématique) ; si aucune
// ligne n'existe encore pour ce foyer (tout premier enregistrement),
// repli sur un POST. Partagé entre saveAppState (chemin direct) et
// flushOfflineQueue (rejeu d'une action "app_state" mise en attente) pour
// ne pas dupliquer cette logique PATCH-puis-POST.
async function applyAppStatePatch(householdId: string, patch: Record<string, unknown>): Promise<void> {
  const rows = await supabaseRequest(`app_state?household_id=eq.${encodeURIComponent(householdId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!rows || !rows.length) {
    await supabaseRequest("app_state", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ household_id: householdId, ...patch }),
    });
  }
}

// Rejoue, dans l'ordre, chaque action mise en file pendant une coupure
// réseau (appelé par l'écouteur "online" — voir hooks/useOfflineSync.js).
// Chaque action réussie est retirée de la file ; on s'arrête à la
// première erreur pour ne pas rejouer la suite dans le désordre — elle
// sera retentée au prochain retour réseau.
//
// Exception : une action qui a déjà échoué MAX_ACTION_RETRIES fois de
// suite est abandonnée (retirée de la file) plutôt que de continuer à
// bloquer indéfiniment tout ce qui la suit — un conflit définitif (ex. le
// foyer visé a été supprimé entre-temps) ne se résoudra jamais tout seul
// en réessayant, contrairement à un simple aléa réseau. On continue alors
// la boucle sur les actions suivantes plutôt que de s'arrêter, puisque le
// blocage vient d'être levé. `dropped` (renvoyé séparément de `flushed`)
// permet à l'appelant de prévenir l'utilisateur que quelque chose a été
// abandonné, plutôt que de le laisser croire à une simple synchronisation
// silencieuse.
const MAX_ACTION_RETRIES = 5;

// Garde-fou contre un rejeu en double : l'événement "online" du navigateur
// peut se déclencher plusieurs fois de suite sur un réseau instable (retour
// 4G→WiFi, bascule d'antenne...), et chaque déclenchement appelle
// flushOfflineQueue (voir hooks/useOfflineSync.js). Sans garde, deux appels
// concurrents liraient la même file, tenteraient tous les deux la même
// action en tête de file avant que le premier n'ait eu le temps de la
// retirer — un simple insert rejoué deux fois crée une ligne en double en
// base. Un second appel pendant qu'un premier est déjà en cours ne relit
// donc plus la file : il n'y a rien d'utile à y faire tant que le premier
// n'est pas arrivé au bout (voir le même principe pour le ping de
// connectivité, useConnectionStatus.js/inFlightRef).
let flushInFlight = false;

export interface OfflineConflict {
  table: string;
  keys: string[];
}

export interface FlushOfflineQueueResult {
  flushed: number;
  dropped: number;
  conflicts: OfflineConflict[];
}

export async function flushOfflineQueue(): Promise<FlushOfflineQueueResult> {
  if (flushInFlight) return { flushed: 0, dropped: 0, conflicts: [] };
  flushInFlight = true;
  try {
    return await runFlushOfflineQueue();
  } finally {
    flushInFlight = false;
  }
}

// Un seul champ (`app_state.pantry`/`.basics`/`.meal_plan`) est un JSON
// complet remplacé en bloc à chaque PATCH, jamais fusionné ligne à ligne —
// si un autre appareil l'a modifié PENDANT que celui-ci était hors-ligne,
// rejouer notre PATCH écraserait purement et simplement son changement.
// Renvoie les clés de `action.payload` dont la valeur serveur ACTUELLE ne
// correspond plus à `action.baseline` (ce que ce client croyait être sur
// le serveur au moment de la mise en file) — donc les clés réellement en
// conflit, jamais un faux positif sur un champ que `patch` ne touche même
// pas (ex. `pantry` modifié ailleurs ne bloque jamais un rejeu qui ne
// portait que sur `meal_plan`, puisqu'on ne compare QUE les clés de
// `payload`, pas la ligne entière ni sa colonne `updated_at`).
async function findAppStateConflicts(
  householdId: string | undefined,
  payload: Record<string, unknown> | undefined,
  baseline: Record<string, unknown> | undefined
): Promise<string[]> {
  if (!baseline) return [];
  const current = await loadAppState(householdId);
  if (!current) return [];
  // Une clé dont la baseline vaut `undefined` (pas encore de valeur connue
  // avant le tout premier chargement réussi, voir parseBaseline dans
  // hooks/useOfflineSync.js) n'a rien à comparer — l'ignorer plutôt que de
  // la compter en conflit systématique face à n'importe quelle valeur
  // serveur réelle. `payload` est toujours défini pour une action
  // "app_state" (voir saveAppState) — le type plus large vient du type
  // partagé OfflineAction, commun à tous les types d'action.
  return Object.keys(payload as Record<string, unknown>).filter(
    (key) => baseline[key] !== undefined && JSON.stringify(current[key]) !== JSON.stringify(baseline[key])
  );
}

async function runFlushOfflineQueue(): Promise<FlushOfflineQueueResult> {
  const queue = getOfflineQueue();
  let flushed = 0;
  let dropped = 0;
  const conflicts: OfflineConflict[] = [];
  for (const action of queue) {
    try {
      if (action.type === "app_state" && action.baseline) {
        const conflictKeys = await findAppStateConflicts(action.recordId, action.payload, action.baseline);
        if (conflictKeys.length) {
          // Abandonnée comme une action définitivement irrécupérable (voir
          // MAX_ACTION_RETRIES plus bas) : la retenter ne changerait rien,
          // le conflit ne se résoudra pas tout seul. `conflicts` (distinct
          // de `dropped`) permet à l'appelant (hooks/useOfflineSync.js) de
          // prévenir précisément l'utilisateur ET de rafraîchir l'état
          // depuis le serveur, plutôt que de laisser l'écran affiché ne
          // plus correspondre à ce qui a réellement été conservé en base.
          removeFromOfflineQueue(action.id);
          conflicts.push({ table: action.table, keys: conflictKeys });
          continue;
        }
      }
      if (action.type === "insert") {
        await supabaseRequest(action.table, { method: "POST", body: JSON.stringify([action.payload]) });
      } else if (action.type === "update") {
        await supabaseRequest(`${action.table}?id=eq.${encodeURIComponent(action.recordId as string)}`, {
          method: "PATCH",
          body: JSON.stringify(action.payload),
        });
      } else if (action.type === "delete") {
        await supabaseRequest(`${action.table}?id=eq.${encodeURIComponent(action.recordId as string)}`, { method: "DELETE" });
      } else if (action.type === "app_state") {
        await applyAppStatePatch(action.recordId as string, action.payload as Record<string, unknown>);
      }
      removeFromOfflineQueue(action.id);
      flushed += 1;
    } catch (err) {
      const failCount = incrementOfflineActionFailCount(action.id);
      if (failCount >= MAX_ACTION_RETRIES) {
        console.error(`Action hors-ligne abandonnée après ${failCount} échecs :`, action, err);
        removeFromOfflineQueue(action.id);
        dropped += 1;
        continue;
      }
      console.error("Échec de la resynchronisation d'une action hors-ligne :", err);
      break;
    }
  }
  return { flushed, dropped, conflicts };
}

// Même choix volontaire que supabaseRequest ci-dessus (voir son commentaire).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadAppState(householdId: string | null | undefined): Promise<any> {
  if (!householdId) return null;
  const rows = await fetchTable(
    "app_state",
    `select=${APP_STATE_COLUMNS}&household_id=eq.${encodeURIComponent(householdId)}`
  );
  return rows && rows[0];
}
// Avant : une panne réseau ici était avalée en silence (aucune trace,
// aucune file de rattrapage), contrairement aux recettes/listes de
// courses qui, elles, passent déjà par withOfflineFallback — un
// changement de frigo/basiques/plan de repas fait hors-ligne pouvait
// donc être perdu pour de bon si l'utilisateur ne retouchait pas cette
// même donnée avant de fermer l'app. `withOfflineFallback` met
// maintenant l'action en file (rejouée par flushOfflineQueue via le
// type "app_state" ci-dessus) exactement comme le reste des écritures.
// Une vraie erreur applicative (RLS, 4xx...) n'est plus avalée non plus :
// elle remonte à l'appelant (voir hooks/useOfflineSync.js) pour être
// loguée et signalée à l'utilisateur.
// `baseline` (optionnel) : valeur de CHAQUE clé de `patch` telle que ce
// client la croyait sur le serveur juste avant cette modification (voir
// lastSyncedPantryRef/lastSyncedBasicsRef/lastSyncedMealPlanRef,
// hooks/useOfflineSync.js) — sert uniquement si cette écriture finit mise
// en file hors-ligne (voir runFlushOfflineQueue ci-dessous) : au retour du
// réseau, comparer ce `baseline` à la valeur RÉELLE alors sur le serveur
// permet de détecter qu'un autre appareil a modifié ce même champ pendant
// la coupure, plutôt que d'écraser aveuglément son changement avec le
// nôtre. Le chemin direct (déjà en ligne) ci-dessous ignore `baseline` :
// il n'est utile qu'au rejeu, jamais à l'écriture immédiate.
export async function saveAppState(
  householdId: string | null | undefined,
  patch: Record<string, unknown>,
  baseline?: Record<string, unknown>
): Promise<void> {
  if (!householdId) return;
  return withOfflineFallback(
    { table: "app_state", type: "app_state", recordId: householdId, payload: patch, baseline },
    () => applyAppStatePatch(householdId, patch),
    undefined
  );
}


/* ------------------------------------------------------------------ */
/*  MAPPING LIGNES SQL <-> OBJETS APPLICATIFS                          */
/* ------------------------------------------------------------------ */

export function mapRowToRecipe(row: Record<string, unknown>) {
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
export function mapRecipeToRow(recipe: Record<string, unknown>, householdId?: string | null) {
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
export function mapRowToShoppingList(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    items: Array.isArray(row.items) ? row.items : [],
    // "scope" absent (listes créées avant ce champ) traité comme
    // "household", jamais "personal" par défaut — voir useShoppingLists.js.
    scope: row.scope === "personal" ? "personal" : "household",
    userId: row.user_id || null,
  };
}
export function mapShoppingListToRow(list: Record<string, unknown>, householdId?: string | null) {
  const scope = list.scope === "personal" ? "personal" : "household";
  return {
    id: list.id,
    name: list.name,
    items: list.items,
    scope,
    user_id: scope === "personal" ? (list.userId || null) : null,
    ...(householdId ? { household_id: householdId } : {}),
  };
}
