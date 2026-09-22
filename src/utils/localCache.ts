/* ------------------------------------------------------------------ */
/*  MIROIR LOCAL (offline-first)                                       */
/*  Copie systématique de l'état applicatif (recettes, frigo, listes    */
/*  de courses) dans localStorage, pour que l'app reste utilisable      */
/*  sans réseau — et redémarre instantanément sur les dernières          */
/*  données connues plutôt que sur un écran vide en attendant Supabase. */
/* ------------------------------------------------------------------ */

const CACHE_KEY = "grimoire_local_cache_v1";

// Reflète ce que useOfflineSync.js écrit réellement (voir l'appel à
// saveLocalCache dans son effet de sauvegarde) — champs optionnels : rien
// n'oblige un appelant à fournir la totalité de l'état applicatif d'un
// coup. Les types `unknown[]`/`Record<string, unknown>` restent volontai-
// rement larges tant qu'il n'existe pas de types Recipe/MealPlanEntry
// dédiés ailleurs dans le code (première étape de la migration TypeScript,
// pas encore la modélisation complète du domaine).
export interface LocalCacheData {
  recipes?: unknown[];
  pantry?: unknown[];
  basics?: unknown[];
  mealPlan?: unknown[];
  shoppingLists?: unknown[];
  activeListId?: string | null;
  householdId?: string | null;
  savedAt?: number;
}

export function saveLocalCache(data: LocalCacheData): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* stockage indisponible : l'app continue avec l'état en mémoire */
  }
}

export function loadLocalCache(): LocalCacheData | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
