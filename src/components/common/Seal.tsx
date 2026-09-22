import type { MouseEvent, ReactNode } from "react";
import { triggerHaptic } from "../../utils/helpers";

interface SealProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  tone?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  haptic?: number;
}

// Le clic sonore n'est plus déclenché ici : un écouteur global délégué
// (voir utils/audioUtils.js, initAudioOnFirstTouch) le joue désormais pour
// tout <button>/<a>/case à cocher de l'app, ce bouton inclus — l'appeler
// aussi ici doublerait le son.
export default function Seal({ children, onClick, tone = "gold", disabled, type = "button", haptic = 15 }: SealProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    triggerHaptic(haptic);
    if (onClick) onClick(e);
  };
  return (
    <button type={type} className={`seal seal-${tone}`} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
}
