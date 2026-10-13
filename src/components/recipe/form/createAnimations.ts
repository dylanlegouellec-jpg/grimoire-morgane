import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/*  ANIMATIONS DE CRÉATION / D'ENREGISTREMENT D'UNE RECETTE             */
/*  La mécanique (minutages, tache d'encre, vol vers la carte, halo) ;   */
/*  le dessin (titre à la plume, sceau de cire) vit dans                  */
/*  QuillAndSeal.tsx, les styles dans styles/createAnimations.css.        */
/*                                                                        */
/*  A) « Tache d'encre » : le « + » de l'onglet Recettes transmet le       */
/*     centre du bouton (InkOrigin). Une tache d'encre (--chrome) part de   */
/*     ce point et couvre l'écran, la page de parchemin s'ouvre dans son     */
/*     sillage depuis le même point, puis l'encre s'efface. Uniquement      */
/*     clip-path/opacity (Web Animations API) : rien ne bouge dans la mise   */
/*     en page, et le formulaire reçoit les touchers dès qu'il est visible.  */
/*  B) « Cachet de cire » : voir WaxSeal (QuillAndSeal.tsx) pour la chute    */
/*     et l'impact ; ici le vol de la feuille vers la carte de la grille et   */
/*     le halo doré posé sur cette carte (markRecipeSealed/useSealedPulse).   */
/* ------------------------------------------------------------------ */

/** Centre du bouton qui a demandé la création, en coordonnées d'écran. */
export interface InkOrigin {
  x: number;
  y: number;
  /** Rayon du bouton : la tache part de sa taille, pas d'un point. */
  r?: number;
}

/** Centre (et rayon) d'un bouton, à passer à onAddRequest. */
export function inkOriginFromElement(el: Element | null | undefined): InkOrigin | undefined {
  if (!el || typeof el.getBoundingClientRect !== "function") return undefined;
  const rect = el.getBoundingClientRect();
  if (!rect.width && !rect.height) return undefined;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: Math.min(rect.width, rect.height) / 2 };
}

// --- Minutages (ms) ----------------------------------------------------
// Ouverture : l'encre couvre l'écran en INK_SPREAD_MS, la page suit avec
// PAGE_DELAY_MS de retard (le liseré d'encre visible entre les deux est la
// « tache »), l'encre s'efface ensuite. Le titre s'écrit et les champs
// arrivent pendant que la page finit de s'ouvrir : formulaire lisible et
// utilisable vers 0,6 s. Les délais CSS (createAnimations.css) reprennent
// QUILL_START_MS/QUILL_CHAR_MS via des variables posées en ligne.
export const INK_SPREAD_MS = 340;
export const PAGE_DELAY_MS = 90;
export const PAGE_REVEAL_MS = 380;
export const INK_FADE_MS = 200;
export const QUILL_START_MS = 220;
export const QUILL_CHAR_MS = 18;
// Fin de l'intro : l'encre est retirée du DOM, le titre redevient un
// simple texte, la cascade des champs est terminée (dernier délai CSS
// 0,58 s + durée 0,3 s).
export const INK_INTRO_MS = 950;

// Sceau : la chute dure SEAL_IMPACT_MS (son + vibration à l'impact), le
// rebond se calme, puis la feuille se referme à SEAL_CLOSE_MS et vole vers
// sa carte en FLIGHT_MS. Total perçu ≈ 1,2 s.
export const SEAL_IMPACT_MS = 360;
export const SEAL_CLOSE_MS = 780;
export const FLIGHT_MS = 440;
export const SEAL_HAPTIC = [18, 40, 34];
// Durée du halo doré sur la carte (createAnimations.css, .card-sealed).
export const SEAL_PULSE_MS = 1300;

const EASE_INK = "cubic-bezier(0.55, 0, 0.25, 1)";
const EASE_PAGE = "cubic-bezier(0.45, 0, 0.2, 1)";

const supportsWaapi = (el: Element | null): el is HTMLElement =>
  !!el && typeof (el as HTMLElement).animate === "function";

/**
 * Joue la tache d'encre : `ink` (calque plein écran couleur encre) puis
 * `page` (le fond de la modale, qui contient la feuille) s'ouvrent en
 * cercle depuis `origin`. Renvoie une fonction d'annulation qui retire
 * tous les clip-path (la page est alors simplement visible en entier).
 * Sans Web Animations API (tests jsdom, très vieux navigateurs), ne fait
 * rien : la page s'affiche directement.
 */
export function playInkReveal(ink: Element | null, page: Element | null, origin: InkOrigin): () => void {
  if (!supportsWaapi(ink) || !supportsWaapi(page)) return () => {};
  const anims: Animation[] = [];
  const circle = (el: HTMLElement, r0: number) => {
    // Coordonnées propres à l'élément : le fond de modale suit
    // visualViewport (--app-vv-offset), il n'est pas toujours collé à 0.
    const rect = el.getBoundingClientRect();
    const x = origin.x - rect.left;
    const y = origin.y - rect.top;
    const far = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) + 8;
    return [`circle(${r0}px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`];
  };
  const [inkFrom, inkTo] = circle(ink, origin.r ?? 24);
  anims.push(ink.animate({ clipPath: [inkFrom, inkTo] }, { duration: INK_SPREAD_MS, easing: EASE_INK, fill: "both" }));
  anims.push(ink.animate({ opacity: [1, 0] }, {
    duration: INK_FADE_MS,
    delay: PAGE_DELAY_MS + PAGE_REVEAL_MS - 60,
    easing: "ease-out",
    fill: "forwards",
  }));
  const [pageFrom, pageTo] = circle(page, 0);
  anims.push(page.animate({ clipPath: [pageFrom, pageTo] }, {
    duration: PAGE_REVEAL_MS,
    delay: PAGE_DELAY_MS,
    easing: EASE_PAGE,
    fill: "both",
  }));
  return () => anims.forEach((a) => a.cancel());
}

/**
 * Vol de la feuille vers la carte de la recette dans la grille : la cible
 * d'`exit` Framer (transform autour du centre de la feuille). null si la
 * carte n'est pas visible à l'écran (autre onglet, filtre qui la masque,
 * hors de la zone visible) ou si une autre modale est ouverte dessous
 * (édition depuis la fiche recette) : sortie normale dans ce cas.
 */
export function cardFlightTarget(sheet: HTMLElement | null, recipeId: string) {
  if (!sheet || typeof document === "undefined") return null;
  if (document.querySelectorAll(".modal-backdrop").length > 1) return null;
  const card = Array.from(document.querySelectorAll<HTMLElement>(".recipe-card[data-recipe-id]"))
    .find((el) => el.dataset.recipeId === recipeId);
  if (!card) return null;
  const c = card.getBoundingClientRect();
  const f = sheet.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  if (!c.width || !f.width || c.bottom < 0 || c.top > vh || c.right < 0 || c.left > vw) return null;
  return {
    x: c.left + c.width / 2 - (f.left + f.width / 2),
    y: c.top + c.height / 2 - (f.top + f.height / 2),
    scale: c.width / f.width,
  };
}

// --- Halo doré sur la carte qui vient d'être scellée -----------------
// Un petit magasin global (une seule recette à la fois) plutôt qu'une prop
// descendue d'AppShell -> RecipesView -> RecipeCard : seule la carte
// concernée se re-rend (useSyncExternalStore compare un booléen).
let sealed: { id: string; stamp: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Fait briller la carte `id` (après `delayMs`, le temps que la feuille arrive). */
export function markRecipeSealed(id: string, delayMs = 0): void {
  const start = () => {
    const stamp = Date.now();
    sealed = { id, stamp };
    emit();
    setTimeout(() => {
      if (sealed && sealed.stamp === stamp) {
        sealed = null;
        emit();
      }
    }, SEAL_PULSE_MS);
  };
  if (delayMs > 0) setTimeout(start, delayMs);
  else start();
}

/** Vrai pendant le halo doré de la carte `id`. */
export function useSealedPulse(id: string): boolean {
  return useSyncExternalStore(subscribe, () => !!sealed && sealed.id === id, () => false);
}
