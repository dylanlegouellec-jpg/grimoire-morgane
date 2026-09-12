import { X } from "lucide-react";
import { motion } from "motion/react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";

export default function DeleteConfirmModal({ recipe, onConfirm, onCancel }) {
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
        <h2 className="dropcap-title">Supprimer la recette ?</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Voulez-vous vraiment supprimer <strong>{recipe.title}</strong> de ton Grimoire ? Cette action est définitive.
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm} haptic={30}>Supprimer</Seal>
        </div>
      </motion.div>
    </motion.div>
  );
}

