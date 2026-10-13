import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  TOAST — message éphémère en bas d'écran                            */
/*  Avec `action` (ex. « Annuler » après une suppression), il reste 5 s */
/*  au lieu de 2,5 s et affiche un bouton ; l'action ne peut servir     */
/*  qu'une fois, le toast disparaît dès qu'on l'utilise.               */
/* ------------------------------------------------------------------ */
export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastState {
  message: string;
  action?: ToastAction;
}

export type ShowToast = (msg: string, action?: ToastAction) => void;

export default function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showToast = useCallback<ShowToast>((message, action) => {
    setToast({ message, action });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), action ? 5000 : 2500);
  }, []);

  return { toast, showToast, hideToast };
}
