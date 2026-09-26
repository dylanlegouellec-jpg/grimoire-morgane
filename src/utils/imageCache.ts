// Doit rester synchronisé avec les noms de cache "runtimeCaching" du
// service worker (voir vite.config.js) : ce sont ces deux caches CacheFirst
// qui rendent une image de recette disponible hors-ligne.
const IMAGE_CACHE_NAMES = ["supabase-storage-images-v2", "pollinations-images-v2"];
// Réduits suite à un comportement observé en usage réel : sur un grimoire
// de 25 recettes, les dernières de la liste échouaient nettement plus
// souvent que les premières, de façon systématique (pas aléatoire) — signe
// d'une limitation de débit côté CDN (Cloudflare, devant Supabase Storage)
// déclenchée par une rafale de requêtes rapprochées, plutôt que d'un
// problème réseau générique. PREFETCH_CONCURRENCY était à 4, sans aucune
// pause entre les requêtes d'un même worker : STAGGER_DELAY_MS étale
// désormais chaque nouvelle requête dans le temps.
const PREFETCH_CONCURRENCY = 2;
const STAGGER_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// Seul le champ lu ici est typé — pas d'import d'un type Recipe complet
// qui n'existe pas encore ailleurs dans le code (voir aiIllustration.ts,
// même choix).
interface ImageSourceRecipe {
  imageUrl?: string | null;
}

async function isAlreadyCached(url: string): Promise<boolean> {
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

// Utilisé par l'action "Vider le cache image" du Panneau de Diagnostics —
// supprime les deux Cache Storage CacheFirst ci-dessus. Les images
// reviendront au prochain affichage en ligne (voir prefetchRecipeImages),
// mais l'app repasse hors-ligne à l'illustration vectorielle par défaut
// tant qu'elles ne sont pas re-téléchargées.
export async function clearImageCaches(): Promise<{ cleared: string[] }> {
  if (typeof caches === "undefined") return { cleared: [] };
  const cleared: string[] = [];
  for (const name of IMAGE_CACHE_NAMES) {
    try {
      if (await caches.delete(name)) cleared.push(name);
    } catch {
      /* Cache Storage indisponible — rien à nettoyer. */
    }
  }
  return { cleared };
}

export async function getImageCacheEntryCounts(): Promise<Record<string, number | null> | null> {
  if (typeof caches === "undefined") return null;
  const counts: Record<string, number | null> = {};
  for (const name of IMAGE_CACHE_NAMES) {
    try {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      counts[name] = keys.length;
    } catch {
      counts[name] = null;
    }
  }
  return counts;
}

// Convertit une URL de photo cross-origin en URL "data:" locale, via un
// fetch() explicitement en mode "cors" — jamais un <img>/fond CSS chargeant
// l'URL distante directement. Un fond CSS (background-image) n'a AUCUN
// équivalent de crossOrigin="anonymous" : impossible d'y forcer une requête
// "cors", elle part toujours en "no-cors", et le service worker (même règle
// CacheFirst que DishArt.tsx ci-dessus) met alors en cache une réponse
// OPAQUE sous la MÊME clé que les lectures CORS habituelles. Cette entrée
// opaque est ensuite systématiquement resservie à ces lectures CORS, qui
// échouent alors avec "Response served by service worker is opaque" —
// cassant l'affichage de cette photo PARTOUT dans l'app (grille de
// recettes, préchargement...), jusqu'à expiration du cache (30 jours) ou
// vidage manuel. Repéré via un vrai cas en production : la photo de
// "Macarons" échouait de façon reproductible, alors que le fichier stocké
// était confirmé 100% valide (curl, navigation Safari directe) — la seule
// différence restante était le passage par CookbookDocument.tsx /
// PublicRecipeView.tsx (livre de cuisine, fiche PDF, lien de partage
// public), qui posaient tous deux ce même fond CSS sans jamais passer par
// ce module. Une URL data: n'a besoin d'aucun réseau pour être affichée
// (donc aucun risque d'empoisonner quoi que ce soit) : pas de cycle de vie
// à gérer contrairement à une URL blob:, contrepartie acceptée ici (photos
// déjà compressées à l'upload, voir imageUpload.ts).
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Mémoïse fetchImageAsDataUrl par URL : CookbookDocument.tsx peut re-rendre
// la même recette plusieurs fois (édition en direct du livre de cuisine) —
// sans ça, chaque rendu relancerait un fetch complet pour la même photo.
const resolvedPhotoDataUrls = new Map<string, Promise<string | null>>();
export function getResolvedPhotoDataUrl(url: string): Promise<string | null> {
  let cached = resolvedPhotoDataUrls.get(url);
  if (!cached) {
    cached = fetchImageAsDataUrl(url);
    resolvedPhotoDataUrls.set(url, cached);
  }
  return cached;
}

export async function prefetchRecipeImages(recipes: ImageSourceRecipe[]): Promise<void> {
  if (typeof caches === "undefined" || typeof fetch === "undefined") return;
  if (!navigator.onLine) return; // aucune chance qu'un fetch aboutisse, inutile de le tenter hors-ligne
  const urls = Array.from(
    new Set((recipes || []).map((r) => r && r.imageUrl).filter((url): url is string => Boolean(url)))
  );
  if (!urls.length) return;

  let index = 0;
  async function worker(): Promise<void> {
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
      // Étale les requêtes dans le temps plutôt que de toutes les tirer
      // dès que le worker précédent se libère (voir STAGGER_DELAY_MS
      // ci-dessus) — inutile après la toute dernière URL.
      if (index < urls.length) await sleep(STAGGER_DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: PREFETCH_CONCURRENCY }, worker));
}
