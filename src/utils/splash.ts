/* ------------------------------------------------------------------ */
/*  ÉCRAN DE DÉMARRAGE (#splash, voir index.html)                       */
/*  Peint par le navigateur avant tout JavaScript ; retiré ici en fondu    */
/*  dès que l'app a monté son premier écran (GrimoireDeMorgane.tsx) — que    */
/*  ce soit l'écran de chargement, la connexion ou l'app elle-même : dans     */
/*  les trois cas, quelque chose de réel est déjà dessiné en dessous.          */
/*  Idempotent, et sans effet si #splash n'existe pas (tests, page de partage    */
/*  d'une recette ouverte autrement).                                             */
/* ------------------------------------------------------------------ */

// Doit rester aligné sur la transition d'opacité de #splash (index.html).
const SPLASH_FADE_MS = 350;

export function dismissSplash(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("splash");
  if (!el || el.classList.contains("splash-leaving")) return;
  el.classList.add("splash-leaving");
  window.setTimeout(() => el.remove(), SPLASH_FADE_MS + 50);
}
