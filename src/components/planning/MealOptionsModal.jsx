import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UN PLAT DU PLAN (déclenché par l'appui long sur   */
/*  une ligne — voir PlanningMealItem.jsx) : mêmes composants/gabarit    */
/*  que RecipeOptionsModal.jsx (portail vers <body>, focus trap, swipe    */
/*  pour fermer), même classes .recipe-options-modal/.recipe-option-row  */
/*  déjà réutilisées telles quelles pour d'autres menus d'options sans     */
/*  lien avec les recettes (HouseholdOptionsModal, HouseholdMemberOptions- */
/*  Modal) — un nom générique de "feuille d'actions", pas propre aux       */
/*  recettes malgré son préfixe historique.                                */
/* ------------------------------------------------------------------ */
export default function MealOptionsModal({ label, onClose, onEdit, onDelete }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const swipe = useSwipeToDismiss(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const handleEdit = () => {
    triggerHaptic(15);
    onEdit();
  };

  const handleDelete = () => {
    triggerHaptic(30);
    onDelete();
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
          <button type="button" className="recipe-option-row" onClick={handleEdit}>
            <Pencil size={18} />
            <span>{t("planning.editMealOption")}</span>
          </button>

          <button type="button" className="recipe-option-row danger" onClick={handleDelete}>
            <Trash2 size={18} />
            <span>{t("planning.deleteMealOption")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
