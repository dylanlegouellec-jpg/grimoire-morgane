import { triggerHaptic } from "../../utils/helpers";

// Le clic sonore n'est plus déclenché ici : un écouteur global délégué
// (voir utils/audioUtils.js, initAudioOnFirstTouch) le joue désormais pour
// tout <button>/<a>/case à cocher de l'app, ce bouton inclus — l'appeler
// aussi ici doublerait le son.
export default function Seal({ children, onClick, tone = "gold", disabled, type = "button", haptic = 15 }) {
  const handleClick = (e) => {
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
