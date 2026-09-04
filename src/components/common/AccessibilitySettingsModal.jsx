import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { useTranslation } from "../../contexts/LanguageContext";
import { getStoredSoundEffects, storeSoundEffects } from "../../utils/localSettings";
import { playClickSound } from "../../utils/audioUtils";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import { PRESS_DURATION_OPTIONS } from "./pressDuration";
import { TEXT_SIZE_OPTIONS } from "./textSize";

// PRESS_DURATION_OPTIONS / TEXT_SIZE_OPTIONS (pressDuration.js / textSize.js)
// portent leurs valeurs ET des libellés français en dur — partagés avec
// RecipeForm, on ne change pas leur forme pour ne pas casser cet autre
// consommateur. Ici, on ne garde que la valeur et on retraduit le libellé
// via ces deux petites tables clé technique -> clé de traduction.
const PRESS_DURATION_LABEL_KEYS = { 500: "settings.pressShort", 750: "settings.pressStandard", 1000: "settings.pressLong" };
const TEXT_SIZE_LABEL_KEYS = { normal: "settings.textSizeNormal", large: "settings.textSizeLarge" };

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
  const { t } = useTranslation();
  // Purement local (voir localSettings.js) : pas synchronisé dans
  // `profiles`, donc géré ici directement plutôt que remonté jusqu'à
  // GrimoireDeMorgane.jsx comme le thème/l'appui long/la taille de texte —
  // rien d'autre dans l'app n'a besoin de réagir à ce changement, playClickSound()
  // relit lui-même la préférence à chaque appel (voir utils/audioUtils.js).
  const [soundEffects, setSoundEffectsState] = useState(() => getStoredSoundEffects());
  const setSoundEffects = (value) => {
    storeSoundEffects(value);
    setSoundEffectsState(value);
    if (value) playClickSound();
  };

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> {t("settings.back")}</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>{t("settings.accessibility")}</h2>
        <Flourish />

        <p className="ios-group-title">{t("settings.pressDurationTitle")}</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl
            options={PRESS_DURATION_OPTIONS.map(({ value }) => ({ value, label: t(PRESS_DURATION_LABEL_KEYS[value]) }))}
            value={pressDuration}
            onChange={onSetPressDuration}
            ariaLabel={t("settings.pressDurationTitle")}
          />
        </div>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
          {t("settings.pressDurationHint")}
        </p>

        <p className="ios-group-title">{t("settings.textSizeTitle")}</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl
            options={TEXT_SIZE_OPTIONS.map(({ value }) => ({ value, label: t(TEXT_SIZE_LABEL_KEYS[value]) }))}
            value={textSize}
            onChange={onSetTextSize}
            ariaLabel={t("settings.textSizeTitle")}
          />
        </div>

        <div className="ios-group">
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-row-title">{t("settings.soundEffects")}</span>
              <span className="settings-row-sub">{t("settings.soundEffectsHint")}</span>
            </div>
            <Switch checked={soundEffects} onChange={setSoundEffects} label={t("settings.soundEffects")} />
          </div>
        </div>
      </div>
    </div>
  );
}
