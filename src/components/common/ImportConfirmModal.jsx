import { X } from "lucide-react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";

export default function ImportConfirmModal({ recipe, onConfirm, onCancel }) {
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(onCancel);
  const swipe = useSwipeToDismiss(onCancel, { scrollRef: modalRef });
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
        <h2 className="dropcap-title">Nouvelle recette reçue</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Ajouter <strong>{recipe.title}</strong> à ton Grimoire ?
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm}>Ajouter</Seal>
        </div>
      </div>
    </div>
  );
}

