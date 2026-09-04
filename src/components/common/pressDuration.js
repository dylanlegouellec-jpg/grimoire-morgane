/* ------------------------------------------------------------------ */
/*  TEMPS D'APPUI LONG (RÉGLAGES)                                      */
/*  Partagé entre SecretSettingsModal et RecipeForm                    */
/* ------------------------------------------------------------------ */

export const PRESS_DURATION_OPTIONS = [
  { value: 500, label: "Court", sub: "0,5 s" },
  { value: 750, label: "Standard", sub: "0,75 s" },
  { value: 1000, label: "Long", sub: "1 s" },
];
export function formatPressDuration(ms) {
  const s = ms / 1000;
  return Number.isInteger(s) ? `${s}s` : `${s.toString().replace(".", ",")}s`;
}

