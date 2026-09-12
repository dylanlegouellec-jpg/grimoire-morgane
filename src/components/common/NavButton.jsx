import { useRef, useState } from "react";
import { motion } from "motion/react";
import { triggerHaptic, triggerHapticFeedback } from "../../utils/haptics";
// Le clic sonore est désormais joué par l'écouteur global délégué (voir
// utils/audioUtils.js, initAudioOnFirstTouch) — plus besoin de l'appeler
// ici, ça doublerait le son.

export default function NavButton({ label, Icon, active, onSelect, onLongPress, pressDuration = 750 }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const btnRef = useRef(null);
  const [pressState, setPressState] = useState("idle");
  const start = () => {
    if (!onLongPress) return;
    fired.current = false;
    setPressState("pressing");
    timer.current = setTimeout(() => {
      fired.current = true;
      setPressState("fired");
      triggerHapticFeedback(btnRef.current, 20);
      onLongPress();
    }, pressDuration);
  };
  const cancel = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setPressState((s) => (s === "fired" ? s : "idle"));
  };
  const handleClick = () => {
    if (fired.current) { fired.current = false; return; }
    triggerHaptic(10);
    onSelect();
  };
  return (
    <button
      ref={btnRef}
      className={`nav-btn press-anim press-${pressState} ${active ? "active" : ""}`}
      onClick={handleClick}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault(); }}
    >
      {/* Pastille active — Framer Motion (layoutId partagé "nav-pill") :
          un seul <motion.span> existe à la fois dans le DOM (rendu
          seulement par le NavButton actif), mais Framer repère qu'un autre
          élément portait déjà ce layoutId juste avant et anime le
          changement de position/taille entre les deux au lieu de faire
          apparaître la pastille d'un coup sec à sa nouvelle place — c'est
          ce qui donne l'effet de glissement d'un onglet à l'autre, sans
          calcul de position manuel. "inset:0" + "borderRadius: inherit"
          (voir modalsBase.css.js, .nav-pill) : la pastille épouse
          exactement la forme du bouton, qu'il soit rond (dock flottant en
          portrait) ou en rectangle arrondi (colonne latérale en paysage,
          voir responsive.css.js) — sans avoir à dupliquer cette règle pour
          les deux mises en page. */}
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="nav-pill"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}
