/* ------------------------------------------------------------------ */
/*  ÉCRAN DE DÉMARRAGE (#splash, voir index.html)                       */
/*  Peint par le navigateur avant tout JavaScript ; retiré ici en fondu    */
/*  dès que l'app a monté son premier écran (GrimoireDeMorgane.tsx) — que    */
/*  ce soit l'écran de chargement, la connexion ou l'app elle-même : dans     */
/*  les trois cas, quelque chose de réel est déjà dessiné en dessous.          */
/*  Avant le fondu, on attend la fin des animations FINIES de #splash (le      */
/*  cookie croqué, ses miettes) en les interrogeant directement               */
/*  (getAnimations) : aucune durée à recopier ici, et l'attente suit           */
/*  l'animation réelle même si le premier affichage a été tardif. Les          */
/*  animations infinies (la respiration du cookie) sont ignorées. Rien à       */
/*  attendre si l'utilisateur a demandé moins d'animations, ni avec            */
/*  { immediate: true } (page de partage d'une recette : rien à cacher).       */
/*  Idempotent, et sans effet si #splash n'existe pas (tests, etc.).           */
/* ------------------------------------------------------------------ */

// Doit rester aligné sur la transition d'opacité de #splash (index.html).
const SPLASH_FADE_MS = 350;
// Filet de sécurité : jamais plus que ça d'attente une fois l'app prête.
const MAX_ANIMATION_WAIT_MS = 3000;

function pendingAnimations(el: HTMLElement): Animation[] {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return [];
  if (typeof el.getAnimations !== "function") return [];
  return el.getAnimations({ subtree: true }).filter((a) => {
    const end = a.effect?.getComputedTiming().endTime;
    return typeof end === "number" && Number.isFinite(end) && a.playState !== "finished";
  });
}

export function dismissSplash({ immediate = false }: { immediate?: boolean } = {}): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("splash");
  if (!el || el.classList.contains("splash-leaving")) return;
  const leave = () => {
    if (el.classList.contains("splash-leaving")) return;
    el.classList.add("splash-leaving");
    window.setTimeout(() => el.remove(), SPLASH_FADE_MS + 50);
  };
  if (immediate) return leave();
  // Un appel est déjà en train d'attendre la fin de l'animation.
  if (el.dataset.dismissing) return;
  el.dataset.dismissing = "1";
  const pending = pendingAnimations(el);
  if (pending.length === 0) return leave();
  Promise.race([
    // finished est rejetée si l'animation est annulée : on part quand même.
    Promise.all(pending.map((a) => a.finished)).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, MAX_ANIMATION_WAIT_MS)),
  ]).then(leave);
}
