import { ChevronLeft } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import { PRESS_DURATION_OPTIONS } from "./pressDuration";
import { TEXT_SIZE_OPTIONS } from "./textSize";

/* ------------------------------------------------------------------ */
/*  SOUS-PANNEAU "ACCESSIBILITÉ" — poussé depuis la liste groupée des    */
/*  Réglages (voir SecretSettingsModal.jsx).                             */
/* ------------------------------------------------------------------ */
export default function AccessibilitySettingsModal({
  pressDuration,
  onSetPressDuration,
  textSize,
  onSetTextSize,
  onBack,
}) {
  useBodyScrollLock(true);

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> Réglages</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>Accessibilité</h2>
        <Flourish />

        <p className="ios-group-title">Durée d'appui long</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl
            options={PRESS_DURATION_OPTIONS.map(({ value, label }) => ({ value, label }))}
            value={pressDuration}
            onChange={onSetPressDuration}
            ariaLabel="Durée d'appui long"
          />
        </div>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
          Durée à maintenir pour supprimer une carte ou ajouter un titre de section.
        </p>

        <p className="ios-group-title">Taille de texte</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl options={TEXT_SIZE_OPTIONS} value={textSize} onChange={onSetTextSize} ariaLabel="Taille de texte" />
        </div>
      </div>
    </div>
  );
}
