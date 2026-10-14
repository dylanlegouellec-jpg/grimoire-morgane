import type { ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { X } from "lucide-react";
import type { PageGeometry, TurnDir } from "../../hooks/usePageTurn";

/* ------------------------------------------------------------------ */
/*  DÉCOR DU TOURNAGE DE PAGE (vue livre de la fiche recette)           */
/*                                                                      */
/*  - RecipePageUnder : la page voisine, posée SOUS la feuille qui tourne */
/*    (même place, même taille, mesurées au début du geste) ; s'éclaire   */
/*    à mesure qu'elle se découvre, avec l'ombre portée du bord libre de   */
/*    la page qui se soulève.                                              */
/*  - RecipePageFold : ombre de pliure posée SUR la feuille qui tourne      */
/*    (même rotation qu'elle), plus sombre côté reliure.                     */
/*  Tout est purement décoratif (aria-hidden, inert, aucun clic) et ne      */
/*  bouge que par transform/opacity, pilotés par l'angle du geste.           */
/* ------------------------------------------------------------------ */

interface UnderProps {
  dir: TurnDir;
  geom: PageGeometry;
  angle: MotionValue<number>;
  children: ReactNode;
}

const box = (geom: PageGeometry) => ({ left: geom.left, top: geom.top, width: geom.width, height: geom.height });

export function RecipePageUnder({ dir, geom, angle, children }: UnderProps) {
  // Voile : la page encore couverte est dans l'ombre, puis s'éclaire.
  const veilOpacity = useTransform(angle, [0, 90], [0.42, 0]);
  // Ombre portée : suit la projection du bord libre (w·cos θ depuis la
  // reliure), plus marquée à mi-course, nulle à plat et à la tranche.
  const edgeX = useTransform(angle, (a) => {
    const projected = geom.width * Math.cos((a * Math.PI) / 180);
    return dir === 1 ? projected : geom.width - projected;
  });
  const shadowOpacity = useTransform(angle, [0, 8, 55, 90], [0, 0.55, 0.7, 0]);
  return (
    <div
      className="modal grimoire-page detail-scroll modal-swipeable recipe-pager-under"
      style={box(geom)}
      aria-hidden="true"
      inert
    >
      <div className="detail-drag-handle" />
      <div className="modal-close"><X size={20} /></div>
      {children}
      <motion.div className="recipe-pager-veil" style={{ opacity: veilOpacity }} />
      <motion.div
        className={`recipe-pager-cast recipe-pager-cast-${dir === 1 ? "next" : "prev"}`}
        style={{ x: edgeX, opacity: shadowOpacity }}
      />
    </div>
  );
}

interface FoldProps {
  dir: TurnDir;
  geom: PageGeometry;
  angle: MotionValue<number>;
  pageStyle: Record<string, unknown>;
}

export function RecipePageFold({ dir, geom, angle, pageStyle }: FoldProps) {
  const opacity = useTransform(angle, [0, 70, 90], [0, 0.85, 1]);
  return (
    <motion.div
      className={`recipe-pager-fold recipe-pager-fold-${dir === 1 ? "next" : "prev"}`}
      style={{ ...box(geom), ...pageStyle, opacity }}
      aria-hidden="true"
    />
  );
}
