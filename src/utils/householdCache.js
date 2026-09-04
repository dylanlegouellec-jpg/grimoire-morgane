/* ------------------------------------------------------------------ */
/*  CACHE HORS-LIGNE — liste des foyers + membres                       */
/*                                                                      */
/*  Clés dédiées, séparées du gros blob de utils/localCache.js : ni      */
/*  useSupabaseAuth (qui écrit la liste des foyers) ni HouseholdManager   */
/*  (qui écrit les membres) n'ont besoin de connaître l'état des recettes/ */
/*  du frigo/etc. pour mettre leur propre cache à jour — et inversement,  */
/*  useOfflineSync n'a pas besoin de connaître les foyers. Cette          */
/*  séparation évite tout risque qu'un écrivain n'écrase par erreur le    */
/*  cache d'un autre (le gros blob, lui, est un remplacement complet à    */
/*  chaque écriture — voir la note dans localCache.js).                   */
/* ------------------------------------------------------------------ */
const HOUSEHOLDS_KEY = "grimoire_households_cache";
const MEMBERS_KEY_PREFIX = "grimoire_household_members__";

export function getCachedHouseholds() {
  try {
    const list = JSON.parse(localStorage.getItem(HOUSEHOLDS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function setCachedHouseholds(list) {
  try {
    localStorage.setItem(HOUSEHOLDS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    /* pas grave : juste un cache, l'app continue avec ce qui est en mémoire */
  }
}

export function getCachedMembers(householdId) {
  if (!householdId) return [];
  try {
    const list = JSON.parse(localStorage.getItem(MEMBERS_KEY_PREFIX + householdId));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function setCachedMembers(householdId, members) {
  if (!householdId) return;
  try {
    localStorage.setItem(MEMBERS_KEY_PREFIX + householdId, JSON.stringify(Array.isArray(members) ? members : []));
  } catch {
    /* idem : pas bloquant */
  }
}
