import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  BOUTONS FIXES À L'ÉCRAN, RENDUS À LA RACINE DE LA PAGE             */
/*  Le bouton « + » flottant (Recettes, Planning) est fixé à l'écran   */
/*  mais vivait DANS l'onglet, lui-même animé à son arrivée (fondu +   */
/*  glissement) à l'intérieur de .app-content qui rogne ce qui dépasse. */
/*  Sur iPhone, Safari découpe alors parfois cet élément fixe aux bords */
/*  de ses parents le temps de l'animation : le « + » apparaissait coupé */
/*  à moitié en ouvrant le Planning. Rendu ici, directement dans <body>, */
/*  plus aucun parent animé ni rogné au-dessus de lui.                 */
/* ------------------------------------------------------------------ */
export default function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
