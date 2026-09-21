/* ------------------------------------------------------------------ */
/*  LIVRE DE CUISINE PDF — document multipage (aperçu à l'écran +        */
/*  impression), voir components/cookbook/CookbookDocument.jsx et          */
/*  CookbookBuilderModal.jsx.                                               */
/*                                                                             */
/*  Même astuce que .print-sheet (responsive.css.js) mais étendue :            */
/*  .cookbook-print-sheet reste caché à l'écran par défaut et n'apparaît         */
/*  QUE dans le rendu d'impression (@media print) — SAUF quand le modificateur    */
/*  .cookbook-print-sheet--preview est ajouté (bouton "Aperçu en direct"),         */
/*  qui le rend visible en plein écran par-dessus l'éditeur, sans dupliquer         */
/*  le balisage entre aperçu et impression réelle.                                 */
/* ------------------------------------------------------------------ */

export const COOKBOOK_CSS = `
/* --- Éditeur (CookbookBuilderModal.jsx) --- */
.cookbook-color-row { display: flex; gap: 10px; flex-wrap: wrap; padding: 4px 2px; }
.cookbook-color-swatch {
  width: 36px; height: 36px; border-radius: 50%; border: none; padding: 0; cursor: pointer;
}
.cookbook-color-swatch.active { box-shadow: 0 0 0 3px var(--parchment), 0 0 0 5px var(--gold); }
.cookbook-recipe-list { max-height: 280px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.cookbook-recipe-list .ios-row-title { flex: 1; text-align: left; }
.cookbook-recipe-list .ios-row-check { color: var(--gold); flex-shrink: 0; }
.cookbook-selection-count {
  font-family: 'Cinzel', serif; letter-spacing: 0.5px; font-size: 0.72rem;
  text-transform: uppercase; color: var(--ink-soft); margin: 8px 2px 0;
}

/* Aperçu miniature de la couverture, toujours visible dans l'éditeur (voir
   CookbookCoverPreview dans CookbookBuilderModal.jsx) — balisage/CSS dédiés
   à cette petite taille, pas une réduction de .cookbook-cover (pensée pour
   ~680px de large, voir CookbookDocument.jsx). Ratio ISO 216 (1:√2, A4 ET
   A5) fixe : une vraie précision par format n'apporte rien à cette échelle. */
/* position:sticky : reste visible pendant qu'on ajuste les réglages listés
   EN DESSOUS dans la même section (titre/sous-titre/couleur/disposition
   pour la couverture, taille de photo/sections pour la mise en page des
   recettes) — demandé par l'utilisateur, captures de référence à l'appui,
   plutôt que de devoir rouvrir "Aperçu en direct" à chaque changement. Un
   top décalé (pas 0) : laisse une respiration visuelle avec le haut de la
   zone de défilement plutôt qu'un collage brut au bord. */
.cookbook-cover-mini {
  max-width: 220px;
  aspect-ratio: 210 / 297;
  margin: 4px auto 14px;
  padding: 16px 14px;
  border: 2px solid var(--cookbook-cover-color, #b3872a);
  border-radius: 6px;
  background: #f6ecd2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  position: sticky;
  top: 8px;
  z-index: 5;
}
.cookbook-cover-mini--epure { border: none; box-shadow: none; }
.cookbook-cover-mini-flourish { font-size: 0.85rem; color: var(--cookbook-cover-color, #b3872a); margin: 3px 0; }
.cookbook-cover-mini-title {
  font-family: 'Cinzel Decorative', 'Cinzel', serif;
  font-size: 0.9rem; line-height: 1.25; margin: 3px 0;
  color: var(--cookbook-cover-color, #b3872a);
  word-break: break-word;
}
.cookbook-cover-mini-subtitle {
  font-family: 'Cinzel', serif; letter-spacing: 1px; text-transform: uppercase;
  font-size: 0.55rem; color: #5c4a30; margin: 0;
}

/* Même principe, pour la section "Mise en page des recettes" (voir
   CookbookRecipePreview) — une recette fictive dont seule la structure
   (photo, colonnes, sections visibles) suit les réglages, le contenu reste
   un simple gabarit (barres décoratives plutôt que du vrai texte). */
.cookbook-recipe-mini {
  max-width: 260px;
  margin: 4px auto 14px;
  padding: 14px 16px;
  border-radius: 6px;
  background: #f6ecd2;
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  position: sticky;
  top: 8px;
  z-index: 5;
}
.cookbook-recipe-mini-photo {
  width: 100%; border-radius: 8px; margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(179,135,42,0.35), rgba(179,135,42,0.15));
}
.cookbook-recipe-mini-photo--moyenne { height: 54px; }
.cookbook-recipe-mini-photo--grande { height: 84px; }
.cookbook-recipe-mini-badges { display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 6px; }
.cookbook-recipe-mini-chip { width: 34px; height: 10px; border-radius: 999px; background: #7c3232; }
.cookbook-recipe-mini-nutri { width: 14px; height: 14px; border-radius: 50%; background: #6b7a3a; }
.cookbook-recipe-mini-title {
  font-family: 'Cinzel Decorative', 'Cinzel', serif; text-align: center;
  font-size: 0.75rem; color: #2a2013; margin: 0 0 4px;
}
.cookbook-recipe-mini-meta { text-align: center; font-size: 0.6rem; color: #5c4a30; margin: 0 0 8px; }
.cookbook-recipe-mini-columns { display: flex; gap: 10px; }
.cookbook-recipe-mini-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.cookbook-recipe-mini-heading { width: 60%; height: 6px; border-radius: 3px; background: #b3872a; margin-bottom: 2px; }
.cookbook-recipe-mini-line { display: block; height: 5px; border-radius: 3px; background: rgba(42,32,19,0.18); }
.cookbook-recipe-mini-line--short { width: 55%; margin-top: 4px; }

/* --- Document (aperçu écran + impression), voir CookbookDocument.jsx --- */
.cookbook-print-sheet { display: none; }

.cookbook-print-sheet.cookbook-print-sheet--preview {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 1200;
  overflow-y: auto;
  background: #2a2013;
  padding: 76px 16px 56px;
  -webkit-overflow-scrolling: touch;
}

/* Mise en page RÉELLE mais hors champ visuel — utilisée le temps de générer
   le vrai PDF (utils/cookbookPdf.js, html2canvas) : html2canvas ne peut
   rasteriser que des éléments effectivement mis en page par le navigateur
   (jamais display:none), mais l'utilisateur n'a cliqué que "Télécharger",
   pas "Aperçu" — le document ne doit donc jamais apparaître à l'écran
   pendant sa génération. */
.cookbook-print-sheet.cookbook-print-sheet--rendering {
  display: block;
  position: fixed;
  left: -9999px;
  top: 0;
  width: 800px;
}

.cookbook-preview-close {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  right: 16px;
  z-index: 1201;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(246,236,210,0.92);
  color: #2a2013;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,0.35);
}

/* --- Pages : styles communs à l'aperçu écran ET à l'impression ---
   Couleurs volontairement fixes (pas de var(--x)) : le livre imprimé/prévisualisé
   doit toujours ressembler à un vrai parchemin, même si l'app est en thème sombre. */
.cookbook-page {
  max-width: 680px;
  margin: 0 auto 28px;
  padding: 44px 46px;
  font-family: 'EB Garamond', Georgia, serif;
  color: #2a2013;
  background: #f6ecd2;
  border-radius: 6px;
  position: relative;
  box-shadow: 0 10px 26px rgba(0,0,0,0.35);
  /* Base la mise en page (colonnes ingrédients/étapes, voir
     .cookbook-recipe-columns plus bas) sur la largeur RÉELLE de cette page
     plutôt que sur celle de la fenêtre — une media query classique se serait
     basée sur la largeur du viewport, qui n'a aucun rapport avec la largeur
     effective d'une page A4/A5 rendue hors champ pour le PDF (toujours
     ~680px ici, quelle que soit la taille réelle de l'écran du visiteur). */
  container-type: inline-size;
}
.cookbook-running-header {
  margin: 0 0 18px;
  font-family: 'Cinzel', serif;
  letter-spacing: 2px;
  font-size: 0.62rem;
  text-transform: uppercase;
  color: #b3872a;
  text-align: center;
  border-bottom: 1px dashed rgba(179,135,42,0.35);
  padding-bottom: 10px;
}
.cookbook-page-number {
  position: absolute;
  bottom: 16px;
  right: 0;
  left: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  letter-spacing: 1px;
  color: #b3872a;
}

/* --- Couverture ---
   Pas de min-height fixe ici : l'aspect-ratio posé sur .cookbook-page (voir
   CookbookDocument.jsx, calculé depuis le format/les marges choisis dans
   l'éditeur) fait déjà tenir cette page sur toute la hauteur utile réelle
   — une valeur fixe en plus aurait pu entrer en conflit selon le format
   (A4 vs A5) au lieu de toujours coller à la bonne forme. */
.cookbook-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 3px solid var(--cookbook-cover-color, #b3872a);
}
.cookbook-cover-flourish { font-size: 1.6rem; color: var(--cookbook-cover-color, #b3872a); margin: 10px 0; }
.cookbook-cover-title {
  font-family: 'Cinzel Decorative', 'Cinzel', serif;
  font-size: 2.1rem;
  margin: 6px 0;
  color: var(--cookbook-cover-color, #b3872a);
}
.cookbook-cover-subtitle {
  font-family: 'Cinzel', serif;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: #5c4a30;
  margin: 0;
}
.cookbook-cover--epure { border: none; box-shadow: none; background: transparent; }
.cookbook-cover--epure .cookbook-cover-title { font-size: 1.7rem; }

/* --- Table des matières --- */
.cookbook-page-title {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  letter-spacing: 1px;
  color: #5c4a30;
  text-align: center;
  margin: 0 0 22px;
}
.cookbook-toc-chapter { margin-bottom: 18px; }
.cookbook-toc-chapter-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.cookbook-toc-chapter-title {
  font-family: 'Cinzel', serif;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: #5c4a30;
  white-space: nowrap;
}
.cookbook-toc-list { list-style: none; margin: 0; padding: 0 0 0 18px; }
.cookbook-toc-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.95rem;
}
.cookbook-toc-name { white-space: nowrap; }
.cookbook-toc-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(42,32,19,0.35);
  margin-bottom: 4px;
}
.cookbook-toc-page {
  flex-shrink: 0;
  min-width: 18px;
  text-align: right;
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
  color: #5c4a30;
}

/* --- Badges de catégorie / nutri-score (mêmes teintes que le reste de l'app) --- */
.cookbook-chip {
  font-family: 'Cinzel', serif;
  letter-spacing: 1px;
  font-size: 0.68rem;
  text-transform: uppercase;
  color: #f6ecd2;
  padding: 6px 16px;
  border-radius: 999px;
}
.cookbook-chip.chip-sale { background: #7c3232; }
.cookbook-chip.chip-sucre { background: #5a3a63; }
.cookbook-nutri-circle {
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-family: 'Cinzel', serif; font-weight: 700; font-size: 0.8rem;
}

/* --- Page recette --- */
/* Image de fond CSS (background-size:cover), pas un <img object-fit:cover> :
   html2canvas (voir utils/cookbookPdf.js) ignore object-fit et étire l'image
   entière dans sa boîte plutôt que de la recadrer — visiblement aplatie dans
   le PDF téléchargé. background-size:cover recadre correctement dans les
   deux rendus (aperçu à l'écran ET rasterisation). */
.cookbook-recipe-photo-wrap {
  margin: 0 0 20px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 20px rgba(42,32,19,0.28);
  background-size: cover; background-position: center; background-repeat: no-repeat;
}
.cookbook-recipe-photo-wrap--moyenne { height: 180px; }
.cookbook-recipe-photo-wrap--grande { height: 300px; }
.cookbook-recipe-badges { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 14px; }
.cookbook-recipe-title { font-family: 'Cinzel Decorative', 'Cinzel', serif; text-align: center; font-size: 1.6rem; margin: 0 0 10px; }
.cookbook-recipe-meta { display: flex; justify-content: center; gap: 22px; font-size: 0.9rem; color: #5c4a30; margin-bottom: 18px; }
.cookbook-recipe-flourish { text-align: center; color: #b3872a; font-size: 1.2rem; margin: 12px 0; }
.cookbook-recipe-columns { display: grid; grid-template-columns: 1fr 1.3fr; gap: 28px; align-items: start; }
/* En dessous de cette largeur (aperçu sur un petit écran, jamais le cas du
   PDF/impression réel — voir container-type sur .cookbook-page ci-dessus,
   toujours rendu à ~680px pour ces deux usages) : ingrédients et étapes
   repassent en une seule colonne plutôt que de s'écraser illisiblement. */
@container (max-width: 460px) {
  .cookbook-recipe-columns { grid-template-columns: 1fr; }
}
.cookbook-section-title { font-family: 'Cinzel', serif; font-size: 0.95rem; letter-spacing: 1px; color: #5c4a30; border-bottom: 1px dashed rgba(179,135,42,0.35); padding-bottom: 6px; }
.cookbook-sub { font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.5px; color: #b3872a; margin: 12px 0 4px; }
.cookbook-notes { font-style: italic; color: #5c4a30; }
.cookbook-page ul { list-style: none; padding-left: 2px; margin: 0; }
.cookbook-page ul li { position: relative; padding-left: 20px; }
.cookbook-page ul li::before { content: "•"; position: absolute; left: 0; color: #b3872a; }
.cookbook-page ol { list-style: none; padding-left: 2px; margin: 0; counter-reset: cookbookstep; }
.cookbook-page ol li { position: relative; padding-left: 30px; counter-increment: cookbookstep; }
.cookbook-page ol li::before { content: counter(cookbookstep) "."; position: absolute; left: 0; color: #b3872a; font-family: 'Cinzel', serif; font-weight: 600; }
.cookbook-page li { margin-bottom: 9px; font-size: 0.98rem; }

@media (max-width: 600px) {
  .cookbook-page { padding: 30px 26px; }
}

@media print {
  body * { visibility: hidden; }
  .cookbook-print-sheet, .cookbook-print-sheet * { visibility: visible; }
  .cookbook-print-sheet {
    display: block !important;
    position: absolute; top: 0; left: 0; width: 100%;
    margin: 0; padding: 0; background: none; inset: auto;
  }
  .cookbook-preview-close { display: none !important; }
  .cookbook-page {
    box-shadow: none; border-radius: 0; margin: 0 auto;
    page-break-after: always; break-after: page;
  }
  .cookbook-page--last { page-break-after: auto; break-after: auto; }

  /* Pagination intelligente pour l'impression navigateur (bouton
     "Imprimer") : jamais de <li>/titre de section coupé net entre deux
     pages physiques — le moteur d'impression du navigateur repousse
     l'élément entier sur la page suivante à sa place. Sans effet ici sur
     "Télécharger" (jsPDF/html2canvas, voir utils/cookbookPdf.js), qui ne
     passe jamais par le moteur de pagination CSS du navigateur : ce
     chemin-là applique la même règle lui-même, en JS, sur les hauteurs
     réellement mesurées avant de rasteriser. */
  .cookbook-page li,
  .cookbook-page-title,
  .cookbook-section-title,
  .cookbook-sub,
  .cookbook-recipe-badges {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;
