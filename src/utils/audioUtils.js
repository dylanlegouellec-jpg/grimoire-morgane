import { getStoredSoundEffects } from "./localSettings";

/* ------------------------------------------------------------------ */
/*  EFFETS SONORES — Web Audio API native (aucun fichier audio chargé)  */
/*                                                                        */
/*  Deux tonalités très courtes et discrètes, synthétisées à la volée      */
/*  via un simple oscillateur + une enveloppe de volume — pas de MP3/OGG    */
/*  à héberger ni précharger. Respecte le réglage "Effets sonores" des      */
/*  Réglages > Accessibilité (voir localSettings.js) directement en         */
/*  interne : les appelants n'ont rien à vérifier eux-mêmes, même            */
/*  ergonomie que triggerHaptic() dans utils/haptics.js.                     */
/*                                                                            */
/*  L'AudioContext est créé une seule fois, paresseusement, au tout           */
/*  premier son réellement joué — la plupart des navigateurs exigent un       */
/*  geste utilisateur avant d'autoriser l'audio, le créer plus tôt (ex. au    */
/*  chargement de la page) échouerait ou resterait "suspended" de toute        */
/*  façon.                                                                     */
/* ------------------------------------------------------------------ */

let sharedContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) {
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedContext.state === "suspended") {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

// Une seule note très courte, avec une enveloppe (montée quasi instantanée,
// descente douce) pour éviter tout "clic" numérique brutal — volume
// volontairement très faible : un accusé de réception discret, jamais un
// vrai bip qui distrairait.
function playTone(frequency, { duration = 0.09, startTime = 0, peakVolume = 0.05 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const t0 = ctx.currentTime + startTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peakVolume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    /* jamais bloquant : au pire, silence */
  }
}

/* ------------------------------------------------------------------ */
/*  API PUBLIQUE                                                        */
/* ------------------------------------------------------------------ */

// Clic court, nettement audible (pas juste un souffle) — navigation basse,
// boutons d'action, et désormais tout élément cliquable de l'app (voir
// initAudioOnFirstTouch ci-dessous).
export function playClickSound() {
  if (!getStoredSoundEffects()) return;
  playTone(720, { duration: 0.08, peakVolume: 0.14 });
}

// Double note ascendante (440Hz -> 880Hz) — validation d'une recette ou
// d'une étape (ex. "Sceller la recette", fin d'étape en Mode Cuisine).
export function playSuccessSound() {
  if (!getStoredSoundEffects()) return;
  playTone(440, { duration: 0.1, peakVolume: 0.06 });
  playTone(880, { duration: 0.14, startTime: 0.09, peakVolume: 0.06 });
}

/* ------------------------------------------------------------------ */
/*  DÉBLOCAGE AUDIO + CLIC GLOBAL                                       */
/*                                                                        */
/*  Sur mobile (iOS en particulier), un AudioContext reste "suspended"     */
/*  — donc muet — tant qu'il n'a pas été créé/repris DANS le contexte       */
/*  d'un vrai geste utilisateur. getAudioContext() ci-dessus s'en charge    */
/*  à chaque appel, mais le tout premier son d'une session (souvent le      */
/*  premier clic, avant même qu'un composant n'ait eu l'occasion d'appeler  */
/*  playClickSound()) peut arriver trop tôt — d'où ce déblocage explicite   */
/*  au tout premier pointerdown/click de l'app, une fois pour toutes.       */
/*                                                                          */
/*  Le clic global lui-même utilise la délégation d'événements (un seul     */
/*  listener sur `document`, phase de capture) plutôt qu'un écouteur par     */
/*  élément : fonctionne pour tout bouton/lien/case à cocher présent OU      */
/*  ajouté plus tard (React re-rend en permanence), sans avoir à modifier    */
/*  chaque composant un par un — remplace donc les appels ponctuels à        */
/*  playClickSound() qui existaient auparavant dans Seal.jsx/NavButton.jsx.  */
/* ------------------------------------------------------------------ */
const CLICKABLE_SELECTOR = 'button, a, input[type="checkbox"], .clickable';
let audioInitialized = false;

export function initAudioOnFirstTouch() {
  if (typeof document === "undefined" || audioInitialized) return;
  audioInitialized = true;

  const unlock = () => { getAudioContext(); };
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("click", unlock, { once: true });

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target && e.target.closest ? e.target.closest(CLICKABLE_SELECTOR) : null;
      if (!target || target.disabled) return;
      playClickSound();
    },
    true // phase de capture : indépendant d'un éventuel stopPropagation() posé plus bas dans l'arbre
  );
}
