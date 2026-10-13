import type { Dispatch, SetStateAction } from "react";
import { Reorder } from "motion/react";
import { triggerHaptic } from "../../../utils/helpers";
import { useTranslation } from "../../../contexts/LanguageContext";
import { formatPressDuration } from "../../common/pressDuration";
import { IngredientRow, StepRow } from "./FormRows";
import useLongPressAdd from "./useLongPressAdd";
import { newIngredientRow, type IngredientRowT, type StepRowT } from "./recipeFormRows";

/* ------------------------------------------------------------------ */
/*  LISTES D'INGRÉDIENTS ET D'ÉTAPES DU FORMULAIRE                      */
/*  Rangées réordonnables à la poignée + bouton « + Ajouter… » (appui   */
/*  maintenu = titre de section). Les rangées elles-mêmes restent dans  */
/*  RecipeForm (enregistrement, détection des modifications).           */
/* ------------------------------------------------------------------ */

interface RowEditorProps<Row> {
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
  newId: () => string;
  pressDuration: number;
}

export function IngredientsEditor({ rows, setRows, newId, pressDuration }: RowEditorProps<IngredientRowT>) {
  const { t } = useTranslation();
  const addRow = () => {
    triggerHaptic(15);
    setRows((prev) => [...prev, newIngredientRow(newId())]);
  };
  const addSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setRows((prev) => [...prev, { id: newId(), isSection: true, title: "" }]);
  };
  const removeRow = (id: string) => {
    triggerHaptic(15);
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateRow = (id: string, field: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, [field]: value } as IngredientRowT) : r)));
  };
  const addPress = useLongPressAdd(addRow, addSectionRow, pressDuration);

  return (
    <>
      <label className="field">
        <span>{t("recipeUi.form.ingredientsLabel")}</span>
      </label>
      <Reorder.Group as="div" className="ingredient-rows" data-tour="recipe-ingredients" axis="y" values={rows} onReorder={setRows}>
        {rows.map((row) => (
          <IngredientRow key={row.id} row={row} onUpdateRow={updateRow} onRemoveRow={removeRow} canRemove={rows.length > 1} />
        ))}
      </Reorder.Group>
      <button type="button" className="link-btn add-ingredient-btn" data-tour="recipe-add-ingredient" {...addPress}>
        {t("recipeUi.form.addIngredient")} <span className="long-press-hint">{t("recipeUi.form.longPressHint", { duration: formatPressDuration(pressDuration) })}</span>
      </button>
    </>
  );
}

export function StepsEditor({ rows, setRows, newId, pressDuration }: RowEditorProps<StepRowT>) {
  const { t } = useTranslation();
  const addRow = () => {
    triggerHaptic(15);
    setRows((prev) => [...prev, { id: newId(), text: "" }]);
  };
  const addSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setRows((prev) => [...prev, { id: newId(), isSection: true, title: "" }]);
  };
  const removeRow = (id: string) => {
    triggerHaptic(15);
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateRow = (id: string, field: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, [field]: value } as StepRowT) : r)));
  };
  const addPress = useLongPressAdd(addRow, addSectionRow, pressDuration);

  return (
    <>
      <label className="field">
        <span>{t("recipeUi.form.stepsLabel")}</span>
      </label>
      <Reorder.Group as="div" className="step-rows" data-tour="recipe-steps" axis="y" values={rows} onReorder={setRows}>
        {rows.map((row, idx) => (
          <StepRow key={row.id} row={row} idx={idx} onUpdateRow={updateRow} onRemoveRow={removeRow} canRemove={rows.length > 1} />
        ))}
      </Reorder.Group>
      <button type="button" className="link-btn add-step-btn" data-tour="recipe-add-step" {...addPress}>
        {t("recipeUi.form.addStep")} <span className="long-press-hint">{t("recipeUi.form.longPressHint", { duration: formatPressDuration(pressDuration) })}</span>
      </button>
    </>
  );
}
