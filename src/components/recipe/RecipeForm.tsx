import { useEffect, useLayoutEffect, useState, useRef, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "motion/react";
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
import ServingsPickerModal from "./form/ServingsPickerModal";
import { normalizeServingsUnit, servingsUnitFor, unitServingsText } from "../../utils/servingsUnit";
import {
  FLIGHT_MS,
  INK_INTRO_MS,
  SEAL_CLOSE_MS,
  SEAL_HAPTIC,
  SEAL_IMPACT_MS,
  cardFlightTarget,
  markRecipeSealed,
  playInkReveal,
  type InkOrigin,
} from "./form/createAnimations";
import { QuillTitle, WaxSeal } from "./form/QuillAndSeal";

export { UNIT_OPTIONS } from "./form/recipeFormRows";

// Gouttelettes de la tache d'encre : angle (deg), distance (px), taille
// (px), décalage (ms) — voir .ink-drop, styles/createAnimations.css.
const INK_DROPS: Array<[number, number, number, number]> = [
  [-150, 70, 14, 0], [-118, 96, 9, 20], [-96, 64, 11, 10], [-172, 104, 8, 30], [-134, 128, 6, 40], [-72, 92, 8, 25], [-196, 74, 7, 15],
];
const inkVars = (o: InkOrigin) => ({ "--ink-x": `${o.x}px`, "--ink-y": `${o.y}px` }) as CSSProperties;

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
  /** Centre du « + » qui a demandé la création : ouverture en tache
   *  d'encre depuis ce point (voir form/createAnimations.ts). Absent =
   *  ouverture normale (édition, tuto, raccourci d'icône...). */
  inkOrigin?: InkOrigin | null;
}

/* ------------------------------------------------------------------ */
/*  FORMULAIRE DE RECETTE (création / édition)                         */
/* ------------------------------------------------------------------ */

export default function RecipeForm({ onClose, onSave, onDelete, initialRecipe, pressDuration = 750, inkOrigin }: RecipeFormProps) {
  const isPresent = useBodyScrollLock(true);
  const { t, language } = useTranslation();
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState<string>(initialRecipe ? initialRecipe.title : "");
  const [category, setCategory] = useState<string>(initialRecipe ? initialRecipe.category : "Salé");
  const [time, setTime] = useState<number>(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState<number>(initialRecipe ? initialRecipe.servings : 4);
  // null = « personnes » ; sinon unité libre (« cookies »...), voir utils/servingsUnit.ts.
  const [servingsUnit, setServingsUnit] = useState<string | null>(() => normalizeServingsUnit(initialRecipe?.servingsUnit));
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

  // --- Animations (voir form/createAnimations.ts) ---------------------
  // « Réduire les animations » : ni tache d'encre ni sceau, la feuille
  // garde sa sortie/entrée habituelle (simple fondu via MotionConfig).
  const prefersReducedMotion = useReducedMotion();
  // Tache d'encre : CRÉATION depuis le « + » uniquement, décidée une fois
  // au montage.
  const [inkIntro, setInkIntro] = useState(() => !!inkOrigin && !initialRecipe && !prefersReducedMotion);
  const [inkStart] = useState(() => inkOrigin);
  const inkRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!inkIntro || !inkStart) return undefined;
    const cancel = playInkReveal(inkRef.current, backdropRef.current, inkStart);
    const timer = setTimeout(() => setInkIntro(false), INK_INTRO_MS);
    return () => { clearTimeout(timer); cancel(); };
  }, [inkIntro, inkStart]);
  // Cachet de cire : position du sceau dans la feuille pendant le scellage,
  // puis cible du vol vers la carte (exit Framer) et fermeture demandée.
  const [sealTop, setSealTop] = useState<number | null>(null);
  const [flightExit, setFlightExit] = useState<TargetAndTransition | null>(null);
  const [closeRequested, setCloseRequested] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);
  // Fermeture APRÈS le rendu qui a posé `flightExit` : AnimatePresence
  // joue la sortie avec les dernières props reçues.
  const closedRef = useRef(false);
  useEffect(() => {
    if (!closeRequested || closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [closeRequested, onClose]);

  // État "modifié" (dirty) : compare un instantané JSON des champs
  // pertinents à leur valeur au tout premier rendu (voir rowsSnapshot).
  const buildSnapshot = () =>
    JSON.stringify({ title, category, time, servings, servingsUnit, nutrition, notes, ...rowsSnapshot(ingredientRows, stepRows) });
  const initialSnapshotRef = useRef<string | null>(null);
  if (initialSnapshotRef.current === null) initialSnapshotRef.current = buildSnapshot();
  const isDirty = initialSnapshotRef.current !== buildSnapshot();

  // Point de passage UNIQUE pour toute tentative de fermeture (bouton "X",
  // clic sur le fond, tirage vers le bas) : jamais de fermeture silencieuse
  // d'un changement non enregistré, voir UnsavedChangesModal ci-dessous.
  const attemptClose = () => {
    if (sealTop !== null) return; // scellage en cours : la feuille se ferme d'elle-même
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
    // Le sceau tombe DÈS l'appui, en parallèle du calcul du Nutri-Score et
    // de l'enregistrement — jamais l'enregistrement après l'animation.
    const sealed = !prefersReducedMotion;
    const startedAt = Date.now();
    if (sealed) {
      const f = formRef.current;
      setSealTop(f ? f.scrollTop + f.clientHeight * 0.42 : 240);
      timersRef.current.push(setTimeout(() => { triggerHaptic(SEAL_HAPTIC); playSuccessSound(); }, SEAL_IMPACT_MS));
    }
    // Nutri-Score recalculé UNIQUEMENT ici (création/édition) — jamais à
    // l'affichage. L'appel a un timeout et un repli local intégrés
    // (voir utils/nutriscoreClient.js) : il ne peut donc jamais bloquer
    // indéfiniment ni faire échouer l'enregistrement de la recette.
    const nutriscoreGrade = await fetchNutriscoreGrade(ingredients, category);

    const recipe: Recipe = {
      id: isEdit ? initialRecipe!.id : nextId(),
      title: title.trim(),
      category,
      time: Number(time) || 30,
      servings: Number(servings) || 4,
      servingsUnit,
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
    };
    try {
      onSave(recipe);
    } catch (err) {
      // Échec de l'enregistrement : le sceau s'efface, le formulaire reste
      // ouvert (rien n'est perdu).
      timersRef.current.forEach(clearTimeout);
      setSealTop(null);
      setSaving(false);
      throw err;
    }
    if (!sealed) {
      playSuccessSound();
      markRecipeSealed(recipe.id, 200);
      setSaving(false);
      onClose();
      return;
    }
    timersRef.current.push(setTimeout(() => {
      const flight = cardFlightTarget(formRef.current, recipe.id);
      if (flight) {
        setFlightExit({
          ...flight,
          opacity: [1, 1, 0],
          transition: { duration: FLIGHT_MS / 1000, ease: [0.5, 0, 0.25, 1], opacity: { duration: FLIGHT_MS / 1000, times: [0, 0.75, 1] } },
        });
      }
      markRecipeSealed(recipe.id, flight ? FLIGHT_MS - 220 : 160);
      setCloseRequested(true);
    }, Math.max(0, SEAL_CLOSE_MS - (Date.now() - startedAt))));
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
    {inkIntro && inkStart && (
      <>
        <div ref={inkRef} className="ink-blot" aria-hidden="true" style={inkVars(inkStart)} />
        <div className="ink-drops" aria-hidden="true" style={inkVars(inkStart)}>
          {INK_DROPS.map(([a, d, size, delay], i) => (
            <span key={i} className="ink-drop" style={{ "--a": `${a}deg`, "--d": `${d}px`, "--s": `${size}px`, "--delay": `${delay}ms` } as CSSProperties} />
          ))}
        </div>
      </>
    )}
    <motion.div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={attemptClose}
      {...MODAL_BACKDROP_MOTION}
      // Tache d'encre : le fond et la feuille sont déjà à leur état final,
      // c'est le clip-path circulaire (playInkReveal) qui les révèle.
      initial={inkIntro ? false : MODAL_BACKDROP_MOTION.initial}
      // Vol vers la carte : la feuille est DANS ce fond, un fondu du fond
      // l'effacerait avec lui — seul l'assombrissement s'éteint.
      exit={flightExit ? { backgroundColor: "rgba(20,14,4,0)", transition: { duration: FLIGHT_MS / 1000 } } : MODAL_BACKDROP_MOTION.exit}
      style={isPresent ? undefined : { pointerEvents: "none" }}
    >
      <motion.form
        ref={setFormRef}
        className={`modal grimoire-page form-clean modal-swipeable${inkIntro ? " form-ink-cascade" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        {...MODAL_SHEET_MOTION}
        initial={inkIntro ? false : MODAL_SHEET_MOTION.initial}
        exit={flightExit ?? MODAL_SHEET_MOTION.exit}
        {...sheet.panHandlers}
      >
        <button type="button" className="modal-close" onClick={attemptClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title" {...(isEdit ? {} : secretImport)}>
          {isEdit ? t("recipeUi.form.titleEdit") : <QuillTitle text={t("recipeUi.form.titleNew")} play={inkIntro} />}
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
              {unitServingsText(t, Number(servings) || 1, servingsUnit, language) ?? t("recipeUi.form.servingsValue", { count: Number(servings) || 1 })}
            </button>
          </label>
        </div>
        <NutritionSection
          // « par cookie » plutôt que « par portion » pour une recette à l'unité.
          toggleLabel={servingsUnit ? t("servingsUnit.nutritionToggle", { unit: servingsUnitFor(servingsUnit, 1) }) : undefined}
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
          <Seal type="submit" tone="gold" disabled={!canSubmit} haptic={prefersReducedMotion ? [100, 50, 40, 50, 150] : 12}>
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
        {sealTop !== null && <WaxSeal top={sealTop} />}
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
        <ServingsPickerModal
          servings={Number(servings) || 1}
          unit={servingsUnit}
          onSave={({ servings: s, unit }) => { setServings(s); setServingsUnit(unit); }}
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
