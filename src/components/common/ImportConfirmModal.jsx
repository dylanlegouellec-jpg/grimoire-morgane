import { X } from "lucide-react";
import Flourish from "./Flourish";
import Seal from "./Seal";

export default function ImportConfirmModal({ recipe, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={20} /></button>
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

