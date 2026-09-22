/* ------------------------------------------------------------------ */
/*  TAILLE DE TEXTE (RÉGLAGES — Accessibilité)                         */
/*  Partagé par SecretSettingsModal — voir utils/localSettings.js       */
/*  (stockage + application sur <html data-text-size="...">).           */
/* ------------------------------------------------------------------ */

import type { TextSize } from "../../utils/localSettings";

interface TextSizeOption {
  value: TextSize;
  label: string;
}

export const TEXT_SIZE_OPTIONS: TextSizeOption[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grand" },
];
