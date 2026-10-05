/* ------------------------------------------------------------------ */
/*  IMPRESSION + MODE PAYSAGE (media queries) */
/*  Extrait de styles.css.js (lignes 1405-1544 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const RESPONSIVE_CSS: string = `
/* ==================================================================== */
/*  MODE PAYSAGE (mobiles/tablettes en rotation, écrans larges)         */
/*  Sidebar fixe à gauche (titre, recherche, filtres, navigation) +     */
/*  zone principale scrollable à droite (grille de recettes en 3-4      */
/*  colonnes). La fiche recette bascule en deux colonnes pour éviter    */
/*  les longs défilements verticaux.                                    */
/* ==================================================================== */
@media (orientation: landscape) and (min-width: 768px) {
  .grimoire-app, .loading-screen { max-width: 1400px; }

  /* Une seule ligne de grille ("sidebar | content") plutôt que 4 lignes
     partagées avec .app-content (ancien grid-template-rows: auto auto auto
     1fr + grid-template-areas à 4 lignes, retiré) — voir .app-sidebar
     ci-dessous pour la raison : .app-content s'étendait sur ces 4 lignes,
     et sa propre hauteur (qui varie énormément selon le nombre de recettes
     affichées, ou l'absence de recherche/filtres sur Plan/Courses)
     influençait la taille calculée de la ligne "nav", faisant visiblement
     glisser la nav latérale de haut en bas à chaque changement de filtre ou
     d'onglet (signalé avec vidéo à l'appui). */
  .grimoire-app {
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-areas: "sidebar content";
    align-content: start;
    min-height: 100vh;
    /* Le padding-bottom: 130px hérité du mode portrait (theme.css.js,
       dégagement pour le dock flottant) n'a plus lieu d'être ici : la nav
       redevient un panneau intégré à la sidebar (voir .bottom-nav plus bas),
       jamais un dock superposé en bas d'écran. Sans ce reset, 130px de vide
       s'ajoutaient en bas de TOUTE la page, après la colonne de contenu. */
    padding-bottom: 0;
  }

  /* En-tête/recherche/filtres/nav : colonne flex INDÉPENDANTE de la hauteur
     de .app-content (voir JSX, AppShell.jsx), avec sa propre min-height:
     100vh — "margin-top: auto" sur .bottom-nav (plus bas) la pousse tout en
     bas de CETTE colonne, qui ne partage plus aucune ligne de grille avec le
     contenu scrollable à côté. En portrait, "display: contents" la rend
     neutre : ses enfants restent directement dans le flux normal de
     .grimoire-app, comme avant l'introduction de ce wrapper. */
  .app-sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* "border-bottom: none" : le filet du mode portrait (shell.css.js, séparateur
     sous le titre avant la barre de recherche) se retrouvait collé contre la
     barre de recherche juste en dessous — le padding du bas de l'en-tête
     (12px) et la marge du haut de .search-bar (0 en paysage) laissent bien
     moins d'air qu'en portrait. Inutile ici de toute façon : .app-content a
     déjà son propre "border-left" (plus bas) pour séparer visuellement la
     sidebar du contenu. */
  .app-header { text-align: left; padding: 24px 20px 12px; border-bottom: none; }
  .app-header h1 { font-size: 1.3rem; }
  .offline-queue-badge { margin-left: 0; }

  .search-bar { margin: 0 20px 12px; }

  .filter-bar {
    flex-direction: column; align-items: stretch;
    padding: 0 20px 16px; overflow-x: visible;
  }
  .filter-pill { text-align: center; }

  /* Navigation basse -> menu latéral vertical, sous les filtres. Redevient
     un panneau intégré à la sidebar plutôt qu'un dock flottant (voir
     modalsBase.css.js) : "position: static" retire tout le traitement
     "flottant" (fond verre/flou, bordure, ombre, coins en pilule) qui n'a
     de sens que posé PAR-DESSUS un contenu qui défile derrière — ici, la
     sidebar paysage est un panneau fixe de la mise en page elle-même, pas
     un élément superposé. */
  .bottom-nav {
    position: static; left: auto; transform: none; max-width: none; width: auto;
    flex-direction: column; align-items: stretch; gap: 4px;
    background: transparent; border: none; box-shadow: none;
    backdrop-filter: none; -webkit-backdrop-filter: none;
    border-radius: 0;
    margin: 0 20px 20px; margin-top: auto; padding: 0;
  }
  .nav-btn {
    flex-direction: row; justify-content: flex-start; gap: 10px;
    width: 100%; padding: 10px 14px; border-radius: 10px;
    color: var(--ink-soft); font-size: 0.78rem;
  }
  /* Pas de "background" ici (retiré) : .nav-pill (modalsBase.css.js,
     Framer Motion) le fournit déjà, avec "border-radius: inherit" qui
     épouse ici le rectangle de .nav-btn ci-dessus plutôt que la pilule du
     dock flottant en portrait — aucune règle à dupliquer pour ce mode. */
  .nav-btn.active { color: var(--gold-light); }

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
