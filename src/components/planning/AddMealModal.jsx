import { useState } from "react";
import { ChevronLeft, PenLine, Search, X } from "lucide-react";
import { MEAL_TYPES, COURSE_TYPES, DEFAULT_COURSE_TYPE, mealTypeHasCourse, toISODate, formatDayLabel } from "../../utils/planning";
import { categoryClass, categoryLabel } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
import Flourish from "../common/Flourish";
import CalendarPicker from "./CalendarPicker";

/* ------------------------------------------------------------------ */
/*  AJOUTER UN REPAS — assistant en couches (même principe de navigation   */
/*  que SecretSettingsModal.jsx). Trois points d'entrée :                   */
/*   - le "+" d'un jour précis (voir PlanningView.jsx) fournit `initialDate` */
/*     : l'étape date est alors sautée, on commence directement au type      */
/*     de repas.                                                             */
/*   - le bouton flottant "+" (FAB) n'a pas de date pré-choisie : la          */
/*     première étape est un calendrier mensuel complet (voir                 */
/*     CalendarPicker.jsx), pour choisir n'importe quel jour de l'année.      */
/*   - le menu "Modifier" d'une ligne existante (voir PlanningMealItem.jsx/    */
/*     MealOptionsModal.jsx) fournit `editEntry` : date et moment sont alors   */
/*     entièrement figés (aucune des deux premières étapes n'a de sens ici,    */
/*     on ne modifie qu'un plat déjà planifié à une date/un moment donnés),     */
/*     l'assistant s'ouvre DIRECTEMENT sur l'étape recette pour choisir une     */
/*     nouvelle recette et/ou un nouveau type de plat ; `onSave` remplace       */
/*     alors `onAdd`, rien n'est ajouté en double.                              */
/*  Rien n'est enregistré tant que la recette finale n'est pas choisie —      */
/*  fermer la feuille à n'importe quelle étape n'ajoute/ne modifie rien.       */
/* ------------------------------------------------------------------ */
export default function AddMealModal({ recipes, initialDate, editEntry = null, onAdd, onSave, onClose }) {
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(onClose);
  const swipe = useSwipeToDismiss(onClose, { scrollRef: modalRef });
  const { t, dict, language } = useTranslation();
  const hasDateStep = !initialDate;
  const [selectedDate, setSelectedDate] = useState(() => {
    if (editEntry) return new Date(editEntry.date);
    return initialDate ? new Date(initialDate) : null;
  });
  const [viewMonth, setViewMonth] = useState(() => (initialDate ? new Date(initialDate) : new Date()));
  const [mealType, setMealType] = useState(() => (editEntry ? editEntry.mealType : null));
  // Type de plat (Apéro/Entrée/Plat/Dessert) — dimension INDÉPENDANTE du
  // moment (mealType) ci-dessus, choisie à côté de lui sur cette même étape
  // (voir le sélecteur à droite de la date plus bas) : "Plat" par défaut,
  // le cas le plus fréquent. N'a de sens que pour Déjeuner/Dîner (voir
  // mealTypeHasCourse) — ignoré à l'enregistrement pour les autres moments,
  // qu'il ait été changé ou non.
  const [courseType, setCourseType] = useState(() => {
    if (editEntry && mealTypeHasCourse(editEntry.mealType)) return editEntry.courseType || DEFAULT_COURSE_TYPE;
    return DEFAULT_COURSE_TYPE;
  });
  // En édition d'un repas personnalisé, préremplit le champ avec son nom
  // actuel : un simple changement de type de plat n'oblige alors pas à
  // retaper le nom pour "confirmer" (voir addCustomMeal plus bas).
  const [search, setSearch] = useState(() => (editEntry && editEntry.customTitle ? editEntry.customTitle : ""));

  const step = editEntry ? "recipe" : (!selectedDate ? "date" : !mealType ? "meal" : "recipe");
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
    const course = mealTypeHasCourse(mealType) ? courseType : null;
    if (editEntry) onSave(editEntry.id, recipeId, null, course);
    else onAdd(toISODate(selectedDate), mealType, recipeId, null, course);
    onClose();
  };

  // Repas "personnalisé" : un simple nom (ex. "Restes", "McDo"), sans fiche
  // recette — réutilise le champ de recherche existant comme champ de
  // saisie libre plutôt que d'ajouter un second input redondant.
  const addCustomMeal = () => {
    const title = search.trim();
    if (!title) return;
    triggerHaptic(15);
    const course = mealTypeHasCourse(mealType) ? courseType : null;
    if (editEntry) onSave(editEntry.id, null, title, course);
    else onAdd(toISODate(selectedDate), mealType, null, title, course);
    onClose();
  };

  const q = search.trim().toLowerCase();
  const filtered = [...recipes]
    .filter((r) => !q || r.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const titles = {
    date: t("planning.dateStepTitle"),
    meal: t("planning.mealStepTitle"),
    recipe: editEntry ? t("planning.editMealStepTitle") : t("planning.recipeStepTitle"),
  };
  const backLabels = { meal: t("planning.backToDate"), recipe: t("planning.backToMealType") };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page planning-step-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        {editEntry ? (
          // Pas de "retour" en édition : date et moment sont figés, cette
          // étape recette est la seule — juste fermer, dans le coin GAUCHE
          // (voir .meal-course-select ci-dessous, qui garde le droit).
          <button className="modal-back" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        ) : !isFirstStep ? (
          <button className="modal-back" onClick={goBack}>
            <ChevronLeft size={20} /> {backLabels[step]}
          </button>
        ) : (
          <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        )}
        {step === "recipe" && mealTypeHasCourse(mealType) && (
          <select
            className="meal-course-select"
            value={courseType}
            onChange={(e) => { triggerHaptic(10); setCourseType(e.target.value); }}
            aria-label={t("planning.courseTypeLabel")}
          >
            {COURSE_TYPES.map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {t(`courseTypes.${c.key}`)}</option>
            ))}
          </select>
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
            <div className="search-bar" style={{ margin: "0 0 10px" }}>
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("planning.searchRecipePlaceholder")}
                autoFocus
              />
            </div>
            <button type="button" className="link-btn add-custom-meal-btn" onClick={addCustomMeal} disabled={!search.trim()}>
              <PenLine size={14} /> {search.trim()
                ? t(editEntry ? "planning.saveCustomMealWithText" : "planning.addCustomMealWithText", { text: search.trim() })
                : t("planning.addCustomMeal")}
            </button>
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
