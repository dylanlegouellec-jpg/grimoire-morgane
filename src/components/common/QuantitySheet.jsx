import { useState } from "react";
import { X } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  SAISIE DE QUANTITÉ (Courses) — remplace l'ancienne molette à roue     */
/*  (voir PortionWheel.jsx, toujours utilisé ailleurs pour les portions    */
/*  de recette — seule la molette d'article de courses posait problème :   */
/*  scroll capricieux, peu lisible pour de grandes valeurs comme 600g).    */
/*  Ici : un champ de saisie direct + des raccourcis courants + un          */
/*  sélecteur d'unité, façon bottom sheet iOS.                              */
/* ------------------------------------------------------------------ */
const UNIT_OPTIONS = ["g", "kg", "ml", "cl", "L", "sachet", "unité"];
const QUICK_PICKS = [
  { value: 1, unit: "unité", label: "1" },
  { value: 2, unit: "unité", label: "2" },
  { value: 50, unit: "g", label: "50g" },
  { value: 100, unit: "g", label: "100g" },
  { value: 250, unit: "g", label: "250g" },
  { value: 500, unit: "g", label: "500g" },
  { value: 1, unit: "kg", label: "1kg" },
];

export default function QuantitySheet({ item, onChange, onClose }) {
  useBodyScrollLock(true);
  const [value, setValue] = useState(item.qty > 0 ? String(Math.round(item.qty * 100) / 100) : "");
  const [unit, setUnit] = useState(item.unit || "unité");

  const applyQuickPick = (qp) => {
    triggerHaptic(12);
    setValue(String(qp.value));
    setUnit(qp.unit);
  };
  const pickUnit = (u) => {
    triggerHaptic(10);
    setUnit(u);
  };

  const handleSave = () => {
    const num = parseFloat(String(value).replace(",", "."));
    onChange(Number.isFinite(num) && num >= 0 ? num : 0, unit);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page qty-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{item.name}</h2>
        <Flourish />

        <input
          type="number"
          inputMode="decimal"
          className="qty-sheet-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="0"
          autoFocus
        />

        <p className="ios-group-title">Raccourcis</p>
        <div className="qty-sheet-quick-picks">
          {QUICK_PICKS.map((qp) => (
            <button key={qp.label} type="button" className="qty-sheet-chip" onClick={() => applyQuickPick(qp)}>
              {qp.label}
            </button>
          ))}
        </div>

        <p className="ios-group-title">Unité</p>
        <div className="qty-sheet-units">
          {UNIT_OPTIONS.map((u) => (
            <button
              key={u}
              type="button"
              className={`qty-sheet-unit-pill ${unit === u ? "active" : ""}`}
              onClick={() => pickUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="qty-sheet-save">
          <Seal tone="gold" onClick={handleSave}>Enregistrer</Seal>
        </div>
      </div>
    </div>
  );
}
