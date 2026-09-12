import { X } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";

/* ------------------------------------------------------------------ */
/*  CONFIRMATION avant de vider toute une section du plan ("Supprimer la */
/*  section Déjeuner", voir MealSectionOptionsModal.jsx/                  */
/*  PlanningMealGroup.jsx) — même gabarit que DeleteConfirmModal.jsx        */
/*  (recettes), généralisé au libellé du moment plutôt que codé en dur       */
/*  pour "la recette".                                                       */
/* ------------------------------------------------------------------ */
export default function DeleteMealSectionConfirmModal({ mealLabel, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(onCancel);
  const swipe = useSwipeToDismiss(onCancel, { scrollRef: modalRef });
  // Manquait ici (contrairement à toutes les autres modales du planning) :
  // sans lui, le fond défilait toujours derrière cette confirmation
  // précise, y compris pendant le tirage pour la fermer.
  useBodyScrollLock(true);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        <button className="modal-close" onClick={onCancel} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{t("planning.deleteSectionConfirmTitle")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("planning.deleteSectionConfirmBody", { meal: mealLabel })}
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>{t("planning.deleteSectionCancel")}</Seal>
          <Seal tone="gold" onClick={onConfirm} haptic={30}>{t("planning.deleteSectionConfirm")}</Seal>
        </div>
      </div>
    </div>
  );
}
