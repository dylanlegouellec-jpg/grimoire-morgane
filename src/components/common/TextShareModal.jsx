import { useRef, useEffect } from "react";
import { Copy, X } from "lucide-react";
import { motion } from "motion/react";
import { copyText } from "../../utils/helpers";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Seal from "./Seal";

export default function TextShareModal({ title, text, onClose }) {
  useBodyScrollLock(true);
  const ref = useRef(null);
  const modalRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{title}</h2>
        <p className="hint" style={{ margin: "4px 0 12px" }}>Ton navigateur a bloqué la copie automatique — sélectionne et copie le texte ci-dessous.</p>
        <textarea ref={ref} className="share-textarea" readOnly value={text} rows={8} onClick={(e) => e.target.select()} />
        <Seal
          tone="gold"
          onClick={async () => {
            const ok = await copyText(text);
            if (ok) onClose();
          }}
        >
          <Copy size={16} /> Copier
        </Seal>
      </motion.div>
    </motion.div>
  );
}

