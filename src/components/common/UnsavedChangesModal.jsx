import { X } from "lucide-react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";

/* ------------------------------------------------------------------ */
/*  MODIFICATIONS NON ENREGISTRÉES — 3 choix, jamais de fermeture         */
/*  silencieuse d'un changement non sauvegardé (voir RecipeForm.jsx,       */
/*  attemptClose). Rendu PAR-DESSUS le formulaire (même z-index de pile     */
/*  que toute autre modale imbriquée de l'app, voir WheelPickerModal dans     */
/*  ce même fichier) : l'empiler stoppe net le fond, jusqu'à un choix.         */
/* ------------------------------------------------------------------ */
export default function UnsavedChangesModal({ onSave, onDiscard, onCancel }) {
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
        <h2 className="dropcap-title">Modifications non enregistrées</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Cette recette a des changements non enregistrés. Que veux-tu faire ?
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onDiscard}>Quitter sans sauvegarder</Seal>
          <Seal tone="gold" onClick={onSave}>Sauvegarder</Seal>
        </div>
        <button type="button" className="link-btn" onClick={onCancel} style={{ display: "block", margin: "12px auto 0" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}
