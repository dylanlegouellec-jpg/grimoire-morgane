/* ------------------------------------------------------------------ */
/*  RETOUR HAPTIQUE — utilitaire cross-platform                        */
/*                                                                      */
/*  `navigator.vibrate()` est la seule API Web qui déclenche un vrai      */
/*  vibreur matériel — couverte ici, disponible sur Android/Chrome/Edge   */
/*  et la plupart des navigateurs basés sur Blink.                        */
/*                                                                        */
/*  iOS (Safari, et une PWA installée sur iOS) : WebKit n'implémente PAS  */
/*  l'API Vibration, par choix délibéré de la plateforme — aucune          */
/*  bibliothèque JS ne peut contourner ça depuis du contenu Web, et il      */
/*  n'existe à ce jour aucune "API Web Haptics" publique qui donnerait      */
/*  accès au Taptic Engine depuis une page/PWA. Plutôt que de prétendre     */
/*  simuler une vraie vibration qu'on ne peut pas produire, le repli ci-    */
/*  dessous déclenche un micro-retour VISUEL (courte pulsation) sur          */
/*  l'élément pressé — un substitut perceptif, pas une vibration. Combiné   */
/*  à l'animation d'enfoncement/rebond de l'appui long (voir RecipeCard.jsx */
/*  et hooks/useLongPress.js), ça donne quand même une sensation "tactile"  */
/*  cohérente sur les appareils sans vibreur accessible.                    */
/* ------------------------------------------------------------------ */

const CAN_VIBRATE = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

// À utiliser si un appelant a besoin d'adapter son comportement selon la
// disponibilité d'un vrai vibreur matériel (ex. insister moins sur le
// retour visuel quand la vibration réelle est déjà là).
export function isHapticVibrationSupported() {
  return CAN_VIBRATE;
}

// `pattern` : un nombre de ms, ou un motif [on, off, on, ...] — mêmes
// valeurs qu'avant (voir l'ancien triggerHaptic de utils/helpers.js, qui
// délègue maintenant ici). Retourne `true` si une vraie vibration a été
// déclenchée, `false` sinon (pas de support, ou échec silencieux).
export function triggerHaptic(pattern = 15) {
  if (!CAN_VIBRATE) return false;
  try {
    return !!navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

// Repli visuel pour les plateformes sans vibreur accessible (iOS) : ajoute
// brièvement une classe CSS de pulsation à l'élément fourni (ou à <html>
// par défaut si aucun élément n'est passé), retirée automatiquement après
// coup. N'essaie de vibrer QUE si aucun élément n'a été fourni pour le
// repli visuel serait de toute façon inutile (ex. depuis un contexte non-UI).
export function triggerHapticFeedback(target, pattern = 15) {
  const vibrated = triggerHaptic(pattern);
  if (vibrated) return true;
  try {
    const el = target && typeof target.classList !== "undefined"
      ? target
      : (typeof document !== "undefined" ? document.documentElement : null);
    if (!el) return false;
    el.classList.add("haptic-pulse");
    window.setTimeout(() => el.classList.remove("haptic-pulse"), 180);
  } catch {
    /* ignore : purement décoratif, jamais bloquant */
  }
  return false;
}
