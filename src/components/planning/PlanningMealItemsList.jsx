import useDragReorder from "../../hooks/useDragReorder";
import PlanningMealItem from "./PlanningMealItem";

/* ------------------------------------------------------------------ */
/*  LISTE DE PLATS RÉORDONNABLE — un seul useDragReorder par LISTE (pas    */
/*  par plat individuel), réutilisée à la fois pour un sous-groupe de       */
/*  type de plat (voir PlanningCourseGroup.jsx, `bulleted`) et pour la       */
/*  liste "à plat" d'un moment sans type de plat (petit-déjeuner/en-cas,      */
/*  voir PlanningMealGroup.jsx). Le glisser-déposer (poignée ⋮⋮, voir         */
/*  PlanningMealItem.jsx) ne réordonne les plats qu'À L'INTÉRIEUR de cette     */
/*  même liste, jamais entre deux sous-groupes différents — cohérent avec      */
/*  ce que useDragReorder.js sait faire (un seul tableau à la fois), et         */
/*  cohérent avec le sens même d'un sous-groupe par type de plat : en sortir     */
/*  changerait le type de plat, ce qui se fait via "Modifier", pas en glissant.  */
/* ------------------------------------------------------------------ */
export default function PlanningMealItemsList({ entries, bulleted, reorderMode, onReorder, labelForEntry, onEdit, onDelete }) {
  const setItems = (updater) => {
    const next = typeof updater === "function" ? updater(entries) : updater;
    onReorder(next.map((e) => e.id));
  };
  const drag = useDragReorder(entries, setItems);
  const Wrapper = bulleted ? "li" : "div";

  return (
    <>
      {entries.map((entry, idx) => (
        <Wrapper
          key={entry.id}
          className={bulleted ? "planning-course-item" : "planning-meal-flat-item"}
          ref={drag.registerNode(entry.id)}
          style={drag.getRowStyle(entry.id, idx)}
        >
          <PlanningMealItem
            entry={entry}
            label={labelForEntry(entry)}
            reorderMode={reorderMode}
            dragHandleProps={reorderMode ? drag.dragHandleProps(entry.id, idx) : null}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Wrapper>
      ))}
    </>
  );
}
