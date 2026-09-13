import { motion, useReducedMotion } from "motion/react";

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
// déjà posé sur .flourish (modalsBase.css.js), pas besoin de dupliquer la
// couleur ici.
const DRAW_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };
const DOT_TRANSITION = { delay: DRAW_TRANSITION.duration * 0.75, duration: 0.2 };

export default function Flourish() {
  const prefersReducedMotion = useReducedMotion();
  const Path = prefersReducedMotion ? "path" : motion.path;
  const Circle = prefersReducedMotion ? "circle" : motion.circle;
  const drawProps = prefersReducedMotion ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: DRAW_TRANSITION };
  const dotProps = prefersReducedMotion ? {} : { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 }, transition: DOT_TRANSITION };
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
