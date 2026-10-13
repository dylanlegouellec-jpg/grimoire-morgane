import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { triggerHaptic } from "../../../utils/helpers";
import { estimateNutritionOnline } from "../../../utils/nutritionClient";
import { useTranslation } from "../../../contexts/LanguageContext";
import type { NutritionValues } from "./recipeFormRows";

/* ------------------------------------------------------------------ */
/*  VALEURS NUTRITIONNELLES DU FORMULAIRE (section repliable)          */
/* ------------------------------------------------------------------ */

const FIELDS: { key: keyof NutritionValues; label: string; example: number }[] = [
  { key: "calories", label: "recipeUi.form.caloriesLabel", example: 320 },
  { key: "protein", label: "recipeUi.form.proteinLabel", example: 12 },
  { key: "carbs", label: "recipeUi.form.carbsLabel", example: 30 },
  { key: "fat", label: "recipeUi.form.fatLabel", example: 9 },
];

interface NutritionSectionProps {
  values: NutritionValues;
  onChange: (values: NutritionValues) => void;
  /** Ingrédients actuels du formulaire et nombre de parts, pour l'estimation en ligne. */
  getEstimateInput: () => { ingredients: Parameters<typeof estimateNutritionOnline>[0]; servings: number };
}

export default function NutritionSection({ values, onChange, getEstimateInput }: NutritionSectionProps) {
  const { t } = useTranslation();
  // Repliée par défaut, sauf si la recette a déjà au moins une valeur
  // nutritionnelle renseignée (édition) — pas de raison de la cacher dans
  // ce cas, l'utilisateur voudra probablement la voir/corriger d'emblée.
  const [open, setOpen] = useState<boolean>(() => Boolean(values.calories || values.protein || values.carbs || values.fat));
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState("");

  const handleEstimate = async () => {
    if (estimating) return;
    triggerHaptic(15);
    setEstimating(true);
    setError("");
    try {
      const { ingredients, servings } = getEstimateInput();
      const result = await estimateNutritionOnline(ingredients, servings);
      if (!result) {
        setError(t("recipeUi.form.nutritionEstimateError"));
        return;
      }
      onChange({ calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat });
    } finally {
      setEstimating(false);
    }
  };

  // Un clavier numérique iOS/Android tape naturellement une virgule pour
  // les décimales (locale française). Avec <input type="number">, un "12,5"
  // ne parse PAS comme nombre valide selon la spec HTML (point seul admis) —
  // le navigateur vide alors silencieusement la valeur ET marque le champ
  // invalide (badInput). D'où <input type="text" inputMode="decimal">
  // (clavier numérique conservé sur mobile, aucun filtrage natif) : la
  // virgule arrive bien jusqu'ici, où on la convertit nous-mêmes.
  const setField = (key: keyof NutritionValues, raw: string) => onChange({ ...values, [key]: raw.replace(",", ".") });

  const field = ({ key, label, example }: (typeof FIELDS)[number]) => (
    <label key={key} className="field field-discreet">
      <span>{t(label)}</span>
      <input type="text" inputMode="decimal" value={values[key]} onChange={(e) => setField(key, e.target.value)} placeholder={t("recipeUi.form.examplePlaceholder", { value: example })} />
    </label>
  );

  return (
    <>
      <button
        type="button"
        className="nutrition-toggle"
        data-tour="recipe-nutrition"
        onClick={() => { triggerHaptic(10); setOpen((v) => !v); }}
      >
        <span>{t("recipeUi.form.nutritionToggle")}</span>
        <ChevronDown size={16} className={`nutrition-chevron ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="nutrition-fields">
          <button type="button" className="link-btn nutrition-estimate-btn" onClick={handleEstimate} disabled={estimating}>
            <Sparkles size={15} /> {estimating ? t("recipeUi.form.estimating") : t("recipeUi.form.estimateNutrition")}
          </button>
          {error && <p className="hint" style={{ fontStyle: "normal" }}>{error}</p>}
          <div className="field-row">{FIELDS.slice(0, 2).map(field)}</div>
          <div className="field-row">{FIELDS.slice(2).map(field)}</div>
        </div>
      )}
    </>
  );
}
