import { ChevronLeft, Monitor, Moon, Sun } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import { LANGUAGE_OPTIONS } from "./language";

const THEME_OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

/* ------------------------------------------------------------------ */
/*  SOUS-PANNEAU "APPARENCE & LANGUE" — poussé depuis la liste groupée   */
/*  des Réglages (voir SecretSettingsModal.jsx).                         */
/* ------------------------------------------------------------------ */
export default function AppearanceSettingsModal({
  theme,
  onSetTheme,
  language,
  onSetLanguage,
  showNutriscore,
  onSetShowNutriscore,
  onBack,
}) {
  useBodyScrollLock(true);

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> Réglages</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>Apparence &amp; Langue</h2>
        <Flourish />

        <p className="ios-group-title">Thème</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={onSetTheme} ariaLabel="Thème" />
        </div>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
          "Système" suit automatiquement le réglage clair/sombre de ton appareil.
        </p>

        <p className="ios-group-title">Langue</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={onSetLanguage} ariaLabel="Langue" />
        </div>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
          Réglage mémorisé — la traduction complète du grimoire arrive dans une prochaine mise à jour.
        </p>

        <p className="ios-group-title">Recettes</p>
        <div className="ios-group">
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-row-title">Badge Nutri-Score</span>
              <span className="settings-row-sub">Affiche la pastille A à E sur les cartes de recettes.</span>
            </div>
            <Switch checked={!!showNutriscore} onChange={onSetShowNutriscore} label="Afficher le badge Nutri-Score" />
          </div>
        </div>
      </div>
    </div>
  );
}
