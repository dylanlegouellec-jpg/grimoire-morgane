/* ------------------------------------------------------------------ */
/*  LANGUE (RÉGLAGES — Apparence & Langue)                              */
/*  Voir utils/localSettings.js pour la note sur la portée de ce réglage */
/*  (mémorisé, mais pas encore branché à une vraie traduction de l'app). */
/* ------------------------------------------------------------------ */

import type { Language } from "../../utils/localSettings";

interface LanguageOption {
  value: Language;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];
