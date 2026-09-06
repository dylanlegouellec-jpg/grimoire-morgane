import { useEffect, useRef, useState } from "react";
import { GUEST_DEBUG_EVENT } from "../../utils/guestDebug";

/* ------------------------------------------------------------------ */
/*  DEBUG TEMPORAIRE — mode invité (?atelier=1) uniquement.              */
/*  Bandeau texte fixe en bas de l'écran, qui affiche le journal envoyé   */
/*  via utils/guestDebug.js — pensé pour être lu/capturé en screenshot    */
/*  directement sur le téléphone où le bug se produit, sans avoir besoin  */
/*  d'ouvrir une console distante. À retirer une fois le bug résolu.      */
/*                                                                        */
/*  Auto-scroll RÉTABLI, mais plus correctement cette fois : la version   */
/*  précédente le retirait entièrement pour tuer un recalcul de mise en   */
/*  page par LIGNE de log (~70 par changement de filtre) — sauf que sans  */
/*  lui, les nouvelles lignes s'ajoutent hors champ, sous la zone visible,  */
/*  et le bandeau semble figé indéfiniment (ce qui a induit en erreur la   */
/*  lecture d'une vidéo de test : le journal progressait réellement,       */
/*  juste invisible). Comme guestDebug.js groupe déjà tous les événements  */
/*  d'un même instant en UN SEUL lot par frame, cet effet ne se déclenche   */
/*  au plus qu'une fois par frame lui aussi — le replacer ici ne réintroduit  */
/*  donc pas le problème de recalculs en cascade de la première version.   */
/* ------------------------------------------------------------------ */
export default function GuestDebugOverlay() {
  const [lines, setLines] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setLines((prev) => [...prev, ...e.detail].slice(-60));
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
        pointerEvents: "auto",
      }}
    >
      {lines.length === 0 ? "Debug atelier — change de filtre pour voir le journal ici." : lines.join("\n")}
    </div>
  );
}
