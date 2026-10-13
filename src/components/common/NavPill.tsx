import { useLayoutEffect, useState } from "react";
import { motion } from "motion/react";
import { SPRING_PILL } from "../../constants/motion";

/* ------------------------------------------------------------------ */
/*  PASTILLE DE L'ONGLET ACTIF (barre de navigation)                   */
/*  Une seule pastille, posée dans la barre et déplacée vers le bouton */
/*  actif (data-tab) avec un ressort. Sa position est mesurée DANS la  */
/*  barre (offsetLeft/offsetTop), jamais par rapport à la page :       */
/*  avant, un layoutId Framer mesurait la page, et si elle défilait    */
/*  pendant le changement d'onglet (position retrouvée, retour en      */
/*  haut), la pastille revenait de très haut ou très bas en rebondissant */
/*  verticalement.                                                      */
/* ------------------------------------------------------------------ */

interface PillBox {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: string;
}

export default function NavPill({ nav, activeKey }: { nav: HTMLElement | null; activeKey: string }) {
  const [box, setBox] = useState<PillBox | null>(null);

  useLayoutEffect(() => {
    if (!nav) return undefined;
    const measure = () => {
      const btn = nav.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`);
      if (!btn) return;
      setBox({
        x: btn.offsetLeft,
        y: btn.offsetTop,
        width: btn.offsetWidth,
        height: btn.offsetHeight,
        radius: getComputedStyle(btn).borderRadius,
      });
    };
    measure();
    // Rotation de l'écran, taille du texte, barre latérale en paysage…
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(nav);
    return () => observer?.disconnect();
  }, [nav, activeKey]);

  if (!box) return null;
  return (
    <motion.span
      className="nav-pill"
      aria-hidden="true"
      initial={false}
      animate={{ x: box.x, y: box.y, width: box.width, height: box.height }}
      transition={SPRING_PILL}
      style={{ borderRadius: box.radius }}
    />
  );
}
