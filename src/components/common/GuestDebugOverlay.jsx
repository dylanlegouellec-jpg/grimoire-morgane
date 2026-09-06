import { useEffect, useRef, useState } from "react";
import { GUEST_DEBUG_EVENT } from "../../utils/guestDebug";

/* ------------------------------------------------------------------ */
/*  DEBUG TEMPORAIRE — mode invité (?atelier=1) uniquement.              */
/*  Bandeau texte fixe en bas de l'écran, qui affiche le journal envoyé   */
/*  via utils/guestDebug.js — pensé pour être lu/capturé en screenshot    */
/*  directement sur le téléphone où le bug se produit, sans avoir besoin  */
/*  d'ouvrir une console distante. À retirer une fois le bug résolu.      */
/* ------------------------------------------------------------------ */
export default function GuestDebugOverlay() {
  const [lines, setLines] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setLines((prev) => [...prev.slice(-39), e.detail]);
    };
    window.addEventListener(GUEST_DEBUG_EVENT, handler);
    return () => window.removeEventListener(GUEST_DEBUG_EVENT, handler);
  }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: "34vh",
        overflowY: "auto",
        background: "rgba(10,10,10,0.92)",
        color: "#5CF25C",
        fontFamily: "monospace",
        fontSize: "10.5px",
        padding: "6px 8px",
        zIndex: 999999,
        whiteSpace: "pre-wrap",
        lineHeight: 1.45,
        pointerEvents: "none",
      }}
    >
      {lines.length === 0 ? "Debug atelier — change de filtre pour voir le journal ici." : lines.join("\n")}
    </div>
  );
}
