/* ------------------------------------------------------------------ */
/*  DEBUG TEMPORAIRE — mode invité (?atelier=1) uniquement.              */
/*  Petit bus d'événements pour faire remonter, en clair sur l'écran      */
/*  (voir GuestDebugOverlay.jsx), ce qui se passe réellement au moment     */
/*  d'un changement de filtre : impossible d'ouvrir la console d'un       */
/*  téléphone à distance, donc l'app affiche elle-même son propre         */
/*  journal. À retirer une fois le bug de latence/animation résolu.       */
/* ------------------------------------------------------------------ */
export const GUEST_DEBUG_EVENT = "grimoire-guest-debug";

let epoch = typeof performance !== "undefined" ? performance.now() : 0;

export function isGuestMode() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("atelier") === "1";
}

export function debugMark(label) {
  epoch = performance.now();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GUEST_DEBUG_EVENT, { detail: `\n— ${label} —` }));
  }
}

export function debugLog(message) {
  const t = Math.round(performance.now() - epoch);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GUEST_DEBUG_EVENT, { detail: `+${t}ms ${message}` }));
  }
}
