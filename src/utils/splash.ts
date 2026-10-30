/* ------------------------------------------------------------------ */
/*  ÉCRAN DE DÉMARRAGE (#splash, voir index.html)                       */
/*  Peint par le navigateur avant tout JavaScript ; retiré ici en fondu    */
/*  dès que l'app a monté son premier écran (GrimoireDeMorgane.tsx) — que    */
/*  ce soit l'écran de chargement, la connexion ou l'app elle-même : dans     */
/*  les trois cas, quelque chose de réel est déjà dessiné en dessous.          */
/*  Si #splash porte data-min-ms (le cookie croqué), le fondu attend que     */
/*  l'animation ait eu ce temps depuis l'ouverture de la page — sauf si      */
/*  l'utilisateur a demandé moins d'animations (rien à attendre alors).      */
/*  Idempotent, et sans effet si #splash n'existe pas (tests, page de partage    */
/*  d'une recette ouverte autrement).                                             */
/* ------------------------------------------------------------------ */

// Doit rester aligné sur la transition d'opacité de #splash (index.html).
const SPLASH_FADE_MS = 350;

function remainingAnimationMs(el: HTMLElement): number {
  const minMs = Number(el.dataset.minMs);
  if (!minMs) return 0;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0;
  // performance.now() part du début de la navigation, c.-à-d. à peu près
  // du moment où le navigateur a peint #splash et lancé son animation.
  return Math.max(0, minMs - performance.now());
}

export function dismissSplash(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("splash");
  if (!el || el.dataset.dismissing) return;
  el.dataset.dismissing = "1";
  const leave = () => {
    el.classList.add("splash-leaving");
    window.setTimeout(() => el.remove(), SPLASH_FADE_MS + 50);
  };
  const wait = remainingAnimationMs(el);
  if (wait > 0) window.setTimeout(leave, wait);
  else leave();
}
