import { useEffect, useRef, useState } from "react";
import { useMotionValue, animate, useReducedMotion } from "motion/react";
import { EASE_OUT } from "../../constants/motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** Mise en forme du nombre affiché (défaut : entier arrondi). Ex. les
   *  quantités d'ingrédients du mode cuisine, qui gardent leurs décimales. */
  format?: (value: number) => string;
  /** Durée de la transition (s). */
  duration?: number;
}

const formatInteger = (n: number) => String(Math.round(n));

/* ------------------------------------------------------------------ */
/*  NOMBRE ANIMÉ — anime la transition entre deux valeurs numériques      */
/*  (ex. compteur de portions, "X/Y articles") au lieu de sauter             */
/*  directement à la nouvelle valeur. Un <motion.span> seul ne suffit pas     */
/*  ici : Framer anime des propriétés CSS/SVG, pas le texte d'un enfant React   */
/*  — on garde donc un <span> normal dont le contenu texte est mis à jour        */
/*  à la main, à chaque frame, via l'abonnement ("on(\"change\", ...)") à la      */
/*  valeur motion sous-jacente pendant qu'elle s'anime avec animate().             */
/*  Par défaut "Math.round" : entiers (portions, nombre d'articles...). La prop      */
/*  "format" permet d'afficher des décimales (quantités du mode cuisine).            */
/* ------------------------------------------------------------------ */
export default function AnimatedNumber({ value, className, format = formatInteger, duration = 0.35 }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const spanRef = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(value);
  const mountedValueRef = useRef(value);

  useEffect(() => {
    if (mountedValueRef.current === value) return undefined;
    mountedValueRef.current = value;
    if (prefersReducedMotion) {
      motionVal.jump(value);
      return undefined;
    }
    const controls = animate(motionVal, value, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, prefersReducedMotion, motionVal, duration]);

  // Dernière mise en forme connue, lue par l'abonnement ci-dessous sans le
  // réabonner à chaque rendu (une fonction fléchée change à chaque fois).
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    if (spanRef.current) spanRef.current.textContent = formatRef.current(motionVal.get());
    return motionVal.on("change", (latest) => {
      if (spanRef.current) spanRef.current.textContent = formatRef.current(latest);
    });
  }, [motionVal]);

  // Texte initial figé : React ne doit plus jamais réécrire ce contenu
  // (sinon la valeur FINALE s'affichait une image avant de défiler depuis
  // l'ancienne) — seul l'abonnement ci-dessus le met à jour ensuite.
  const [initialText] = useState(() => format(value));
  return <span ref={spanRef} className={className}>{initialText}</span>;
}
