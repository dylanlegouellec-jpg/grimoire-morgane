import { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { getWheelRange } from "../../utils/templateParser";
import PortionWheel from "../recipe/PortionWheel";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useFocusTrap from "../../hooks/useFocusTrap";

// Volontairement SANS le geste "tirer pour fermer" (voir useDismissibleSheet,
// utilisé par les autres modales) : cette molette EST une zone de
// défilement vertical (PortionWheel, overflow-y: scroll) — un tirage vers
// le bas pour la faire tourner déclencherait aussi, à tort, la fermeture
// de la modale (le hook ne connaît que le scrollTop de la modale
// elle-même, jamais à 0 quand on manipule la molette). La fermeture reste
// possible via le bouton "X" ou, une fois la valeur stabilisée, via
// onSettle (voir PortionWheel.jsx). L'entrée/sortie anime tout de même
// avec Framer Motion (MODAL_SHEET_MOTION), juste sans le geste de tirage.
export default function QuantityWheelModal({ item, onChange, onClose }) {
  const { min, max, step } = getWheelRange(item.unit);
  const modalRef = useFocusTrap(onClose);
  const [value, setValue] = useState(() => {
    const raw = Math.max(min, item.qty || 0);
    return Math.round(raw / step) * step;
  });
  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page qty-wheel-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{item.name}</h2>
        <p className="hint" style={{ fontStyle: "normal" }}>Fais glisser pour ajuster la quantité{item.unit ? ` (${item.unit})` : ""}.</p>
        <div className="qty-wheel-wrap">
          <PortionWheel
            value={value}
            onChange={(v) => { setValue(v); onChange(v); }}
            min={min}
            max={max}
            step={step}
            dark={false}
            suffix={item.unit || ""}
            onSettle={onClose}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

