import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  TOAST — message éphémère en bas d'écran                            */
/* ------------------------------------------------------------------ */
export default function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return { toast, showToast };
}
