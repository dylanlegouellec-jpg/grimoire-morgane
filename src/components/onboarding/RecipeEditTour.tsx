import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "../../contexts/LanguageContext";
import { EASE_OUT, MODAL_BACKDROP_MOTION } from "../../constants/motion";
import { triggerHaptic } from "../../utils/haptics";
import useFocusTrap from "../../hooks/useFocusTrap";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";
import { RECIPE_TOUR_STEPS } from "./recipeTourSteps";

/* ------------------------------------------------------------------ */
/*  TUTO « MODIFIER UNE RECETTE » — même surcouche « spotlight » que     */
/*  OnboardingTour, mais les cibles sont les champs du formulaire de     */
/*  recette (repérés par l'attribut `data-tour`, voir RecipeForm.tsx) au  */
/*  lieu des boutons de la barre du bas.                                 */
/*                                                                        */
/*  L'appelant (AppShell) ouvre un formulaire de création VIDE derrière   */
/*  ce tuto : rien n'est enregistré, et comme aucun champ n'est touché,   */
/*  le refermer ne déclenche pas la demande « modifications non           */
/*  enregistrées ». À chaque étape, la cible est amenée en haut de la     */
/*  fenêtre du formulaire (qui est elle-même le conteneur défilant), puis */
/*  mesurée ; le trou est borné pour ne jamais passer sous la carte.      */
/* ------------------------------------------------------------------ */

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
  // Uniquement pour satisfaire le type `animate` de Framer Motion (voir Hole
  // dans OnboardingTour.tsx) : jamais utilisé en pratique.
  [key: `--${string}`]: number;
}

interface RecipeEditTourProps {
  onFinish: () => void;
}

const HOLE_PADDING = 6;
const SCROLL_MARGIN = 20;

export default function RecipeEditTour({ onFinish }: RecipeEditTourProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState<Hole | null>(null);
  const [cardOnTop, setCardOnTop] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = RECIPE_TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === RECIPE_TOUR_STEPS.length - 1;

  const focusTrapRef = useFocusTrap<HTMLDivElement>(onFinish);
  useBodyScrollLock(true);

  // Amène la cible en haut de la fenêtre du formulaire (le formulaire EST le
  // conteneur défilant), la mesure, puis borne le trou au-dessus de la carte
  // d'explication. Le formulaire s'anime encore à son ouverture pendant les
  // premières étapes : on re-mesure donc plusieurs fois.
  useLayoutEffect(() => {
    const measure = () => {
      if (!step.selector) {
        cardRef.current?.classList.remove("onboarding-card--top");
        setCardOnTop(false);
        setHole({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
        return;
      }
      const el = document.querySelector<HTMLElement>(step.selector);
      if (!el) return;
      const container = el.closest<HTMLElement>(".modal");
      if (container) {
        const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top - SCROLL_MARGIN;
        if (Math.abs(delta) > 1) container.scrollTop += delta;
      }
      const r = el.getBoundingClientRect();
      // Le formulaire ne défile pas toujours (il tient parfois en entier) :
      // une cible située sous la carte (ou à peine visible au-dessus) reste en
      // bas. La carte se place alors en haut de l'écran plutôt que par-dessus. Classe posée
      // tout de suite sur le DOM pour mesurer la carte à sa vraie place.
      cardRef.current?.classList.remove("onboarding-card--top");
      const bottomCardTop = cardRef.current ? cardRef.current.getBoundingClientRect().top : window.innerHeight;
      const visibleAbove = Math.min(r.bottom + HOLE_PADDING, bottomCardTop - 12) - Math.max(r.top - HOLE_PADDING, 0);
      const onTop = visibleAbove < Math.min(r.height + HOLE_PADDING * 2, 56);
      cardRef.current?.classList.toggle("onboarding-card--top", onTop);
      setCardOnTop(onTop);
      const cardRect = cardRef.current?.getBoundingClientRect();
      let top = Math.max(r.top - HOLE_PADDING, 0);
      let bottom = r.bottom + HOLE_PADDING;
      if (cardRect) {
        if (onTop) top = Math.max(top, cardRect.bottom + 12);
        else bottom = Math.min(bottom, cardRect.top - 12);
      }
      setHole({ top, left: Math.max(r.left - HOLE_PADDING, 0), width: r.width + HOLE_PADDING * 2, height: Math.max(bottom - top, 24) });
    };
    measure();
    window.addEventListener("resize", measure);
    const timers = [260, 600].map((ms) => setTimeout(measure, ms));
    return () => {
      window.removeEventListener("resize", measure);
      timers.forEach(clearTimeout);
    };
  }, [step.selector]);

  const goNext = () => {
    triggerHaptic(15);
    if (isLast) { onFinish(); return; }
    setStepIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (isFirst) return;
    triggerHaptic(10);
    setStepIndex((i) => i - 1);
  };

  const holeStyle: Hole = hole || { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };

  return (
    <motion.div
      ref={focusTrapRef}
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("recipeTour.ariaLabel")}
      {...MODAL_BACKDROP_MOTION}
    >
      <motion.div
        className="onboarding-hole onboarding-hole--box"
        initial={false}
        animate={holeStyle}
        transition={prefersReducedMotion ? { duration: 0.01 } : { type: "spring", stiffness: 260, damping: 28 }}
      />

      <div className={`onboarding-card${cardOnTop ? " onboarding-card--top" : ""}`} ref={cardRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <div className="onboarding-card-icon">
              <step.Icon size={22} />
            </div>
            <h3 className="dropcap-title">{t(`recipeTour.${step.key}Title`)}</h3>
            <Flourish />
            <p>{t(`recipeTour.${step.key}Body`)}</p>
          </motion.div>
        </AnimatePresence>

        <p className="hint onboarding-step-counter">
          {t("onboarding.stepCounter", { current: stepIndex + 1, total: RECIPE_TOUR_STEPS.length })}
        </p>

        <div className="onboarding-footer">
          <button type="button" className="onboarding-skip" onClick={onFinish}>
            {t("onboarding.skip")}
          </button>
          <div className="onboarding-nav-buttons">
            {!isFirst && <Seal tone="gold" onClick={goPrev}>{t("onboarding.previous")}</Seal>}
            <Seal tone="gold" onClick={goNext}>{isLast ? t("onboarding.finish") : t("onboarding.next")}</Seal>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
