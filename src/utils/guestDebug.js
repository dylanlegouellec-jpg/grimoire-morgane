/* ------------------------------------------------------------------ */
/*  DEBUG TEMPORAIRE — mode invité (?atelier=1) uniquement.              */
/*  Petit bus d'événements pour faire remonter, en clair sur l'écran      */
/*  (voir GuestDebugOverlay.jsx), ce qui se passe réellement au moment     */
/*  d'un changement de filtre : impossible d'ouvrir la console d'un       */
/*  téléphone à distance, donc l'app affiche elle-même son propre         */
/*  journal. À retirer une fois le bug de latence/animation résolu.       */
/*                                                                        */
/*  Regroupé en un seul lot par frame (requestAnimationFrame) plutôt      */
/*  qu'un événement + un re-rendu React par ligne : le premier jet de cet */
/*  outil dispatchait un événement PAR carte PAR étape (jusqu'à ~70 par   */
/*  changement de filtre), et GuestDebugOverlay forçait en plus une       */
/*  lecture de mise en page (scrollTop = scrollHeight) à chacun — le      */
/*  outil de mesure était devenu lui-même la plus grosse source de        */
/*  latence observée (le fameux blocage de plusieurs secondes), faussant  */
/*  complètement la mesure du vrai bug qu'il était censé aider à trouver. */
/* ------------------------------------------------------------------ */
export const GUEST_DEBUG_EVENT = "grimoire-guest-debug";

let epoch = typeof performance !== "undefined" ? performance.now() : 0;
let buffer = [];
let flushScheduled = false;

export function isGuestMode() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("atelier") === "1";
}

function flush() {
  flushScheduled = false;
  if (!buffer.length) return;
  const batch = buffer;
  buffer = [];
  window.dispatchEvent(new CustomEvent(GUEST_DEBUG_EVENT, { detail: batch }));
}

function schedule() {
  if (flushScheduled || typeof window === "undefined") return;
  flushScheduled = true;
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
  else setTimeout(flush, 16);
}

export function debugMark(label) {
  epoch = performance.now();
  buffer.push(`\n— ${label} —`);
  schedule();
}

export function debugLog(message) {
  const t = Math.round(performance.now() - epoch);
  buffer.push(`+${t}ms ${message}`);
  schedule();
}
