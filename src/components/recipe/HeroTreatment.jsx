/* ------------------------------------------------------------------ */
/*  HABILLAGE DU VISUEL DE RECETTE — les décorations posées par-dessus  */
/*  la photo dans .detail-hero (voir RecipeDetail.jsx), selon le         */
/*  réglage choisi dans Apparence > Visuel de la fiche recette            */
/*  (HeroTreatmentPreview.jsx, pour l'aperçu dans les Réglages, réutilise  */
/*  ce même composant — un seul et même rendu, jamais deux à maintenir).   */
/*                                                                          */
/*  "fondu" reste plein cadre (bord à bord, comportement d'origine) ; les    */
/*  5 autres réclament une marge visible autour de la photo (voir             */
/*  heroTreatmentClassName, qui ajoute .detail-hero-inset) — un bord           */
/*  doré/festonné/corné n'a de sens que si le fond de la page reste visible     */
/*  tout autour.                                                                 */
/* ------------------------------------------------------------------ */
export function heroTreatmentClassName(treatment) {
  if (treatment === "cadre") return "detail-hero-inset hero-treat-cadre";
  if (treatment === "fondu" || !treatment) return "";
  return "detail-hero-inset";
}

// "legende" est le seul traitement où le titre/catégorie viennent se
// superposer À LA PHOTO plutôt que de rester dans le flux normal en
// dessous (voir RecipeDetail.jsx, qui rend alors HeroLegendCaption ici
// plutôt que son bloc chip+titre habituel).
export function isLegendTreatment(treatment) {
  return treatment === "legende";
}

export default function HeroTreatment({ treatment }) {
  switch (treatment) {
    case "cadre":
      return (
        <>
          <div className="hero-corner hero-corner-tl" aria-hidden="true" />
          <div className="hero-corner hero-corner-tr" aria-hidden="true" />
          <div className="hero-corner hero-corner-bl" aria-hidden="true" />
          <div className="hero-corner hero-corner-br" aria-hidden="true" />
        </>
      );
    case "feston":
      return <div className="scallop-cutter" aria-hidden="true" />;
    case "legende":
      return <div className="hero-legende-veil" aria-hidden="true" />;
    case "vignette":
      return <div className="hero-vignette-shadow" aria-hidden="true" />;
    case "coin":
      return (
        <>
          <div className="hero-coin-shadow" aria-hidden="true" />
          <div className="hero-coin-fold" aria-hidden="true" />
        </>
      );
    case "fondu":
    default:
      return <div className="detail-hero-fade" aria-hidden="true" />;
  }
}
