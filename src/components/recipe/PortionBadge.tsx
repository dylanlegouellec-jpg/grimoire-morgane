import { useState, useRef, type MouseEvent } from "react";
import { triggerHaptic } from "../../utils/helpers";
import PortionWheel from "./PortionWheel";
import Seal from "../common/Seal";
import { useTranslation } from "../../contexts/LanguageContext";

type PressPhase = "idle" | "charging" | "open";

interface PortionBadgeProps {
  value: number;
  onChange: (value: number) => void;
  pressDuration?: number;
}

export default function PortionBadge({ value, onChange, pressDuration = 750 }: PortionBadgeProps) {
  const { t } = useTranslation();
  const [pressPhase, setPressPhase] = useState<PressPhase>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        onContextMenu={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
        aria-label={t("recipeUi.portionBadge.holdToAdjust")}
      >
        {value}
      </button>
      {pressPhase === "open" && (
        <div className="portion-badge-popover">
          <PortionWheel value={value} onChange={onChange} min={1} max={24} />
          <Seal tone="gold" onClick={() => setPressPhase("idle")}>{t("recipeUi.portionBadge.confirm")}</Seal>
        </div>
      )}
    </div>
  );
}
