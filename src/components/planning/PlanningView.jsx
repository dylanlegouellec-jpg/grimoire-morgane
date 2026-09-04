import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Send, X } from "lucide-react";
import { getWeekStart, addWeeks, getWeekDays, toISODate, isSameDay, formatWeekRange, formatDayLabel, mealTypeInfo } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import Seal from "../common/Seal";
import AddMealModal from "./AddMealModal";

/* ------------------------------------------------------------------ */
/*  PLANIFICATION — vue chronologique par semaine, un jour par bloc,      */
/*  chaque repas rattaché à une recette existante.                        */
/*                                                                          */
/*  Deux façons d'ajouter un repas :                                       */
/*   - le "+" d'un jour précis pré-remplit la date (étape calendrier         */
/*     sautée dans AddMealModal.jsx) ;                                       */
/*   - le bouton flottant "+" (FAB, coin bas-droit — voir .fab, déjà          */
/*     positionné correctement au-dessus de la nav basse pour RecipesView)   */
/*     ouvre le même assistant SANS date pré-choisie : sa première étape      */
/*     est alors un calendrier mensuel complet (CalendarPicker.jsx).          */
/*  Dans les deux cas, valider redirige automatiquement la vue sur la          */
/*  semaine du jour choisi — utile surtout depuis le FAB, où n'importe         */
/*  quel jour de l'année est possible, pas seulement ceux de la semaine        */
/*  actuellement affichée.                                                     */
/* ------------------------------------------------------------------ */
export default function PlanningView({ recipes, mealPlan, onAddMeal, onRemoveMeal, onSendToShoppingList, showToast }) {
  const { t, language } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState(null); // date ISO pré-remplie ("YYYY-MM-DD") | null (FAB, calendrier libre)

  const days = getWeekDays(weekStart);
  const today = new Date();
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const entriesForDay = (isoDate) => mealPlan.filter((e) => e.date === isoDate);
  const weekEntries = days.flatMap((d) => entriesForDay(toISODate(d)));

  const goPrevWeek = () => { triggerHaptic(10); setWeekStart((w) => addWeeks(w, -1)); };
  const goNextWeek = () => { triggerHaptic(10); setWeekStart((w) => addWeeks(w, 1)); };

  const openAddForDay = (iso) => { triggerHaptic(15); setAddModalDate(iso); setShowAddModal(true); };
  const openAddFab = () => { triggerHaptic(15); setAddModalDate(null); setShowAddModal(true); };

  const handleAdd = (dateISO, mealType, recipeId) => {
    onAddMeal(dateISO, mealType, recipeId);
    setShowAddModal(false);
    setWeekStart(getWeekStart(new Date(dateISO)));
  };

  const handleSend = () => {
    const recipeIds = weekEntries.map((e) => e.recipeId).filter(Boolean);
    if (!recipeIds.length) {
      showToast(t("planning.noMealsThisWeek"));
      return;
    }
    onSendToShoppingList(recipeIds);
  };

  return (
    <div className="view">
      <div className="planning-header">
        <h2 className="dropcap-title" style={{ margin: 0, textAlign: "center" }}>{t("planning.title")}</h2>
        <div className="planning-week-nav">
          <button type="button" className="planning-week-arrow" onClick={goPrevWeek} aria-label={t("planning.prevWeek")}>
            <ChevronLeft size={18} />
          </button>
          <span className="planning-week-range">{formatWeekRange(weekStart, language)}</span>
          <button type="button" className="planning-week-arrow" onClick={goNextWeek} aria-label={t("planning.nextWeek")}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="planning-days">
        {days.map((d) => {
          const iso = toISODate(d);
          const dayEntries = entriesForDay(iso);
          const todayFlag = isSameDay(d, today);
          const dayLabel = formatDayLabel(d, language);
          return (
            <div className={`planning-day ${todayFlag ? "today" : ""}`} key={iso}>
              <div className="planning-day-header">
                <span className="planning-day-label">
                  {todayFlag && <span className="planning-today-badge">{t("planning.today")}</span>}
                  {dayLabel}
                </span>
                <button
                  type="button"
                  className="planning-add-btn"
                  onClick={() => openAddForDay(iso)}
                  aria-label={t("planning.addMealLabel", { day: dayLabel })}
                >
                  <Plus size={16} />
                </button>
              </div>
              {dayEntries.length > 0 && (
                <div className="planning-meals">
                  {dayEntries.map((entry) => {
                    const recipe = recipeById.get(entry.recipeId);
                    const meal = mealTypeInfo(entry.mealType);
                    return (
                      <div className="planning-meal-row" key={entry.id}>
                        <span className="planning-meal-icon" aria-hidden="true">{meal.icon}</span>
                        <span className="planning-meal-info">
                          <span className="planning-meal-type">{t(`mealTypes.${entry.mealType}`)}</span>
                          <span className="planning-meal-recipe">{recipe ? recipe.title : t("planning.recipeDeletedLabel")}</span>
                        </span>
                        <button
                          type="button"
                          className="planning-meal-remove"
                          onClick={() => onRemoveMeal(entry.id)}
                          aria-label={t("planning.removeMeal")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="planning-send-wrap">
        <Seal tone="gold" onClick={handleSend}>
          <Send size={15} /> {t("planning.sendToShopping")}
        </Seal>
      </div>

      <button type="button" className="fab" onClick={openAddFab} aria-label={t("planning.addMealFab")}>
        <Plus size={22} />
      </button>

      {showAddModal && (
        <AddMealModal
          recipes={recipes}
          initialDate={addModalDate}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
