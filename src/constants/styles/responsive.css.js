/* ------------------------------------------------------------------ */
/*  IMPRESSION + MODE PAYSAGE (media queries) */
/*  Extrait de styles.css.js (lignes 1405-1544 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const RESPONSIVE_CSS = `
/* --- Fiche imprimable (PDF / Parchemin) ---
   Couleurs volontairement fixes (pas de var(--x)) : la fiche imprimée doit
   toujours ressembler à un parchemin clair sur papier, même si l'app est
   actuellement en thème sombre. */
.print-sheet { display: none; }
@media print {
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet { display: block; position: absolute; top: 0; left: 0; width: 100%; margin: 0; }
  .print-page {
    max-width: 680px; margin: 0 auto; padding: 36px 40px;
    font-family: 'EB Garamond', Georgia, serif; color: #2a2013; background: #f6ecd2;
  }
  .print-photo-wrap { margin: 0 0 20px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 20px rgba(42,32,19,0.28); }
  .print-photo { display: block; width: 100%; height: 260px; object-fit: cover; }
  .print-badges { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 14px; }
  .print-chip { font-family: 'Cinzel', serif; letter-spacing: 1px; font-size: 0.68rem; text-transform: uppercase; color: #f6ecd2; padding: 6px 16px; border-radius: 999px; }
  .print-chip.chip-sale { background: #7c3232; }
  .print-chip.chip-sucre { background: #5a3a63; }
  .print-nutri-circle {
    width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    color: #fff; font-family: 'Cinzel', serif; font-weight: 700; font-size: 0.8rem;
  }
  .print-page h1 { font-family: 'Cinzel Decorative', 'Cinzel', serif; text-align: center; font-size: 1.8rem; margin: 0 0 10px; }
  .print-type { text-align: center; font-family: 'Cinzel', serif; letter-spacing: 2px; font-size: 0.7rem; text-transform: uppercase; color: #b3872a; margin-bottom: 18px; }
  .print-meta { display: flex; justify-content: center; gap: 22px; font-size: 0.9rem; color: #5c4a30; margin-bottom: 20px; }
  .print-flourish { text-align: center; color: #b3872a; font-size: 1.3rem; margin: 14px 0; }
  .print-page h2 { font-family: 'Cinzel', serif; font-size: 1rem; letter-spacing: 1px; color: #5c4a30; border-bottom: 1px dashed rgba(179,135,42,0.35); padding-bottom: 6px; }
  .print-sub { font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: #b3872a; margin: 14px 0 4px; }
  .print-notes { font-style: italic; color: #5c4a30; }
  .print-columns { display: grid; grid-template-columns: 1fr 1.3fr; gap: 32px; align-items: start; }
  .print-page ul { list-style: none; padding-left: 2px; }
  .print-page ul li { position: relative; padding-left: 20px; }
  .print-page ul li::before { content: "•"; position: absolute; left: 0; color: #b3872a; }
  .print-page ol { list-style: none; padding-left: 2px; counter-reset: step; }
  .print-page ol li { position: relative; padding-left: 32px; counter-increment: step; }
  .print-page ol li::before { content: counter(step) "."; position: absolute; left: 0; color: #b3872a; font-family: 'Cinzel', serif; font-weight: 600; }
  .print-page li { margin-bottom: 10px; font-size: 1.02rem; }
  .print-footer {
    margin-top: 28px; padding-top: 14px; border-top: 1px dashed rgba(179,135,42,0.4);
    text-align: center; font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 1px; color: #b3872a;
  }
  @page { margin: 16mm; }
}

/* ==================================================================== */
/*  MODE PAYSAGE (mobiles/tablettes en rotation, écrans larges)         */
/*  Sidebar fixe à gauche (titre, recherche, filtres, navigation) +     */
/*  zone principale scrollable à droite (grille de recettes en 3-4      */
/*  colonnes). La fiche recette bascule en deux colonnes pour éviter    */
/*  les longs défilements verticaux.                                    */
/* ==================================================================== */
@media (orientation: landscape) and (min-width: 768px) {
  .grimoire-app, .loading-screen { max-width: 1400px; }

  .grimoire-app {
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: auto auto auto 1fr;
    grid-template-areas:
      "header  content"
      "search  content"
      "filters content"
      "nav     content";
    align-content: start;
    min-height: 100vh;
  }

  .app-header { grid-area: header; text-align: left; padding: 24px 20px 12px; }
  .app-header h1 { font-size: 1.3rem; }
  .offline-queue-badge { margin-left: 0; }

  .search-bar { grid-area: search; margin: 0 20px 12px; }

  .filter-bar {
    grid-area: filters;
    flex-direction: column; align-items: stretch;
    padding: 0 20px 16px; overflow-x: visible;
  }
  .filter-pill { text-align: center; }

  /* Navigation basse -> menu latéral vertical, sous les filtres */
  .bottom-nav {
    grid-area: nav;
    position: static; left: auto; transform: none; max-width: none; width: auto;
    flex-direction: column; align-items: stretch; gap: 4px;
    background: transparent; border-top: none;
    margin: auto 20px 20px; padding: 0;
  }
  .nav-btn {
    flex-direction: row; justify-content: flex-start; gap: 10px;
    width: 100%; padding: 10px 14px; border-radius: 10px;
    color: var(--ink-soft); font-size: 0.78rem;
  }
  .nav-btn.active { background: var(--chrome); color: var(--gold-light); }
  /* La pastille glissante (modalsBase.css.js) n'a de sens que sur une nav
     horizontale : ses mesures (gauche/largeur) deviendraient incohérentes
     une fois .bottom-nav repassée en colonne verticale ci-dessus — l'onglet
     actif garde ici son propre traitement (fond plein, juste au-dessus). */
  .nav-indicator { display: none; }

  .app-content {
    grid-area: content;
    max-height: 100vh; overflow-y: auto;
    padding: 24px 28px 40px;
    border-left: 1px solid var(--line);
  }

  .recipes-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }

  /* La nav basse devient une colonne statique dans la sidebar (voir
     .bottom-nav ci-dessus) : plus de chevauchement possible en bas
     d'écran, le FAB peut donc se rapprocher du coin. */
  .fab { bottom: 24px; }

  /* --- Fiche recette : deux colonnes, sans long défilement vertical ---
     "min(84vh, calc(var(--app-vvh) - ...))", pas "84vh" seul : ce bloc
     paysage (tablette/iPhone tourné) est concaténé APRÈS modalsBase.css.js
     dans styles.css.js et cible le même élément que ".modal, .grimoire-page"
     (voir RecipeDetail.jsx, className="modal grimoire-page detail-scroll..."),
     donc gagne à l'ordre de la cascade — sans --app-vvh ici, ce bloc
     réintroduisait tel quel le bug de hauteur figée déjà corrigé une fois
     dans modalsBase.css.js (dvh/vh ne suivent jamais le clavier virtuel). */
  .detail-scroll { max-width: 900px; max-height: min(84vh, var(--app-vvh, 84vh)); }
  .detail-columns {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 28px;
    align-items: start;
  }
  .detail-info-col .detail-hero { border-radius: 12px; overflow: hidden; }
  .detail-body-col {
    max-height: min(calc(84vh - 90px), calc(var(--app-vvh, 84vh) - 90px));
    overflow-y: auto;
    padding-right: 6px;
  }
  .detail-scroll-hint { display: none; } /* propre au geste de swipe vertical, inutile ici */

  /* .bottom-nav n'est plus position:fixed ici (voir plus haut : devenue
     une colonne statique dans la sidebar de gauche) — la marge de secours
     ajoutée à .shopping-result pour la nav fixe du mobile (voir plus haut,
     ~90px) n'a alors plus lieu d'être : elle ne faisait que creuser un
     grand vide en bas de la liste de courses, donnant l'impression que le
     contenu "manquait"/chevauchait la mise en page à côté. */
  .shopping-result { padding-bottom: 0; }
}

/* Grille de recettes encore plus large sur tablette/desktop en paysage */
@media (orientation: landscape) and (min-width: 1024px) {
  .recipes-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
}

`;
