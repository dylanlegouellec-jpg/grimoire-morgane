import { useState } from "react";
import { useTranslation } from "../../contexts/LanguageContext";
import useLongPress from "../../hooks/useLongPress";
import { mealTypeHasCourse } from "../../utils/planning";
import PlanningCourseGroup from "./PlanningCourseGroup";
import PlanningMealItemsList from "./PlanningMealItemsList";
import MealSectionOptionsModal from "./MealSectionOptionsModal";
import DeleteMealSectionConfirmModal from "./DeleteMealSectionConfirmModal";

const LONG_PRESS_DURATION_MS = 500;

/* ------------------------------------------------------------------ */
/*  BLOC D'UN MOMENT ("DÉJEUNER", "DÎNER"…) DANS LE PLAN — voir             */
/*  PlanningView.jsx. Extrait en composant séparé plutôt qu'inline dans      */
/*  le double .map() jour/moment : useLongPress est un hook, il ne peut       */
/*  pas être appelé un nombre de fois variable dans une boucle (même          */
/*  raison que PlanningCourseGroup.jsx/PlanningMealItem.jsx).                  */
/*  Un appui long sur le TITRE du moment ("DÉJEUNER") ouvre un menu avec         */
/*  deux options : basculer le mode réorganisation (poignée ⋮⋮, voir            */
/*  PlanningMealItem.jsx — pas de bouton permanent en haut de la vue, ce         */
/*  menu EST le point d'entrée) et vider toute la section d'un coup, avec        */
/*  une confirmation intermédiaire (voir MealSectionOptionsModal.jsx/            */
/*  DeleteMealSectionConfirmModal.jsx) pour éviter les suppressions              */
/*  accidentelles d'un repas entier.                                              */
/* ------------------------------------------------------------------ */
export default function PlanningMealGroup({
  mealType,
  entries,
  groupEntriesByCourse,
  labelForEntry,
  reorderMode,
  onToggleReorder,
  onReorder,
  onEdit,
  onDelete,
  onDeleteSection,
  onAddToCourse,
  onDeleteAllCourse,
}) {
  const { t } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const headerLongPress = useLongPress(() => setShowOptions(true), LONG_PRESS_DURATION_MS);
  const closeOptions = () => {
    setShowOptions(false);
    headerLongPress.resetPressState();
  };
  const mealLabel = t(`mealTypes.${mealType.key}`);
  const hasCourse = mealTypeHasCourse(mealType.key);

  return (
    <div className="planning-meal-group">
      <div
        ref={headerLongPress.ref}
        className={`planning-meal-group-header press-anim press-${headerLongPress.pressState}`}
        onClick={() => { headerLongPress.wasLongPress(); }}
        {...headerLongPress.handlers}
      >
        <span className="planning-meal-icon" aria-hidden="true">{mealType.icon}</span>
        <span className="planning-meal-type">{mealLabel}</span>
      </div>
      <div className="planning-meal-group-items">
        {/* Aucun type de plat pour petit-déjeuner/en-cas (voir
            mealTypeHasCourse) — jamais de sous-groupe pour ces moments,
            juste la liste des entrées, réordonnable comme les autres. */}
        {hasCourse
          ? groupEntriesByCourse(entries).map((courseGroup) => (
              <PlanningCourseGroup
                key={courseGroup.course.key}
                course={courseGroup.course}
                entries={courseGroup.entries}
                labelForEntry={labelForEntry}
                reorderMode={reorderMode}
                onToggleReorder={onToggleReorder}
                onReorder={onReorder}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddToCourse={onAddToCourse}
                onDeleteAll={onDeleteAllCourse}
              />
            ))
          : (
              <PlanningMealItemsList
                entries={entries}
                bulleted={false}
                reorderMode={reorderMode}
                onReorder={onReorder}
                labelForEntry={labelForEntry}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
      </div>

      {showOptions && (
        <MealSectionOptionsModal
          mealLabel={mealLabel}
          reorderMode={reorderMode}
          onToggleReorder={onToggleReorder}
          onClose={closeOptions}
          onDeleteSection={() => {
            closeOptions();
            // Même délai que pour Modifier/Ajouter un plat ailleurs dans ce
            // dossier (voir PlanningMealItem.jsx/PlanningCourseGroup.jsx) :
            // laisse la fermeture asynchrone de ce menu se dérouler avant
            // d'ouvrir la confirmation, pour ne pas fausser l'historique
            // (voir hooks/useFocusTrap.js).
            setTimeout(() => setShowConfirm(true), 0);
          }}
        />
      )}
      {showConfirm && (
        <DeleteMealSectionConfirmModal
          mealLabel={mealLabel}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            onDeleteSection(entries);
            setShowConfirm(false);
          }}
        />
      )}
    </div>
  );
}
