import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UN EN-TÊTE DE MOMENT ("DÉJEUNER", "DÎNER"…),       */
/*  déclenché par l'appui long — voir PlanningMealGroup.jsx. Une seule     */
/*  option pour l'instant (supprimer toute la section), mais garde le      */
/*  même gabarit de feuille d'actions que MealOptionsModal.jsx/              */
/*  CourseOptionsModal.jsx plutôt qu'un raccourci direct vers la               */
/*  confirmation — cohérent avec le reste de l'app, et laisse la place        */
/*  pour d'éventuelles options futures sans tout restructurer.                 */
/* ------------------------------------------------------------------ */
export default function MealSectionOptionsModal({ mealLabel, onClose, onDeleteSection }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const swipe = useSwipeToDismiss(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const handleDeleteSection = () => {
    triggerHaptic(15);
    onDeleteSection();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page recipe-options-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{mealLabel}</h2>
        <Flourish />

        <div className="recipe-options-list">
          <button type="button" className="recipe-option-row danger" onClick={handleDeleteSection}>
            <Trash2 size={18} />
            <span>{t("planning.deleteSectionOption", { meal: mealLabel })}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
