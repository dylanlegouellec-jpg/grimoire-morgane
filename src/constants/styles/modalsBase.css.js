/* ------------------------------------------------------------------ */
/*  NAV BASSE + MODALES (structure commune) + menu d'actions recette */
/*  Extrait de styles.css.js (lignes 793-900 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const MODALS_BASE_CSS = `
/* --- Navigation basse --- */
.bottom-nav {
  /* "position: fixed" (pas "absolute" — testé, cassé : voir git log de ce
     fichier). Rendue directement dans le flux du DOM (AppShell.jsx), comme
     enfant de .grimoire-app : nécessaire pour que la mise en page paysage
     ci-dessous (grid-area: nav) s'applique — un portail vers <body> la sort
     de la grille et la fait disparaître entièrement sur PC/tablette. */
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  display: flex; justify-content: space-around;
  /* Verre dépoli : le contenu qui défile en dessous reste visible (flouté)
     à travers la barre plutôt que masqué par un bandeau opaque. Le taux
     d'opacité du fond posé PAR-DESSUS ce flou est réglable par
     l'utilisateur (Réglages > Apparence) — 0 = verre dépoli seul,
     1 = bandeau plein. Voir --nav-bg-rgb/--nav-opacity dans theme.css.js.
     Les couleurs d'icônes/texte ci-dessous (--ink-soft/--gold) sont pensées
     pour ce fond clair, à toutes les opacités. */
  background: rgba(var(--nav-bg-rgb), var(--nav-opacity, 0));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 2px solid var(--gold);
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
}
.nav-btn {
  background: none; border: none; color: var(--ink-soft);
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  cursor: pointer; padding: 4px 10px;
}
.nav-btn.active { color: var(--gold); }
/* Barre un peu plus haute, mais SEULEMENT dans l'app installée (PWA) — pas
   dans un onglet de navigateur normal, ni sur PC/Android en mode web.
   html[data-standalone="true"] (posé par main.jsx), pas
   "@media (display-mode: standalone)" : ce média CSS existe bel et bien,
   mais s'est avéré peu fiable sous iOS Safari selon la manière dont l'app a
   été ajoutée à l'écran d'accueil — confirmé sur appareil réel ("aucune
   différence" alors que ce bloc ciblait très exactement ce mode).
   ":where(html[data-standalone])" plutôt que "html[data-standalone] " tout
   court : :where() ramène la spécificité à zéro, donc ces deux règles
   pèsent exactement comme ".bottom-nav"/".nav-btn" seuls — sans ça, la
   règle paysage plus bas (responsive.css.js, qui repasse .bottom-nav en
   colonne latérale statique avec padding:0) perdrait la bataille de
   spécificité et resterait bloquée sur ce padding, même sur une tablette en
   PWA installée. Voir .fab (recipeCards.css.js) et .grimoire-app
   (theme.css.js), ajustés à l'identique pour garder le même espace de
   respiration au-dessus du FAB et au-dessus du contenu, mais eux aussi
   seulement en standalone. */
:where(html[data-standalone="true"]) .bottom-nav { padding: 16px 0 max(16px, env(safe-area-inset-bottom)); }
:where(html[data-standalone="true"]) .nav-btn { padding: 6px 10px; }

/* --- Modales / page de grimoire --- */
.modal-backdrop {
  position: fixed; left: 0; right: 0;
  top: var(--app-vv-offset, 0px); height: var(--app-vvh, 100dvh);
  background: rgba(20,14,4,0.55);
  display: flex; align-items: flex-end; justify-content: center;
  /* Volontairement au-dessus du FAB "+" (voir .fab, z-index: 50) : les
     deux étaient à égalité avant ce correctif, un pur hasard d'ordre DOM
     décidait alors lequel des deux gagnait le dessus — le bouton flottant
     repassait parfois visuellement PAR-DESSUS une modale ouverte. */
  z-index: 55;
  padding: 0;
  touch-action: none; overscroll-behavior: contain;
  /* Fondu de fermeture — voir hooks/useAnimatedClose.js : ".closing" n'est
     posée que le temps de l'animation de sortie (ne change rien tant
     qu'elle n'est pas ajoutée, "opacity" vaut déjà 1 par défaut). */
  transition: opacity 0.22s ease;
}
.modal-backdrop.closing { opacity: 0; }
/* "top"/"height" pilotés par --app-vv-offset/--app-vvh (posés par
   main.jsx depuis window.visualViewport), pas "inset: 0; height: 100dvh" :
   "dvh" ne suit que le rétractement de la barre d'adresse, jamais le
   clavier virtuel. Sur iOS, une modale "position: fixed" ouverte pendant
   que le <body> est LUI AUSSI figé (voir useBodyScrollLock.js) et
   contenant un champ qui reçoit le clavier (ex. la recherche de
   AddMealModal.jsx, autoFocus) se faisait décaler entièrement vers le haut
   par la tentative de Safari de "faire défiler jusqu'au champ" — un body
   figé ne pouvant pas vraiment scroller, c'est toute la couche fixed qui
   partait, faisant sortir le haut de la modale (barre de recherche
   comprise) au-dessus de l'écran. Se recaler sur visualViewport (hauteur ET
   décalage réels de la zone visible, mis à jour en direct) couvre aussi
   l'ancien cas (barre d'adresse en cours de rétractation) : fallback
   100dvh/0px si l'API n'existe pas. Contenu ICI à ce seul overlay (jamais
   html/body) : pas de lien avec le blocage de scroll déjà corrigé ailleurs
   (voir shell.css.js), qui venait d'un tout autre problème
   (overscroll-behavior sur .app-content). */
.modal, .grimoire-page {
  background: var(--parchment);
  /* "dvh", pas "vh" : "vh" se fige à sa valeur de calcul initiale et ne se
     remet jamais à jour — en PWA standalone iOS, mesuré en direct,
     window.innerHeight vaut 874 au tout premier rendu puis se stabilise
     sur 812 quelques secondes après ; un max-height en "vh" pris à ce
     premier instant restait donc bloqué sur 874 (moins de contenu réel
     ne remplissant jamais cette hauteur = grand vide en bas d'une courte
     modale ; à l'inverse, un contenu long dont on attend qu'il s'arrête à
     812 débordait de 62px de trop avant coupure). "dvh" se recalcule en
     continu et suit donc la valeur stable. "min(…, var(--app-vvh))" en plus
     de "dvh" (voir .modal-backdrop juste au-dessus pour --app-vvh) : sans
     ce second plafond, une modale dont le contenu remplit vraiment ses
     88dvh déborderait quand le clavier réduit la zone visible réelle en
     dessous de cette hauteur — le clavier ne réduit jamais "dvh" (qui ne
     suit que la barre d'adresse), le débordement partirait alors PAR LE
     HAUT du fond (align-items: flex-end), au-dessus de l'écran. */
  width: 100%; max-width: 480px; max-height: min(88dvh, var(--app-vvh, 88dvh)); overflow-y: auto; overflow-x: hidden;
  border-radius: 18px 18px 0 0;
  /* padding-bottom inclut env(safe-area-inset-bottom) : sans lui, le
     dernier texte défilable (ex. la dernière étape d'une recette) finit
     pile au bord de l'écran, sans respirer au-dessus de la zone
     d'indicateur d'accueil iOS — signalé comme "coupé" même s'il était
     techniquement tout affiché. */
  padding: 22px 20px calc(30px + env(safe-area-inset-bottom));
  position: relative;
  border-top: 3px solid var(--gold);
  animation: slideUp 0.28s ease;
  overscroll-behavior: contain;
  touch-action: pan-y;
}
/* Poignée de tirage — réservée aux modales qui gèrent RÉELLEMENT le geste
   "tirer pour fermer" (RecipeDetail, RecipeForm, SecretSettingsModal —
   voir leur classe modal-swipeable dans leur JSX respectif). Auparavant
   posée sur TOUT .modal sans distinction (via un ::before universel) :
   purement décorative sur les ~20 autres modales de l'appli
   (RecipeOptionsModal, confirmations, Réglages/Foyer...), elle y
   suggérait à tort qu'on pouvait tirer vers le bas pour fermer alors que
   rien ne l'implémentait pour elles — signalé comme trompeur ("n'a pas
   vraiment d'intérêt") après un test réel sur iPhone. top:8px, sous les
   14px de .modal-close/.modal-back : aucun chevauchement. Purement
   visuel (aria-hidden implicite, un ::before n'est jamais focusable). */
.modal-swipeable::before {
  content: "";
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 4px; border-radius: 999px; background: var(--drag-handle);
  z-index: 4;
}
.form-clean { max-width: 100%; overflow-x: hidden; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
/* Symétrique de slideUp, pour la fermeture (voir hooks/useAnimatedClose.js) —
   auparavant inexistante : le clic sur "Fermer"/"Retour" démontait la
   modale au rendu React suivant, donc instantanément (pas de transition à
   interrompre), ce qui découvrait d'un coup sec la nav basse et la vue
   derrière — repéré en particulier quand deux fermetures s'enchaînent vite
   (ex. Accessibilité -> Réglages -> fermé), chacune étant un "pop" figé.
   ".closing" n'est posée qu'au moment de fermer (voir le hook), donc sans
   effet sur l'animation d'entrée ci-dessus. Durée alignée sur la
   transition d'opacité de .modal-backdrop.closing ci-dessus, pour que le
   fond et la feuille disparaissent ensemble. */
.modal.closing, .grimoire-page.closing { animation: slideDown 0.22s ease forwards; }
@keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(30px); opacity: 0; } }
.modal-close {
  position: absolute; top: 14px; right: 14px; z-index: 5;
  background: var(--modal-close-bg); border: none; border-radius: 50%;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  color: var(--ink-soft); cursor: pointer;
}
.dropcap-title { font-family: 'Cinzel', serif; font-size: 1.3rem; margin: 10px 0 4px; }
.flourish { text-align: center; color: var(--gold); font-size: 1.1rem; margin: 12px 0; }
.modal h4 { font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; margin: 16px 0 8px; color: var(--ink-soft); }

/* --- Menu d'actions sur une recette (appui long) ----------------------
   Ancien correctif erroné retiré : le padding bas de ~70-90px "pour ne
   pas passer sous .bottom-nav" partait du principe que .bottom-nav se
   dessine PAR-DESSUS cette modale — vérifié faux. .modal-backdrop (le
   fond de cette modale) a déjà z-index: 55, largement au-dessus de
   .bottom-nav (aucun z-index propre, donc 0 implicite) : le fond de la
   modale couvre déjà TOUT l'écran, .bottom-nav est entièrement invisible
   derrière, quelle que soit la hauteur du contenu. Ce padding ne faisait
   donc que creuser un grand vide sous "Supprimer la recette" pour rien
   (confirmé visuellement) — et sur certains appareils, semblait aussi
   perturber la zone tactile du bouton "Fermer" une fois la feuille
   étirée par ce vide. z-index: 60 sur l'élément ci-dessous est function-
   nellement redondant pour la même raison (le z-index de son parent
   .modal-backdrop suffit déjà) mais gardé : retirer un z-index déjà
   correct n'apporte rien, seul le padding était le problème. */
.modal.recipe-options-modal {
  z-index: 60;
  max-height: min(80dvh, var(--app-vvh, 80dvh));
  overflow-y: auto;
}

/* --- Assistant "Ajouter un repas" (Planification) — portait le même
   padding bas inutile que .recipe-options-modal ci-dessus (retiré, voir
   son commentaire pour l'explication complète : .modal-backdrop couvre
   déjà .bottom-nav entièrement, rien à réserver). "min(…, var(--app-vvh))" :
   même raison que .modal/.grimoire-page plus haut — cette feuille contient
   justement le champ (recherche/recette personnalisée) dont le clavier
   déclenchait le débordement par le haut. */
.modal.planning-step-modal {
  max-height: min(80dvh, var(--app-vvh, 80dvh));
  overflow-y: auto;
}

.recipe-options-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.recipe-option-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--surface);
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  cursor: pointer; text-align: left;
}
.recipe-option-row:disabled { opacity: 0.6; cursor: default; }
.recipe-option-row.danger { color: #B33A2E; border-color: rgba(179,58,46,0.35); }
.recipe-options-error { color: #B33A2E; margin-top: 10px; text-align: center; }

`;
