import { useState, useRef } from "react";
import { triggerHaptic } from "../../utils/helpers";
import PortionWheel from "./PortionWheel";

export default function PortionBadge({ value, onChange, pressDuration = 750 }) {
  const [pressPhase, setPressPhase] = useState("idle"); // idle | charging | open
  const timerRef = useRef(null);

  const startPress = () => {
    if (pressPhase === "open") return;
    setPressPhase("charging");
    timerRef.current = setTimeout(() => {
      triggerHaptic([15, 20, 15]);
      setPressPhase("open");
    }, pressDuration);
  };
  const cancelPress = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPressPhase((p) => (p === "charging" ? "idle" : p));
  };

  return (
    <div className="portion-badge-wrap">
      <button
        type="button"
        className={`portion-badge ${pressPhase === "charging" ? "charging" : ""} ${pressPhase === "open" ? "open" : ""}`}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Maintenir pour ajuster les portions"
      >
        {value}
      </button>
      {pressPhase === "open" && (
        <div className="portion-badge-popover">
          <PortionWheel value={value} onChange={onChange} min={1} max={24} onSettle={() => setPressPhase("idle")} />
        </div>
      )}
    </div>
  );
}

