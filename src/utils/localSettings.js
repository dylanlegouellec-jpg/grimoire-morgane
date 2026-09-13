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

/* --- Opacité du fond de la nav basse (0 → 1) ---------------------------
   0 = verre dépoli seul (on voit le contenu défiler, flouté, à travers la
   barre), 1 = bandeau parchemin plein. Purement local à l'appareil, comme
   les effets sonores ci-dessus : `profiles` n'a pas de colonne pour ça,
   donc rien à synchroniser par compte. */
const NAV_OPACITY_KEY = "grimoire_nav_opacity";
const DEFAULT_NAV_OPACITY = 0;

export function getStoredNavOpacity() {
  try {
    const raw = localStorage.getItem(NAV_OPACITY_KEY);
    if (raw !== null) {
      const v = Number(raw);
      if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
    }
  } catch {
    /* repli ci-dessous */
  }
  return DEFAULT_NAV_OPACITY;
}

export function storeNavOpacity(value) {
  try {
    localStorage.setItem(NAV_OPACITY_KEY, String(value));
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

// Exposé en variable CSS sur <html> (donc :root) plutôt qu'en style inline
// sur la nav : la mise en page paysage redéfinit son fond de son côté (voir
// responsive.css.js), le CSS reste ainsi seul juge de qui s'en sert. Même
// principe qu'applyTheme()/applyTextSize(), qui posent un attribut.
export function applyNavOpacity(value) {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.style.setProperty("--nav-opacity", String(value));
  }
}

/* --- Portée du plan de repas affichée ("household" | "personal") -------
   Purement local à l'appareil, comme les effets sonores ci-dessus : c'est
   une préférence d'AFFICHAGE (quel sous-ensemble du plan regarder), pas
   une donnée de foyer — chaque membre peut préférer un onglet de départ
   différent sans que ça n'affecte les autres ni ne mérite une
   synchronisation. Voir PlanningView.jsx. */
const PLANNING_SCOPE_KEY = "grimoire_planning_scope";
const VALID_PLANNING_SCOPES = ["household", "personal"];

export function getStoredPlanningScope() {
  try {
    const v = localStorage.getItem(PLANNING_SCOPE_KEY);
    if (VALID_PLANNING_SCOPES.includes(v)) return v;
  } catch {
    /* repli ci-dessous */
  }
  return "household";
}

export function storePlanningScope(scope) {
  try {
    localStorage.setItem(PLANNING_SCOPE_KEY, scope);
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

/* --- Portée des listes de courses ("household" | "personal") -----------
   Même principe que la portée du plan de repas ci-dessus, mais ICI le
   champ "scope" qu'elle filtre est une vraie colonne Supabase sur
   `shopping_lists` (pas juste un champ dans un tableau partagé) : chaque
   liste appartient réellement à une portée, et une liste "personal" est en
   plus rattachée à un `user_id`. Ce qui reste purement local ici, c'est
   seulement LA PRÉFÉRENCE D'ONGLET actif sur cet appareil (+ la mémoire de
   la dernière liste ouverte par portée, ci-dessous) — voir
   useShoppingLists.js. */
const SHOPPING_SCOPE_KEY = "grimoire_shopping_scope";
const VALID_SHOPPING_SCOPES = ["household", "personal"];

export function getStoredShoppingScope() {
  try {
    const v = localStorage.getItem(SHOPPING_SCOPE_KEY);
    if (VALID_SHOPPING_SCOPES.includes(v)) return v;
  } catch {
    /* repli ci-dessous */
  }
  return "household";
}

export function storeShoppingScope(scope) {
  try {
    localStorage.setItem(SHOPPING_SCOPE_KEY, scope);
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

/* --- Tutoriel guidé (onboarding) terminé ? -----------------------------
   Repli hors-ligne / avant résolution de session, comme les autres
   réglages synchronisés par compte ci-dessus (voir utils/onboarding.js
   pour la synchronisation Supabase, volontairement isolée de
   utils/profile.js — colonne `profiles.has_completed_onboarding` pas
   forcément migrée sur toutes les installations). Ce flag LOCAL, lui,
   suffit à lui seul à ne jamais rejouer le tuto deux fois sur CET
   appareil, même si la synchronisation compte échoue ou n'existe pas
   encore. */
const ONBOARDING_COMPLETED_KEY = "grimoire_onboarding_completed";

export function getStoredOnboardingCompleted() {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "1";
  } catch {
    /* repli ci-dessous */
  }
  return false;
}

export function storeOnboardingCompleted(value) {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? "1" : "0");
  } catch {
    /* rien à faire si le stockage échoue */
  }
}

// Mémorise, par portée, la dernière liste ouverte sur CET appareil — pour
// qu'en rebasculant sur "personal" on retrouve la même liste perso plutôt
// que la première de la liste à chaque fois.
const SHOPPING_ACTIVE_LIST_PREFIX = "grimoire_shopping_active_list_";

export function getStoredActiveShoppingListId(scope) {
  try {
    return localStorage.getItem(SHOPPING_ACTIVE_LIST_PREFIX + scope) || null;
  } catch {
    return null;
  }
}

export function storeActiveShoppingListId(scope, id) {
  try {
    if (id) localStorage.setItem(SHOPPING_ACTIVE_LIST_PREFIX + scope, id);
    else localStorage.removeItem(SHOPPING_ACTIVE_LIST_PREFIX + scope);
  } catch {
    /* rien à faire si le stockage échoue */
  }
}
