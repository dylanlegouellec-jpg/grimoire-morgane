import { useEffect, useState } from "react";
import { GUEST_DEBUG_EVENT } from "../../utils/guestDebug";

/* ------------------------------------------------------------------ */
/*  DEBUG TEMPORAIRE — mode invité (?atelier=1) uniquement.              */
/*  Bandeau texte fixe en bas de l'écran, qui affiche le journal envoyé   */
/*  via utils/guestDebug.js — pensé pour être lu/capturé en screenshot    */
/*  directement sur le téléphone où le bug se produit, sans avoir besoin  */
/*  d'ouvrir une console distante. À retirer une fois le bug résolu.      */
/*                                                                        */
/*  Pas d'auto-scroll ici (ex-useEffect qui lisait scrollHeight à chaque  */
/*  mise à jour) : cette lecture forçait un recalcul de mise en page à    */
/*  chaque ligne de log — avec ~70 lignes par changement de filtre, c'est */
/*  ce bandeau lui-même qui provoquait le blocage de plusieurs secondes   */
/*  observé, pas l'app. Les événements arrivent déjà groupés par lot      */
/*  (un seul par frame, voir guestDebug.js) : faire défiler manuellement  */
/*  pour lire le bas du journal est un compromis acceptable pour un       */
/*  outil temporaire.                                                     */
/* ------------------------------------------------------------------ */
export default function GuestDebugOverlay() {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      setLines((prev) => [...prev, ...e.detail].slice(-60));
    };
    window.addEventListener(GUEST_DEBUG_EVENT, handler);
    return () => window.removeEventListener(GUEST_DEBUG_EVENT, handler);
  }, []);

  return (
    <div
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
