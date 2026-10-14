/* ------------------------------------------------------------------ */
/*  RETOUR HAPTIQUE — utilitaire cross-platform                        */
/*                                                                      */
/*  `navigator.vibrate()` est la seule API Web qui déclenche un vrai      */
/*  vibreur matériel — couverte ici, disponible sur Android/Chrome/Edge   */
/*  et la plupart des navigateurs basés sur Blink.                        */
/*                                                                        */
/*  MISE À JOUR : depuis iOS 18, un petit « clic » réel est possible via  */
/*  un interrupteur natif invisible (voir triggerIosTick plus bas) ; le    */
/*  pulse visuel décrit ci-dessous reste le repli des iOS plus anciens.    */
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
/*                                                                        */
/*  Réglage "Retour tactile" (Accessibilité, voir utils/localSettings.js) : */
/*  coupe les DEUX mécanismes ensemble, vibration réelle et pulse visuel     */
/*  de repli — sur iPhone, seul le second est perceptible (WebKit n'expose    */
/*  pas l'API Vibration), donc ne couper que la vibration laisserait ce         */
/*  réglage sans effet visible sur cette plateforme.                             */
/* ------------------------------------------------------------------ */
import { getStoredHapticFeedback } from "./localSettings";

const CAN_VIBRATE = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

// Même type que le premier argument de Navigator.vibrate() : un nombre de
// ms, ou un motif [on, off, on, ...].
export type VibratePattern = number | number[];

// À utiliser si un appelant a besoin d'adapter son comportement selon la
// disponibilité d'un vrai vibreur matériel (ex. insister moins sur le
// retour visuel quand la vibration réelle est déjà là).
export function isHapticVibrationSupported(): boolean {
  return CAN_VIBRATE;
}

// `pattern` : un nombre de ms, ou un motif [on, off, on, ...] — mêmes
// valeurs qu'avant (voir l'ancien triggerHaptic de utils/helpers.js, qui
// délègue maintenant ici). Retourne `true` si une vraie vibration a été
// déclenchée, `false` sinon (pas de support, réglage désactivé, ou échec
// silencieux).
export function triggerHaptic(pattern: VibratePattern = 15): boolean {
  if (!getStoredHapticFeedback()) return false;
  if (!CAN_VIBRATE) return triggerIosTick(pattern);
  try {
    return !!navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/* --- iPhone : « clic » du Taptic Engine via un interrupteur natif -------
   Pas d'API de vibration dans Safari, MAIS depuis iOS 18 basculer un
   interrupteur natif (<input type="checkbox" switch>) produit le petit
   retour haptique du système. On garde donc un interrupteur invisible hors
   écran, et on le bascule via son <label> (un clic programmé sur le label
   est celui que Safari accepte). Ne marche que pendant/peu après un geste
   de l'utilisateur, ce qui est le cas de tous nos appels (appui, glisser…).
   Un motif [on, off, on, …] donne un clic par « on » (au plus 3). Sur un
   iOS plus ancien, le basculement est sans effet : le repli visuel de
   triggerHapticFeedback prend le relais si on renvoie false — impossible de
   savoir si le clic a été ressenti, donc on ne le renvoie que sur iOS 18+. */
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
// iOS 18+ : version lue dans « OS 18_0 like Mac OS X » (iPhone) ou « Version/18.0 » (iPad/Safari).
const IOS_MAJOR = (() => {
  if (typeof navigator === "undefined") return 0;
  const m = navigator.userAgent.match(/OS (\d+)_/) || navigator.userAgent.match(/Version\/(\d+)/);
  return m ? Number(m[1]) : 0;
})();
const IOS_SWITCH_HAPTICS = IS_IOS && IOS_MAJOR >= 18;

let switchLabel: HTMLLabelElement | null = null;
let switchInput: HTMLInputElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (switchLabel && switchLabel.isConnected) return switchLabel;
  if (typeof document === "undefined" || !document.body) return null;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.className = "haptic-switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  switchInput = input;
  return label;
}

function tickOnce(): void {
  const label = ensureSwitch();
  if (!label) return;
  // Ne jamais voler le focus d'un champ en cours de saisie (le clavier se
  // refermerait) : on le rend aussitôt à l'élément qui l'avait.
  const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
  label.click();
  if (active && document.activeElement !== active && typeof active.focus === "function") {
    active.focus({ preventScroll: true });
  } else if (document.activeElement === switchInput) {
    switchInput?.blur();
  }
}

export function triggerIosTick(pattern: VibratePattern = 15): boolean {
  if (!IOS_SWITCH_HAPTICS) return false;
  try {
    const ticks = Array.isArray(pattern) ? pattern.filter((_, i) => i % 2 === 0).length : 1;
    const gaps = Array.isArray(pattern) ? pattern : [];
    tickOnce();
    // Clics suivants d'un motif : espacés comme les « on » du motif.
    let delay = 0;
    for (let i = 1; i < Math.min(ticks, 3); i++) {
      delay += (gaps[2 * i - 2] || 0) + (gaps[2 * i - 1] || 0);
      window.setTimeout(tickOnce, delay);
    }
    return true;
  } catch {
    return false;
  }
}

// Repli visuel pour les plateformes sans vibreur accessible (iOS) : ajoute
// brièvement une classe CSS de pulsation à l'élément fourni (ou à <html>
// par défaut si aucun élément n'est passé), retirée automatiquement après
// coup. N'essaie de vibrer QUE si aucun élément n'a été fourni pour le
// repli visuel serait de toute façon inutile (ex. depuis un contexte non-UI).
export function triggerHapticFeedback(target?: Element | null, pattern: VibratePattern = 15): boolean {
  if (!getStoredHapticFeedback()) return false;
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
