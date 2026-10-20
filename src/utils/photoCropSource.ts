/* ------------------------------------------------------------------ */
/*  PHOTO À RECADRER — décodage avant d'ouvrir l'éditeur                */
/*  L'éditeur (PhotoCropModal) ne s'ouvre que sur une image réellement   */
/*  décodée : un fichier illisible (HEIC sur Android, fichier abîmé...)   */
/*  ou une photo en ligne impossible à lire (réseau, CORS) lève une        */
/*  PhotoSourceError, et l'appelant affiche son message.                  */
/*                                                                        */
/*  La photo est redessinée UNE fois dans un canvas (JPEG sans EXIF,       */
/*  2400 px max) : ce que l'éditeur affiche et ce que l'envoi découpe       */
/*  (uploadRecipeImage, option `crop`) sont alors exactement les mêmes      */
/*  pixels — même orientation, quel que soit le moteur — et la mémoire       */
/*  reste raisonnable face à une photo de 48 Mpx. L'envoi réduit de toute     */
/*  façon à 1200 px de large.                                                 */
/* ------------------------------------------------------------------ */

export const CROP_SOURCE_MAX_SIDE = 2400;
const CROP_SOURCE_QUALITY = 0.92;

export type PhotoSourceErrorKind = "decode" | "remote";

export class PhotoSourceError extends Error {
  kind: PhotoSourceErrorKind;
  constructor(kind: PhotoSourceErrorKind, message: string) {
    super(message);
    this.name = "PhotoSourceError";
    this.kind = kind;
  }
}

export interface CropSource {
  /** Image normalisée (JPEG) : c'est elle qui sera découpée puis envoyée. */
  blob: Blob;
  /** URL locale (blob:) de cette image, pour l'affichage dans l'éditeur. */
  url: string;
  width: number;
  height: number;
  /** Libère l'URL locale (à appeler à la fermeture de l'éditeur). */
  release: () => void;
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // crossOrigin AVANT src (voir DishArt.tsx) : sinon la requête part sans CORS.
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => (img.naturalWidth > 0 && img.naturalHeight > 0 ? resolve(img) : reject(new Error("image vide")));
    img.onerror = () => reject(new Error("image illisible"));
    img.src = src;
  });
}

async function normalize(img: HTMLImageElement, kind: PhotoSourceErrorKind): Promise<CropSource> {
  const scale = Math.min(1, CROP_SOURCE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoSourceError(kind, "canvas indisponible");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  let blob: Blob | null;
  try {
    // Lève SecurityError si le canvas est « teinté » (réponse sans CORS).
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", CROP_SOURCE_QUALITY));
  } catch (err) {
    throw new PhotoSourceError(kind, err instanceof Error ? err.message : "canvas illisible");
  }
  if (!blob) throw new PhotoSourceError(kind, "encodage impossible");
  const url = URL.createObjectURL(blob);
  return { blob, url, width, height, release: () => URL.revokeObjectURL(url) };
}

/** Photo choisie sur l'appareil (appareil photo ou galerie). */
export async function loadCropSourceFromFile(file: Blob): Promise<CropSource> {
  const localUrl = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(localUrl, false);
    } catch (err) {
      throw new PhotoSourceError("decode", err instanceof Error ? err.message : "image illisible");
    }
    return await normalize(img, "decode");
  } finally {
    URL.revokeObjectURL(localUrl);
  }
}

/** Photo déjà en place (bucket public recipe-images), pour « Recadrer la photo ». */
export async function loadCropSourceFromUrl(src: string): Promise<CropSource> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(src, true);
  } catch (err) {
    throw new PhotoSourceError("remote", err instanceof Error ? err.message : "photo injoignable");
  }
  return normalize(img, "remote");
}
