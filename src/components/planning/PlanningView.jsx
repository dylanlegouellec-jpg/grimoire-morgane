import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Send, User, Users } from "lucide-react";
import { getWeekStart, addWeeks, getWeekDays, toISODate, isSameDay, formatWeekRange, formatDayLabel, MEAL_TYPES, COURSE_TYPES, courseTypeInfo, courseTypeOrder } from "../../utils/planning";
import { triggerHaptic } from "../../utils/haptics";
import { getStoredPlanningScope, storePlanningScope } from "../../utils/localSettings";
import { useTranslation } from "../../contexts/LanguageContext";
import useHorizontalSwipe from "../../hooks/useHorizontalSwipe";
import Seal from "../common/Seal";
import SegmentedControl from "../common/SegmentedControl";
import AddMealModal from "./AddMealModal";
import PlanningMealGroup from "./PlanningMealGroup";

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
export default function PlanningView({ recipes, mealPlan, onAddMeal, onRemoveMeal, onRemoveMeals, onUpdateMeal, onReorderMeals, onSendToShoppingList, showToast, user }) {
  const { t, language } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  // Mode réorganisation (voir PlanningMealItem.jsx, poignée ⋮⋮) : masqué par
  // défaut pour ne pas encombrer la vue normale, affiché sur tous les jours
  // à la fois une fois activé plutôt que par jour — une seule bascule
  // globale, plus simple à retenir qu'un état par jour. Se bascule depuis le
  // menu d'appui long d'un titre de moment/sous-catégorie (voir
  // MealSectionOptionsModal.jsx/CourseOptionsModal.jsx) plutôt que via un
  // bouton permanent dans l'en-tête de la vue, pour ne rien ajouter à
  // l'affichage tant qu'on n'a pas fait ce geste.
  const [reorderMode, setReorderMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState(null); // date ISO pré-remplie ("YYYY-MM-DD") | null (FAB, calendrier libre)
  // Moment/type de plat prérempli pour le "+" ouvert depuis le menu d'un
  // en-tête de sous-catégorie (voir PlanningCourseGroup.jsx) — null pour le
  // FAB ou le "+" d'un jour, qui démarrent tous deux sans rien de préréglé.
  const [addModalMealType, setAddModalMealType] = useState(null);
  const [addModalCourseType, setAddModalCourseType] = useState(null);
  // Entrée en cours de modification (menu "Modifier", voir
  // PlanningMealItem.jsx/MealOptionsModal.jsx) — sa date et son moment
  // restent fixes, seuls la recette/le type de plat peuvent changer (voir
  // AddMealModal.jsx, prop `editEntry`).
  const [editingEntry, setEditingEntry] = useState(null);
  // Jours dépliés/repliés (voir isDayExpanded plus bas) — seuls les
  // BASCULEMENTS explicites de l'utilisateur sont mémorisés ici, par date
  // ISO (persiste donc d'une semaine à l'autre pour cette même date) ;
  // l'état par défaut (aujourd'hui déplié, le reste replié) n'a pas besoin
  // d'être stocké puisqu'il est recalculable à tout moment.
  const [expandedOverrides, setExpandedOverrides] = useState(() => new Map());
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

  const openAddForDay = (iso) => {
    triggerHaptic(15);
    setAddModalDate(iso);
    setAddModalMealType(null);
    setAddModalCourseType(null);
    setShowAddModal(true);
  };
  const openAddFab = () => {
    triggerHaptic(15);
    setAddModalDate(null);
    setAddModalMealType(null);
    setAddModalCourseType(null);
    setShowAddModal(true);
  };
  // "Ajouter un plat" du menu d'un en-tête de sous-catégorie (voir
  // PlanningCourseGroup.jsx) : même assistant que les deux ci-dessus, mais
  // moment ET type de plat démarrent déjà préremplis sur cette catégorie
  // (voir AddMealModal.jsx, props initialMealType/initialCourseType) —
  // l'étape recette s'affiche donc directement.
  const openAddForCourse = (iso, mealTypeKey, courseKey) => {
    triggerHaptic(15);
    setAddModalDate(iso);
    setAddModalMealType(mealTypeKey);
    setAddModalCourseType(courseKey);
    setShowAddModal(true);
  };

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

  // "Supprimer la section Déjeuner" du menu d'un en-tête de moment (voir
  // PlanningMealGroup.jsx/MealSectionOptionsModal.jsx) — vide TOUT le
  // moment d'un coup (toutes ses entrées, tous types de plat confondus),
  // via la même suppression groupée que "Tout supprimer" d'une sous-
  // catégorie (voir onRemoveMeals, hooks/useMealPlan.js).
  const handleDeleteSection = (entries) => onRemoveMeals(entries.map((e) => e.id));

  const toggleReorderMode = () => {
    triggerHaptic(15);
    setReorderMode((v) => !v);
  };

  // Accordéon par jour : seuls les basculements EXPLICITES sont mémorisés
  // (par date ISO, voir expandedOverrides ci-dessus) — sans override, un
  // jour est déplié par défaut UNIQUEMENT s'il s'agit d'aujourd'hui, replié
  // sinon (y compris pour une semaine sans "aujourd'hui" du tout, passée ou
  // future : tous ses jours démarrent alors repliés).
  const isDayExpanded = (iso, isToday) => (expandedOverrides.has(iso) ? expandedOverrides.get(iso) : isToday);
  const toggleDay = (iso, isToday) => {
    triggerHaptic(10);
    setExpandedOverrides((prev) => {
      const next = new Map(prev);
      next.set(iso, !isDayExpanded(iso, isToday));
      return next;
    });
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
          const expanded = isDayExpanded(iso, todayFlag);
          return (
            <div className={`planning-day ${todayFlag ? "today" : ""}`} key={iso}>
              <div className="planning-day-header">
                <button
                  type="button"
                  className="planning-day-toggle"
                  onClick={() => toggleDay(iso, todayFlag)}
                  aria-expanded={expanded}
                  aria-label={t(expanded ? "planning.collapseDay" : "planning.expandDay", { day: dayLabel })}
                >
                  <ChevronDown size={16} className={`planning-day-chevron ${expanded ? "expanded" : ""}`} aria-hidden="true" />
                  <span className="planning-day-label">
                    {todayFlag && <span className="planning-today-badge">{t("planning.today")}</span>}
                    {dayLabel}
                  </span>
                  {/* Nombre de repas visible même replié : garde le jour
                      "scannable" d'un coup d'œil sans avoir à le déplier
                      juste pour savoir s'il contient déjà quelque chose. */}
                  {!expanded && dayEntries.length > 0 && (
                    <span className="planning-day-count" aria-label={t("planning.dayMealCountLabel", { count: dayEntries.length })}>
                      {dayEntries.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="planning-add-btn"
                  onClick={(e) => { e.stopPropagation(); openAddForDay(iso); }}
                  aria-label={t("planning.addMealLabel", { day: dayLabel })}
                >
                  <Plus size={16} />
                </button>
              </div>
              {expanded && dayEntries.length > 0 && (
                <div className="planning-meals">
                  {groupEntriesByMealType(dayEntries).map((group) => (
                    <PlanningMealGroup
                      key={group.mealType.key}
                      mealType={group.mealType}
                      entries={group.entries}
                      groupEntriesByCourse={groupEntriesByCourse}
                      labelForEntry={labelForEntry}
                      reorderMode={reorderMode}
                      onToggleReorder={toggleReorderMode}
                      onReorder={onReorderMeals}
                      onEdit={setEditingEntry}
                      onDelete={(e) => onRemoveMeal(e.id)}
                      onDeleteSection={handleDeleteSection}
                      onAddToCourse={(courseKey) => openAddForCourse(iso, group.mealType.key, courseKey)}
                      onDeleteAllCourse={(groupEntries) => onRemoveMeals(groupEntries.map((e) => e.id))}
                    />
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

      {/* Masqué en mode réorganisation (voir bannière ci-dessous) : ajouter un
          repas n'a pas de sens pendant qu'on réordonne, et son coin bas-droit
          chevaucherait de toute façon la bannière. */}
      {!reorderMode && (
        <button type="button" className="fab" onClick={openAddFab} aria-label={t("planning.addMealFab")}>
          <Plus size={22} />
        </button>
      )}

      {/* Bannière fixe de validation du mode réorganisation (voir
          `reorderMode`/`toggleReorderMode` plus haut) — "Terminer" valide le
          nouvel ordre (déjà appliqué au fil du glissement, voir
          hooks/useDragReorder.js/useMealPlan.js) et referme simplement ce
          mode, rien à enregistrer en plus à ce moment précis. */}
      {reorderMode && (
        <div className="planning-reorder-banner">
          <span className="planning-reorder-banner-label">{t("planning.reorderBannerLabel")}</span>
          <Seal tone="gold" onClick={toggleReorderMode}>{t("planning.reorderBannerConfirm")}</Seal>
        </div>
      )}

      {showAddModal && (
        <AddMealModal
          recipes={recipes}
          initialDate={addModalDate}
          initialMealType={addModalMealType}
          initialCourseType={addModalCourseType}
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
