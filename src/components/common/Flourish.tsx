import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "../../constants/motion";

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS PARTAGÉS                                         */
/* ------------------------------------------------------------------ */

// Remplace l'ancien glyphe texte "❦" par un petit ornement en SVG qui SE
// DESSINE (pathLength) à chaque montage — donc à CHAQUE ouverture d'une
// modale, puisque ce composant partagé est utilisé comme séparateur dans
// une trentaine d'entre elles (RecipeDetail, tous les *OptionsModal,
// *ConfirmModal...) : un seul petit changement ici suffit à leur donner
// à toutes ce même détail, sans les toucher une par une. Les deux traits
// démarrent du point central et se déploient chacun vers son extrémité en
// même temps (deux <motion.path> distincts plutôt qu'un seul tracé continu)
// pour un effet d'"éclosion" depuis le centre plutôt qu'un simple tracé de
// gauche à droite. "stroke=currentColor" : hérite du "color: var(--gold)"
// déjà posé sur .flourish (modalsBase.css), pas besoin de dupliquer la
// couleur ici.
const DRAW_TRANSITION: { duration: number; ease: [number, number, number, number] } = { duration: 0.55, ease: EASE_OUT };
const DOT_TRANSITION = { delay: DRAW_TRANSITION.duration * 0.75, duration: 0.2 };

// "undrawn" : ornement laissé NON dessiné (traits et point masqués) — pour
// la page voisine découverte pendant qu'on tourne une page de la fiche
// (RecipePage "preview") : sans lui, il s'y dessinait sous le doigt et
// avait déjà fini quand on la voyait ; il se dessine désormais une fois la
// page lâchée, quand la vraie page se monte à sa place.
const UNDRAWN_PATH = { pathLength: 0 };
const UNDRAWN_DOT = { opacity: 0, scale: 0 };

export default function Flourish({ undrawn = false }: { undrawn?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const Path = prefersReducedMotion ? "path" : motion.path;
  const Circle = prefersReducedMotion ? "circle" : motion.circle;
  const drawProps = prefersReducedMotion ? {} : { initial: UNDRAWN_PATH, animate: undrawn ? UNDRAWN_PATH : { pathLength: 1 }, transition: DRAW_TRANSITION };
  const dotProps = prefersReducedMotion ? {} : { initial: UNDRAWN_DOT, animate: undrawn ? UNDRAWN_DOT : { opacity: 1, scale: 1 }, transition: DOT_TRANSITION };
  return (
    <div className="flourish" aria-hidden="true">
      <svg viewBox="0 0 100 20" width="70" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <Path d="M50,10 C34,2 20,18 2,10" {...drawProps} />
        <Path d="M50,10 C66,2 80,18 98,10" {...drawProps} />
        <Circle cx="50" cy="10" r="2.5" fill="currentColor" stroke="none" {...dotProps} />
      </svg>
    </div>
  );
}
