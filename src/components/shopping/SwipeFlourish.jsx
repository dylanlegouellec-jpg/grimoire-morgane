import { useState } from "react";
import { motion, useMotionValue, animate } from "motion/react";

/* ------------------------------------------------------------------ */
/*  FLORILÈGE SWIPEABLE (geste tactile générique) — Framer Motion         */
/*  `drag="x"`, remplace l'ancien suivi maison (onPointerMove + useState   */
/*  par pixel + transition CSS). Sans risque de rejouer le bug de           */
/*  useDismissibleSheet.js (arbitrage `touch-action` gagné par le            */
/*  défilement natif) : ce glissement est HORIZONTAL ("x") alors que          */
/*  `touch-action: pan-y` (voir misc.css.js) n'accorde le défilement natif      */
/*  qu'à la verticale — les deux axes ne se disputent jamais le même geste,       */
/*  c'est justement l'association que Framer documente pour un drag             */
/*  horizontal posé dans une page qui défile verticalement.                        */
/*                                                                                    */
/*  `dragConstraints={{ left: 0, right: 0 }}` + `dragElastic={1}` : la position       */
/*  de repos reste 0 des deux côtés, mais sans AUCUNE résistance en s'en                */
/*  éloignant (élasticité maximale) — suit donc le doigt au pixel près, comme             */
/*  avant. `dragMomentum={false}` + un `animate()` manuel au relâchement (plutôt            */
/*  que l'inertie automatique de Framer) : garde la même sensation de rebond                 */
/*  "élastique" (spring) que l'ancienne courbe CSS cubic-bezier, quelle que soit               */
/*  l'issue du geste (tap, glissement confirmé ou abandonné).                                    */
/* ------------------------------------------------------------------ */
const SWIPE_THRESHOLD_PX = 40;
const RELEASE_SPRING = { type: "spring", stiffness: 500, damping: 30 };

export default function SwipeFlourish({ onSwipeRight, onSwipeLeft, onTap }) {
  const x = useMotionValue(0);
  // Seul bout d'état React : la couleur d'indice (vert/rouge) ne change que
  // par PALIER (franchissement de ±24px), jamais en continu — pas besoin
  // qu'elle suive elle-même une MotionValue.
  const [hint, setHint] = useState(null); // null | "right" | "left"

  const handleDrag = (_event, info) => {
    const next = info.offset.x > 24 ? "right" : info.offset.x < -24 ? "left" : null;
    if (next !== hint) setHint(next);
  };

  const handleDragEnd = (_event, info) => {
    setHint(null);
    animate(x, 0, RELEASE_SPRING);
    const dx = info.offset.x;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
      if (onTap) onTap();
      return;
    }
    if (dx > 0) onSwipeRight();
    else onSwipeLeft();
  };

  return (
    <motion.div
      className={`flourish flourish-swipe ${hint === "right" ? "hint-right" : hint === "left" ? "hint-left" : ""}`}
      aria-hidden="true"
      style={{ x }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      ❦
    </motion.div>
  );
}
