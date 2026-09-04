import { getSupabaseClient } from "./supabaseClient";
import { nextId } from "./helpers";

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

export const RECIPE_IMAGE_BUCKET = "recipe-images";
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;

function loadBitmap(file) {
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

function supportsWebp(canvas) {
  try {
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

// Redimensionne (largeur max, ratio conservé) et recompresse une image
// côté client, avant tout envoi réseau — jamais de photo brute qui part
// sur le réseau ou qui atterrit dans Supabase Storage.
export async function compressImageToBlob(file, { maxWidth = MAX_WIDTH, quality = JPEG_QUALITY } = {}) {
  const bitmap = await loadBitmap(file);
  const sourceWidth = bitmap.width || bitmap.naturalWidth;
  const sourceHeight = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const mimeType = supportsWebp(canvas) ? "image/webp" : "image/jpeg";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error("Compression d'image impossible sur cet appareil.");
  return { blob, mimeType, extension: mimeType === "image/webp" ? "webp" : "jpg" };
}

// Compresse puis envoie vers le bucket Storage, et renvoie l'URL
// publique à stocker dans recipe.imageUrl. Ne met rien en file
// hors-ligne : un upload binaire ne se rejoue pas comme une simple ligne
// JSON (voir utils/offlineQueue.js) — en cas d'échec réseau, l'appelant
// doit informer l'utilisateur plutôt que de faire semblant d'avoir
// réussi.
export async function uploadRecipeImage(file, householdId) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase non configuré — upload d'image impossible.");

  const { blob, mimeType, extension } = await compressImageToBlob(file);
  const folder = householdId || "sans-foyer";
  const path = `${folder}/${nextId()}.${extension}`;

  const { error } = await client.storage.from(RECIPE_IMAGE_BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error("URL publique introuvable après upload.");
  return data.publicUrl;
}
