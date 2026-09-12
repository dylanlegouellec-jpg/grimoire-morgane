import { useState } from "react";
import { useTranslation } from "../../contexts/LanguageContext";
import useLongPress from "../../hooks/useLongPress";
import PlanningMealItemsList from "./PlanningMealItemsList";
import CourseOptionsModal from "./CourseOptionsModal";

const LONG_PRESS_DURATION_MS = 500;

/* ------------------------------------------------------------------ */
/*  SOUS-GROUPE D'UN TYPE DE PLAT (ex. "Entrées") DANS LE PLAN — voir       */
/*  PlanningView.jsx. Extrait en composant séparé plutôt qu'inline dans      */
/*  le triple .map() jour/moment/type : useLongPress est un hook, il ne      */
/*  peut pas être appelé un nombre de fois variable dans une boucle (même     */
/*  raison que PlanningMealItem.jsx pour chaque ligne).                       */
/*  Un appui long sur l'EN-TÊTE (pas sur une ligne précise) ouvre un menu      */
/*  à deux options : ajouter directement un nouveau plat dans cette même       */
/*  catégorie (date/moment/type de plat préremplis, voir AddMealModal.jsx,      */
/*  props `initialMealType`/`initialCourseType`), ou tout supprimer d'un coup.  */
/* ------------------------------------------------------------------ */
export default function PlanningCourseGroup({ course, entries, labelForEntry, reorderMode, onReorder, onEdit, onDelete, onAddToCourse, onDeleteAll }) {
  const { t } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const headerLongPress = useLongPress(() => setShowOptions(true), LONG_PRESS_DURATION_MS);
  const closeOptions = () => {
    setShowOptions(false);
    headerLongPress.resetPressState();
  };
  // Singulier pour un seul plat de ce type, pluriel dès qu'il y en a
  // plusieurs (voir translations.js, courseTypes/courseTypesPlural).
  const label = t(`courseTypes${entries.length > 1 ? "Plural" : ""}.${course.key}`);

  return (
    <div className="planning-course-group">
      <div
        ref={headerLongPress.ref}
        className={`planning-course-header press-anim press-${headerLongPress.pressState}`}
        onClick={() => { headerLongPress.wasLongPress(); }}
        {...headerLongPress.handlers}
      >
        <span className="planning-meal-course-icon" aria-hidden="true">{course.icon}</span>
        <span className="planning-course-label">{label}</span>
      </div>
      <ul className="planning-course-items">
        <PlanningMealItemsList
          entries={entries}
          bulleted
          reorderMode={reorderMode}
          onReorder={onReorder}
          labelForEntry={labelForEntry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </ul>

      {showOptions && (
        <CourseOptionsModal
          label={label}
          onClose={closeOptions}
          onAdd={() => {
            closeOptions();
            // Même course entre "fermer ce menu" et "ouvrir l'assistant
            // d'ajout" que Modifier/Supprimer dans PlanningMealItem.jsx —
            // voir son commentaire pour le détail du timing history.back()/
            // pushState() : un setTimeout(0) laisse la fermeture (asynchrone)
            // de ce menu se dérouler avant d'ouvrir la modale suivante.
            setTimeout(() => onAddToCourse(course.key), 0);
          }}
          onDeleteAll={() => { closeOptions(); onDeleteAll(entries); }}
        />
      )}
    </div>
  );
}
