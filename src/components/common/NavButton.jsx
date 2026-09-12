import { forwardRef, useRef, useState } from "react";
import { triggerHaptic, triggerHapticFeedback } from "../../utils/haptics";
// Le clic sonore est désormais joué par l'écouteur global délégué (voir
// utils/audioUtils.js, initAudioOnFirstTouch) — plus besoin de l'appeler
// ici, ça doublerait le son.

// `forwardRef` : AppShell a besoin du vrai nœud DOM du bouton pour mesurer
// sa position/largeur (voir .nav-indicator, la pastille dorée qui glisse
// d'un onglet à l'autre dans modalsBase.css.js) — sans ça, aucun moyen
// d'obtenir ces mesures depuis l'extérieur. Fusionnée avec btnRef ci-dessous
// (déjà utilisée en interne pour le retour haptique), pas remplacée : les
// deux doivent pointer vers le même bouton.
const NavButton = forwardRef(function NavButton(
  { label, Icon, active, onSelect, onLongPress, pressDuration = 750 },
  forwardedRef
) {
  const timer = useRef(null);
  const fired = useRef(false);
  const btnRef = useRef(null);
  const setRefs = (node) => {
    btnRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
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
      ref={setRefs}
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
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
});

export default NavButton;
