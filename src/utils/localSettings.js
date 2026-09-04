/* ------------------------------------------------------------------ */
/*  RÉGLAGES LOCAUX (repli hors-ligne)                                  */
/*                                                                      */
/*  Appui long, badge Nutri-Score et taille de texte sont désormais      */
/*  synchronisés PAR COMPTE dans la table `profiles` (voir utils/profile.js */
/*  + GrimoireDeMorgane.jsx) — mais restent toujours lus/écrits ICI en    */
/*  premier, en localStorage, pour ne jamais bloquer l'affichage hors     */
/*  ligne ou avant que la session Supabase ne soit résolue. Le thème      */
/*  suit le même principe (voir utils/theme.js).                          */
/* ------------------------------------------------------------------ */
const PRESS_DURATION_KEY = "grimoire_press_duration";
const DEFAULT_PRESS_DURATION = 750;
const VALID_PRESS_DURATIONS = [500, 750, 1000];

export function getStoredPressDuration() {
  try {
    const v = Number(localStorage.getItem(PRESS_DURATION_KEY));
    if (VALID_PRESS_DURATIONS.includes(v)) return v;
  } catch {
    /* localStorage indisponible (navigation privée...) : repli sur la valeur par défaut */
  }
  return DEFAULT_PRESS_DURATION;
}

export function storePressDuration(ms) {
  try {
    localStorage.setItem(PRESS_DURATION_KEY, String(ms));
  } catch {
    /* rien à faire si le stockage échoue, le réglage reste actif en mémoire */
  }
}

/* --- Badge Nutri-Score sur les cartes de recettes --------------------- */
const SHOW_NUTRISCORE_KEY = "grimoire_show_nutriscore";

export function getStoredShowNutriscore() {
  try {
    const v = localStorage.getItem(SHOW_NUTRISCORE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* repli ci-dessous */
  }
  return true;
}

export function storeShowNutriscore(value) {
  try {
    localStorage.setItem(SHOW_NUTRISCORE_KEY, value ? "1" : "0");
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

/* --- Taille du texte ("normal" | "large") ----------------------------- */
const TEXT_SIZE_KEY = "grimoire_text_size";
const VALID_TEXT_SIZES = ["normal", "large"];

export function getStoredTextSize() {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    if (VALID_TEXT_SIZES.includes(v)) return v;
  } catch {
    /* repli ci-dessous */
  }
  return "normal";
}

export function storeTextSize(size) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

// Applique la taille de texte sur <html data-text-size="..."> — même
// principe que applyTheme() dans utils/theme.js (styles.css.js cible
// html[data-text-size="large"] pour agrandir le rem de base).
export function applyTextSize(size) {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-text-size", size === "large" ? "large" : "normal");
  }
}

/* --- Langue ("fr" | "en") ----------------------------------------------
   Réglage mémorisé et affiché dans le sélecteur des Réglages, mais SANS
   effet sur les textes de l'app pour l'instant : tout le contenu du
   grimoire est écrit en dur en français dans les composants — une vraie
   traduction demanderait une passe d'internationalisation séparée, bien
   plus large que ce correctif. Le réglage est donc conservé (et prêt à
   être branché le jour où cette passe sera faite), sans prétendre à tort
   traduire quoi que ce soit aujourd'hui. */
const LANGUAGE_KEY = "grimoire_language";
const VALID_LANGUAGES = ["fr", "en"];

export function getStoredLanguage() {
  try {
    const v = localStorage.getItem(LANGUAGE_KEY);
    if (VALID_LANGUAGES.includes(v)) return v;
  } catch {
    /* repli ci-dessous */
  }
  return "fr";
}

export function storeLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

/* --- Effets sonores (clic / validation — voir utils/audioUtils.js) -----
   Contrairement aux autres réglages ci-dessus, purement local : jamais
   synchronisé dans `profiles`, l'utilisateur n'a pas demandé qu'il suive
   le compte d'un appareil à l'autre, juste qu'il soit mémorisé ici. */
const SOUND_EFFECTS_KEY = "sound_effects_enabled";

export function getStoredSoundEffects() {
  try {
    const v = localStorage.getItem(SOUND_EFFECTS_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* repli ci-dessous */
  }
  return true; // activés par défaut
}

export function storeSoundEffects(value) {
  try {
    localStorage.setItem(SOUND_EFFECTS_KEY, value ? "1" : "0");
  } catch {
    /* rien à faire si le stockage échoue */
  }
}
