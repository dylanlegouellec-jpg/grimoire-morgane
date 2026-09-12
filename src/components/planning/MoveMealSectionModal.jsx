import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { MEAL_TYPES } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";

/* ------------------------------------------------------------------ */
/*  SÉLECTEUR DE MOMENT — "Changer le moment du repas" d'un en-tête de    */
/*  moment (voir PlanningMealGroup.jsx/MealSectionOptionsModal.jsx).       */
/*  Même liste ".ios-group"/".ios-row" que l'étape "Quel repas ?" de        */
/*  AddMealModal.jsx, sans le moment ACTUEL (le déplacer vers lui-même       */
/*  n'aurait aucun effet). Choisir une ligne agit immédiatement — pas de      */
/*  confirmation supplémentaire : rien n'est supprimé, seulement reclassé,    */
/*  et une éventuelle collision avec des plats déjà présents sous le           */
/*  moment cible se résout d'elle-même à l'affichage (regroupement par         */
/*  type de plat déjà en place, voir PlanningView.jsx/groupEntriesByCourse),    */
/*  sans code de fusion dédié ici.                                              */
/* ------------------------------------------------------------------ */
export default function MoveMealSectionModal({ currentMealTypeKey, onClose, onSelect }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onClose);
  const swipe = useSwipeToDismiss(onClose, { scrollRef: modalRef });
  useBodyScrollLock(true);

  const choices = MEAL_TYPES.filter((m) => m.key !== currentMealTypeKey);

  const handlePick = (key) => {
    triggerHaptic(15);
    onSelect(key);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{t("planning.moveSectionStepTitle")}</h2>
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
      </div>
    </div>,
    document.body
  );
}
