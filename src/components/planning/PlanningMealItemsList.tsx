import { useEffect, useState } from "react";
import { Reorder } from "motion/react";
import PlanningMealItem, { type MealEntryLike } from "./PlanningMealItem";

interface PlanningMealItemsListProps {
  entries: MealEntryLike[];
  bulleted: boolean;
  wrapperClassName: string;
  reorderMode: boolean;
  onReorder: (ids: string[]) => void;
  labelForEntry: (entry: MealEntryLike) => string;
  onEdit: (entry: MealEntryLike) => void;
  onDelete: (entry: MealEntryLike) => void;
}

/* ------------------------------------------------------------------ */
/*  LISTE DE PLATS RÉORDONNABLE — un seul <Reorder.Group> par LISTE (pas    */
/*  par plat individuel), réutilisée à la fois pour un sous-groupe de        */
/*  type de plat (voir PlanningCourseGroup.jsx, `bulleted`) et pour la        */
/*  liste "à plat" d'un moment sans type de plat (petit-déjeuner/en-cas,       */
/*  voir PlanningMealGroup.jsx). Le glisser-déposer (poignée ⋮⋮, voir          */
/*  PlanningMealItem.jsx) ne réordonne les plats qu'À L'INTÉRIEUR de cette      */
/*  même liste, jamais entre deux sous-groupes différents — cohérent avec       */
/*  ce que ce composant sait faire (un seul <Reorder.Group> = un seul            */
/*  tableau à la fois), et cohérent avec le sens même d'un sous-groupe par         */
/*  type de plat : en sortir changerait le type de plat, ce qui se fait via         */
/*  "Modifier", pas en glissant.                                                      */
/*                                                                                       */
/*  Ce composant rend lui-même le conteneur (`wrapperClassName`, voir                     */
/*  PlanningMealGroup.jsx/PlanningCourseGroup.jsx) plutôt que de le recevoir                */
/*  déjà posé par l'appelant : <Reorder.Group> DOIT être le parent DOM DIRECT                */
/*  de chaque <Reorder.Item> pour mesurer correctement leurs positions                        */
/*  pendant le glissement — un wrapper intermédiaire fourni séparément                         */
/*  casserait ce calcul.                                                                        */
/*                                                                                                */
/*  MIGRATION depuis hooks/useDragReorder.js (retiré — RecipeForm.jsx a suivi                    */
/*  la même migration juste après, voir IngredientRow/StepRow) : Framer Motion                    */
/*  fournit un couple <Reorder.Group>/<Reorder.Item> dédié précisément à ce                         */
/*  geste — plus besoin de mesurer les hauteurs de rangée à la main ni de                            */
/*  calculer des décalages de secours (l'ancien hook faisait les deux). Chaque                        */
/*  <Reorder.Item> anime AUTOMATIQUEMENT sa position (et celle des voisins                             */
/*  qu'il croise) via son "layout" interne — c'est ce qui donne l'effet "la                             */
/*  liste se réorganise toute seule" pendant le glissement, gratuitement.                                */
/*                                                                                                          */
/*  État local (`localEntries`) plutôt que `entries` directement dans                                       */
/*  <Reorder.Group value=...> : Framer appelle `onReorder` en CONTINU pendant                                */
/*  le glissement (à chaque changement de position, pas seulement au                                          */
/*  relâchement) pour faire réagir l'affichage en direct — hooks/useMealPlan.js                                */
/*  (onReorder -> reorderMealPlanEntries) déclenche lui un retour haptique ET                                   */
/*  une écriture dans l'état partagé du foyer à CHAQUE appel : le rappeler en                                     */
/*  boucle pendant tout le glissement ferait vibrer l'appareil en continu et                                       */
/*  écrirait des dizaines de fois pour un seul geste. `localEntries` absorbe                                        */
/*  ces mises à jour en direct pour l'AFFICHAGE seul ; le vrai `onReorder` (voir                                     */
/*  PlanningMealItem.jsx, onCommitOrder) n'est appelé QU'UNE FOIS, au relâchement.                                    */
/* ------------------------------------------------------------------ */
export default function PlanningMealItemsList({ entries, bulleted, wrapperClassName, reorderMode, onReorder, labelForEntry, onEdit, onDelete }: PlanningMealItemsListProps) {
  const [localEntries, setLocalEntries] = useState(entries);
  // Resynchronise dès que la vraie liste change pour une raison EXTÉRIEURE
  // au glissement (ajout/suppression/modification d'un plat, changement de
  // semaine...) — jamais l'inverse : c'est bien `entries` (la prop) qui
  // reste la source de vérité entre deux glissements.
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  const commitOrder = () => onReorder(localEntries.map((e) => e.id));

  return (
    <Reorder.Group
      as={bulleted ? "ul" : "div"}
      className={wrapperClassName}
      axis="y"
      values={localEntries}
      onReorder={setLocalEntries}
    >
      {localEntries.map((entry) => (
        <PlanningMealItem
          key={entry.id}
          entry={entry}
          bulleted={bulleted}
          label={labelForEntry(entry)}
          reorderMode={reorderMode}
          onCommitOrder={commitOrder}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Reorder.Group>
  );
}
