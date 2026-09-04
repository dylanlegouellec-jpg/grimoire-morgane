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

// Clic très doux et court — navigation basse, boutons d'action principaux.
export function playClickSound() {
  if (!getStoredSoundEffects()) return;
  playTone(660, { duration: 0.07, peakVolume: 0.04 });
}

// Double note ascendante (440Hz -> 880Hz) — validation d'une recette ou
// d'une étape (ex. "Sceller la recette", fin d'étape en Mode Cuisine).
export function playSuccessSound() {
  if (!getStoredSoundEffects()) return;
  playTone(440, { duration: 0.1, peakVolume: 0.06 });
  playTone(880, { duration: 0.14, startTime: 0.09, peakVolume: 0.06 });
}
