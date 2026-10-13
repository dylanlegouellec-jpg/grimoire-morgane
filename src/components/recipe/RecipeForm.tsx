import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wand2, X } from "lucide-react";
import { nextId, extractCodeFromInput, decodeRecipeCode, triggerHaptic, formatDurationMinutes } from "../../utils/helpers";
import { fetchNutriscoreGrade } from "../../utils/nutriscoreClient";
import { playSuccessSound } from "../../utils/audioUtils";
import { resolveIllustrationKey } from "../art/illustrations";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useSecretTrigger from "../../hooks/useSecretTrigger";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";
import WheelPickerModal from "../common/WheelPickerModal";
import UnsavedChangesModal from "../common/UnsavedChangesModal";
import type { Recipe } from "../../hooks/useRecipes";
import { useTranslation } from "../../contexts/LanguageContext";
import {
  ingredientRowsFromRecipe,
  ingredientsFromRows,
  makeRowIdFactory,
  nutritionFromRecipe,
  rowsSnapshot,
  stepRowsFromRecipe,
  stepsFromRows,
  type IngredientRowT,
  type NutritionValues,
  type StepRowT,
} from "./form/recipeFormRows";
import { IngredientsEditor, StepsEditor } from "./form/RowEditors";
import NutritionSection from "./form/NutritionSection";

export { UNIT_OPTIONS } from "./form/recipeFormRows";

/* ------------------------------------------------------------------ */
/*  Les morceaux du formulaire vivent dans ./form/ :                    */
/*  - recipeFormRows.ts : unités, rangées, passage recette <-> rangées  */
/*  - FormRows.tsx : une rangée d'ingrédient / d'étape réordonnable     */
/*  - RowEditors.tsx : listes d'ingrédients et d'étapes + « Ajouter »   */
/*  - NutritionSection.tsx : valeurs nutritionnelles et estimation      */
/*  - useLongPressAdd.ts : appui court / maintenu sur « + Ajouter… »    */
/*  Ce fichier garde l'état de la recette, l'enregistrement, la         */
/*  fermeture (modifications non enregistrées) et la mise en page.      */
/* ------------------------------------------------------------------ */

interface RecipeFormProps {
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  initialRecipe?: Recipe | null;
  pressDuration?: number;
}

/* ------------------------------------------------------------------ */
/*  FORMULAIRE DE RECETTE (création / édition)                         */
/* ------------------------------------------------------------------ */

export default function RecipeForm({ onClose, onSave, onDelete, initialRecipe, pressDuration = 750 }: RecipeFormProps) {
  useBodyScrollLock(true);
  const { t } = useTranslation();
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState<string>(initialRecipe ? initialRecipe.title : "");
  const [category, setCategory] = useState<string>(initialRecipe ? initialRecipe.category : "Salé");
  const [time, setTime] = useState<number>(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState<number>(initialRecipe ? initialRecipe.servings : 4);
  const [nutrition, setNutrition] = useState<NutritionValues>(() => nutritionFromRecipe(initialRecipe));
  const [notes, setNotes] = useState<string>(initialRecipe && initialRecipe.notes ? initialRecipe.notes : "");
  const [newIngredientId] = useState(() => makeRowIdFactory("ing"));
  const [ingredientRows, setIngredientRows] = useState<IngredientRowT[]>(() => ingredientRowsFromRecipe(initialRecipe, newIngredientId));
  const [newStepId] = useState(() => makeRowIdFactory("step"));
  const [stepRows, setStepRows] = useState<StepRowT[]>(() => stepRowsFromRecipe(initialRecipe, newStepId));
  const [importUnlocked, setImportUnlocked] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTimeWheel, setShowTimeWheel] = useState(false);
  const [showServingsWheel, setShowServingsWheel] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // État "modifié" (dirty) : compare un instantané JSON des champs
  // pertinents à leur valeur au tout premier rendu (voir rowsSnapshot).
  const buildSnapshot = () =>
    JSON.stringify({ title, category, time, servings, nutrition, notes, ...rowsSnapshot(ingredientRows, stepRows) });
  const initialSnapshotRef = useRef<string | null>(null);
  if (initialSnapshotRef.current === null) initialSnapshotRef.current = buildSnapshot();
  const isDirty = initialSnapshotRef.current !== buildSnapshot();

  // Point de passage UNIQUE pour toute tentative de fermeture (bouton "X",
  // clic sur le fond, tirage vers le bas) : jamais de fermeture silencieuse
  // d'un changement non enregistré, voir UnsavedChangesModal ci-dessous.
  const attemptClose = () => {
    if (isDirty) { setShowUnsavedConfirm(true); return; }
    onClose();
  };

  // "Tirer pour fermer" : le formulaire lui-même EST le conteneur défilant
  // (.modal a overflow-y: auto). Désactivé pendant qu'une roue de sélection
  // ou la boîte de dialogue "non enregistré" est ouverte par-dessus — même
  // raison que dans SecretSettingsModal.jsx (évite qu'un tirage à
  // l'intérieur de ce sous-composant ne remonte jusqu'ici).
  const formRef = useRef<HTMLFormElement | null>(null);
  const sheet = useDismissibleSheet(attemptClose, {
    scrollRef: formRef,
    disabled: showUnsavedConfirm || showTimeWheel || showServingsWheel,
  });
  // Même principe de fusion de refs que SecretSettingsModal/RecipeDetail :
  // formRef sert déjà au geste de fermeture, le piège à focus a besoin du
  // même conteneur pour Échap/Tab — combinées dans setFormRef.
  const focusTrapRef = useFocusTrap<HTMLFormElement>(attemptClose);
  const setFormRef = (node: HTMLFormElement | null) => {
    formRef.current = node;
    focusTrapRef.current = node;
  };

  const secretImport = useSecretTrigger(() => setImportUnlocked(true));

  const hasTitle = title.trim().length > 0;
  const hasIngredients = ingredientRows.some((r) => !r.isSection && r.name.trim().length > 0);
  const hasSteps = stepRows.some((r) => !r.isSection && r.text.trim().length > 0);
  const canSubmit = hasTitle && hasIngredients && hasSteps;

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit || saving) {
      if (!canSubmit) setFormError(t("recipeUi.form.missingFields"));
      return;
    }
    const ingredients = ingredientsFromRows(ingredientRows);
    const steps = stepsFromRows(stepRows);
    const toNumberOrNull = (v: string | number): number | null => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
    const titleChanged = isEdit && initialRecipe!.title !== title.trim();
    const illustrationKey =
      isEdit && initialRecipe!.illustrationKey && !titleChanged
        ? initialRecipe!.illustrationKey
        : resolveIllustrationKey({ title: title.trim(), category });

    setSaving(true);
    // Nutri-Score recalculé UNIQUEMENT ici (création/édition) — jamais à
    // l'affichage. L'appel a un timeout et un repli local intégrés
    // (voir utils/nutriscoreClient.js) : il ne peut donc jamais bloquer
    // indéfiniment ni faire échouer l'enregistrement de la recette.
    const nutriscoreGrade = await fetchNutriscoreGrade(ingredients, category);

    onSave({
      id: isEdit ? initialRecipe!.id : nextId(),
      title: title.trim(),
      category,
      time: Number(time) || 30,
      servings: Number(servings) || 4,
      carbs: toNumberOrNull(nutrition.carbs),
      calories: toNumberOrNull(nutrition.calories),
      protein: toNumberOrNull(nutrition.protein),
      fat: toNumberOrNull(nutrition.fat),
      notes: notes.trim() || null,
      illustrationKey,
      favorite: isEdit ? !!initialRecipe!.favorite : false,
      ingredients,
      steps,
      nutriscoreGrade,
      imageUrl: isEdit ? initialRecipe!.imageUrl || null : null,
      imageSource: isEdit ? initialRecipe!.imageSource || null : null,
    });
    playSuccessSound();
    setSaving(false);
    onClose();
  };

  const submitImport = () => {
    const code = extractCodeFromInput(importText);
    const parsed = decodeRecipeCode(code);
    if (!parsed) {
      setImportError(t("recipeUi.form.importInvalid"));
      return;
    }
    onSave({ ...parsed, id: nextId(), favorite: false } as unknown as Recipe);
    onClose();
  };

  return (
    <>
    <motion.div className="modal-backdrop" onClick={attemptClose} {...MODAL_BACKDROP_MOTION}>
      <motion.form
        ref={setFormRef}
        className="modal grimoire-page form-clean modal-swipeable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button type="button" className="modal-close" onClick={attemptClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title" {...(isEdit ? {} : secretImport)}>
          {isEdit ? t("recipeUi.form.titleEdit") : t("recipeUi.form.titleNew")}
        </h2>

        {!isEdit && importUnlocked && (
          <div className="import-panel">
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
              placeholder={t("recipeUi.form.importPlaceholder")}
            />
            {importError && <p className="import-error">{importError}</p>}
            <div className="import-panel-actions">
              <button type="button" className="link-btn" onClick={() => { setImportUnlocked(false); setImportError(""); }}>{t("common.cancel")}</button>
              <Seal type="button" tone="gold" onClick={submitImport}>{t("recipeUi.form.importAction")}</Seal>
            </div>
          </div>
        )}

        <Flourish />
        <label className="field" data-tour="recipe-title">
          <span>{t("recipeUi.form.nameLabel")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("recipeUi.form.namePlaceholder")} required />
        </label>
        <div className="field-row" data-tour="recipe-meta">
          <label className="field">
            <span>{t("recipeUi.form.categoryLabel")}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Salé">{t("filters.sale")}</option>
              <option value="Sucré">{t("filters.sucre")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("recipeUi.form.timeLabel")}</span>
            <button
              type="button"
              className="wheel-trigger-btn"
              onClick={() => { triggerHaptic(15); setShowTimeWheel(true); }}
            >
              {formatDurationMinutes(Number(time) || 0)}
            </button>
          </label>
          <label className="field">
            <span>{t("recipeUi.form.servingsLabel")}</span>
            <button
              type="button"
              className="wheel-trigger-btn"
              onClick={() => { triggerHaptic(15); setShowServingsWheel(true); }}
            >
              {t("recipeUi.form.servingsValue", { count: Number(servings) || 1 })}
            </button>
          </label>
        </div>
        <NutritionSection
          values={nutrition}
          onChange={setNutrition}
          getEstimateInput={() => ({ ingredients: ingredientsFromRows(ingredientRows), servings: Number(servings) || 4 })}
        />

        <IngredientsEditor rows={ingredientRows} setRows={setIngredientRows} newId={newIngredientId} pressDuration={pressDuration} />

        <StepsEditor rows={stepRows} setRows={setStepRows} newId={newStepId} pressDuration={pressDuration} />

        <label className="field" data-tour="recipe-notes">
          <span>{t("recipeUi.form.notesLabel")}</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("recipeUi.form.notesPlaceholder")}
          />
        </label>

        <div className="form-footer" data-tour="recipe-save">
          {formError && <p className="import-error">{formError}</p>}
          <Seal type="submit" tone="gold" disabled={!canSubmit} haptic={[100, 50, 40, 50, 150]}>
            <Wand2 size={16} /> {isEdit ? t("recipeUi.form.saveChanges") : t("recipeUi.form.sealRecipe")}
          </Seal>
          {isEdit && (
            <button
              type="button"
              className="link-btn delete-recipe-btn"
              onClick={() => { triggerHaptic(30); onDelete(initialRecipe!.id); onClose(); }}
            >
              {t("recipeUi.form.deleteRecipe")}
            </button>
          )}
        </div>
      </motion.form>
    </motion.div>

    <AnimatePresence>
      {showTimeWheel && (
        <WheelPickerModal
          title={t("recipeUi.form.timeWheelTitle")}
          hint={t("recipeUi.form.timeWheelHint")}
          columns={[
            { key: "h", initialValue: Math.floor((Number(time) || 0) / 60), min: 0, max: 23, suffix: "h" },
            { key: "m", initialValue: (Number(time) || 0) % 60, min: 0, max: 59, suffix: "min" },
          ]}
          onSave={({ h, m }) => setTime(h * 60 + m)}
          onClose={() => setShowTimeWheel(false)}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {showServingsWheel && (
        <WheelPickerModal
          title={t("recipeUi.form.servingsLabel")}
          hint={t("recipeUi.form.servingsWheelHint")}
          columns={[{ key: "servings", initialValue: Number(servings) || 1, min: 1, max: 24, suffix: t("recipeUi.form.servingsSuffix") }]}
          onSave={({ servings: s }) => setServings(s)}
          onClose={() => setShowServingsWheel(false)}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {showUnsavedConfirm && (
        <UnsavedChangesModal
          onSave={async () => { setShowUnsavedConfirm(false); await submit({ preventDefault: () => {} }); }}
          onDiscard={() => { setShowUnsavedConfirm(false); onClose(); }}
          onCancel={() => setShowUnsavedConfirm(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
