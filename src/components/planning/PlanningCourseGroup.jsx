import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "../../contexts/LanguageContext";
import useLongPress from "../../hooks/useLongPress";
import PlanningMealItemsList from "./PlanningMealItemsList";
import CourseOptionsModal from "./CourseOptionsModal";
import MoveMealSectionModal from "./MoveMealSectionModal";

const LONG_PRESS_DURATION_MS = 500;

/* ------------------------------------------------------------------ */
/*  SOUS-GROUPE D'UN TYPE DE PLAT (ex. "Entrées") DANS LE PLAN — voir       */
/*  PlanningView.jsx. Extrait en composant séparé plutôt qu'inline dans      */
/*  le triple .map() jour/moment/type : useLongPress est un hook, il ne      */
/*  peut pas être appelé un nombre de fois variable dans une boucle (même     */
/*  raison que PlanningMealItem.jsx pour chaque ligne).                       */
/*  Un appui long sur l'EN-TÊTE (pas sur une ligne précise) ouvre un menu      */
/*  à plusieurs options : ajouter directement un nouveau plat dans cette        */
/*  même catégorie (date/moment/type de plat préremplis, voir                    */
/*  AddMealModal.jsx, props `initialMealType`/`initialCourseType`), basculer      */
/*  le mode réorganisation, déplacer TOUTE cette sous-catégorie vers un autre      */
/*  moment (voir MoveMealSectionModal.jsx — `onMoveToMeal`, reçu de                */
/*  PlanningView.jsx via PlanningMealGroup.jsx : c'est le MÊME gestionnaire         */
/*  générique que "Changer le moment du repas" d'un en-tête de moment entier,       */
/*  ici simplement appelé avec les seules entrées de cette sous-catégorie plutôt     */
/*  que toutes celles du moment — le reste du moment d'origine n'est jamais           */
/*  touché), ou tout supprimer d'un coup.                                              */
/* ------------------------------------------------------------------ */
export default function PlanningCourseGroup({ mealTypeKey, course, entries, labelForEntry, reorderMode, onToggleReorder, onReorder, onEdit, onDelete, onAddToCourse, onMoveToMeal, onDeleteAll }) {
  const { t } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
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

      <AnimatePresence>
        {showOptions && (
          <CourseOptionsModal
            label={label}
            reorderMode={reorderMode}
            onToggleReorder={onToggleReorder}
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
            onMoveToMeal={() => {
              closeOptions();
              setTimeout(() => setShowMoveModal(true), 0);
            }}
            onDeleteAll={() => { closeOptions(); onDeleteAll(entries); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMoveModal && (
          <MoveMealSectionModal
            currentMealTypeKey={mealTypeKey}
            sourceLabel={label}
            onClose={() => setShowMoveModal(false)}
            onSelect={(newMealTypeKey) => {
              onMoveToMeal(entries, newMealTypeKey);
              setShowMoveModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
