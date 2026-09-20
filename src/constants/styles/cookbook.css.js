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
.cookbook-toc-list { list-style: none; margin: 0; padding: 0; }
.cookbook-toc-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 1rem;
}
.cookbook-toc-name { white-space: nowrap; }
.cookbook-toc-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(42,32,19,0.35);
  margin-bottom: 4px;
}
.cookbook-toc-chip { flex-shrink: 0; }

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
.cookbook-recipe-photo-wrap { margin: 0 0 20px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 20px rgba(42,32,19,0.28); }
.cookbook-recipe-photo { display: block; width: 100%; object-fit: cover; }
.cookbook-recipe-photo-wrap--moyenne .cookbook-recipe-photo { height: 180px; }
.cookbook-recipe-photo-wrap--grande .cookbook-recipe-photo { height: 300px; }
.cookbook-recipe-badges { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 14px; }
.cookbook-recipe-title { font-family: 'Cinzel Decorative', 'Cinzel', serif; text-align: center; font-size: 1.6rem; margin: 0 0 10px; }
.cookbook-recipe-meta { display: flex; justify-content: center; gap: 22px; font-size: 0.9rem; color: #5c4a30; margin-bottom: 18px; }
.cookbook-recipe-flourish { text-align: center; color: #b3872a; font-size: 1.2rem; margin: 12px 0; }
.cookbook-recipe-columns { display: grid; grid-template-columns: 1fr 1.3fr; gap: 28px; align-items: start; }
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
  .cookbook-recipe-columns { grid-template-columns: 1fr; }
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
}
`;
