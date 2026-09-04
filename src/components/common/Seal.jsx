import { triggerHaptic } from "../../utils/helpers";
import { playClickSound } from "../../utils/audioUtils";

export default function Seal({ children, onClick, tone = "gold", disabled, type = "button", haptic = 15 }) {
  const handleClick = (e) => {
    if (disabled) return;
    triggerHaptic(haptic);
    playClickSound();
    if (onClick) onClick(e);
  };
  return (
    <button type={type} className={`seal seal-${tone}`} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
}
