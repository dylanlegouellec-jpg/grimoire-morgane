import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { MEAL_TYPES } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  SÉLECTEUR DE MOMENT — "Changer le moment du repas" d'un en-tête de    */
/*  moment (voir PlanningMealGroup.jsx/MealSectionOptionsModal.jsx), OU      */
/*  "Déplacer vers un autre repas" d'un en-tête de sous-catégorie de type     */
/*  de plat (voir PlanningCourseGroup.jsx/CourseOptionsModal.jsx) — même       */
/*  sélecteur pour les deux, seul `sourceLabel` change (précise QUOI se        */
/*  déplace dans le titre quand ce n'est pas déjà tout le repas, ex.            */
/*  "Déplacer Entrées vers…"). Même liste ".ios-group"/".ios-row" que           */
/*  l'étape "Quel repas ?" de AddMealModal.jsx, sans le moment ACTUEL (le        */
/*  déplacer vers lui-même n'aurait aucun effet). Choisir une ligne agit          */
/*  immédiatement — pas de confirmation supplémentaire : rien n'est               */
/*  supprimé, seulement reclassé, et une éventuelle collision avec des             */
/*  plats déjà présents sous le moment cible se résout d'elle-même à                */
/*  l'affichage (regroupement par type de plat déjà en place, voir                   */
/*  PlanningView.jsx/groupEntriesByCourse), sans code de fusion dédié ici.             */
/* ------------------------------------------------------------------ */
export default function MoveMealSectionModal({ currentMealTypeKey, sourceLabel, onClose, onSelect }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const choices = MEAL_TYPES.filter((m) => m.key !== currentMealTypeKey);

  const handlePick = (key) => {
    triggerHaptic(15);
    onSelect(key);
  };

  return createPortal(
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">
          {sourceLabel ? t("planning.moveSectionStepTitleWithLabel", { label: sourceLabel }) : t("planning.moveSectionStepTitle")}
        </h2>
        <Flourish />
        <div className="ios-group">
          {choices.map((m) => (
            <button
              key={m.key}
              type="button"
              className="ios-row"
              onClick={() => handlePick(m.key)}
            >
              <span className="ios-row-icon" style={{ background: "var(--surface-strong)", fontSize: "1.05rem" }}>{m.icon}</span>
              <span className="ios-row-title">{t(`mealTypes.${m.key}`)}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
