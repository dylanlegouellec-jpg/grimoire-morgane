import { createPortal } from "react-dom";
import { ArrowUpDown, Plus, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UN EN-TÊTE DE SOUS-CATÉGORIE ("Entrées", "Plats"…, */
/*  déclenché par l'appui long — voir PlanningCourseGroup.jsx) : même       */
/*  gabarit que MealOptionsModal.jsx/RecipeOptionsModal.jsx (portail vers   */
/*  <body>, focus trap, swipe pour fermer, classes .recipe-options-modal/    */
/*  .recipe-option-row déjà partagées par plusieurs menus sans lien avec     */
/*  les recettes). Le mode réorganisation (poignée ⋮⋮, voir                   */
/*  PlanningMealItem.jsx) se bascule ICI plutôt que via un bouton permanent    */
/*  en haut de la vue — voir MealSectionOptionsModal.jsx, même choix.          */
/* ------------------------------------------------------------------ */
export default function CourseOptionsModal({ label, reorderMode, onToggleReorder, onClose, onAdd, onDeleteAll }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const swipe = useSwipeToDismiss(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const handleAdd = () => {
    triggerHaptic(15);
    onAdd();
  };

  const handleToggleReorder = () => {
    triggerHaptic(15);
    onToggleReorder();
    onClose();
  };

  const handleDeleteAll = () => {
    triggerHaptic(30);
    onDeleteAll();
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
        <h2 className="dropcap-title">{label}</h2>
        <Flourish />

        <div className="recipe-options-list">
          <button type="button" className="recipe-option-row" onClick={handleAdd}>
            <Plus size={18} />
            <span>{t("planning.addCourseOption")}</span>
          </button>

          <button type="button" className="recipe-option-row" onClick={handleToggleReorder}>
            <ArrowUpDown size={18} />
            <span>{t(reorderMode ? "planning.reorderModeOff" : "planning.reorderModeOn")}</span>
          </button>

          <button type="button" className="recipe-option-row danger" onClick={handleDeleteAll}>
            <Trash2 size={18} />
            <span>{t("planning.deleteAllCourseOption")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
