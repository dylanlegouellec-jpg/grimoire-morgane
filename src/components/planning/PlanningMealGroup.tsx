import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslation } from "../../contexts/LanguageContext";
import useLongPress from "../../hooks/useLongPress";
import { mealTypeHasCourse } from "../../utils/planning";
import CategoryIcon from "../common/CategoryIcon";
import PlanningCourseGroup from "./PlanningCourseGroup";
import PlanningMealItemsList from "./PlanningMealItemsList";
import MealSectionOptionsModal from "./MealSectionOptionsModal";
import DeleteMealSectionConfirmModal from "./DeleteMealSectionConfirmModal";
import MoveMealSectionModal from "./MoveMealSectionModal";
import type { MealEntryLike } from "./PlanningMealItem";
import type { MealTypeInfo } from "../../utils/planning";

const LONG_PRESS_DURATION_MS = 500;

interface CourseGroupEntry {
  course: MealTypeInfo;
  entries: MealEntryLike[];
}

interface PlanningMealGroupProps {
  mealType: MealTypeInfo;
  entries: MealEntryLike[];
  groupEntriesByCourse: (entries: MealEntryLike[]) => CourseGroupEntry[];
  labelForEntry: (entry: MealEntryLike) => string;
  reorderMode: boolean;
  onToggleReorder: () => void;
  onReorder: (ids: string[]) => void;
  onEdit: (entry: MealEntryLike) => void;
  onDelete: (entry: MealEntryLike) => void;
  onAddMeal: () => void;
  onMoveSection: (entries: MealEntryLike[], newMealTypeKey: string) => void;
  onDeleteSection: (entries: MealEntryLike[]) => void;
  onAddToCourse: (courseKey: string) => void;
  onDeleteAllCourse: (entries: MealEntryLike[]) => void;
}

/* ------------------------------------------------------------------ */
/*  BLOC D'UN MOMENT ("DÉJEUNER", "DÎNER"…) DANS LE PLAN — voir             */
/*  PlanningView.jsx. Extrait en composant séparé plutôt qu'inline dans      */
/*  le double .map() jour/moment : useLongPress est un hook, il ne peut       */
/*  pas être appelé un nombre de fois variable dans une boucle (même          */
/*  raison que PlanningCourseGroup.jsx/PlanningMealItem.jsx).                  */
/*  Un appui long sur le TITRE du moment ("DÉJEUNER") ouvre un menu avec         */
/*  quatre options : ajouter directement un plat à ce moment (voir                */
/*  MealSectionOptionsModal.jsx/PlanningView.jsx, `openAddForMealSection` —          */
/*  moment présélectionné, type de plat par défaut sur "Plat" pour                     */
/*  Déjeuner/Dîner, modifiable via le sélecteur de l'assistant), basculer le              */
/*  mode réorganisation (poignée ⋮⋮, voir PlanningMealItem.jsx — pas de                    */
/*  bouton permanent en haut de la vue, ce menu EST le point d'entrée),                       */
/*  changer le moment de TOUTE la section d'un coup (voir                                        */
/*  MoveMealSectionModal.jsx — une éventuelle collision avec des plats déjà                          */
/*  présents sous le moment cible se résout d'elle-même via le regroupement                             */
/*  par type de plat déjà en place, sans code de fusion dédié), et vider toute                              */
/*  la section d'un coup, avec une confirmation intermédiaire (voir                                            */
/*  MealSectionOptionsModal.jsx/DeleteMealSectionConfirmModal.jsx) pour éviter                                    */
/*  les suppressions accidentelles d'un repas entier.                                                                */
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
  onAddMeal,
  onMoveSection,
  onDeleteSection,
  onAddToCourse,
  onDeleteAllCourse,
}: PlanningMealGroupProps) {
  const { t } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const headerLongPress = useLongPress<HTMLDivElement>(() => setShowOptions(true), LONG_PRESS_DURATION_MS);
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
        <CategoryIcon className="planning-meal-icon" emoji={mealType.icon} icon={mealType.vectorIcon} />
        <span className="planning-meal-type">{mealLabel}</span>
      </div>
      {/* Aucun type de plat pour petit-déjeuner/en-cas (voir
          mealTypeHasCourse) — jamais de sous-groupe pour ces moments, juste
          la liste des entrées, réordonnable comme les autres. Dans ce cas,
          PlanningMealItemsList rend LUI-MÊME le conteneur
          ".planning-meal-group-items" (voir son commentaire de fichier :
          <Reorder.Group> doit être le parent DOM direct de chaque ligne) —
          il ne reçoit donc PAS de wrapper séparé ici, contrairement au cas
          "plusieurs sous-groupes" ci-dessous, qui lui reste un simple
          conteneur d'affichage sans rôle dans le glissement. */}
      {hasCourse ? (
        <div className="planning-meal-group-items">
          {groupEntriesByCourse(entries).map((courseGroup) => (
            <PlanningCourseGroup
              key={courseGroup.course.key}
              mealTypeKey={mealType.key}
              course={courseGroup.course}
              entries={courseGroup.entries}
              labelForEntry={labelForEntry}
              reorderMode={reorderMode}
              onToggleReorder={onToggleReorder}
              onReorder={onReorder}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddToCourse={onAddToCourse}
              onMoveToMeal={onMoveSection}
              onDeleteAll={onDeleteAllCourse}
            />
          ))}
        </div>
      ) : (
        <PlanningMealItemsList
          entries={entries}
          bulleted={false}
          wrapperClassName="planning-meal-group-items"
          reorderMode={reorderMode}
          onReorder={onReorder}
          labelForEntry={labelForEntry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      <AnimatePresence>
        {showOptions && (
          <MealSectionOptionsModal
            mealLabel={mealLabel}
            reorderMode={reorderMode}
            onToggleReorder={onToggleReorder}
            onClose={closeOptions}
            onAddMeal={() => {
              closeOptions();
              // Même délai que pour les autres actions de ce menu (voir plus
              // bas, onMoveSection/onDeleteSection) : laisse la fermeture
              // asynchrone de ce menu se dérouler avant d'ouvrir l'assistant
              // d'ajout, pour ne pas fausser l'historique (voir
              // hooks/useFocusTrap.js).
              setTimeout(() => onAddMeal(), 0);
            }}
            onMoveSection={() => {
              closeOptions();
              // Même délai que pour Modifier/Ajouter un plat/Supprimer la
              // section ailleurs dans ce dossier (voir PlanningMealItem.jsx/
              // PlanningCourseGroup.jsx) : laisse la fermeture asynchrone de ce
              // menu se dérouler avant d'ouvrir le sélecteur de moment, pour ne
              // pas fausser l'historique (voir hooks/useFocusTrap.js).
              setTimeout(() => setShowMoveModal(true), 0);
            }}
            onDeleteSection={() => {
              closeOptions();
              setTimeout(() => setShowConfirm(true), 0);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMoveModal && (
          <MoveMealSectionModal
            currentMealTypeKey={mealType.key}
            onClose={() => setShowMoveModal(false)}
            onSelect={(newMealTypeKey) => {
              onMoveSection(entries, newMealTypeKey);
              setShowMoveModal(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}
