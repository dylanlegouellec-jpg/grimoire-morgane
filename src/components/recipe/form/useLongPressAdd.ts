import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export interface LongPressAddHandlers {
  onClick: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}

/** Bouton « + Ajouter… » : appui court = une rangée, appui maintenu `duration` ms = un titre de section. */
export default function useLongPressAdd(onShortPress: () => void, onLongPress: () => void, duration: number): LongPressAddHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = () => {
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, duration);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const click = () => { if (fired.current) { fired.current = false; return; } onShortPress(); };
  return {
    onClick: click,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onContextMenu: (e) => e.preventDefault(),
  };
}
