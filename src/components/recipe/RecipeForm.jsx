import { useState, useRef } from "react";
import { Wand2, X } from "lucide-react";
import { nextId, extractCodeFromInput, decodeRecipeCode, triggerHaptic, formatDurationMinutes } from "../../utils/helpers";
import { normalizeIngredientList } from "../../utils/ingredients";
import { fetchNutriscoreGrade } from "../../utils/nutriscoreClient";
import { formatPressDuration } from "../common/pressDuration";
import { resolveIllustrationKey } from "../art/illustrations";
import useSecretTrigger from "../../hooks/useSecretTrigger";
import useDragReorder from "../../hooks/useDragReorder";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";
import WheelPickerModal from "../common/WheelPickerModal";

/* ------------------------------------------------------------------ */
/*  UNITÉS DISPONIBLES POUR LES INGRÉDIENTS                            */
/* ------------------------------------------------------------------ */

export const UNIT_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "cl", label: "cl" },
  { value: "l", label: "l" },
  { value: "pièce", label: "pièce(s)" },
  { value: "pincée", label: "pincée(s)" },
  { value: "c. à soupe", label: "c. à soupe" },
  { value: "c. à café", label: "c. à café" },
  { value: "", label: "Sans unité" },
];


/* ------------------------------------------------------------------ */
/*  FORMULAIRE DE RECETTE (création / édition)                         */
/* ------------------------------------------------------------------ */

export default function RecipeForm({ onClose, onSave, onDelete, initialRecipe, pressDuration = 750 }) {
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState(initialRecipe ? initialRecipe.title : "");
  const [category, setCategory] = useState(initialRecipe ? initialRecipe.category : "Salé");
  const [time, setTime] = useState(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState(initialRecipe ? initialRecipe.servings : 4);
  const [carbs, setCarbs] = useState(initialRecipe && initialRecipe.carbs ? initialRecipe.carbs : "");
  const [notes, setNotes] = useState(initialRecipe && initialRecipe.notes ? initialRecipe.notes : "");
  const rowIdRef = useRef(0);
  const newRowId = () => `ing-${rowIdRef.current++}`;
  const [ingredientRows, setIngredientRows] = useState(() =>
    initialRecipe && initialRecipe.ingredients.length
      ? initialRecipe.ingredients.map((i) =>
          i.isSection
            ? { id: newRowId(), isSection: true, title: i.title }
            : { id: newRowId(), qty: i.qty, unit: i.unit, name: i.name }
        )
      : [{ id: newRowId(), qty: "", unit: "g", name: "" }]
  );
  const stepIdRef = useRef(0);
  const newStepId = () => `step-${stepIdRef.current++}`;
  const [stepRows, setStepRows] = useState(() =>
    initialRecipe && initialRecipe.steps.length
      ? initialRecipe.steps.map((s) =>
          s && typeof s === "object" && s.isSection
            ? { id: newStepId(), isSection: true, title: s.title }
            : { id: newStepId(), text: s }
        )
      : [{ id: newStepId(), text: "" }]
  );
  const [importUnlocked, setImportUnlocked] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTimeWheel, setShowTimeWheel] = useState(false);
  const [showServingsWheel, setShowServingsWheel] = useState(false);

  const secretImport = useSecretTrigger(() => setImportUnlocked(true));

  const addIngredientRow = () => {
    triggerHaptic(15);
    setIngredientRows((prev) => [...prev, { id: newRowId(), qty: "", unit: "g", name: "" }]);
  };
  const addIngredientSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setIngredientRows((prev) => [...prev, { id: newRowId(), isSection: true, title: "" }]);
  };
  const removeIngredientRow = (id) => {
    triggerHaptic(15);
    setIngredientRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateIngredientRow = (id, field, value) => {
    setIngredientRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const ingredientDrag = useDragReorder(ingredientRows, setIngredientRows);

  const addStepRow = () => {
    triggerHaptic(15);
    setStepRows((prev) => [...prev, { id: newStepId(), text: "" }]);
  };
  const addStepSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setStepRows((prev) => [...prev, { id: newStepId(), isSection: true, title: "" }]);
  };
  const removeStepRow = (id) => {
    triggerHaptic(15);
    setStepRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateStepRow = (id, field, value) => {
    setStepRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const stepDrag = useDragReorder(stepRows, setStepRows);

  // Maintenir "+ Ajouter…" pendant le temps d'appui configuré ajoute un titre de section.
  const useLongPressAdd = (onShortPress, onLongPress, duration) => {
    const timer = useRef(null);
    const fired = useRef(false);
    const start = () => {
      fired.current = false;
      timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, duration);
    };
    const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
    const click = () => { if (fired.current) { fired.current = false; return; } onShortPress(); };
    return {
      onClick: click,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e) => e.preventDefault(),
    };
  };
  const ingredientAddPress = useLongPressAdd(addIngredientRow, addIngredientSectionRow, pressDuration);
  const stepAddPress = useLongPressAdd(addStepRow, addStepSectionRow, pressDuration);

  const hasTitle = title.trim().length > 0;
  const hasIngredients = ingredientRows.some((r) => !r.isSection && r.name.trim().length > 0);
  const hasSteps = stepRows.some((r) => !r.isSection && r.text.trim().length > 0);
  const canSubmit = hasTitle && hasIngredients && hasSteps;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || saving) {
      if (!canSubmit) setFormError("Il manque le nom, les ingrédients ou les étapes de la recette.");
      return;
    }
    const ingredients = normalizeIngredientList(
      ingredientRows
        .filter((r) => (r.isSection ? r.title.trim() : r.name.trim()))
        .map((r) =>
          r.isSection
            ? { isSection: true, title: r.title.trim() }
            : { qty: parseFloat(String(r.qty).replace(",", ".")) || 0, unit: r.unit, name: r.name.trim() }
        )
    );
    const steps = stepRows
      .filter((r) => (r.isSection ? r.title.trim() : r.text.trim()))
      .map((r) => (r.isSection ? { isSection: true, title: r.title.trim() } : r.text.trim()));
    const carbsValue = carbs !== "" && !Number.isNaN(Number(carbs)) ? Number(carbs) : null;
    const titleChanged = isEdit && initialRecipe.title !== title.trim();
    const illustrationKey =
      isEdit && initialRecipe.illustrationKey && !titleChanged
        ? initialRecipe.illustrationKey
        : resolveIllustrationKey({ title: title.trim(), category });

    setSaving(true);
    // Nutri-Score recalculé UNIQUEMENT ici (création/édition) — jamais à
    // l'affichage. L'appel a un timeout et un repli local intégrés
    // (voir utils/nutriscoreClient.js) : il ne peut donc jamais bloquer
    // indéfiniment ni faire échouer l'enregistrement de la recette.
    const nutriscoreGrade = await fetchNutriscoreGrade(ingredients, category);

    onSave({
      id: isEdit ? initialRecipe.id : nextId(),
      title: title.trim(),
      category,
      time: Number(time) || 30,
      servings: Number(servings) || 4,
      carbs: carbsValue,
      notes: notes.trim() || null,
      illustrationKey,
      favorite: isEdit ? !!initialRecipe.favorite : false,
      ingredients,
      steps,
      nutriscoreGrade,
      imageUrl: isEdit ? initialRecipe.imageUrl || null : null,
      imageSource: isEdit ? initialRecipe.imageSource || null : null,
    });
    setSaving(false);
    onClose();
  };

  const submitImport = () => {
    const code = extractCodeFromInput(importText);
    const parsed = decodeRecipeCode(code);
    if (!parsed) {
      setImportError("Ce code ne semble pas valide.");
      return;
    }
    onSave({ ...parsed, id: nextId(), favorite: false });
    onClose();
  };

  return (
    <>
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal grimoire-page form-clean"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button type="button" className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title" {...(isEdit ? {} : secretImport)}>
          {isEdit ? "Modifier la recette" : "Invoquer une recette"}
        </h2>

        {!isEdit && importUnlocked && (
          <div className="import-panel">
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
              placeholder="Colle ici le lien ou le code de recette reçu…"
            />
            {importError && <p className="import-error">{importError}</p>}
            <div className="import-panel-actions">
              <button type="button" className="link-btn" onClick={() => { setImportUnlocked(false); setImportError(""); }}>Annuler</button>
              <Seal type="button" tone="gold" onClick={submitImport}>Importer</Seal>
            </div>
          </div>
        )}

        <Flourish />
        <label className="field">
          <span>Nom de la recette</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Galette des rois" required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Salé">Salé</option>
              <option value="Sucré">Sucré</option>
            </select>
          </label>
          <label className="field">
            <span>Temps</span>
            <button
              type="button"
              className="wheel-trigger-btn"
              onClick={() => { triggerHaptic(15); setShowTimeWheel(true); }}
            >
              {formatDurationMinutes(Number(time) || 0)}
            </button>
          </label>
          <label className="field">
            <span>Portions</span>
            <button
              type="button"
              className="wheel-trigger-btn"
              onClick={() => { triggerHaptic(15); setShowServingsWheel(true); }}
            >
              {Number(servings) || 1} pers.
            </button>
          </label>
        </div>
        <label className="field field-discreet">
          <span>Glucides (g par portion) — facultatif</span>
          <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Ex. 30" />
        </label>

        <label className="field">
          <span>Ingrédients</span>
        </label>
        <div className="ingredient-rows">
          {ingredientRows.map((row, idx) =>
            row.isSection ? (
              <div
                className="ingredient-section-row"
                key={row.id}
                ref={ingredientDrag.registerNode(row.id)}
                style={ingredientDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...ingredientDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="text"
                  className="ing-section-title"
                  value={row.title}
                  onChange={(e) => updateIngredientRow(row.id, "title", e.target.value)}
                  placeholder="Titre de la section (ex. Crème diplomate)"
                />
                {ingredientRows.length > 1 && (
                  <button
                    type="button"
                    className="ing-remove"
                    onClick={() => removeIngredientRow(row.id)}
                    aria-label="Supprimer cette section"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div
                className="ingredient-row"
                key={row.id}
                ref={ingredientDrag.registerNode(row.id)}
                style={ingredientDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...ingredientDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="ing-qty"
                  value={row.qty}
                  onChange={(e) => updateIngredientRow(row.id, "qty", e.target.value)}
                  placeholder="Qté"
                />
                <select
                  className="ing-unit"
                  value={row.unit}
                  onChange={(e) => updateIngredientRow(row.id, "unit", e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.label} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="ing-name"
                  value={row.name}
                  onChange={(e) => updateIngredientRow(row.id, "name", e.target.value)}
                  placeholder="Nom de l'ingrédient"
                />
                {ingredientRows.length > 1 && (
                  <button
                    type="button"
                    className="ing-remove"
                    onClick={() => removeIngredientRow(row.id)}
                    aria-label="Supprimer cet ingrédient"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          )}
        </div>
        <button type="button" className="link-btn add-ingredient-btn" {...ingredientAddPress}>
          + Ajouter un ingrédient <span className="long-press-hint">(maintenir {formatPressDuration(pressDuration)} : titre de section)</span>
        </button>

        <label className="field">
          <span>Étapes de préparation</span>
        </label>
        <div className="step-rows">
          {stepRows.map((row, idx) =>
            row.isSection ? (
              <div
                className="step-section-row"
                key={row.id}
                ref={stepDrag.registerNode(row.id)}
                style={stepDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...stepDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="text"
                  className="step-section-title"
                  value={row.title}
                  onChange={(e) => updateStepRow(row.id, "title", e.target.value)}
                  placeholder="Titre de la section (ex. Garniture)"
                />
                {stepRows.length > 1 && (
                  <button
                    type="button"
                    className="step-remove"
                    onClick={() => removeStepRow(row.id)}
                    aria-label="Supprimer cette section"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div
                className="step-row"
                key={row.id}
                ref={stepDrag.registerNode(row.id)}
                style={stepDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...stepDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <span className="step-row-num">{idx + 1}</span>
                <input
                  type="text"
                  className="step-text"
                  value={row.text}
                  onChange={(e) => updateStepRow(row.id, "text", e.target.value)}
                  placeholder={`Étape ${idx + 1}`}
                />
                {stepRows.length > 1 && (
                  <button
                    type="button"
                    className="step-remove"
                    onClick={() => removeStepRow(row.id)}
                    aria-label="Supprimer cette étape"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          )}
        </div>
        <button type="button" className="link-btn add-step-btn" {...stepAddPress}>
          + Ajouter une étape <span className="long-press-hint">(maintenir {formatPressDuration(pressDuration)} : titre de section)</span>
        </button>

        <label className="field">
          <span>Remarques / Astuces — facultatif</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. Peut se préparer la veille, remplacer le beurre par…"
          />
        </label>

        <div className="form-footer">
          {formError && <p className="import-error">{formError}</p>}
          <Seal type="submit" tone="gold" disabled={!canSubmit} haptic={[100, 50, 40, 50, 150]}>
            <Wand2 size={16} /> {isEdit ? "Enregistrer les modifications" : "Sceller la recette"}
          </Seal>
          {isEdit && (
            <button
              type="button"
              className="link-btn delete-recipe-btn"
              onClick={() => { triggerHaptic(30); onDelete(initialRecipe.id); onClose(); }}
            >
              Supprimer cette recette
            </button>
          )}
        </div>
      </form>
    </div>

    {showTimeWheel && (
      <WheelPickerModal
        title="Temps de préparation"
        hint="Fais glisser les roues pour ajuster la durée."
        columns={[
          { key: "h", initialValue: Math.floor((Number(time) || 0) / 60), min: 0, max: 23, suffix: "h" },
          { key: "m", initialValue: (Number(time) || 0) % 60, min: 0, max: 59, suffix: "min" },
        ]}
        onSave={({ h, m }) => setTime(h * 60 + m)}
        onClose={() => setShowTimeWheel(false)}
      />
    )}
    {showServingsWheel && (
      <WheelPickerModal
        title="Portions"
        hint="Fais glisser la roue pour ajuster le nombre de portions."
        columns={[{ key: "servings", initialValue: Number(servings) || 1, min: 1, max: 24, suffix: "pers." }]}
        onSave={({ servings: s }) => setServings(s)}
        onClose={() => setShowServingsWheel(false)}
      />
    )}
    </>
  );
}

