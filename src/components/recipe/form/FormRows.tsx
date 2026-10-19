import type { PointerEvent as ReactPointerEvent } from "react";
import { Reorder, useDragControls } from "motion/react";
import { triggerHaptic } from "../../../utils/helpers";
import { useTranslation } from "../../../contexts/LanguageContext";
import { useUnits } from "../../../contexts/UnitsContext";
import { buildUnitOptions } from "../../../utils/units";
import { UNIT_LABEL_KEYS, type IngredientRowT, type StepRowT } from "./recipeFormRows";

/* ------------------------------------------------------------------ */
/*  RANGÉE D'INGRÉDIENT/D'ÉTAPE RÉORDONNABLE — extraite en composant       */
/*  séparé (comme PlanningMealItem.jsx pour le Planning, même geste) :      */
/*  useDragControls est un hook, il ne peut pas être appelé un nombre de     */
/*  fois variable dans le .map() de RecipeForm.tsx.                           */
/*                                                                              */
/*  MIGRATION depuis hooks/useDragReorder.js (déjà fait pour le Planning,        */
/*  voir PlanningMealItemsList.jsx/PlanningMealItem.jsx) : <Reorder.Group>/         */
/*  <Reorder.Item> de Framer Motion remplacent la mesure de hauteurs de              */
/*  rangée et le calcul de décalages à la main. Contrairement au Planning,             */
/*  `onReorder` peut ici mettre à jour l'état (ingredientRows/stepRows) EN               */
/*  DIRECT, à chaque changement de position pendant le glissement, sans état                */
/*  local intermédiaire à committer au relâchement : ce sont déjà de simples                  */
/*  useState locaux à ce formulaire, sans retour haptique ni écriture réseau à                  */
/*  chaque appel (contrairement à hooks/useMealPlan.js, reorderMealPlanEntries)                   */
/*  — les rappeler en boucle pendant tout le glissement ne coûte rien.                               */
/*                                                                                                      */
/*  "dragListener={false}" + `dragControls` : seule la poignée (⠿) démarre un                          */
/*  glissement via `dragControls.start(e)` — jamais un simple clic dans un champ                         */
/*  texte/liste déroulante de la rangée, qui doit rester utilisable normalement.                           */
/* ------------------------------------------------------------------ */
interface IngredientRowProps {
  row: IngredientRowT;
  onUpdateRow: (id: string, field: string, value: string) => void;
  onRemoveRow: (id: string) => void;
  canRemove: boolean;
}

export function IngredientRow({ row, onUpdateRow, onRemoveRow, canRemove }: IngredientRowProps) {
  const { t } = useTranslation();
  const { unitSettings } = useUnits();
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => { triggerHaptic(15); dragControls.start(e); };
  const commitDrag = () => triggerHaptic(12);

  if (row.isSection) {
    return (
      <Reorder.Item value={row} as="div" className="ingredient-section-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
        <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label={t("recipeUi.form.dragToReorder")}>⠿</button>
        <input
          type="text"
          className="ing-section-title"
          value={row.title}
          onChange={(e) => onUpdateRow(row.id, "title", e.target.value)}
          placeholder={t("recipeUi.form.ingredientSectionPlaceholder")}
        />
        {canRemove && (
          <button type="button" className="ing-remove" onClick={() => onRemoveRow(row.id)} aria-label={t("recipeUi.form.removeSection")}>✕</button>
        )}
      </Reorder.Item>
    );
  }
  return (
    <Reorder.Item value={row} as="div" className="ingredient-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
      <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label={t("recipeUi.form.dragToReorder")}>⠿</button>
      {/* Texte + clavier décimal (comme les valeurs nutritionnelles plus bas) :
          avec type="number", « 0,5 » tapé sur iPhone arrivait vide et la
          quantité était enregistrée à 0 sans prévenir. Voir parseQuantity. */}
      <input
        type="text"
        inputMode="decimal"
        className="ing-qty"
        value={row.qty}
        onChange={(e) => onUpdateRow(row.id, "qty", e.target.value)}
        placeholder={t("recipeUi.form.qtyPlaceholder")}
      />
      <select
        className="ing-unit"
        value={row.unit}
        onChange={(e) => onUpdateRow(row.id, "unit", e.target.value)}
      >
        {/* Liste du foyer (Réglages > Unités des ingrédients, voir
            utils/units.ts) — l'unité actuelle de CETTE ligne y reste
            toujours, même masquée/supprimée depuis ou venue d'un import :
            sinon elle serait perdue à l'enregistrement. Les unités ajoutées
            s'affichent telles qu'écrites, jamais traduites. */}
        {buildUnitOptions(unitSettings, row.unit).map((u) => (
          <option key={u.value || "none"} value={u.value}>{u.isDefault && u.value in UNIT_LABEL_KEYS ? t(UNIT_LABEL_KEYS[u.value]) : u.value}</option>
        ))}
      </select>
      <input
        type="text"
        className="ing-name"
        value={row.name}
        onChange={(e) => onUpdateRow(row.id, "name", e.target.value)}
        placeholder={t("recipeUi.form.ingredientNamePlaceholder")}
      />
      {canRemove && (
        <button type="button" className="ing-remove" onClick={() => onRemoveRow(row.id)} aria-label={t("recipeUi.form.removeIngredient")}>✕</button>
      )}
    </Reorder.Item>
  );
}

interface StepRowProps {
  row: StepRowT;
  idx: number;
  onUpdateRow: (id: string, field: string, value: string) => void;
  onRemoveRow: (id: string) => void;
  canRemove: boolean;
}

export function StepRow({ row, idx, onUpdateRow, onRemoveRow, canRemove }: StepRowProps) {
  const { t } = useTranslation();
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => { triggerHaptic(15); dragControls.start(e); };
  const commitDrag = () => triggerHaptic(12);

  if (row.isSection) {
    return (
      <Reorder.Item value={row} as="div" className="step-section-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
        <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label={t("recipeUi.form.dragToReorder")}>⠿</button>
        <input
          type="text"
          className="step-section-title"
          value={row.title}
          onChange={(e) => onUpdateRow(row.id, "title", e.target.value)}
          placeholder={t("recipeUi.form.stepSectionPlaceholder")}
        />
        {canRemove && (
          <button type="button" className="step-remove" onClick={() => onRemoveRow(row.id)} aria-label={t("recipeUi.form.removeSection")}>✕</button>
        )}
      </Reorder.Item>
    );
  }
  return (
    <Reorder.Item value={row} as="div" className="step-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
      <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label={t("recipeUi.form.dragToReorder")}>⠿</button>
      <span className="step-row-num">{idx + 1}</span>
      <input
        type="text"
        className="step-text"
        value={row.text}
        onChange={(e) => onUpdateRow(row.id, "text", e.target.value)}
        placeholder={t("recipeUi.form.stepPlaceholder", { n: idx + 1 })}
      />
      {canRemove && (
        <button type="button" className="step-remove" onClick={() => onRemoveRow(row.id)} aria-label={t("recipeUi.form.removeStep")}>✕</button>
      )}
    </Reorder.Item>
  );
}
