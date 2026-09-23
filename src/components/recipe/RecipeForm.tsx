import { useState, useRef } from "react";
import type { ChangeEvent, Dispatch, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { ChevronDown, Sparkles, Wand2, X } from "lucide-react";
import { nextId, extractCodeFromInput, decodeRecipeCode, triggerHaptic, formatDurationMinutes } from "../../utils/helpers";
import { normalizeIngredientList } from "../../utils/ingredients";
import { fetchNutriscoreGrade } from "../../utils/nutriscoreClient";
import { estimateNutritionOnline } from "../../utils/nutritionClient";
import { playSuccessSound } from "../../utils/audioUtils";
import { formatPressDuration } from "../common/pressDuration";
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

interface IngredientSectionRow {
  id: string;
  isSection: true;
  title: string;
}
interface IngredientDataRow {
  id: string;
  isSection?: false;
  qty: string | number;
  unit: string;
  name: string;
}
type IngredientRowT = IngredientSectionRow | IngredientDataRow;

interface StepSectionRow {
  id: string;
  isSection: true;
  title: string;
}
interface StepDataRow {
  id: string;
  isSection?: false;
  text: string;
}
type StepRowT = StepSectionRow | StepDataRow;

/* ------------------------------------------------------------------ */
/*  RANGÉE D'INGRÉDIENT/D'ÉTAPE RÉORDONNABLE — extraite en composant       */
/*  séparé (comme PlanningMealItem.jsx pour le Planning, même geste) :      */
/*  useDragControls est un hook, il ne peut pas être appelé un nombre de     */
/*  fois variable dans le .map() de RecipeForm.jsx.                           */
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

function IngredientRow({ row, onUpdateRow, onRemoveRow, canRemove }: IngredientRowProps) {
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => { triggerHaptic(15); dragControls.start(e); };
  const commitDrag = () => triggerHaptic(12);

  if (row.isSection) {
    return (
      <Reorder.Item value={row} as="div" className="ingredient-section-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
        <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label="Glisser pour réordonner">⠿</button>
        <input
          type="text"
          className="ing-section-title"
          value={row.title}
          onChange={(e) => onUpdateRow(row.id, "title", e.target.value)}
          placeholder="Titre de la section (ex. Crème diplomate)"
        />
        {canRemove && (
          <button type="button" className="ing-remove" onClick={() => onRemoveRow(row.id)} aria-label="Supprimer cette section">✕</button>
        )}
      </Reorder.Item>
    );
  }
  return (
    <Reorder.Item value={row} as="div" className="ingredient-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
      <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label="Glisser pour réordonner">⠿</button>
      <input
        type="number"
        min="0"
        step="any"
        className="ing-qty"
        value={row.qty}
        onChange={(e) => onUpdateRow(row.id, "qty", e.target.value)}
        placeholder="Qté"
      />
      <select
        className="ing-unit"
        value={row.unit}
        onChange={(e) => onUpdateRow(row.id, "unit", e.target.value)}
      >
        {UNIT_OPTIONS.map((u) => (
          <option key={u.label} value={u.value}>{u.label}</option>
        ))}
      </select>
      <input
        type="text"
        className="ing-name"
        value={row.name}
        onChange={(e) => onUpdateRow(row.id, "name", e.target.value)}
        placeholder="Nom de l'ingrédient"
      />
      {canRemove && (
        <button type="button" className="ing-remove" onClick={() => onRemoveRow(row.id)} aria-label="Supprimer cet ingrédient">✕</button>
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

function StepRow({ row, idx, onUpdateRow, onRemoveRow, canRemove }: StepRowProps) {
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => { triggerHaptic(15); dragControls.start(e); };
  const commitDrag = () => triggerHaptic(12);

  if (row.isSection) {
    return (
      <Reorder.Item value={row} as="div" className="step-section-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
        <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label="Glisser pour réordonner">⠿</button>
        <input
          type="text"
          className="step-section-title"
          value={row.title}
          onChange={(e) => onUpdateRow(row.id, "title", e.target.value)}
          placeholder="Titre de la section (ex. Garniture)"
        />
        {canRemove && (
          <button type="button" className="step-remove" onClick={() => onRemoveRow(row.id)} aria-label="Supprimer cette section">✕</button>
        )}
      </Reorder.Item>
    );
  }
  return (
    <Reorder.Item value={row} as="div" className="step-row" dragListener={false} dragControls={dragControls} onDragEnd={commitDrag}>
      <button type="button" className="row-drag-handle" onPointerDown={startDrag} aria-label="Glisser pour réordonner">⠿</button>
      <span className="step-row-num">{idx + 1}</span>
      <input
        type="text"
        className="step-text"
        value={row.text}
        onChange={(e) => onUpdateRow(row.id, "text", e.target.value)}
        placeholder={`Étape ${idx + 1}`}
      />
      {canRemove && (
        <button type="button" className="step-remove" onClick={() => onRemoveRow(row.id)} aria-label="Supprimer cette étape">✕</button>
      )}
    </Reorder.Item>
  );
}

interface RecipeFormProps {
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  initialRecipe?: Recipe | null;
  pressDuration?: number;
}

interface LongPressAddHandlers {
  onClick: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}

/* ------------------------------------------------------------------ */
/*  FORMULAIRE DE RECETTE (création / édition)                         */
/* ------------------------------------------------------------------ */

export default function RecipeForm({ onClose, onSave, onDelete, initialRecipe, pressDuration = 750 }: RecipeFormProps) {
  useBodyScrollLock(true);
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState<string>(initialRecipe ? initialRecipe.title : "");
  const [category, setCategory] = useState<string>(initialRecipe ? initialRecipe.category : "Salé");
  const [time, setTime] = useState<number>(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState<number>(initialRecipe ? initialRecipe.servings : 4);
  const [calories, setCalories] = useState<string | number>(initialRecipe && initialRecipe.calories ? initialRecipe.calories : "");
  const [protein, setProtein] = useState<string | number>(initialRecipe && initialRecipe.protein ? initialRecipe.protein : "");
  const [carbs, setCarbs] = useState<string | number>(initialRecipe && initialRecipe.carbs ? initialRecipe.carbs : "");
  const [fat, setFat] = useState<string | number>(initialRecipe && initialRecipe.fat ? initialRecipe.fat : "");
  // Repliée par défaut, sauf si la recette a déjà au moins une valeur
  // nutritionnelle renseignée (édition) — pas de raison de la cacher dans
  // ce cas, l'utilisateur voudra probablement la voir/corriger d'emblée.
  const [showNutrition, setShowNutrition] = useState<boolean>(
    Boolean(initialRecipe && (initialRecipe.calories || initialRecipe.protein || initialRecipe.carbs || initialRecipe.fat))
  );
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState("");
  const [notes, setNotes] = useState<string>(initialRecipe && initialRecipe.notes ? initialRecipe.notes : "");
  const rowIdRef = useRef(0);
  const newRowId = () => `ing-${rowIdRef.current++}`;
  const [ingredientRows, setIngredientRows] = useState<IngredientRowT[]>(() =>
    initialRecipe && initialRecipe.ingredients.length
      ? initialRecipe.ingredients.map((i): IngredientRowT =>
          "isSection" in i
            ? { id: newRowId(), isSection: true, title: i.title }
            : { id: newRowId(), qty: i.qty ?? "", unit: i.unit, name: i.name }
        )
      : [{ id: newRowId(), qty: "", unit: "g", name: "" }]
  );
  const stepIdRef = useRef(0);
  const newStepId = () => `step-${stepIdRef.current++}`;
  const [stepRows, setStepRows] = useState<StepRowT[]>(() =>
    initialRecipe && initialRecipe.steps.length
      ? initialRecipe.steps.map((s): StepRowT =>
          typeof s === "object" && s.isSection
            ? { id: newStepId(), isSection: true, title: s.title }
            : { id: newStepId(), text: s as string }
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
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // État "modifié" (dirty) : compare un instantané JSON des champs
  // pertinents à leur valeur au tout premier rendu — jamais les `id`
  // internes des rangées d'ingrédients/étapes (juste des clés React, pas
  // une donnée de la recette), sinon un simple réordonnancement identique
  // au contenu original se signalerait à tort comme une modification.
  const buildSnapshot = () =>
    JSON.stringify({
      title, category, time, servings, calories, protein, carbs, fat, notes,
      ingredients: ingredientRows.map((r) => (r.isSection ? { isSection: true, title: r.title } : { qty: r.qty, unit: r.unit, name: r.name })),
      steps: stepRows.map((r) => (r.isSection ? { isSection: true, title: r.title } : { text: r.text })),
    });
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

  const addIngredientRow = () => {
    triggerHaptic(15);
    setIngredientRows((prev) => [...prev, { id: newRowId(), qty: "", unit: "g", name: "" }]);
  };
  const addIngredientSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setIngredientRows((prev) => [...prev, { id: newRowId(), isSection: true, title: "" }]);
  };
  const removeIngredientRow = (id: string) => {
    triggerHaptic(15);
    setIngredientRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateIngredientRow = (id: string, field: string, value: string) => {
    setIngredientRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, [field]: value } as IngredientRowT) : r)));
  };

  const addStepRow = () => {
    triggerHaptic(15);
    setStepRows((prev) => [...prev, { id: newStepId(), text: "" }]);
  };
  const addStepSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setStepRows((prev) => [...prev, { id: newStepId(), isSection: true, title: "" }]);
  };
  const removeStepRow = (id: string) => {
    triggerHaptic(15);
    setStepRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateStepRow = (id: string, field: string, value: string) => {
    setStepRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, [field]: value } as StepRowT) : r)));
  };

  // Maintenir "+ Ajouter…" pendant le temps d'appui configuré ajoute un titre de section.
  const useLongPressAdd = (onShortPress: () => void, onLongPress: () => void, duration: number): LongPressAddHandlers => {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Partagé entre submit() et le bouton "Estimer la nutrition" : les deux
  // ont besoin de la même liste d'ingrédients normalisée à partir des
  // rangées du formulaire, l'un pour enregistrer la recette, l'autre pour
  // l'envoyer à /api/nutrition-estimate.
  const buildIngredientsFromRows = () =>
    normalizeIngredientList(
      ingredientRows
        .filter((r) => (r.isSection ? r.title.trim() : r.name.trim()))
        .map((r) =>
          r.isSection
            ? { isSection: true, title: r.title.trim() }
            : { qty: parseFloat(String(r.qty).replace(",", ".")) || 0, unit: r.unit, name: r.name.trim() }
        )
    );

  // Un clavier numérique iOS/Android tape naturellement une virgule pour
  // les décimales (locale française). Avec <input type="number">, un "12,5"
  // ne parse PAS comme nombre valide selon la spec HTML (point seul admis) —
  // le navigateur vide alors silencieusement e.target.value ET marque le
  // champ invalide (badInput), d'où l'erreur "Entrez une valeur valide" au
  // moment de sceller la recette, sans que la virgule n'ait jamais atteint
  // le JS pour être corrigée. D'où le passage en <input type="text"
  // inputMode="decimal"> ci-dessous (clavier numérique conservé sur
  // mobile, mais AUCUN filtrage natif du caractère) : la virgule arrive
  // bien jusqu'ici, où on la convertit nous-mêmes.
  const onDecimalChange = (setter: Dispatch<SetStateAction<string | number>>) => (e: ChangeEvent<HTMLInputElement>) =>
    setter(e.target.value.replace(",", "."));

  const handleEstimateNutrition = async () => {
    if (estimatingNutrition) return;
    triggerHaptic(15);
    setEstimatingNutrition(true);
    setNutritionError("");
    try {
      const result = await estimateNutritionOnline(buildIngredientsFromRows(), Number(servings) || 4);
      if (!result) {
        setNutritionError("Estimation impossible — pas assez d'ingrédients reconnus. Tu peux saisir les valeurs à la main.");
        return;
      }
      setCalories(result.calories);
      setProtein(result.protein);
      setCarbs(result.carbs);
      setFat(result.fat);
    } finally {
      setEstimatingNutrition(false);
    }
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit || saving) {
      if (!canSubmit) setFormError("Il manque le nom, les ingrédients ou les étapes de la recette.");
      return;
    }
    const ingredients = buildIngredientsFromRows();
    const steps = stepRows
      .filter((r) => (r.isSection ? r.title.trim() : r.text.trim()))
      .map((r) => (r.isSection ? { isSection: true as const, title: r.title.trim() } : r.text.trim()));
    const toNumberOrNull = (v: string | number): number | null => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
    const carbsValue = toNumberOrNull(carbs);
    const caloriesValue = toNumberOrNull(calories);
    const proteinValue = toNumberOrNull(protein);
    const fatValue = toNumberOrNull(fat);
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
      carbs: carbsValue,
      calories: caloriesValue,
      protein: proteinValue,
      fat: fatValue,
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
      setImportError("Ce code ne semble pas valide.");
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
        <button type="button" className="modal-close" onClick={attemptClose} aria-label="Fermer"><X size={20} /></button>
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
        <button
          type="button"
          className="nutrition-toggle"
          onClick={() => { triggerHaptic(10); setShowNutrition((v) => !v); }}
        >
          <span>Valeurs nutritionnelles (par portion)</span>
          <ChevronDown size={16} className={`nutrition-chevron ${showNutrition ? "open" : ""}`} />
        </button>
        {showNutrition && (
          <div className="nutrition-fields">
            <button
              type="button"
              className="link-btn nutrition-estimate-btn"
              onClick={handleEstimateNutrition}
              disabled={estimatingNutrition}
            >
              <Sparkles size={15} /> {estimatingNutrition ? "Estimation en cours…" : "Estimer la nutrition"}
            </button>
            {nutritionError && <p className="hint" style={{ fontStyle: "normal" }}>{nutritionError}</p>}
            <div className="field-row">
              <label className="field field-discreet">
                <span>Calories (kcal)</span>
                <input type="text" inputMode="decimal" value={calories} onChange={onDecimalChange(setCalories)} placeholder="Ex. 320" />
              </label>
              <label className="field field-discreet">
                <span>Protéines (g)</span>
                <input type="text" inputMode="decimal" value={protein} onChange={onDecimalChange(setProtein)} placeholder="Ex. 12" />
              </label>
            </div>
            <div className="field-row">
              <label className="field field-discreet">
                <span>Glucides (g)</span>
                <input type="text" inputMode="decimal" value={carbs} onChange={onDecimalChange(setCarbs)} placeholder="Ex. 30" />
              </label>
              <label className="field field-discreet">
                <span>Lipides (g)</span>
                <input type="text" inputMode="decimal" value={fat} onChange={onDecimalChange(setFat)} placeholder="Ex. 9" />
              </label>
            </div>
          </div>
        )}

        <label className="field">
          <span>Ingrédients</span>
        </label>
        <Reorder.Group as="div" className="ingredient-rows" axis="y" values={ingredientRows} onReorder={setIngredientRows}>
          {ingredientRows.map((row) => (
            <IngredientRow
              key={row.id}
              row={row}
              onUpdateRow={updateIngredientRow}
              onRemoveRow={removeIngredientRow}
              canRemove={ingredientRows.length > 1}
            />
          ))}
        </Reorder.Group>
        <button type="button" className="link-btn add-ingredient-btn" {...ingredientAddPress}>
          + Ajouter un ingrédient <span className="long-press-hint">(maintenir {formatPressDuration(pressDuration)} : titre de section)</span>
        </button>

        <label className="field">
          <span>Étapes de préparation</span>
        </label>
        <Reorder.Group as="div" className="step-rows" axis="y" values={stepRows} onReorder={setStepRows}>
          {stepRows.map((row, idx) => (
            <StepRow
              key={row.id}
              row={row}
              idx={idx}
              onUpdateRow={updateStepRow}
              onRemoveRow={removeStepRow}
              canRemove={stepRows.length > 1}
            />
          ))}
        </Reorder.Group>
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
              onClick={() => { triggerHaptic(30); onDelete(initialRecipe!.id); onClose(); }}
            >
              Supprimer cette recette
            </button>
          )}
        </div>
      </motion.form>
    </motion.div>

    <AnimatePresence>
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
    </AnimatePresence>
    <AnimatePresence>
      {showServingsWheel && (
        <WheelPickerModal
          title="Portions"
          hint="Fais glisser la roue pour ajuster le nombre de portions."
          columns={[{ key: "servings", initialValue: Number(servings) || 1, min: 1, max: 24, suffix: "pers." }]}
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
