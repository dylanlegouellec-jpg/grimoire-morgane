import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Send, User, Users } from "lucide-react";
import { getWeekStart, addWeeks, getWeekDays, toISODate, isSameDay, formatWeekRange, formatDayLabel, MEAL_TYPES, COURSE_TYPES, courseTypeInfo, courseTypeOrder, mealTypeHasCourse } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { getStoredPlanningScope, storePlanningScope } from "../../utils/localSettings";
import { useTranslation } from "../../contexts/LanguageContext";
import useHorizontalSwipe from "../../hooks/useHorizontalSwipe";
import Seal from "../common/Seal";
import SegmentedControl from "../common/SegmentedControl";
import AddMealModal from "./AddMealModal";
import PlanningMealItem from "./PlanningMealItem";

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
export default function PlanningView({ recipes, mealPlan, onAddMeal, onRemoveMeal, onUpdateMeal, onSendToShoppingList, showToast, user }) {
  const { t, language } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState(null); // date ISO pré-remplie ("YYYY-MM-DD") | null (FAB, calendrier libre)
  // Entrée en cours de modification (menu "Modifier", voir
  // PlanningMealItem.jsx/MealOptionsModal.jsx) — sa date et son moment
  // restent fixes, seuls la recette/le type de plat peuvent changer (voir
  // AddMealModal.jsx, prop `editEntry`).
  const [editingEntry, setEditingEntry] = useState(null);
  // Portée affichée ("household" | "personal") — préférence locale à
  // l'appareil (voir utils/localSettings.js), pas une donnée de foyer :
  // chaque membre peut avoir son propre onglet de départ.
  const [scope, setScope] = useState(() => getStoredPlanningScope());
  const changeScope = (next) => {
    setScope(next);
    storePlanningScope(next);
  };

  const days = getWeekDays(weekStart);
  const today = new Date();
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  // "household" couvre aussi les entrées créées avant l'existence de ce
  // champ (scope absent, voir hooks/useMealPlan.js) — jamais traitées comme
  // "personal" par défaut. Une entrée "personal" n'est visible que pour
  // SON propriétaire (userId) : stockée dans le même app_state.meal_plan
  // partagé du foyer (donc techniquement lisible par les autres membres
  // au niveau des données, les RLS restant au niveau du foyer), ce filtre
  // ne garantit qu'une séparation d'AFFICHAGE, pas une confidentialité
  // stricte entre membres du même foyer.
  const scopedMealPlan = mealPlan.filter((e) => (
    scope === "personal" ? (e.scope === "personal" && e.userId === (user && user.id)) : e.scope !== "personal"
  ));
  const entriesForDay = (isoDate) => scopedMealPlan.filter((e) => e.date === isoDate);
  const weekEntries = days.flatMap((d) => entriesForDay(toISODate(d)));
  // Regroupe les entrées d'un jour par moment (un seul bloc "DÉJEUNER" plutôt
  // qu'une carte par plat) et trie chaque groupe dans l'ordre gastronomique
  // (voir courseTypeOrder) plutôt que dans l'ordre d'ajout au planning.
  const groupEntriesByMealType = (dayEntries) =>
    MEAL_TYPES
      .map((m) => ({
        mealType: m,
        entries: dayEntries
          .filter((e) => e.mealType === m.key)
          .slice()
          .sort((a, b) => courseTypeOrder(a.courseType) - courseTypeOrder(b.courseType)),
      }))
      .filter((g) => g.entries.length > 0);
  // Sous-regroupe les plats d'un même moment par TYPE DE PLAT (Apéro/Entrée/
  // Plat/Dessert) — un seul en-tête "Entrées" plutôt qu'une ligne "Entrée"
  // répétée pour chaque recette de ce type. `entries` (celles d'un groupe
  // ci-dessus) est déjà trié dans l'ordre gastronomique, donc les entrées
  // d'un même type y sont déjà contiguës : un simple filtre par type, dans
  // l'ordre de COURSE_TYPES, suffit à les répartir sans perdre cet ordre.
  const groupEntriesByCourse = (entries) =>
    COURSE_TYPES
      .map((c) => ({
        course: c,
        entries: entries.filter((e) => courseTypeInfo(e.courseType).key === c.key),
      }))
      .filter((g) => g.entries.length > 0);
  // Recette liée, repas personnalisé (texte libre, voir AddMealModal.jsx) ou
  // recette depuis effacée : voir le commentaire détaillé plus bas où cette
  // même logique était répétée pour chaque entrée avant l'ajout du sous-
  // regroupement par type de plat.
  const labelForEntry = (entry) => {
    const recipe = entry.recipeId ? recipeById.get(entry.recipeId) : null;
    return entry.customTitle || (recipe ? recipe.title : t("planning.recipeDeletedLabel"));
  };

  const goPrevWeek = () => { triggerHaptic(10); setWeekStart((w) => addWeeks(w, -1)); };
  const goNextWeek = () => { triggerHaptic(10); setWeekStart((w) => addWeeks(w, 1)); };
  // Glisser à gauche = avancer d'une semaine (comme tourner une page vers
  // l'avant), glisser à droite = reculer — mêmes seuils/verrouillage d'axe
  // que le swipe de filtres déjà en place ailleurs dans l'app, jamais de
  // preventDefault() donc aucun risque pour le défilement vertical.
  const weekSwipe = useHorizontalSwipe(goNextWeek, goPrevWeek);

  const openAddForDay = (iso) => { triggerHaptic(15); setAddModalDate(iso); setShowAddModal(true); };
  const openAddFab = () => { triggerHaptic(15); setAddModalDate(null); setShowAddModal(true); };

  const handleAdd = (dateISO, mealType, recipeId, customTitle, courseType) => {
    // Le nouveau repas hérite automatiquement de la portée actuellement
    // affichée (voir hooks/useMealPlan.js pour la forme exacte de l'entrée).
    onAddMeal(dateISO, mealType, recipeId, customTitle, scope, user && user.id, courseType);
    setShowAddModal(false);
    setWeekStart(getWeekStart(new Date(dateISO)));
  };

  const handleSaveEdit = (entryId, recipeId, customTitle, courseType) => {
    onUpdateMeal(entryId, {
      recipeId: recipeId || null,
      customTitle: customTitle || null,
      courseType,
    });
    setEditingEntry(null);
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
        {/* Semaine + portée sur une seule ligne : le toggle reste collé au
            bord droit (flex-shrink: 0), tout le reste de la largeur va au
            groupe flèches+date (.planning-week-date-group, flex: 1) — les
            flèches s'écartent jusqu'aux bords de cet espace restant (voir
            justify-content: space-between en CSS) et la date, elle-même en
            flex: 1 entre les deux, se centre dans tout ce qu'il reste. */}
        <div className="planning-week-nav">
          <div className="planning-week-date-group">
            <button type="button" className="planning-week-arrow" onClick={goPrevWeek} aria-label={t("planning.prevWeek")}>
              <ChevronLeft size={18} />
            </button>
            <span className="planning-week-range">{formatWeekRange(weekStart, language)}</span>
            <button type="button" className="planning-week-arrow" onClick={goNextWeek} aria-label={t("planning.nextWeek")}>
              <ChevronRight size={18} />
            </button>
          </div>
          <SegmentedControl
            compact
            ariaLabel={t("planning.scopeToggleLabel")}
            value={scope}
            onChange={changeScope}
            options={[
              { value: "household", label: "", icon: Users, ariaLabel: t("planning.scopeHousehold") },
              { value: "personal", label: "", icon: User, ariaLabel: t("planning.scopePersonal") },
            ]}
          />
        </div>
      </div>

      <div className="planning-days" {...weekSwipe}>
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
                  {groupEntriesByMealType(dayEntries).map((group) => (
                    <div className="planning-meal-group" key={group.mealType.key}>
                      <div className="planning-meal-group-header">
                        <span className="planning-meal-icon" aria-hidden="true">{group.mealType.icon}</span>
                        <span className="planning-meal-type">{t(`mealTypes.${group.mealType.key}`)}</span>
                      </div>
                      <div className="planning-meal-group-items">
                        {/* Aucun type de plat pour petit-déjeuner/en-cas (voir
                            mealTypeHasCourse) — jamais de sous-groupe pour ces
                            moments, juste la liste des entrées comme avant. */}
                        {mealTypeHasCourse(group.mealType.key)
                          ? groupEntriesByCourse(group.entries).map((courseGroup) => (
                              <div className="planning-course-group" key={courseGroup.course.key}>
                                <div className="planning-course-header">
                                  <span className="planning-meal-course-icon" aria-hidden="true">{courseGroup.course.icon}</span>
                                  <span className="planning-course-label">
                                    {/* Singulier pour un seul plat de ce type, pluriel
                                        dès qu'il y en a plusieurs (voir
                                        translations.js, courseTypes/courseTypesPlural). */}
                                    {t(`courseTypes${courseGroup.entries.length > 1 ? "Plural" : ""}.${courseGroup.course.key}`)}
                                  </span>
                                </div>
                                <ul className="planning-course-items">
                                  {courseGroup.entries.map((entry) => (
                                    <li className="planning-course-item" key={entry.id}>
                                      <PlanningMealItem
                                        entry={entry}
                                        course={null}
                                        label={labelForEntry(entry)}
                                        onEdit={setEditingEntry}
                                        onDelete={(e) => onRemoveMeal(e.id)}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))
                          : group.entries.map((entry) => (
                              <PlanningMealItem
                                key={entry.id}
                                entry={entry}
                                course={null}
                                label={labelForEntry(entry)}
                                onEdit={setEditingEntry}
                                onDelete={(e) => onRemoveMeal(e.id)}
                              />
                            ))}
                      </div>
                    </div>
                  ))}
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

      {editingEntry && (
        <AddMealModal
          recipes={recipes}
          editEntry={editingEntry}
          onSave={handleSaveEdit}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
