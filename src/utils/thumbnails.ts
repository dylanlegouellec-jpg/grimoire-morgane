/* ------------------------------------------------------------------ */
/*  MINIATURES DES PHOTOS DE RECETTES — dérivation des chemins/URLs      */
/*                                                                      */
/*  Projet Supabase en offre gratuite : pas de transformation d'image    */
/*  à la volée (render/image). L'app fabrique donc elle-même, à côté de   */
/*  chaque photo `${foyer}/${id}.webp|.jpg` du bucket `recipe-images`,     */
/*  une miniature `${foyer}/${id}.thumb.webp|.thumb.jpg` (~480px de        */
/*  large, voir utils/imageUpload.ts) que la grille charge à la place de   */
/*  la pleine taille — bien plus légère sur réseau mobile.                 */
/*                                                                          */
/*  Ce module reste PUR (aucun accès réseau, aucun import du SDK) : il ne   */
/*  fait que dériver des chemins et garder en mémoire, pour la session,    */
/*  les photos dont la miniature manque (anciennes photos, envoyées avant  */
/*  l'apparition des miniatures) — pour ne pas la redemander à chaque      */
/*  affichage d'une carte.                                                  */
/* ------------------------------------------------------------------ */

export const RECIPE_IMAGE_BUCKET = "recipe-images";
// Dossier utilisé par uploadRecipeImage quand aucun foyer n'est connu —
// la règle de stockage n'y autorise aucun dépôt, inutile d'y tenter un
// rattrapage de miniature.
export const NO_HOUSEHOLD_FOLDER = "sans-foyer";
export const THUMB_MAX_WIDTH = 480;
export const THUMB_QUALITY = 0.8;

const PUBLIC_PREFIX = `/storage/v1/object/public/${RECIPE_IMAGE_BUCKET}/`;
// Extensions produites par compressImageToBlob (webp/jpg), plus "jpeg" par
// précaution. Le PNG n'est jamais produit par l'app : pas de miniature.
const PHOTO_PATH_RE = /^(.+?)\.(webp|jpg|jpeg)$/i;

// "foyer/abc.webp" -> "foyer/abc.thumb.webp". null pour un chemin qui
// n'est pas une photo (extension inconnue, ou déjà une miniature).
export function thumbPathFor(path: string): string | null {
  const match = PHOTO_PATH_RE.exec(path);
  if (!match || /\.thumb$/i.test(match[1])) return null;
  return `${match[1]}.thumb.${match[2]}`;
}

// Chemin dans le bucket (ex. "foyer/abc.webp") d'une URL publique du
// bucket `recipe-images` de Supabase Storage, sans paramètre de requête
// (ex. "?retry=" ajouté par DishArt). null pour toute autre URL :
// Pollinations, data:, autre bucket, URL invalide...
export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.pathname.startsWith(PUBLIC_PREFIX)) return null;
  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname.slice(PUBLIC_PREFIX.length));
  } catch {
    return null;
  }
  return path || null;
}

// URL publique de la miniature d'une photo du bucket `recipe-images`, ou
// null si l'URL n'en est pas une (illustrations Pollinations, anciennes
// images base64, miniature elle-même...). Le paramètre de requête
// éventuel est retiré : la miniature est une autre ressource.
export function thumbUrlFor(url: string | null | undefined): string | null {
  const path = storagePathFromPublicUrl(url);
  if (!path) return null;
  const thumbPath = thumbPathFor(path);
  if (!thumbPath) return null;
  const parsed = new URL(url as string);
  const encoded = thumbPath.split("/").map(encodeURIComponent).join("/");
  return `${parsed.origin}${PUBLIC_PREFIX}${encoded}`;
}

/* --- Mémoire de session ------------------------------------------- */

// Photos (URL pleine taille) dont la miniature a échoué à se charger
// pendant cette session : DishArt va alors directement à la pleine taille
// (déjà en cache HTTP après le premier repli) au lieu de reproduire la
// même erreur 400/404 à chaque remontage d'une carte.
const missingThumbs = new Set<string>();
// Photos dont la miniature a déjà fait l'objet d'une tentative de
// rattrapage pendant cette session (réussie ou non) — une seule par photo.
const backfillClaims = new Set<string>();

export function markThumbMissing(photoUrl: string): void {
  missingThumbs.add(photoUrl);
}

export function isThumbKnownMissing(photoUrl: string): boolean {
  return missingThumbs.has(photoUrl);
}

// true la première fois pour une photo donnée, false ensuite.
export function claimThumbBackfill(photoUrl: string): boolean {
  if (backfillClaims.has(photoUrl)) return false;
  backfillClaims.add(photoUrl);
  return true;
}

// Réservé aux tests.
export function resetThumbSessionState(): void {
  missingThumbs.clear();
  backfillClaims.clear();
}
