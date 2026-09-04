import { useState } from "react";
import { X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import PortionWheel from "../recipe/PortionWheel";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  SÉLECTEUR À ROUES GÉNÉRIQUE (iOS picker wheel) — une ou plusieurs     */
/*  roues défilantes (voir PortionWheel, déjà utilisé pour les portions    */
/*  en mode cuisine) côte à côte, avec un bouton "Enregistrer" explicite   */
/*  plutôt qu'une fermeture automatique — utile dès que l'utilisateur       */
/*  doit ajuster PLUSIEURS roues avant de valider (ex. Heures + Minutes),  */
/*  contrairement à PortionBadge (une seule roue, valide toute seule en    */
/*  s'arrêtant de tourner).                                                */
/*                                                                          */
/*  `columns`: [{ key, initialValue, min, max, step?, suffix }]            */
/*  `onSave(values)`: values = { [key]: nombre final de chaque roue }      */
/* ------------------------------------------------------------------ */
export default function WheelPickerModal({ title, hint, columns, onSave, onClose }) {
  useBodyScrollLock(true);
  const [values, setValues] = useState(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.initialValue]))
  );

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page qty-wheel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{title}</h2>
        <Flourish />
        {hint && <p className="hint" style={{ fontStyle: "normal" }}>{hint}</p>}
        <div className="time-wheel-wrap">
          {columns.map((c) => (
            <PortionWheel
              key={c.key}
              value={values[c.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [c.key]: v }))}
              min={c.min}
              max={c.max}
              step={c.step || 1}
              dark={false}
              suffix={c.suffix}
            />
          ))}
        </div>
        <div className="cookmode-nav" style={{ marginTop: 18 }}>
          <Seal tone="gold" onClick={handleSave}>Enregistrer</Seal>
        </div>
      </div>
    </div>
  );
}
