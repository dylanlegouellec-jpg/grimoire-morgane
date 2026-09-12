import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowUpDown, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UN EN-TÊTE DE MOMENT ("DÉJEUNER", "DÎNER"…),       */
/*  déclenché par l'appui long — voir PlanningMealGroup.jsx. Même            */
/*  gabarit de feuille d'actions que MealOptionsModal.jsx/CourseOptionsModal  */
/*  .jsx. Le mode réorganisation (poignée ⋮⋮, voir PlanningMealItem.jsx) se     */
/*  bascule ICI plutôt que via un bouton permanent en haut de la vue — reste   */
/*  découvrable au même endroit que "Supprimer", sans rien ajouter à           */
/*  l'affichage normal tant qu'on n'a pas fait un appui long. "Ajouter un        */
/*  plat" ouvre directement l'assistant recette avec ce moment déjà              */
/*  présélectionné (voir AddMealModal.jsx/PlanningView.jsx,                       */
/*  `openAddForMealSection`) — même principe que "Ajouter un plat" d'un            */
/*  en-tête de sous-catégorie (CourseOptionsModal.jsx), mais sans figer le           */
/*  type de plat sur une catégorie précise : AddMealModal retombe sur son             */
/*  propre défaut ("Plat") pour Déjeuner/Dîner, modifiable via son sélecteur            */
/*  d'en-tête. "Changer le moment du repas" ouvre un sélecteur (voir                    */
/*  MoveMealSectionModal.jsx) pour reclasser toute la section vers un autre               */
/*  moment de la journée.                                                                  */
/* ------------------------------------------------------------------ */
export default function MealSectionOptionsModal({ mealLabel, reorderMode, onToggleReorder, onClose, onAddMeal, onMoveSection, onDeleteSection }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const handleAddMeal = () => {
    triggerHaptic(15);
    onAddMeal();
  };

  const handleToggleReorder = () => {
    triggerHaptic(15);
    onToggleReorder();
    onClose();
  };

  const handleMoveSection = () => {
    triggerHaptic(15);
    onMoveSection();
  };

  const handleDeleteSection = () => {
    triggerHaptic(15);
    onDeleteSection();
  };

  return createPortal(
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page recipe-options-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{mealLabel}</h2>
        <Flourish />

        <div className="recipe-options-list">
          <button type="button" className="recipe-option-row" onClick={handleAddMeal}>
            <Plus size={18} />
            <span>{t("planning.addMealSectionOption")}</span>
          </button>

          <button type="button" className="recipe-option-row" onClick={handleToggleReorder}>
            <ArrowUpDown size={18} />
            <span>{t(reorderMode ? "planning.reorderModeOff" : "planning.reorderModeOn")}</span>
          </button>

          <button type="button" className="recipe-option-row" onClick={handleMoveSection}>
            <RefreshCw size={18} />
            <span>{t("planning.moveSectionOption")}</span>
          </button>

          <button type="button" className="recipe-option-row danger" onClick={handleDeleteSection}>
            <Trash2 size={18} />
            <span>{t("planning.deleteSectionOption", { meal: mealLabel })}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
