import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import { LANGUAGE_OPTIONS } from "./language";

/* ------------------------------------------------------------------ */
/*  SOUS-VUE "APPARENCE & LANGUE" — contenu seul, voir la note dans          */
/*  AccessibilitySettingsModal.jsx : rendu à l'intérieur de la coquille        */
/*  unique de SecretSettingsModal.jsx, aucun conteneur modal propre ici.       */
/* ------------------------------------------------------------------ */
export default function AppearanceSettingsModal({
  theme,
  onSetTheme,
  language,
  onSetLanguage,
  showNutriscore,
  onSetShowNutriscore,
}) {
  const { t } = useTranslation();

  const THEME_OPTIONS = [
    { value: "light", label: t("settings.themeLight"), icon: Sun },
    { value: "dark", label: t("settings.themeDark"), icon: Moon },
    { value: "system", label: t("settings.themeSystem"), icon: Monitor },
  ];

  return (
    <>
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
    </>
  );
}
