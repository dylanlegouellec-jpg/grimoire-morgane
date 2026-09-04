/* ------------------------------------------------------------------ */
/*  MIROIR LOCAL (offline-first)                                       */
/*  Copie systématique de l'état applicatif (recettes, frigo, listes    */
/*  de courses) dans localStorage, pour que l'app reste utilisable      */
/*  sans réseau — et redémarre instantanément sur les dernières          */
/*  données connues plutôt que sur un écran vide en attendant Supabase. */
/* ------------------------------------------------------------------ */

const CACHE_KEY = "grimoire_local_cache_v1";

export function saveLocalCache(data) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* stockage indisponible : l'app continue avec l'état en mémoire */
  }
}

export function loadLocalCache() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
