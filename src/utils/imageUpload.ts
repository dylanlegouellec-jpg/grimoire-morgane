import { getSupabaseClient } from "./supabaseClient";
import { nextId } from "./helpers";
import { loadLocalCache } from "./localCache";
import {
  RECIPE_IMAGE_BUCKET,
  NO_HOUSEHOLD_FOLDER,
  THUMB_MAX_WIDTH,
  THUMB_QUALITY,
  claimThumbBackfill,
  storagePathFromPublicUrl,
  thumbPathFor,
} from "./thumbnails";
import { roundCrop, type CropRect } from "./photoCrop";

/* ------------------------------------------------------------------ */
/*  IMAGES DE RECETTES — compression + Supabase Storage                */
/*                                                                      */
/*  Ancien comportement : la photo brute du téléphone (souvent 3-8 Mo)  */
/*  était encodée en base64 et écrite telle quelle dans la colonne       */
/*  jsonb `image_url` de la table `recipes`. Conséquence : chaque         */
/*  `select=*` sur la table recipes (fait à CHAQUE démarrage de l'app)    */
/*  rapatriait l'intégralité de ces images, et `saveLocalCache()`         */
/*  recopiait tout ça dans localStorage — dont le quota (5-10 Mo) ne       */
/*  survit pas longtemps à des photos non compressées.                    */
/*                                                                        */
/*  Nouveau comportement : l'image est redimensionnée et recompressée      */
/*  côté client via <canvas> (max 1200px de large, WebP si supporté,       */
/*  sinon JPEG), puis envoyée dans un bucket Supabase Storage. Seule       */
/*  l'URL publique (quelques dizaines de caractères) est stockée dans      */
/*  la ligne `recipes` — plus aucune donnée binaire dans la base.          */
/* ------------------------------------------------------------------ */

// Défini dans utils/thumbnails.ts (qui en dérive les URLs de miniature),
// réexporté ici pour les appelants historiques.
export { RECIPE_IMAGE_BUCKET };
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;

export interface CompressedImage {
  blob: Blob;
  mimeType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
}

// ImageBitmap (voie normale) ou HTMLImageElement (repli ci-dessous) : les
// deux exposent width/height (ou naturalWidth/naturalHeight pour le
// second) et peuvent être passés tels quels à CanvasRenderingContext2D.drawImage.
type LoadedBitmap = ImageBitmap | HTMLImageElement;

function loadBitmap(file: Blob): Promise<LoadedBitmap> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  // Repli pour les navigateurs sans createImageBitmap (rare aujourd'hui,
  // mais évite un plantage sec plutôt qu'une dégradation silencieuse).
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function supportsWebp(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

// Dessine une source déjà décodée dans un canvas (largeur max, ratio
// conservé) et l'encode. `mimeType` impose le format (miniature : même
// format que la photo) ; sinon WebP si supporté, JPEG à défaut. `crop` :
// seule cette zone (pixels source, déjà arrondie) est dessinée — voir
// l'éditeur de recadrage (PhotoCropModal).
function encodeToBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  { maxWidth, quality, mimeType: forcedMime, smooth = false, crop }: {
    maxWidth: number;
    quality: number;
    mimeType?: CompressedImage["mimeType"];
    smooth?: boolean;
    crop?: CropRect;
  }
): Promise<CompressedImage> {
  const area = crop || { x: 0, y: 0, w: sourceWidth, h: sourceHeight };
  const scale = Math.min(1, maxWidth / area.w);
  const width = Math.max(1, Math.round(area.w * scale));
  const height = Math.max(1, Math.round(area.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  // Réduction forte (÷2.5 pour une miniature) : le lissage "high" évite
  // l'aspect crénelé d'un sous-échantillonnage naïf.
  if (smooth) ctx.imageSmoothingQuality = "high";
  if (crop) ctx.drawImage(source, area.x, area.y, area.w, area.h, 0, 0, width, height);
  else ctx.drawImage(source, 0, 0, width, height);

  const mimeType: CompressedImage["mimeType"] = forcedMime || (supportsWebp(canvas) ? "image/webp" : "image/jpeg");
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality)).then((blob) => {
    if (!blob) throw new Error("Compression d'image impossible sur cet appareil.");
    return { blob, mimeType, extension: mimeType === "image/webp" ? "webp" : "jpg" };
  });
}

function bitmapSize(bitmap: LoadedBitmap): [number, number] {
  // ImageBitmap n'a que width/height ; HTMLImageElement (repli ci-dessus)
  // a aussi naturalWidth/naturalHeight, utile si .width vaut encore 0 sur
  // une <img> jamais insérée dans le document au moment de la lecture.
  return [
    bitmap.width || (bitmap as HTMLImageElement).naturalWidth,
    bitmap.height || (bitmap as HTMLImageElement).naturalHeight,
  ];
}

// Redimensionne (largeur max, ratio conservé) et recompresse une image
// côté client, avant tout envoi réseau — jamais de photo brute qui part
// sur le réseau ou qui atterrit dans Supabase Storage.
export async function compressImageToBlob(
  file: File,
  { maxWidth = MAX_WIDTH, quality = JPEG_QUALITY }: { maxWidth?: number; quality?: number } = {}
): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const [w, h] = bitmapSize(bitmap);
  return encodeToBlob(bitmap, w, h, { maxWidth, quality });
}

// Compresse puis envoie vers le bucket Storage, et renvoie l'URL
// publique à stocker dans recipe.imageUrl. Ne met rien en file
// hors-ligne : un upload binaire ne se rejoue pas comme une simple ligne
// JSON (voir utils/offlineQueue.js) — en cas d'échec réseau, l'appelant
// doit informer l'utilisateur plutôt que de faire semblant d'avoir
// réussi.
// Dossier du foyer où ranger la photo. Normalement reçu de l'écran appelant ;
// s'il manque (signalé sur Android : au retour de l'appareil photo ou de la
// galerie, la page reprend et l'app revérifie session et foyer — l'envoi
// partait alors vers « sans-foyer », refusé par le stockage), on le
// retrouve : foyer mémorisé sur l'appareil, sinon demandé au serveur
// (get_my_household_ids, foyers dont on est membre accepté). « sans-foyer »
// ne reste que pour le mode invité / sans compte.
async function resolveUploadFolder(client: NonNullable<ReturnType<typeof getSupabaseClient>>, householdId: string | null | undefined): Promise<string> {
  if (householdId) return householdId;
  try {
    const cached = (loadLocalCache() || {}).householdId;
    if (cached) {
      console.warn("[photo] foyer absent à l'envoi : repris du cache local");
      return cached;
    }
  } catch {
    /* cache illisible : on demande au serveur ci-dessous */
  }
  try {
    const { data: auth } = await client.auth.getSession();
    if (auth && auth.session) {
      const { data } = await client.rpc("get_my_household_ids");
      const first: unknown = Array.isArray(data) ? data[0] : data;
      const id = typeof first === "string" ? first : (first as { get_my_household_ids?: string } | null)?.get_my_household_ids;
      if (id) {
        console.warn("[photo] foyer absent à l'envoi : redemandé au serveur");
        return id;
      }
    }
  } catch {
    /* hors-ligne ou refus : dossier par défaut */
  }
  return NO_HOUSEHOLD_FOLDER;
}

export interface UploadRecipeImageOptions {
  // Zone à garder, en pixels de l'image reçue (voir utils/photoCrop.ts) :
  // la photo ET sa miniature sont découpées à cette zone avant compression.
  crop?: CropRect;
}

export async function uploadRecipeImage(
  file: Blob,
  householdId: string | null | undefined,
  { crop }: UploadRecipeImageOptions = {}
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré — upload d'image impossible.");

  // Décodée une seule fois : la photo ET sa miniature en sont tirées.
  const bitmap = await loadBitmap(file);
  const [w, h] = bitmapSize(bitmap);
  const area = crop ? roundCrop(crop, { width: w, height: h }) : undefined;
  const { blob, mimeType, extension } = await encodeToBlob(bitmap, w, h, { maxWidth: MAX_WIDTH, quality: JPEG_QUALITY, crop: area });
  const folder = await resolveUploadFolder(client, householdId);
  const path = `${folder}/${nextId()}.${extension}`;

  const { error } = await client.storage.from(RECIPE_IMAGE_BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  // Miniature pour la grille (voir utils/thumbnails.ts), même format que
  // la photo. Purement accessoire : son échec n'empêche JAMAIS l'envoi
  // de la photo (DishArt retombe sur la pleine taille et la refabrique
  // plus tard, voir backfillThumbnail) — simple trace dans le journal.
  try {
    const thumb = await encodeToBlob(bitmap, w, h, {
      maxWidth: THUMB_MAX_WIDTH,
      quality: THUMB_QUALITY,
      mimeType,
      smooth: true,
      crop: area,
    });
    const { error: thumbError } = await client.storage
      .from(RECIPE_IMAGE_BUCKET)
      .upload(thumbPathFor(path) as string, thumb.blob, { contentType: mimeType, upsert: false });
    if (thumbError) throw thumbError;
  } catch (err) {
    console.warn("[uploadRecipeImage] Miniature non envoyée (la photo, elle, l'est) :", err);
  }

  const { data } = client.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error("URL publique introuvable après upload.");
  return data.publicUrl;
}

// Rattrapage des photos envoyées avant l'apparition des miniatures :
// appelé par DishArt quand la grille a dû charger la pleine taille faute
// de miniature. Fabrique la miniature à partir de l'<img> DÉJÀ chargée
// (chargée en crossOrigin="anonymous", donc lisible par le canvas — le
// bucket public renvoie les en-têtes CORS) et l'envoie, en tâche de
// fond. Une seule tentative par photo et par session, uniquement si
// l'utilisateur est connecté et que la photo est rangée dans un dossier
// de foyer ; la règle de stockage refuse le reste (foyer dont on n'est
// pas membre approuvé, miniature déjà envoyée par un autre appareil...)
// et ce refus est ignoré sans bruit. Ne lève jamais. Renvoie true si la
// miniature a bien été envoyée.
export async function backfillThumbnail(img: HTMLImageElement, photoUrl: string): Promise<boolean> {
  try {
    const path = storagePathFromPublicUrl(photoUrl);
    const thumbPath = path && thumbPathFor(path);
    if (!path || !thumbPath) return false;
    const slash = path.indexOf("/");
    if (slash <= 0 || path.slice(0, slash) === NO_HOUSEHOLD_FOLDER) return false;
    const mimeType: CompressedImage["mimeType"] = /\.webp$/i.test(path) ? "image/webp" : "image/jpeg";

    const client = getSupabaseClient();
    if (!client) return false;
    const { data } = await client.auth.getSession();
    if (!data || !data.session) return false;
    if (!claimThumbBackfill(thumbPath)) return false;

    // Laisse passer l'affichage d'abord : l'encodage canvas n'a rien
    // d'urgent.
    await new Promise<void>((resolve) => {
      if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 3000 });
      else setTimeout(resolve, 200);
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return false;
    const thumb = await encodeToBlob(img, w, h, {
      maxWidth: THUMB_MAX_WIDTH,
      quality: THUMB_QUALITY,
      mimeType,
      smooth: true,
    });
    const { error } = await client.storage
      .from(RECIPE_IMAGE_BUCKET)
      .upload(thumbPath, thumb.blob, { contentType: mimeType, upsert: false });
    return !error;
  } catch {
    // Canvas "taint" (réponse sans CORS), encodage impossible, réseau... :
    // la grille continue simplement d'afficher la pleine taille.
    return false;
  }
}
