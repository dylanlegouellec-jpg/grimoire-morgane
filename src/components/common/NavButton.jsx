import { useRef, useState } from "react";
import { triggerHaptic, triggerHapticFeedback } from "../../utils/haptics";

export default function NavButton({ tabKey, label, Icon, active, onSelect, onLongPress, pressDuration = 750 }) {
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
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}
