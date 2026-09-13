/* ------------------------------------------------------------------ */
/*  NAV BASSE + MODALES (structure commune) + menu d'actions recette */
/*  Extrait de styles.css.js (lignes 793-900 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const MODALS_BASE_CSS = `
/* --- Navigation basse : dock flottant façon iOS --------------------------
   Ne colle plus aux bords (avant : pleine largeur, voir l'historique git de
   ce fichier) — centrée avec une marge de chaque côté ET par rapport au bas
   de l'écran, coins entièrement arrondis, verre dépoli plus prononcé et une
   ombre portée pour bien la détacher du contenu qui défile derrière, plutôt
   qu'un bandeau soudé au bord de l'écran. "position: fixed" (jamais
   "absolute" — testé, cassé : voir git log de ce fichier). Rendue
   directement dans le flux du DOM (AppShell.jsx), comme enfant de
   .grimoire-app : nécessaire pour que la mise en page paysage ci-dessous
   (grid-area: nav) s'applique — un portail vers <body> la sort de la grille
   et la fait disparaître entièrement sur PC/tablette. */
.bottom-nav {
  position: fixed; left: 50%; transform: translateX(-50%);
  /* "max(20px, …)" et non juste env(safe-area-inset-bottom) seul (qui vaut
     0 sur la plupart des appareils, sans encoche ni barre de geste) : sans
     ce plancher, le dock collerait quand même au bord sur un appareil sans
     zone de sécurité, perdant tout l'effet "flottant" recherché. */
  bottom: max(20px, calc(env(safe-area-inset-bottom) + 10px));
  width: calc(100% - 48px); max-width: 400px;
  display: flex; justify-content: space-around; gap: 2px;
  padding: 8px;
  border-radius: 999px;
  /* Flou plus marqué qu'avant (20px, contre 8px sur l'ancien bandeau plein
     largeur) : un dock qui flotte a besoin d'un contour visible sur ses
     QUATRE côtés pour se détacher du contenu, pas seulement en haut comme
     l'ancien "border-top" doré suffisait à le suggérer. Le taux d'opacité
     posé PAR-DESSUS ce flou reste réglable par l'utilisateur (Réglages >
     Apparence, 0 = verre dépoli seul, 1 = fond plein) — comportement de
     --nav-bg-rgb/--nav-opacity inchangé, voir theme.css.js. */
  background: rgba(var(--nav-bg-rgb), var(--nav-opacity, 0));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--nav-bg-rgb), 0.5);
  box-shadow: 0 10px 30px rgba(20,14,4,0.22), 0 2px 8px rgba(20,14,4,0.12);
  z-index: 40;
}
.nav-btn {
  /* Bloc conteneur positionné pour .nav-pill ci-dessous (la pastille active
     de Framer Motion, voir NavButton.jsx) — "z-index: 0" (pas juste
     "position: relative" seul) : ÉTABLIT une nouvelle zone d'empilement
     propre à ce bouton, pour que le "z-index: -1" de .nav-pill reste
     confiné à L'INTÉRIEUR de ce bouton (donc bien au-dessus du fond en
     verre de .bottom-nav) plutôt que de s'échapper vers le niveau
     d'empilement du dock entier, où il se retrouverait cette fois DERRIÈRE
     son fond flouté — invisible. */
  position: relative; z-index: 0;
  flex: 1;
  background: none; border: none; color: var(--ink-soft);
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  cursor: pointer; padding: 8px 10px;
  border-radius: 999px;
}
/* Le fond de l'onglet actif est désormais porté par .nav-pill (Framer
   Motion) juste en dessous — seule la couleur du texte change encore ici.
   "--gold-light" (pas "--gold") : contraste sur le fond sombre --chrome de
   la pastille, même choix déjà fait pour le bouton "+" flottant
   (recipeCards.css.js) et pour cette même nav en colonne latérale paysage
   (voir responsive.css.js, qui n'a plus besoin de redéfinir "background"
   pour son propre onglet actif — seule .nav-pill le fait désormais, dans
   les deux mises en page). */
.nav-btn.active { color: var(--gold-light); }
/* --- Pastille active — Framer Motion (layoutId="nav-pill") ---------------
   Un seul <motion.span> existe à la fois dans le DOM (voir NavButton.jsx,
   rendu seulement par le bouton actif) : Framer repère qu'un autre élément
   portait déjà ce layoutId juste avant le changement d'onglet et anime le
   passage de l'un à l'autre (position ET taille) avec une physique de
   ressort, sans le moindre calcul de position manuel côté React (contraste
   avec .filter-indicator un peu plus bas dans ce fichier, qui lui reste
   mesuré à la main — voir son commentaire, AppShell.jsx, pour la raison).
   "inset: 0" + "border-radius: inherit" : épouse exactement la forme et la
   taille du bouton qui la porte, qu'il soit rond (dock flottant en
   portrait) ou en rectangle arrondi (colonne latérale en paysage, voir
   responsive.css.js) — jamais besoin de dupliquer cette règle pour les deux
   mises en page. "z-index: -1" : reste sous l'icône/le texte du bouton
   (contenu normal, non positionné — voir le commentaire de .nav-btn
   ci-dessus pour pourquoi ça reste bien confiné À CE bouton). */
.nav-pill {
  position: absolute; inset: 0; z-index: -1;
  border-radius: inherit;
  background: var(--chrome);
}
/* Dock un peu plus haut, mais SEULEMENT dans l'app installée (PWA) — pas
   dans un onglet de navigateur normal, ni sur PC/Android en mode web.
   html[data-standalone="true"] (posé par main.jsx), pas
   "@media (display-mode: standalone)" : ce média CSS existe bel et bien,
   mais s'est avéré peu fiable sous iOS Safari selon la manière dont l'app a
   été ajoutée à l'écran d'accueil — confirmé sur appareil réel ("aucune
   différence" alors que ce bloc ciblait très exactement ce mode).
   ":where(html[data-standalone])" plutôt que "html[data-standalone] " tout
   court : :where() ramène la spécificité à zéro, donc cette règle pèse
   exactement comme ".bottom-nav" seul — sans ça, la règle paysage plus bas
   (responsive.css.js, qui repasse .bottom-nav en colonne latérale statique
   avec "position: static") perdrait la bataille de spécificité et
   resterait bloquée sur ce "bottom", même sur une tablette en PWA
   installée. Voir .fab (recipeCards.css.js) et .grimoire-app
   (theme.css.js), ajustés à l'identique pour garder le même espace de
   respiration au-dessus du FAB et au-dessus du contenu, mais eux aussi
   seulement en standalone. */
:where(html[data-standalone="true"]) .bottom-nav { bottom: max(28px, calc(env(safe-area-inset-bottom) + 16px)); }

/* Android seulement (voir main.jsx, data-platform posé via navigator.
   userAgent) : demandé tel quel — le dock est "parfait" sur iPhone (aucun
   changement là-bas), mais un peu trop haut sur Android, où
   env(safe-area-inset-bottom) vaut généralement 0 (pas de zone de sécurité
   équivalente à l'encoche/barre d'accueil iOS) — les valeurs plancher
   (20px/28px standalone) prennent donc systématiquement le dessus, plus
   loin du bord qu'on ne le voudrait sur cette plateforme précise. Placée
   APRÈS la règle standalone ci-dessus (même spécificité nulle via :where())
   pour l'emporter aussi sur un Android installé en PWA — même position
   basse recherchée, avec ou sans écran d'accueil. */
:where(html[data-platform="android"]) .bottom-nav { bottom: max(10px, calc(env(safe-area-inset-bottom) + 6px)); }

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
  /* Le fondu d'entrée/sortie est désormais porté par Framer Motion
     (MODAL_BACKDROP_MOTION, src/constants/motion.js — chaque modale rend
     cet élément en <motion.div>) : plus de transition CSS ni de classe
     ".closing" à poser/retirer ici (ancien hooks/useAnimatedClose.js,
     retiré). */
}
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
  /* "Cadre doré" — même esprit que .seal/.gilt-frame (voir plus bas) :
     un fin liseré lumineux tout autour de la feuille, en plus du bandeau
     doré du haut déjà présent, pour qu'elle se détache un peu plus du fond
     assombri plutôt que de fondre dedans sur ses trois autres bords. Un pur
     box-shadow, jamais un border (ne change donc rien à la boîte ni au
     padding intérieur). */
  box-shadow: 0 0 0 1px rgba(179,135,42,0.18), 0 -12px 32px rgba(20,14,4,0.28);
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

/* Morphing "carte -> fiche recette" : ex-View Transition API du navigateur,
   remplacée par un layoutId Framer Motion (voir RecipeCard.jsx/
   RecipeDetail.jsx) — la transition elle-même (spring) est configurée
   directement en JS sur ces éléments, plus aucune règle CSS dédiée ici. */

`;
