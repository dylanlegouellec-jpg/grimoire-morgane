import { useState } from "react";
import { X } from "lucide-react";
import { getWheelRange } from "../../utils/templateParser";
import PortionWheel from "../recipe/PortionWheel";

export default function QuantityWheelModal({ item, onChange, onClose }) {
  const { min, max, step } = getWheelRange(item.unit);
  const [value, setValue] = useState(() => {
    const raw = Math.max(min, item.qty || 0);
    return Math.round(raw / step) * step;
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page qty-wheel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
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
      </div>
    </div>
  );
}

