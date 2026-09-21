import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { categoryLabel, groupIngredients, groupSteps, formatDurationMinutes } from "../../utils/helpers";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { COVER_COLORS, marginMm, pageDimensionsMm } from "../../constants/cookbook";

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

// Extrait un préfixe "càc"/"càs" (abréviation de cuillère à café/soupe)
// resté collé dans le NOM d'un ingrédient plutôt que découpé dans son
// propre champ unité — arrive quand une recette a été tapée comme texte
// libre plutôt que via les champs qté/unité/nom séparés de l'éditeur (ex.
// "càc de curry" plutôt que unité "c. à café" + nom "curry"). Jamais
// appliqué si une unité existe déjà (elle est alors déjà correcte).
const LEADING_SPOON_UNIT = /^c\.?\s?[aà]\.?\s?(c|s)\.?\s+(?:de\s+|d['’])?/i;
function splitLeadingSpoonUnit(unit, name) {
  if (unit || typeof name !== "string") return { unit, name };
  const trimmed = name.trim();
  const match = LEADING_SPOON_UNIT.exec(trimmed);
  if (!match) return { unit, name };
  const isSoupe = match[1].toLowerCase() === "s";
  return { unit: isSoupe ? "c. à soupe" : "c. à café", name: trimmed.slice(match[0].length).trim() };
}

// Ligne d'ingrédient affichée — jamais de tiret "orphelin" après une
// quantité sans unité (signalé par l'utilisateur : "10 — feuilles de
// brick" devient "10 feuilles de brick") : ce tiret ne sépare rien tant
// qu'il n'y a pas d'unité à distinguer du nom.
export function formatIngredientLine(it, language) {
  const { unit, name } = splitLeadingSpoonUnit(it.unit, it.name);
  const translatedName = translateRecipeText(name, language);
  if (!unit) return `${it.qty} ${translatedName}`.trim();
  return `${it.qty} ${translateRecipeText(unit, language)} — ${translatedName}`;
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

// Groupe par catégorie (Salé d'abord, comme partout ailleurs dans l'app —
// voir filters.sale/filters.sucre) pour une table des matières "par
// chapitres" plutôt qu'une liste à plat — un chapitre sans recette (aucune
// recette Sucrée sélectionnée, par ex.) n'apparaît simplement pas.
function groupByCategory(recipes) {
  const sale = recipes.filter((r) => categoryLabel(r) !== "Sucré");
  const sucre = recipes.filter((r) => categoryLabel(r) === "Sucré");
  return [
    { key: "sale", labelKey: "filters.sale", recipes: sale },
    { key: "sucre", labelKey: "filters.sucre", recipes: sucre },
  ].filter((chapter) => chapter.recipes.length > 0);
}

function TocPage({ recipes, t, language, pageNumber, runningTitle, pageStarts, tocMode }) {
  const chapters = groupByCategory(recipes);
  return (
    <section className="cookbook-page cookbook-toc">
      <p className="cookbook-running-header">{runningTitle}</p>
      <h2 className="cookbook-page-title">{t("cookbook.tocTitle")}</h2>
      {chapters.map((chapter) => {
        // Absent tant que la mesure préalable (computeRecipeStartPages, voir
        // CookbookBuilderModal.jsx) n'a pas encore tourné — pas un numéro
        // faux, juste pas encore calculé.
        const chapterStartPage = pageStarts && chapter.recipes[0] ? pageStarts[chapter.recipes[0].id] : null;
        return (
          <div key={chapter.key} className="cookbook-toc-chapter">
            <div className="cookbook-toc-chapter-row">
              <span className="cookbook-toc-chapter-title">{t(chapter.labelKey)}</span>
              <span className="cookbook-toc-dots" aria-hidden="true" />
              {chapterStartPage != null && <span className="cookbook-toc-page">{chapterStartPage}</span>}
            </div>
            {tocMode === "chapitresEtRecettes" && (
              <ol className="cookbook-toc-list">
                {chapter.recipes.map((r) => {
                  const startPage = pageStarts ? pageStarts[r.id] : null;
                  return (
                    <li key={r.id}>
                      <span className="cookbook-toc-name">{translateRecipeText(r.title, language)}</span>
                      <span className="cookbook-toc-dots" aria-hidden="true" />
                      {startPage != null && <span className="cookbook-toc-page">{startPage}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
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
      {/* Image de fond CSS (background-size:cover) plutôt qu'un <img
          object-fit:cover> : html2canvas (voir utils/cookbookPdf.js) ne
          respecte pas object-fit sur un <img> — il étire la photo entière
          dans la boîte au lieu de la recadrer, la rendant visiblement
          aplatie/déformée dans le PDF téléchargé (signalé par l'utilisateur).
          background-size:cover recadre correctement dans les deux cas
          (aperçu à l'écran ET rasterisation html2canvas), sans rien changer
          au rendu visuel normal du navigateur. */}
      {hasPhoto && (
        <div
          className={`cookbook-recipe-photo-wrap cookbook-recipe-photo-wrap--${config.photoSize}`}
          style={{ backgroundImage: `url("${recipe.imageUrl}")` }}
        />
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
          {/* Remplace les anciennes icônes ⏱/👥 (jugées trop "basiques" par
              l'utilisateur) par un traitement purement typographique — un
              point plein comme séparateur, dans le même style Cinzel
              espacé/majuscule que les puces de catégorie et la table des
              matières un peu plus haut dans ce fichier, plutôt que des
              pictogrammes qui détonnaient avec le reste du document. */}
          <span>{formatDurationMinutes(recipe.time || recipe.prep_time || 0)}</span>
          <span className="cookbook-recipe-meta-dot" aria-hidden="true" />
          <span>{servings} {t("share.servingsShort")}</span>
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
                    <li key={j}>{formatIngredientLine(it, language)}</li>
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
export default function CookbookDocument({ recipes, config, pageStarts }) {
  const { t, language } = useTranslation();
  const list = Array.isArray(recipes) ? recipes : [];
  const runningTitle = config.coverTitle || "Le Grimoire de Morgane";

  // Numérotation calculée en JS plutôt qu'avec les compteurs CSS @page —
  // beaucoup plus fiable entre navigateurs (Safari iOS notamment) pour un
  // simple numéro par page logique, sans dépendre du découpage physique
  // réel que seul le moteur d'impression connaît.
  let counter = 0;
  const showToc = config.tocMode !== "aucune";
  const coverNumber = config.pageNumbers ? ++counter : null;
  const tocNumber = showToc && config.pageNumbers ? ++counter : null;

  // Ratio largeur/hauteur de la surface utile d'une page (format moins les
  // marges choisies) — posé comme aspect-ratio CSS sur .cookbook-page :
  // sans lui, une page dont le contenu est plus court qu'une page entière
  // (couverture, table des matières courte, petite recette) ne prenait que
  // la hauteur de son propre contenu, laissant un immense blanc en dessous
  // aussi bien à l'écran (aperçu) qu'au rendu du PDF (html2canvas rasterise
  // exactement ce que le navigateur a mis en page). aspect-ratio ne FIXE
  // pas la hauteur : une recette plus longue que ce ratio grandit quand
  // même normalement (voir découpe en tranches, utils/cookbookPdf.js).
  const pageMm = pageDimensionsMm(config);
  const m = marginMm(config.margin);
  const usableWidthMm = pageMm.width - m * 2;
  const usableHeightMm = pageMm.height - m * 2;

  return (
    <>
      <style>{`
        @page { size: ${config.format === "A5" ? "A5" : "A4"}${config.orientation === "paysage" ? " landscape" : ""}; margin: ${m}mm; }
        .cookbook-page { aspect-ratio: ${usableWidthMm} / ${usableHeightMm}; }
      `}</style>
      <CoverPage config={config} pageNumber={coverNumber} />
      {showToc && (
        <TocPage
          recipes={list}
          t={t}
          language={language}
          pageNumber={tocNumber}
          runningTitle={runningTitle}
          pageStarts={pageStarts}
          tocMode={config.tocMode}
        />
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
