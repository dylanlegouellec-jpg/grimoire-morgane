import { useRef, useState, type MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { triggerHaptic, triggerHapticFeedback } from "../../utils/haptics";
// Le clic sonore est désormais joué par l'écouteur global délégué (voir
// utils/audioUtils.js, initAudioOnFirstTouch) — plus besoin de l'appeler
// ici, ça doublerait le son.

interface NavButtonProps {
  tabKey: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
  onLongPress?: () => void;
  pressDuration?: number;
}

export default function NavButton({ tabKey, label, Icon, active, onSelect, onLongPress, pressDuration = 750 }: NavButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pressState, setPressState] = useState<"idle" | "pressing" | "fired">("idle");
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
      // data-tab : seul crochet exposé pour retrouver CE bouton précis
      // depuis l'extérieur (voir components/onboarding/OnboardingTour.jsx,
      // qui mesure sa position pour y poser son "spotlight") — aucun effet
      // sur le style ni le comportement du bouton lui-même.
      data-tab={tabKey}
      className={`nav-btn press-anim press-${pressState} ${active ? "active" : ""}`}
      onClick={handleClick}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onContextMenu={(e: MouseEvent<HTMLButtonElement>) => { if (onLongPress) e.preventDefault(); }}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}
