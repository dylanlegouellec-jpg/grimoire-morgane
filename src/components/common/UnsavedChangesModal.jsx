import { X } from "lucide-react";
import { motion } from "motion/react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";

/* ------------------------------------------------------------------ */
/*  MODIFICATIONS NON ENREGISTRÉES — 3 choix, jamais de fermeture         */
/*  silencieuse d'un changement non sauvegardé (voir RecipeForm.jsx,       */
/*  attemptClose). Rendu PAR-DESSUS le formulaire (même z-index de pile     */
/*  que toute autre modale imbriquée de l'app, voir WheelPickerModal dans     */
/*  ce même fichier) : l'empiler stoppe net le fond, jusqu'à un choix.         */
/* ------------------------------------------------------------------ */
export default function UnsavedChangesModal({ onSave, onDiscard, onCancel }) {
  const modalRef = useFocusTrap(onCancel);
  const sheet = useDismissibleSheet(onCancel, { scrollRef: modalRef });
  return (
    <motion.div className="modal-backdrop" onClick={onCancel} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
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
      </motion.div>
    </motion.div>
  );
}
