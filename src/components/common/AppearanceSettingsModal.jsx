import { ChevronLeft, Monitor, Moon, Sun } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import { LANGUAGE_OPTIONS } from "./language";

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
  const { t } = useTranslation();

  const THEME_OPTIONS = [
    { value: "light", label: t("settings.themeLight"), icon: Sun },
    { value: "dark", label: t("settings.themeDark"), icon: Moon },
    { value: "system", label: t("settings.themeSystem"), icon: Monitor },
  ];

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> {t("settings.back")}</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>{t("settings.appearanceLanguage")}</h2>
        <Flourish />

        <p className="ios-group-title">{t("settings.themeTitle")}</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={onSetTheme} ariaLabel={t("settings.themeTitle")} />
        </div>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
          {t("settings.themeSystemHint")}
        </p>

        <p className="ios-group-title">{t("settings.languageTitle")}</p>
        <div className="ios-group ios-group-padded">
          <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={onSetLanguage} ariaLabel={t("settings.languageTitle")} />
        </div>

        <p className="ios-group-title">{t("settings.recipesSection")}</p>
        <div className="ios-group">
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-row-title">{t("settings.nutriscoreBadge")}</span>
              <span className="settings-row-sub">{t("settings.nutriscoreBadgeHint")}</span>
            </div>
            <Switch checked={!!showNutriscore} onChange={onSetShowNutriscore} label={t("settings.nutriscoreBadge")} />
          </div>
        </div>
      </div>
    </div>
  );
}
