import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  TOAST — message éphémère en bas d'écran                            */
/* ------------------------------------------------------------------ */
export default function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return { toast, showToast };
}
