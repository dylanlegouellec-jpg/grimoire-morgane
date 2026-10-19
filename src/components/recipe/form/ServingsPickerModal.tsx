import { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../../constants/motion";
import { useTranslation } from "../../../contexts/LanguageContext";
import useBodyScrollLock from "../../../hooks/useBodyScrollLock";
import useFocusTrap from "../../../hooks/useFocusTrap";
import { triggerHaptic } from "../../../utils/haptics";
import {
  SERVINGS_MAX_PEOPLE,
  SERVINGS_MAX_UNITS,
  SERVINGS_UNIT_MAX_LENGTH,
  normalizeServingsUnit,
  servingsUnitFor,
} from "../../../utils/servingsUnit";
import PortionWheel from "../PortionWheel";
import Flourish from "../../common/Flourish";
import Seal from "../../common/Seal";
import SegmentedControl from "../../common/SegmentedControl";

/* ------------------------------------------------------------------ */
/*  PORTIONS DU FORMULAIRE — « pour 4 personnes » ou « pour 20 cookies » */
/*  Même feuille que WheelPickerModal (roue + « Enregistrer », sans le    */
/*  geste « tirer pour fermer », pour la même raison : la roue défile),   */
/*  plus un choix Personnes / À l'unité. À l'unité : un champ libre       */
/*  (« cookies », « parts », « pots »...) et des suggestions en un appui. */
/*  Une unité laissée vide revient à « personnes » (voir                  */
/*  normalizeServingsUnit, utils/servingsUnit.ts).                        */
/* ------------------------------------------------------------------ */

type Mode = "people" | "units";

interface ServingsPickerModalProps {
  servings: number;
  unit: string | null;
  onSave: (value: { servings: number; unit: string | null }) => void;
  onClose: () => void;
}

export default function ServingsPickerModal({ servings, unit, onSave, onClose }: ServingsPickerModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const initialUnit = normalizeServingsUnit(unit);
  const [mode, setMode] = useState<Mode>(initialUnit ? "units" : "people");
  const [count, setCount] = useState(() => Math.max(1, Math.round(Number(servings) || 1)));
  const [unitText, setUnitText] = useState(initialUnit || "");
  const max = mode === "people" ? SERVINGS_MAX_PEOPLE : SERVINGS_MAX_UNITS;
  const value = Math.min(max, count);
  const suggestions = t("servingsUnit.suggestions").split(",").map((s) => s.trim()).filter(Boolean);
  const cleanUnit = normalizeServingsUnit(unitText);
  const suffix = mode === "people"
    ? t("recipeUi.form.servingsSuffix")
    : cleanUnit ? servingsUnitFor(cleanUnit, value) : t("servingsUnit.unitsSuffix");

  const handleSave = () => {
    onSave({ servings: value, unit: mode === "units" ? cleanUnit : null });
    onClose();
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page qty-wheel-modal servings-picker"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("recipeUi.form.servingsLabel")}
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title">{t("recipeUi.form.servingsLabel")}</h2>
        <Flourish />
        <SegmentedControl
          ariaLabel={t("servingsUnit.modeLabel")}
          value={mode}
          onChange={(next) => setMode(next as Mode)}
          options={[
            { value: "people", label: t("servingsUnit.modePeople") },
            { value: "units", label: t("servingsUnit.modeUnits") },
          ]}
        />
        <p className="hint servings-picker-hint">
          {mode === "people" ? t("recipeUi.form.servingsWheelHint") : t("servingsUnit.unitsHint")}
        </p>
        <div className="time-wheel-wrap servings-picker-wheel">
          {/* Remontée à chaque changement de mode : la plage change (1-24
              personnes, 1-99 à l'unité) et la roue ne se positionne qu'au
              montage (voir PortionWheel). */}
          <PortionWheel key={mode} value={value} onChange={setCount} min={1} max={max} dark={false} suffix={suffix} />
        </div>
        {mode === "units" && (
          <div className="servings-picker-unit">
            <label className="field">
              <span>{t("servingsUnit.unitLabel")}</span>
              <input
                value={unitText}
                maxLength={SERVINGS_UNIT_MAX_LENGTH}
                onChange={(e) => setUnitText(e.target.value)}
                placeholder={t("servingsUnit.unitPlaceholder")}
                enterKeyHint="done"
                autoCapitalize="none"
              />
            </label>
            <div className="servings-picker-suggestions" role="group" aria-label={t("servingsUnit.suggestionsLabel")}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`servings-picker-chip ${cleanUnit === s ? "active" : ""}`}
                  aria-pressed={cleanUnit === s}
                  onClick={() => { triggerHaptic(10); setUnitText(s); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="cookmode-nav servings-picker-save">
          <Seal tone="gold" onClick={handleSave}>{t("common.save")}</Seal>
        </div>
      </motion.div>
    </motion.div>
  );
}
