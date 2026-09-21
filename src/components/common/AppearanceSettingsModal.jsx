import { Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import HeroTreatmentPreview from "./HeroTreatmentPreview";
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
  navOpacity,
  onSetNavOpacity,
  heroTreatment,
  onSetHeroTreatment,
  iconStyle,
  onSetIconStyle,
}) {
  const { t } = useTranslation();

  const THEME_OPTIONS = [
    { value: "light", label: t("settings.themeLight"), icon: Sun },
    { value: "dark", label: t("settings.themeDark"), icon: Moon },
    { value: "system", label: t("settings.themeSystem"), icon: Monitor },
  ];

  const ICON_STYLE_OPTIONS = [
    { value: "emoji", label: t("settings.iconStyleEmoji") },
    { value: "vector", label: t("settings.iconStyleVector"), icon: Sparkles },
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

      <p className="ios-group-title">{t("settings.iconStyleTitle")}</p>
      <div className="ios-group ios-group-padded">
        <SegmentedControl options={ICON_STYLE_OPTIONS} value={iconStyle} onChange={onSetIconStyle} ariaLabel={t("settings.iconStyleTitle")} />
      </div>
      <p className="hint" style={{ fontStyle: "normal", marginTop: 8 }}>
        {t("settings.iconStyleHint")}
      </p>

      <p className="ios-group-title">{t("settings.languageTitle")}</p>
      <div className="ios-group ios-group-padded">
        <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={onSetLanguage} ariaLabel={t("settings.languageTitle")} />
      </div>

      <p className="ios-group-title">{t("settings.navigationSection")}</p>
      <div className="ios-group">
        <div className="settings-slider-row">
          <div className="settings-slider-head">
            <div className="settings-row-label">
              <span className="settings-row-title">{t("settings.navOpacityTitle")}</span>
              <span className="settings-row-sub">{t("settings.navOpacityHint")}</span>
            </div>
            <span className="settings-slider-value">{Math.round(navOpacity * 100)} %</span>
          </div>
          <input
            type="range"
            className="settings-slider"
            min="0"
            max="1"
            step="0.05"
            value={navOpacity}
            onChange={(e) => onSetNavOpacity(Number(e.target.value))}
            aria-label={t("settings.navOpacityTitle")}
            // La modale des Réglages se ferme sur un tirage vers le bas
            // (useDismissibleSheet, posé sur son conteneur) : sans ça, la
            // moindre dérive verticale en traînant le curseur remonterait
            // jusqu'à ce geste et refermerait le panneau en plein réglage.
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          />
        </div>
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

      <p className="ios-group-title">{t("settings.heroTreatmentTitle")}</p>
      <p className="hint" style={{ fontStyle: "normal", marginTop: -4 }}>
        {t("settings.heroTreatmentHint")}
      </p>
      <HeroTreatmentPreview value={heroTreatment} onChange={onSetHeroTreatment} />
    </>
  );
}
