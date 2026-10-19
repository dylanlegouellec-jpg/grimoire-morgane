import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import { useUnits } from "../../contexts/UnitsContext";
import { triggerHaptic } from "../../utils/helpers";
import {
  DEFAULT_UNITS,
  MAX_CUSTOM_UNITS,
  MAX_UNIT_LENGTH,
  NO_UNIT,
  addCustomUnit,
  availableSuggestions,
  customUnits,
  isDefaultUnitHidden,
  removeCustomUnit,
  setDefaultUnitHidden,
} from "../../utils/units";
import { UNIT_LABEL_KEYS } from "../recipe/form/recipeFormRows";
import Flourish from "./Flourish";
import Switch from "./Switch";

/* ------------------------------------------------------------------ */
/*  SOUS-VUE « UNITÉS DES INGRÉDIENTS » — contenu seul (titre + corps),    */
/*  la coquille (fond, bouton « < Réglages », tirage) est portée par          */
/*  SettingsSubPanel dans SecretSettingsModal, comme les autres sous-vues.     */
/*  Lit et modifie la liste du FOYER via UnitsContext (voir utils/units.ts     */
/*  pour les règles : doublons, « Sans unité » jamais masquable, au moins       */
/*  une unité gardée) ; la synchro app_state.units est faite par                 */
/*  hooks/useOfflineSync.ts. Rien ici ne touche aux recettes existantes.          */
/* ------------------------------------------------------------------ */

// Message affiché juste sous le groupe où l'action a eu lieu.
type FeedbackArea = "defaults" | "custom" | "add";
type Feedback = { kind: "error" | "info"; text: string; area: FeedbackArea } | null;

export default function UnitsSettingsModal() {
  const { t } = useTranslation();
  const { unitSettings, setUnitSettings } = useUnits();
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const errorText = (error: string) => t(`unitsSettings.errors.${error}`, { max: error === "tooMany" ? MAX_CUSTOM_UNITS : MAX_UNIT_LENGTH });
  const defaultLabel = (value: string) => (value in UNIT_LABEL_KEYS ? t(UNIT_LABEL_KEYS[value]) : value);

  const add = (input: string) => {
    const result = addCustomUnit(unitSettings, input);
    if (!result.ok) {
      triggerHaptic([20, 40, 20]);
      setFeedback({ kind: "error", text: errorText(result.error), area: "add" });
      return false;
    }
    triggerHaptic(15);
    setUnitSettings(result.settings);
    const shown = result.unhidden ? defaultLabel(result.value) : result.value;
    setFeedback({ kind: "info", text: t(result.unhidden ? "unitsSettings.unhidden" : "unitsSettings.added", { unit: shown }), area: "add" });
    return true;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (add(draft)) setDraft("");
  };

  const toggleDefault = (value: string, visible: boolean) => {
    const result = setDefaultUnitHidden(unitSettings, value, !visible);
    if (!result.ok) {
      triggerHaptic([20, 40, 20]);
      setFeedback({ kind: "error", text: errorText(result.error), area: "defaults" });
      return;
    }
    setFeedback(null);
    setUnitSettings(result.settings);
  };

  const remove = (value: string) => {
    const result = removeCustomUnit(unitSettings, value);
    if (!result.ok) {
      triggerHaptic([20, 40, 20]);
      setFeedback({ kind: "error", text: errorText(result.error), area: "custom" });
      return;
    }
    triggerHaptic(20);
    setUnitSettings(result.settings);
    setFeedback({ kind: "info", text: t("unitsSettings.removed", { unit: value }), area: "custom" });
  };

  const renderFeedback = (area: FeedbackArea) => feedback && feedback.area === area && (
    <p
      className={`units-settings-feedback ${feedback.kind === "error" ? "is-error" : ""}`}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.text}
    </p>
  );

  const custom = customUnits(unitSettings);
  const suggestions = availableSuggestions(unitSettings);

  return (
    <>
      <h2 className="dropcap-title" style={{ marginTop: 34 }}>{t("unitsSettings.title")}</h2>
      <Flourish />
      <p className="hint" style={{ fontStyle: "normal" }}>{t("unitsSettings.intro")}</p>

      <p className="ios-group-title">{t("unitsSettings.defaultsTitle")}</p>
      <div className="ios-group">
        {DEFAULT_UNITS.map((u) => {
          const label = defaultLabel(u.value);
          return (
            <div className="settings-row units-settings-row" key={u.value || "none"}>
              <span className="settings-row-title">{label}</span>
              {u.value === NO_UNIT ? (
                <span className="settings-row-sub">{t("unitsSettings.alwaysShown")}</span>
              ) : (
                <Switch
                  checked={!isDefaultUnitHidden(unitSettings, u.value)}
                  onChange={(visible) => toggleDefault(u.value, visible)}
                  label={t("unitsSettings.showUnit", { unit: label })}
                />
              )}
            </div>
          );
        })}
      </div>
      {renderFeedback("defaults")}

      <p className="ios-group-title">{t("unitsSettings.customTitle")}</p>
      <div className="ios-group">
        {custom.length === 0 ? (
          <p className="settings-row settings-row-sub units-settings-empty">{t("unitsSettings.customEmpty")}</p>
        ) : (
          custom.map((u) => (
            <div className="settings-row units-settings-row" key={u}>
              <span className="settings-row-title units-settings-custom-name">{u}</span>
              <button
                type="button"
                className="units-settings-remove"
                onClick={() => remove(u)}
                aria-label={t("unitsSettings.remove", { unit: u })}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))
        )}
      </div>
      {renderFeedback("custom")}

      <p className="ios-group-title">{t("unitsSettings.addTitle")}</p>
      <div className="ios-group ios-group-padded">
        <form className="units-settings-add" onSubmit={handleSubmit}>
          <input
            type="text"
            className="units-settings-input"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (feedback?.kind === "error") setFeedback(null); }}
            placeholder={t("unitsSettings.addPlaceholder")}
            aria-label={t("unitsSettings.addLabel")}
            maxLength={MAX_UNIT_LENGTH + 10}
            autoCapitalize="none"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="submit" className="units-settings-add-btn" disabled={!draft.trim()}>
            <Plus size={16} /> {t("unitsSettings.addButton")}
          </button>
        </form>
        {suggestions.length > 0 && (
          <div className="units-settings-suggestions">
            <span className="units-settings-suggestions-label">{t("unitsSettings.suggestionsLabel")}</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="qty-sheet-chip units-settings-chip"
                onClick={() => add(s)}
                aria-label={t("unitsSettings.suggestionAdd", { unit: s })}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {renderFeedback("add")}
      </div>

      <p className="hint units-settings-hint">{t("unitsSettings.recipesHint")}</p>
    </>
  );
}
