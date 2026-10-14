import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import AnimatedNumber from "../common/AnimatedNumber";
import { useTranslation } from "../../contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/*  PASTILLE DES PARTS (mode cuisine)                                   */
/*  Avant : un appui LONG ouvrait une molette dans une bulle, avec un     */
/*  bouton « Valider » — peu découvrable, et pénible les mains en cuisine. */
/*  Désormais un simple appui fait s'étirer la pastille ronde en un petit   */
/*  contrôle − / nombre / + (animation de mise en page motion, ressort) ;    */
/*  le nombre défile (AnimatedNumber) à chaque changement. Ouverture et       */
/*  fermeture sont pilotées par le parent (CookMode), qui pose aussi le fond   */
/*  flouté : un appui à côté referme.                                          */
/* ------------------------------------------------------------------ */

// Ressort de la pastille qui s'étire : un peu plus souple que SPRING_PILL
// (constants/motion.ts) pour que le passage rond → gélule se lise bien.
const SPRING_BADGE = { type: "spring", stiffness: 420, damping: 30, mass: 0.8 } as const;

interface PortionBadgeProps {
  value: number;
  onChange: (value: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  min?: number;
  max?: number;
}

export default function PortionBadge({ value, onChange, open, onOpenChange, min = 1, max = 24 }: PortionBadgeProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SPRING_BADGE;
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    triggerHaptic(10);
    onChange(next);
  };
  const buttonMotion = {
    initial: { opacity: 0, scale: 0.4 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.4 },
    transition: reduceMotion ? { duration: 0 } : { ...SPRING_BADGE, opacity: { duration: 0.15 } },
  };

  return (
    <motion.div
      layout
      transition={transition}
      className={`portion-badge ${open ? "open" : ""}`}
      // Rayon posé en style (pas seulement en CSS) : motion le corrige
      // pendant l'étirement, sinon les coins se déformeraient.
      style={{ borderRadius: 999 }}
      role={open ? "group" : undefined}
      aria-label={open ? t("cookPortions.group") : undefined}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {open && (
          <motion.button
            key="minus"
            type="button"
            className="portion-badge-step"
            onClick={() => step(-1)}
            disabled={value <= min}
            aria-label={t("cookPortions.decrease")}
            {...buttonMotion}
          >
            <Minus size={16} />
          </motion.button>
        )}
      </AnimatePresence>
      <motion.button
        layout="position"
        transition={transition}
        type="button"
        className="portion-badge-value"
        onClick={() => { triggerHaptic(10); onOpenChange(!open); }}
        aria-expanded={open}
        aria-label={open ? t("cookPortions.done") : t("cookPortions.adjust", { count: value })}
      >
        <AnimatedNumber value={value} className="portion-badge-number" />
        <AnimatePresence initial={false}>
          {open && (
            <motion.span
              key="unit"
              className="portion-badge-unit"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              {value > 1 ? t("cookPortions.unitOther") : t("cookPortions.unitOne")}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence initial={false} mode="popLayout">
        {open && (
          <motion.button
            key="plus"
            type="button"
            className="portion-badge-step"
            onClick={() => step(1)}
            disabled={value >= max}
            aria-label={t("cookPortions.increase")}
            {...buttonMotion}
          >
            <Plus size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
