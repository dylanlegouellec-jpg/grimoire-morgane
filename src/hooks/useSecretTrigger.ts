import { useRef } from "react";
import type { CSSProperties } from "react";

/* ------------------------------------------------------------------ */
/*  DÉCLENCHEUR SECRET (triple-clic ou appui long 2s)                  */
/* ------------------------------------------------------------------ */

interface SecretTriggerHandlers {
  onClick: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  style: CSSProperties;
}

export default function useSecretTrigger(onTrigger: () => void): SecretTriggerHandlers {
  const clicksRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerClick = () => {
    clicksRef.current.count += 1;
    if (clicksRef.current.timer) clearTimeout(clicksRef.current.timer);
    if (clicksRef.current.count >= 3) {
      clicksRef.current.count = 0;
      onTrigger();
      return;
    }
    clicksRef.current.timer = setTimeout(() => { clicksRef.current.count = 0; }, 600);
  };

  const startPress = () => {
    pressTimerRef.current = setTimeout(onTrigger, 2000);
  };
  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return {
    onClick: registerClick,
    onMouseDown: startPress,
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    style: { cursor: "pointer", userSelect: "none" },
  };
}
