import { useEffect, useRef } from "react";
import { useMotionValue, animate, useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------ */
/*  NOMBRE ANIMÉ — anime la transition entre deux valeurs numériques      */
/*  (ex. compteur de portions, "X/Y articles") au lieu de sauter             */
/*  directement à la nouvelle valeur. Un <motion.span> seul ne suffit pas     */
/*  ici : Framer anime des propriétés CSS/SVG, pas le texte d'un enfant React   */
/*  — on garde donc un <span> normal dont le contenu texte est mis à jour        */
/*  à la main, à chaque frame, via l'abonnement ("on(\"change\", ...)") à la      */
/*  valeur motion sous-jacente pendant qu'elle s'anime avec animate().             */
/*  "Math.round" : ce composant n'affiche que des entiers (portions, nombre         */
/*  d'articles...) — jamais appelé avec une valeur à décimales dans cette app.       */
/* ------------------------------------------------------------------ */
export default function AnimatedNumber({ value, className }) {
  const prefersReducedMotion = useReducedMotion();
  const spanRef = useRef(null);
  const motionVal = useMotionValue(value);
  const mountedValueRef = useRef(value);

  useEffect(() => {
    if (mountedValueRef.current === value) return undefined;
    mountedValueRef.current = value;
    if (prefersReducedMotion) {
      motionVal.jump(value);
      return undefined;
    }
    const controls = animate(motionVal, value, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, prefersReducedMotion, motionVal]);

  useEffect(() => {
    if (spanRef.current) spanRef.current.textContent = Math.round(motionVal.get());
    return motionVal.on("change", (latest) => {
      if (spanRef.current) spanRef.current.textContent = Math.round(latest);
    });
  }, [motionVal]);

  return <span ref={spanRef} className={className}>{Math.round(value)}</span>;
}
