// Doit rester synchronisé avec les noms de cache "runtimeCaching" du
// service worker (voir vite.config.js) : ce sont ces deux caches CacheFirst
// qui rendent une image de recette disponible hors-ligne.
const IMAGE_CACHE_NAMES = ["supabase-storage-images-v2", "pollinations-images-v2"];
const PREFETCH_CONCURRENCY = 4;

/* ------------------------------------------------------------------ */
/*  PRÉCHARGEMENT DES IMAGES DE RECETTES — pour qu'une recette reste       */
/*  illustrée hors-ligne même si sa carte n'a jamais été affichée à          */
/*  l'écran pendant que le réseau était disponible.                          */
/*                                                                            */
/*  Les <img> de DishArt.jsx portent `loading="lazy"` : le navigateur           */
/*  n'émet la requête réseau (et donc ne remplit le cache CacheFirst du          */
/*  service worker) que quand la carte s'approche du viewport. Une recette         */
/*  jamais scrollée à l'écran pendant qu'on était en ligne n'a donc jamais           */
/*  sa photo en cache — hors-ligne, son <img> échoue immédiatement (aucune            */
/*  requête n'a jamais pu la mettre en cache) et retombe sur l'illustration             */
/*  vectorielle par défaut, même si l'image existe bel et bien côté serveur.             */
/*                                                                                        */
/*  Ce module précharge PROACTIVEMENT chaque URL d'image dès que la liste des               */
/*  recettes est connue (voir useOfflineSync.js) : un simple fetch() sur une                 */
/*  URL qui correspond déjà à une règle `runtimeCaching` de Workbox                            */
/*  (supabase-storage-images-v2 / pollinations-images-v2, vite.config.js) suffit                */
/*  à la faire mettre en cache par le service worker, exactement comme si un                     */
/*  <img> l'avait affichée. Pas besoin de dupliquer cette logique de cache                         */
/*  nous-mêmes (IndexedDB, Dexie...) : Cache Storage n'a pas la limite de ~5 Mo                      */
/*  de localStorage, et Workbox s'en occupe déjà correctement une fois la                             */
/*  requête déclenchée — il ne manquait que le déclenchement lui-même.                                  */
/* ------------------------------------------------------------------ */

async function isAlreadyCached(url) {
  if (typeof caches === "undefined") return false;
  for (const name of IMAGE_CACHE_NAMES) {
    try {
      const cache = await caches.open(name);
      if (await cache.match(url)) return true;
    } catch {
      /* Cache Storage indisponible (navigation privée stricte, etc.) — tant pis, on retente un fetch normal ci-dessous. */
    }
  }
  return false;
}

export async function prefetchRecipeImages(recipes) {
  if (typeof caches === "undefined" || typeof fetch === "undefined") return;
  if (!navigator.onLine) return; // aucune chance qu'un fetch aboutisse, inutile de le tenter hors-ligne
  const urls = Array.from(new Set((recipes || []).map((r) => r && r.imageUrl).filter(Boolean)));
  if (!urls.length) return;

  let index = 0;
  async function worker() {
    while (index < urls.length) {
      const url = urls[index++];
      try {
        if (await isAlreadyCached(url)) continue;
        // mode "cors" (jamais "no-cors") : Pollinations.ai et le bucket
        // Supabase Storage envoient tous deux Access-Control-Allow-Origin: *
        // (voir DishArt.jsx) — une réponse opaque mise en cache resterait
        // ensuite illisible pour le canvas d'export (recipeCardCanvas.js),
        // même piège déjà documenté et corrigé là-bas pour l'<img>.
        await fetch(url, { mode: "cors", credentials: "omit" });
      } catch {
        // Une image manquante/injoignable ne doit jamais bloquer le
        // préchargement des autres recettes de la liste.
      }
    }
  }
  await Promise.all(Array.from({ length: PREFETCH_CONCURRENCY }, worker));
}
