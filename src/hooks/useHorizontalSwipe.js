import { useRef } from "react";

/* ------------------------------------------------------------------ */
/*  SWIPE HORIZONTAL GÉNÉRIQUE — verrouillage d'axe pour ne jamais        */
/*  interférer avec un défilement vertical (même principe que le swipe     */
/*  de filtres déjà en place dans AppShell.jsx — extrait ici pour être       */
/*  réutilisé ailleurs, ex. le changement de semaine dans PlanningView).      */
/*  Jamais de preventDefault() : le sens du geste n'est décidé qu'après       */
/*  quelques pixels de mouvement (AXIS_LOCK_THRESHOLD_PX), et tant qu'il         */
/*  n'est pas tranché, le navigateur reste entièrement libre de scroller          */
/*  verticalement si c'est finalement ce qui se produit. */
/* ------------------------------------------------------------------ */
const AXIS_LOCK_THRESHOLD_PX = 10;
const SWIPE_COMMIT_PX = 55;

export default function useHorizontalSwipe(onSwipeLeft, onSwipeRight) {
  const startRef = useRef(null);
  const axisRef = useRef(null);

  const onTouchStart = (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY };
    axisRef.current = null;
  };

  const onTouchMove = (e) => {
    if (startRef.current == null || axisRef.current != null) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    if (Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX && Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX) return;
    axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  };

  const onTouchEnd = (e) => {
    if (startRef.current == null || axisRef.current !== "x") {
      startRef.current = null;
      axisRef.current = null;
      return;
    }
    const t = e.changedTouches && e.changedTouches[0];
    const dx = t ? t.clientX - startRef.current.x : 0;
    startRef.current = null;
    axisRef.current = null;
    if (Math.abs(dx) < SWIPE_COMMIT_PX) return;
    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
