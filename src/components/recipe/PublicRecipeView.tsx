import { useEffect } from "react";
import { CSS } from "../../constants/styles.css";
import { PUBLIC_RECIPE_CSS } from "../../constants/styles/publicRecipe.css";
import { LanguageProvider, useTranslation } from "../../contexts/LanguageContext";
import { getStoredLanguage } from "../../utils/localSettings";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { categoryLabel, groupIngredients, groupSteps, formatDurationMinutes } from "../../utils/helpers";
import { formatIngredientLine } from "../cookbook/CookbookDocument";
import { NUTRI_COLORS } from "../../utils/nutriscore";
import type { NormalizedIngredient } from "../../utils/ingredients";
import type { StepEntry } from "../../utils/helpers";
import type { NutriscoreGrade } from "../../utils/nutriscoreClient";

// Décodée depuis le lien de partage (voir decodeRecipeCode, utils/helpers.ts)
// — donnée non fiable par nature (encodée côté client par n'importe quel
// auteur de recette, jamais revalidée côté serveur) : tous les champs
// restent optionnels, chacun affiché défensivement ci-dessous.
interface PublicRecipe {
  title: string;
  category?: string | null;
  time?: number;
  prep_time?: number;
  servings?: number | string;
  ingredients?: NormalizedIngredient[];
  steps?: StepEntry[];
  notes?: string | null;
  imageUrl?: string | null;
  nutriscoreGrade?: string | null;
}

/* ------------------------------------------------------------------ */
/*  VUE PUBLIQUE D'UNE SEULE RECETTE — lien de partage (voir            */
/*  ShareRecipeModal.jsx, "Copier le lien") : à la demande explicite de   */
/*  l'utilisateur, ce lien ne doit JAMAIS donner accès au reste du         */
/*  Grimoire (autres recettes, compte, navigation) — juste cette seule       */
/*  recette. Deux conséquences sur ce fichier :                                */
/*                                                                                */
/*  1. Monté à la RACINE de l'app (voir main.jsx), à la place de                  */
/*     GrimoireDeMorgane, dès que l'URL porte `?recette=` — jamais à              */
/*     l'intérieur de l'arbre normal (AppShell, hooks Supabase...) : la              */
/*     personne qui ouvre ce lien n'a pas de session, ne doit déclencher                */
/*     aucun appel réseau vers Supabase, et ne doit surtout pas voir la                  */
/*     moindre trace du reste du Grimoire (nav, réglages, autres recettes).                */
/*                                                                                            */
/*  2. La recette elle-même n'est PAS chargée depuis Supabase : elle est                       */
/*     encodée intégralement dans le lien (voir encodeRecipeCode /                                */
/*     buildRecipeShareLink, utils/helpers.js) — ce composant se contente de                        */
/*     décoder puis afficher, sans la moindre requête. Un lien de partage                              */
/*     fonctionne donc aussi hors-ligne, et reste valable même si la recette                              */
/*     d'origine est ensuite modifiée ou supprimée par son auteur.                                          */
/*                                                                                                              */
/*  Réutilise volontairement le même balisage/CSS que la page recette du                                        */
/*  livre de cuisine (CookbookDocument.jsx, classes .cookbook-recipe-*) —                                          */
/*  déjà pensé pour un rendu autonome, soigné, imprimable — MOINS l'en-tête                                          */
/*  courant ("LE GRIMOIRE DE MORGANE") et le numéro de page, propres à un                                              */
/*  livre relié, qui n'ont pas de sens pour une seule recette isolée.                                                     */
/* ------------------------------------------------------------------ */

function RecipeContent({ recipe }: { recipe: PublicRecipe }) {
  const { t, language } = useTranslation();
  const servings = Number(recipe.servings) || 1;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const isSucreCat = categoryLabel(recipe) === "Sucré";
  const hasPhoto = Boolean(recipe.imageUrl);
  const nutriGrade = recipe.nutriscoreGrade;
  const nutriColor = NUTRI_COLORS[nutriGrade as NutriscoreGrade] || "#b3872a";

  useEffect(() => {
    try {
      document.title = translateRecipeText(recipe.title, language);
    } catch {
      /* pas grave si le titre de l'onglet ne peut pas être changé */
    }
  }, [recipe.title, language]);

  return (
    <section className="cookbook-page cookbook-recipe-page">
      {hasPhoto && (
        <div
          className="cookbook-recipe-photo-wrap cookbook-recipe-photo-wrap--grande"
          style={{ backgroundImage: `url("${recipe.imageUrl}")` }}
        />
      )}
      <div className="cookbook-recipe-badges">
        <span className={`cookbook-chip ${isSucreCat ? "chip-sucre" : "chip-sale"}`}>
          {t(isSucreCat ? "filters.sucre" : "filters.sale")}
        </span>
        {nutriGrade && <span className="cookbook-nutri-circle" style={{ background: nutriColor }}>{nutriGrade}</span>}
      </div>
      <h2 className="cookbook-recipe-title">{translateRecipeText(recipe.title, language)}</h2>
      <div className="cookbook-recipe-meta">
        <span>{formatDurationMinutes(recipe.time || recipe.prep_time || 0)}</span>
        <span className="cookbook-recipe-meta-dot" aria-hidden="true" />
        <span>{servings} {t("share.servingsShort")}</span>
      </div>
      <div className="cookbook-recipe-flourish" aria-hidden="true">❦</div>
      <div className="cookbook-recipe-columns">
        <div>
          <h3 className="cookbook-section-title">{t("share.printIngredients")}</h3>
          {groupIngredients(ingredients).map((g, i) => (
            <div key={i}>
              {g.title && <h4 className="cookbook-sub">{translateRecipeText(g.title, language)}</h4>}
              <ul>
                {g.items.map((it, j) => (
                  <li key={j}>{formatIngredientLine(it, language)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="cookbook-section-title">{t("share.printPreparation")}</h3>
          {groupSteps(steps).map((g, i) => (
            <div key={i}>
              {g.title && <h4 className="cookbook-sub">{translateRecipeText(g.title, language)}</h4>}
              <ol>
                {g.steps.map((s, j) => <li key={j}>{translateRecipeText(s, language)}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>
      {recipe.notes && (
        <>
          <h3 className="cookbook-section-title" style={{ marginTop: 22 }}>{t("share.printNotesTitle")}</h3>
          <p className="cookbook-notes">{translateRecipeText(recipe.notes, language)}</p>
        </>
      )}
    </section>
  );
}

function InvalidLink() {
  const { t } = useTranslation();
  return (
    <div className="public-recipe-invalid">
      <p>{t("publicRecipe.invalidTitle")}</p>
    </div>
  );
}

interface PublicRecipeViewProps {
  recipe: PublicRecipe | null;
}

export default function PublicRecipeView({ recipe }: PublicRecipeViewProps) {
  return (
    <LanguageProvider language={getStoredLanguage()}>
      <div className="public-recipe-page">
        <style>{CSS}</style>
        <style>{PUBLIC_RECIPE_CSS}</style>
        {recipe ? <RecipeContent recipe={recipe} /> : <InvalidLink />}
      </div>
    </LanguageProvider>
  );
}
