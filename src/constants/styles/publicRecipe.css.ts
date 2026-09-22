/* ------------------------------------------------------------------ */
/*  VUE PUBLIQUE D'UNE RECETTE — page racine autonome (voir              */
/*  PublicRecipeView.jsx), délibérément DÉCOUPLÉE de .grimoire-app        */
/*  (qui bascule en grille desktop via responsive.css.js) : cette page     */
/*  n'a ni nav, ni en-tête, ni sidebar à faire tenir dans cette grille —     */
/*  juste une seule carte recette centrée, quelle que soit la largeur.        */
/* ------------------------------------------------------------------ */
export const PUBLIC_RECIPE_CSS: string = `
.public-recipe-page {
  font-family: 'EB Garamond', Georgia, serif;
  color: var(--ink);
  background: radial-gradient(ellipse at top left, var(--page-glow), transparent 60%), var(--parchment);
  min-height: 100vh;
  /* .cookbook-page (voir cookbook.css.js) impose déjà sa propre largeur
     (max-width: 680px, margin: 0 auto) et se centre lui-même — cette
     enveloppe n'a qu'à laisser assez de place autour pour ça, plus un peu
     de padding vertical/horizontal pour ne pas coller aux bords sur mobile. */
  padding: 32px 20px 60px;
}
.public-recipe-invalid {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--ink-soft);
  font-style: italic;
  padding: 20px;
}
`;
