import { getStoredLanguage } from "../../utils/localSettings";
/* ------------------------------------------------------------------ */
/*  TEMPS D'APPUI LONG (RÉGLAGES)                                      */
/*  Partagé entre SecretSettingsModal et RecipeForm                    */
/* ------------------------------------------------------------------ */

interface PressDurationOption {
  value: number;
  label: string;
  sub: string;
}

export const PRESS_DURATION_OPTIONS: PressDurationOption[] = [
  { value: 500, label: "Court", sub: "0,5 s" },
  { value: 750, label: "Standard", sub: "0,75 s" },
  { value: 1000, label: "Long", sub: "1 s" },
];
export function formatPressDuration(ms: number): string {
  const s = ms / 1000;
  // Virgule décimale en français seulement (« 0,75s » / « 0.75s »).
  if (Number.isInteger(s)) return `${s}s`;
  return getStoredLanguage() === "en" ? `${s}s` : `${s.toString().replace(".", ",")}s`;
}

