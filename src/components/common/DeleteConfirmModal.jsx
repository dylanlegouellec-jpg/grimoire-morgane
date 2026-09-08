import { X } from "lucide-react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import useFocusTrap from "../../hooks/useFocusTrap";

export default function DeleteConfirmModal({ recipe, onConfirm, onCancel }) {
  const modalRef = useFocusTrap(onCancel);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal grimoire-page" ref={modalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">Supprimer la recette ?</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Voulez-vous vraiment supprimer <strong>{recipe.title}</strong> de ton Grimoire ? Cette action est définitive.
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm} haptic={30}>Supprimer</Seal>
        </div>
      </div>
    </div>
  );
}

