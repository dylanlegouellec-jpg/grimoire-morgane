import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { categoryLabel, groupIngredients, groupSteps } from "../../utils/helpers";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { COVER_COLORS, marginMm } from "../../constants/cookbook";

/* ------------------------------------------------------------------ */
/*  LIVRE DE CUISINE — document partagé aperçu/impression                */
/*                                                                        */
/*  Un seul arbre JSX pour les deux usages (voir CookbookBuilderModal.jsx) : */
/*  le parent bascule entre "aperçu à l'écran" et "impression réelle" via     */
/*  une simple classe CSS ajoutée à l'enveloppe (.cookbook-print-sheet vs      */
/*  .cookbook-print-sheet--preview, voir styles/cookbook.css.js), jamais en     */
/*  dupliquant le balisage — même principe que .print-sheet dans                */
/*  ShareRecipeModal.jsx, étendu ici à un document multi-recettes.                */
/* ------------------------------------------------------------------ */

function coverColorValue(id) {
  return (COVER_COLORS.find((c) => c.id === id) || COVER_COLORS[0]).value;
}

function CoverPage({ config, pageNumber }) {
  const color = coverColorValue(config.coverColor);
  return (
    <section
      className={`cookbook-page cookbook-cover cookbook-cover--${config.coverLayout}`}
      style={{ "--cookbook-cover-color": color }}
    >
      <div className="cookbook-cover-flourish" aria-hidden="true">❦</div>
      <h1 className="cookbook-cover-title">{config.coverTitle || "Le Grimoire de Morgane"}</h1>
      {config.coverSubtitle && <p className="cookbook-cover-subtitle">{config.coverSubtitle}</p>}
      <div className="cookbook-cover-flourish" aria-hidden="true">❦</div>
      {pageNumber != null && <div className="cookbook-page-number">{pageNumber}</div>}
    </section>
  );
}

function TocPage({ recipes, t, language, pageNumber, runningTitle }) {
  return (
    <section className="cookbook-page cookbook-toc">
      <p className="cookbook-running-header">{runningTitle}</p>
      <h2 className="cookbook-page-title">{t("cookbook.tocTitle")}</h2>
      <ol className="cookbook-toc-list">
        {recipes.map((r) => {
          const isSucreCat = categoryLabel(r) === "Sucré";
          return (
            <li key={r.id}>
              <span className="cookbook-toc-name">{translateRecipeText(r.title, language)}</span>
              <span className="cookbook-toc-dots" aria-hidden="true" />
              <span className={`cookbook-chip cookbook-toc-chip ${isSucreCat ? "chip-sucre" : "chip-sale"}`}>
                {t(isSucreCat ? "filters.sucre" : "filters.sale")}
              </span>
            </li>
          );
        })}
      </ol>
      {pageNumber != null && <div className="cookbook-page-number">{pageNumber}</div>}
    </section>
  );
}

function RecipePage({ recipe, config, t, language, pageNumber, isLast, runningTitle }) {
  const servings = Number(recipe.servings) || 1;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const isSucreCat = categoryLabel(recipe) === "Sucré";
  const nutriGrade = recipe.nutriscoreGrade || estimateNutriscoreLocal(ingredients, recipe.category);
  const nutriColor = NUTRI_COLORS[nutriGrade] || "#b3872a";
  const hasPhoto = Boolean(recipe.imageUrl) && config.photoSize !== "aucune";

  return (
    <section className={`cookbook-page cookbook-recipe-page ${isLast ? "cookbook-page--last" : ""}`}>
      <p className="cookbook-running-header">{runningTitle}</p>
      {hasPhoto && (
        <div className={`cookbook-recipe-photo-wrap cookbook-recipe-photo-wrap--${config.photoSize}`}>
          <img className="cookbook-recipe-photo" src={recipe.imageUrl} alt="" crossOrigin="anonymous" />
        </div>
      )}
      <div className="cookbook-recipe-badges">
        <span className={`cookbook-chip ${isSucreCat ? "chip-sucre" : "chip-sale"}`}>
          {t(isSucreCat ? "filters.sucre" : "filters.sale")}
        </span>
        {config.showNutrition && (
          <span className="cookbook-nutri-circle" style={{ background: nutriColor }}>{nutriGrade}</span>
        )}
      </div>
      <h2 className="cookbook-recipe-title">{translateRecipeText(recipe.title, language)}</h2>
      {config.showTime && (
        <div className="cookbook-recipe-meta">
          <span>⏱ {recipe.time || recipe.prep_time || 0} {t("share.minutesShort")}</span>
          <span>👥 {servings} {t("share.servingsShort")}</span>
        </div>
      )}
      <div className="cookbook-recipe-flourish" aria-hidden="true">❦</div>
      <div className="cookbook-recipe-columns">
        {config.showIngredients && (
          <div>
            <h3 className="cookbook-section-title">{t("share.printIngredients")}</h3>
            {groupIngredients(ingredients).map((g, i) => (
              <div key={i}>
                {g.title && <h4 className="cookbook-sub">{translateRecipeText(g.title, language)}</h4>}
                <ul>
                  {g.items.map((it, j) => (
                    <li key={j}>
                      {[it.qty, it.unit ? translateRecipeText(it.unit, language) : ""].filter(Boolean).join(" ")} — {translateRecipeText(it.name, language)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {config.showSteps && (
          <div>
            <h3 className="cookbook-section-title">{t("share.printPreparation")}</h3>
            {groupSteps(steps).map((g, i) => (
              <div key={i}>
                {g.title && <h4 className="cookbook-sub">{translateRecipeText(g.title, language)}</h4>}
                <ol>{g.steps.map((s, j) => <li key={j}>{translateRecipeText(s, language)}</li>)}</ol>
              </div>
            ))}
          </div>
        )}
      </div>
      {config.showNotes && recipe.notes && (
        <>
          <h3 className="cookbook-section-title">{t("share.printNotesTitle")}</h3>
          <p className="cookbook-notes">{translateRecipeText(recipe.notes, language)}</p>
        </>
      )}
      {pageNumber != null && <div className="cookbook-page-number">{pageNumber}</div>}
    </section>
  );
}

// `recipes` : déjà filtrées/triées par l'appelant (voir CookbookBuilderModal,
// selectionMode "all"/"category"/"manual") — ce composant ne fait plus que
// mettre en page la sélection qu'on lui donne.
export default function CookbookDocument({ recipes, config }) {
  const { t, language } = useTranslation();
  const list = Array.isArray(recipes) ? recipes : [];
  const runningTitle = config.coverTitle || "Le Grimoire de Morgane";

  // Numérotation calculée en JS plutôt qu'avec les compteurs CSS @page —
  // beaucoup plus fiable entre navigateurs (Safari iOS notamment) pour un
  // simple numéro par page logique, sans dépendre du découpage physique
  // réel que seul le moteur d'impression connaît.
  let counter = 0;
  const coverNumber = config.pageNumbers ? ++counter : null;
  const tocNumber = config.toc && config.pageNumbers ? ++counter : null;

  return (
    <>
      <style>{`@page { size: ${config.format === "A5" ? "A5" : "A4"}; margin: ${marginMm(config.margin)}mm; }`}</style>
      <CoverPage config={config} pageNumber={coverNumber} />
      {config.toc && (
        <TocPage recipes={list} t={t} language={language} pageNumber={tocNumber} runningTitle={runningTitle} />
      )}
      {list.map((r, i) => (
        <RecipePage
          key={r.id}
          recipe={r}
          config={config}
          t={t}
          language={language}
          pageNumber={config.pageNumbers ? ++counter : null}
          isLast={i === list.length - 1}
          runningTitle={runningTitle}
        />
      ))}
    </>
  );
}
