import { useEffect, useRef } from "react";
import { triggerHaptic } from "../../utils/haptics";

export default function PortionWheel({ value, onChange, min = 1, max = 24, step = 1, dark = true, suffix = "pers.", onSettle }) {
  const listRef = useRef(null);
  const itemHeight = 40;
  const wheelHeight = 120;
  const padHeight = (wheelHeight - itemHeight) / 2;
  const count = Math.max(1, Math.floor((max - min) / step) + 1);
  const numbers = Array.from({ length: count }, (_, i) => Math.round((min + i * step) * 100) / 100);
  const closestIndex = (v) => {
    let best = 0;
    let bestDist = Infinity;
    numbers.forEach((n, i) => {
      const d = Math.abs(n - v);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };
  const lastReportedIdx = useRef(closestIndex(value));
  const mountedAtRef = useRef(0);
  const settleTimerRef = useRef(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    if (listRef.current) {
      listRef.current.scrollTop = closestIndex(value) * itemHeight;
    }
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
    // Positionne la molette sur la valeur initiale uniquement au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!listRef.current) return;
    const idx = Math.min(numbers.length - 1, Math.max(0, Math.round(listRef.current.scrollTop / itemHeight)));
    if (idx !== lastReportedIdx.current) {
      lastReportedIdx.current = idx;
      triggerHaptic(8);
      onChange(numbers[idx]);
    }

    // Validation automatique : on réarme un délai de 500ms à chaque
    // mouvement de la molette. Le tout premier événement "scroll" au
    // montage vient du positionnement programmatique initial (pas d'un
    // vrai geste utilisateur) — on l'ignore pour ne pas refermer la
    // molette avant même que l'utilisateur n'y ait touché.
    if (onSettle && Date.now() - mountedAtRef.current > 120) {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onSettle();
      }, 500);
    }
  };

  return (
    <div className={`portion-wheel-wrap ${dark ? "" : "light"}`}>
      <div className="portion-wheel-highlight" aria-hidden="true" />
      <div className="portion-wheel" ref={listRef} onScroll={handleScroll}>
        <div style={{ height: padHeight }} />
        {numbers.map((n, i) => (
          <div key={n} className={`portion-wheel-item ${i === lastReportedIdx.current ? "active" : ""}`}>{n}</div>
        ))}
        <div style={{ height: padHeight }} />
      </div>
      {suffix && <span className="portion-wheel-suffix">{suffix}</span>}
    </div>
  );
}

