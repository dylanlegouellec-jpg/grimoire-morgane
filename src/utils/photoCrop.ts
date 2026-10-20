/* ------------------------------------------------------------------ */
/*  RECADRAGE D'UNE PHOTO DE RECETTE — calculs purs (aucun DOM)          */
/*  Utilisés par l'éditeur (components/common/PhotoCropModal.tsx) pour    */
/*  déplacer/zoomer la photo, dessiner ses aperçus, puis par l'envoi       */
/*  (utils/imageUpload.ts, option `crop`) pour découper la zone choisie.  */
/*                                                                        */
/*  L'état de l'éditeur (CropView) est exprimé en PIXELS SOURCE : centre   */
/*  de la zone gardée + zoom. Il ne dépend donc jamais de la taille du     */
/*  cadre à l'écran (rotation du téléphone, redimensionnement...).          */
/*                                                                        */
/*  Proportion du cadre : 4:3, celle de la carte de la grille (.illus,     */
/*  aspect-ratio 4/3, recipeCards.css) — l'usage le plus LARGE de la photo. */
/*  Le haut de la fiche (.detail-hero, 16/10, photo surdimensionnée de      */
/*  12 % en haut et en bas pour sa parallaxe) n'en montre qu'une bande       */
/*  centrale (voir heroWindow) : tout ce qui est dans la bande est visible   */
/*  sur les deux, et la carte montre la photo recadrée en entier.            */
/* ------------------------------------------------------------------ */

export interface Size {
  width: number;
  height: number;
}

/** Zone gardée, en pixels de l'image source. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** État de l'éditeur : zoom (1 = la plus grande zone possible) et centre de la zone, en pixels source. */
export interface CropView {
  zoom: number;
  cx: number;
  cy: number;
}

/** Fraction (0 à 1) de la photo recadrée réellement visible dans un cadre. */
export interface CropWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Doivent rester alignées sur recipeCards.css : .illus (aspect-ratio 4/3),
// .detail-hero (aspect-ratio 16/10) et .detail-hero-parallax (inset -12% 0,
// soit une boîte de 124 % de la hauteur du héros).
export const CROP_ASPECT = 4 / 3;
export const HERO_ASPECT = 16 / 10;
export const HERO_OVERSCAN = 1.24;
export const MAX_ZOOM = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Taille de la zone gardée au zoom 1 : le plus grand rectangle à la proportion `aspect` qui tient dans la photo. */
export function baseCropSize(src: Size, aspect: number = CROP_ASPECT): { w: number; h: number } {
  if (src.width / src.height > aspect) return { w: src.height * aspect, h: src.height };
  return { w: src.width, h: src.width / aspect };
}

/**
 * Ramène un état dans ses bornes : zoom entre 1 et MAX_ZOOM, centre placé
 * pour que la zone gardée reste ENTIÈREMENT dans la photo — le cadre n'a
 * jamais de bord vide.
 */
export function clampView(view: CropView, src: Size, aspect: number = CROP_ASPECT): CropView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, 1, MAX_ZOOM);
  const base = baseCropSize(src, aspect);
  const w = base.w / zoom;
  const h = base.h / zoom;
  const cx = clamp(Number.isFinite(view.cx) ? view.cx : src.width / 2, w / 2, src.width - w / 2);
  const cy = clamp(Number.isFinite(view.cy) ? view.cy : src.height / 2, h / 2, src.height - h / 2);
  return { zoom, cx, cy };
}

/** État de départ et « Recentrer » : zoom 1, photo centrée. */
export function centeredView(src: Size): CropView {
  return { zoom: 1, cx: src.width / 2, cy: src.height / 2 };
}

/** Zone gardée (pixels source, non arrondie) pour un état donné. */
export function cropRectFor(view: CropView, src: Size, aspect: number = CROP_ASPECT): CropRect {
  const v = clampView(view, src, aspect);
  const base = baseCropSize(src, aspect);
  const w = base.w / v.zoom;
  const h = base.h / v.zoom;
  return { x: v.cx - w / 2, y: v.cy - h / 2, w, h };
}

/** Zone à découper, en pixels entiers, garantie dans la photo (pour drawImage). */
export function roundCrop(rect: CropRect, src: Size): CropRect {
  const w = clamp(Math.round(rect.w), 1, src.width);
  const h = clamp(Math.round(rect.h), 1, src.height);
  const x = clamp(Math.round(rect.x), 0, src.width - w);
  const y = clamp(Math.round(rect.y), 0, src.height - h);
  return { x, y, w, h };
}

/** Échelle d'affichage (pixels écran par pixel source) dans un cadre de `frameWidth` px. */
export function displayScale(view: CropView, src: Size, frameWidth: number, aspect: number = CROP_ASPECT): number {
  return frameWidth / cropRectFor(view, src, aspect).w;
}

/**
 * Déplacement au doigt : le doigt glisse de (dx, dy) pixels écran, la photo
 * suit — donc le centre de la zone gardée part dans l'autre sens.
 */
export function panView(view: CropView, dx: number, dy: number, frameWidth: number, src: Size, aspect: number = CROP_ASPECT): CropView {
  const v = clampView(view, src, aspect);
  const s = displayScale(v, src, frameWidth, aspect);
  if (!(s > 0)) return v;
  return clampView({ zoom: v.zoom, cx: v.cx - dx / s, cy: v.cy - dy / s }, src, aspect);
}

/**
 * Zoom autour d'un point du cadre (milieu des deux doigts, curseur de la
 * souris, centre du cadre pour la glissière) : le point de la photo situé
 * sous ce point reste sous ce point (dans la limite des bornes).
 */
export function zoomViewAt(
  view: CropView,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
  frameWidth: number,
  src: Size,
  aspect: number = CROP_ASPECT
): CropView {
  const v = clampView(view, src, aspect);
  const rect = cropRectFor(v, src, aspect);
  const s = frameWidth / rect.w;
  if (!(s > 0)) return v;
  const px = rect.x + anchorX / s;
  const py = rect.y + anchorY / s;
  const zoom = clamp(nextZoom, 1, MAX_ZOOM);
  const base = baseCropSize(src, aspect);
  const w = base.w / zoom;
  const h = base.h / zoom;
  const s2 = frameWidth / w;
  const x = px - anchorX / s2;
  const y = py - anchorY / s2;
  return clampView({ zoom, cx: x + w / 2, cy: y + h / 2 }, src, aspect);
}

/**
 * Transformation CSS de l'<img> de l'éditeur (affichée à sa taille source,
 * transform-origin 0 0) : translate(tx, ty) scale(scale).
 */
export function editorTransform(view: CropView, src: Size, frameWidth: number, aspect: number = CROP_ASPECT): { tx: number; ty: number; scale: number } {
  const rect = cropRectFor(view, src, aspect);
  const scale = frameWidth / rect.w;
  return { tx: -rect.x * scale, ty: -rect.y * scale, scale };
}

/**
 * Partie de la photo recadrée (proportion `cropAspect`) visible dans une
 * boîte de proportion `boxAspect` qui l'affiche en object-fit: cover, centrée.
 */
export function coverWindow(boxAspect: number, cropAspect: number = CROP_ASPECT): CropWindow {
  if (boxAspect < cropAspect) {
    const w = boxAspect / cropAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = cropAspect / boxAspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

/**
 * Bande de la photo recadrée visible en haut de la fiche (portrait, au
 * repos) : la photo couvre une boîte 16/10 agrandie de 24 % en hauteur, dont
 * seule la partie centrale (1/1,24) est dans le cadre du héros.
 */
export function heroWindow(cropAspect: number = CROP_ASPECT): CropWindow {
  const box = coverWindow(HERO_ASPECT / HERO_OVERSCAN, cropAspect);
  const h = box.h / HERO_OVERSCAN;
  return { x: box.x, y: box.y + (box.h - h) / 2, w: box.w, h };
}

/** Partie de la photo recadrée visible dans la carte de la grille (toute la photo : même proportion). */
export function cardWindow(cropAspect: number = CROP_ASPECT): CropWindow {
  return coverWindow(CROP_ASPECT, cropAspect);
}

/**
 * Placement (en % de la boîte d'aperçu) de l'image SOURCE pour qu'une boîte
 * montre exactement ce que montrera la photo recadrée une fois envoyée :
 * la fenêtre `win` de la zone `crop`.
 */
export function previewPlacement(crop: CropRect, src: Size, win: CropWindow): { left: number; top: number; width: number; height: number } {
  const vx = crop.x + win.x * crop.w;
  const vy = crop.y + win.y * crop.h;
  const vw = win.w * crop.w;
  const vh = win.h * crop.h;
  return {
    left: (-vx / vw) * 100,
    top: (-vy / vh) * 100,
    width: (src.width / vw) * 100,
    height: (src.height / vh) * 100,
  };
}
