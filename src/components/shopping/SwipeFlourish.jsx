import { useState, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  FLORILÈGE SWIPEABLE (geste tactile générique)                      */
/* ------------------------------------------------------------------ */

export default function SwipeFlourish({ onSwipeRight, onSwipeLeft, onTap }) {
  const startRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    startRef.current = e.clientX;
    setIsDragging(true);
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const handlePointerMove = (e) => {
    if (startRef.current == null) return;
    setDragX(e.clientX - startRef.current);
  };
  const endGesture = (e) => {
    if (startRef.current == null) { setIsDragging(false); setDragX(0); return; }
    const dx = e.clientX - startRef.current;
    startRef.current = null;
    setIsDragging(false);
    setDragX(0);
    if (Math.abs(dx) < 40) {
      if (onTap) onTap();
      return;
    }
    if (dx > 0) onSwipeRight();
    else onSwipeLeft();
  };
  const cancelGesture = () => {
    startRef.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  const hintClass = dragX > 24 ? "hint-right" : dragX < -24 ? "hint-left" : "";

  return (
    <div
      className={`flourish flourish-swipe ${hintClass}`}
      aria-hidden="true"
      style={{
        transform: `translateX(${dragX}px)`,
        // Aucune transition pendant le geste (suit le doigt au pixel près) ;
        // un rebond élastique uniquement au relâchement.
        transition: isDragging
          ? "none"
          : "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={cancelGesture}
      onPointerLeave={() => { if (isDragging) cancelGesture(); }}
    >
      ❦
    </div>
  );
}

