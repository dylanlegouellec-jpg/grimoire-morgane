import { useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { MEAL_TYPES, toISODate, formatDayLabel } from "../../utils/planning";
import { categoryClass, categoryLabel } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "../common/Flourish";
import CalendarPicker from "./CalendarPicker";

/* ------------------------------------------------------------------ */
/*  AJOUTER UN REPAS — assistant en couches (même principe de navigation   */
/*  que SecretSettingsModal.jsx). Deux points d'entrée :                    */
/*   - le "+" d'un jour précis (voir PlanningView.jsx) fournit `initialDate` */
/*     : l'étape date est alors sautée, on commence directement au type      */
/*     de repas.                                                             */
/*   - le bouton flottant "+" (FAB) n'a pas de date pré-choisie : la          */
/*     première étape est un calendrier mensuel complet (voir                 */
/*     CalendarPicker.jsx), pour choisir n'importe quel jour de l'année.      */
/*  Rien n'est enregistré tant que la recette finale n'est pas choisie —      */
/*  fermer la feuille à n'importe quelle étape n'ajoute rien.                 */
/* ------------------------------------------------------------------ */
export default function AddMealModal({ recipes, initialDate, onAdd, onClose }) {
  useBodyScrollLock(true);
  const { t, dict, language } = useTranslation();
  const hasDateStep = !initialDate;
  const [selectedDate, setSelectedDate] = useState(() => (initialDate ? new Date(initialDate) : null));
  const [viewMonth, setViewMonth] = useState(() => (initialDate ? new Date(initialDate) : new Date()));
  const [mealType, setMealType] = useState(null);
  const [search, setSearch] = useState("");

  const step = !selectedDate ? "date" : !mealType ? "meal" : "recipe";
  const isFirstStep = hasDateStep ? step === "date" : step === "meal";

  const goBack = () => {
    triggerHaptic(10);
    if (step === "recipe") setMealType(null);
    else if (step === "meal") setSelectedDate(null);
  };

  const handleSelectDate = (d) => {
    triggerHaptic(15);
    setSelectedDate(d);
  };

  const pickRecipe = (recipeId) => {
    triggerHaptic(15);
    onAdd(toISODate(selectedDate), mealType, recipeId);
    onClose();
  };

  const q = search.trim().toLowerCase();
  const filtered = [...recipes]
    .filter((r) => !q || r.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const titles = { date: t("planning.dateStepTitle"), meal: t("planning.mealStepTitle"), recipe: t("planning.recipeStepTitle") };
  const backLabels = { meal: t("planning.backToDate"), recipe: t("planning.backToMealType") };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page planning-step-modal" onClick={(e) => e.stopPropagation()}>
        {!isFirstStep ? (
          <button className="modal-back" onClick={goBack}>
            <ChevronLeft size={20} /> {backLabels[step]}
          </button>
        ) : (
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        )}
        <h2 className="dropcap-title" style={!isFirstStep ? { marginTop: 34 } : undefined}>
          {titles[step]}
        </h2>
        <Flourish />
        {step === "meal" && selectedDate && (
          <p className="hint" style={{ fontStyle: "normal" }}>{formatDayLabel(selectedDate, language)}</p>
        )}

        {step === "date" && (
          <CalendarPicker
            viewMonth={viewMonth}
            onChangeMonth={setViewMonth}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        )}

        {step === "meal" && (
          <div className="ios-group">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.key}
                type="button"
                className="ios-row"
                onClick={() => { triggerHaptic(15); setMealType(m.key); }}
              >
                <span className="ios-row-icon" style={{ background: "var(--surface-strong)", fontSize: "1.05rem" }}>{m.icon}</span>
                <span className="ios-row-title">{t(`mealTypes.${m.key}`)}</span>
              </button>
            ))}
          </div>
        )}

        {step === "recipe" && (
          <>
            <div className="search-bar" style={{ margin: "0 0 14px" }}>
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("planning.searchRecipePlaceholder")}
                autoFocus
              />
            </div>
            {filtered.length === 0 ? (
              <p className="hint">{t("planning.noRecipeMatch")}</p>
            ) : (
              <div className="recipe-select-list">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="recipe-select-row card recipe-select-row-btn"
                    onClick={() => pickRecipe(r.id)}
                  >
                    <span className="recipe-select-row-title">{r.title}</span>
                    <span className={`chip ${categoryClass(r)}`}>{dict.labels[categoryLabel(r)] || categoryLabel(r)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
