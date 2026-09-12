import { X } from "lucide-react";
import { motion } from "motion/react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";

export default function ImportConfirmModal({ recipe, onConfirm, onCancel }) {
  useBodyScrollLock(true);
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
        <h2 className="dropcap-title">Nouvelle recette reçue</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Ajouter <strong>{recipe.title}</strong> à ton Grimoire ?
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm}>Ajouter</Seal>
        </div>
      </motion.div>
    </motion.div>
  );
}

