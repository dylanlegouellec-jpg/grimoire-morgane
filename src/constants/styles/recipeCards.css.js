/* ------------------------------------------------------------------ */
/*  RECETTES — grille, carte recette, fiche détail, sceaux, bouton + */
/*  Extrait de styles.css.js (lignes 289-545 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const RECIPE_CARDS_CSS = `
/* --- Cartes --- */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  /* Ombre portée existante (profondeur extérieure) + un très léger creux
     intérieur chaud ("inset"), pour donner à la carte un grain de parchemin
     plutôt qu'une simple plaque plate — inspiré du même procédé sur les
     sceaux/boutons (.seal) déjà présents. Un box-shadow supplémentaire ne
     change ni la taille ni le padding de la carte : purement décoratif,
     aucun risque de régression de mise en page. */
  box-shadow: inset 0 0 26px rgba(124,90,66,0.06), 0 2px 0 rgba(42,32,19,0.06), 0 6px 14px rgba(42,32,19,0.07);
}

.recipes-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 110px;
  overscroll-behavior-y: contain;
  /* PAS de -webkit-overflow-scrolling: touch ici (retiré) — cette
     propriété n'a de sens que sur un élément qui défile LUI-MÊME
     (overflow-y: auto/scroll), ce que .recipes-grid n'est pas (c'est le
     document qui défile en portrait, voir theme.css.js). Héritée de
     Safari, qui l'ignore proprement sur un élément non-scrollable ; Chrome
     n'a jamais eu à en garantir un comportement aussi propre dans ce même
     cas, et c'est un candidat plausible pour le rebond au geste constaté
     uniquement sous Chromium (Chrome/Edge desktop, Android Chrome) —
     jamais sous Safari iOS. */
}
/* Fondu/zoom d'entrée : ex-.card-enter/.card-enter-alt (CSS), désormais un
   animate() Framer Motion impératif (useAnimate) posé directement sur cette
   carte — voir RecipeCard.jsx. Plus aucune classe CSS dédiée ici : Framer
   pilote directement opacity/transform sur le noeud DOM. */
.recipe-card {
  overflow: hidden; cursor: pointer;
  /* Historique : "pan-y" explicite avait été ajouté ici parce que laisser
     touch-action à sa valeur implicite ("auto") sur un élément portant
     plusieurs écouteurs tactiles se montrait moins fiable sur Android
     Chrome — le navigateur ne pouvait pas être sûr à l'avance qu'aucun de
     ces écouteurs n'appellerait preventDefault(). Ce doute n'a plus lieu
     d'être : ces écouteurs sont désormais attachés nativement en
     { passive: true } (voir hooks/useLongPress.js), une garantie plus
     forte que touch-action ne peut en offrir. Repassé à "auto" (valeur par
     défaut, retirée plutôt que reconduite) car "pan-y" semble au contraire
     être la cause d'un défilement au geste bloqué en mode portrait sur
     desktop (Chrome + pavé tactile) : en portrait, la grille n'a AUCUN
     conteneur de défilement propre à proximité (.grimoire-app déclare
     volontairement overflow-y: visible, voir theme.css.js) — le document
     entier, plusieurs niveaux plus haut, est le seul véritable conteneur
     scrollable. Un "pan-y" posé sur la carte, seule déclaration de
     touch-action de toute la chaîne d'ancêtres jusqu'à <html>, semble alors
     dérouter l'arbitrage geste-vs-scroll de Chrome desktop pour ce cas
     précis (le défilement programmatique et au clavier, eux, fonctionnent
     très bien — seule la RECONNAISSANCE DU GESTE échouait). En paysage, où
     .app-content est un vrai conteneur overflow-y: auto tout proche, le
     problème ne se posait pas, d'où le "ça marche en paysage mais pas en
     portrait" observé. */
  touch-action: auto;
  /* Le fondu d'enfoncement/rebond vient de .press-anim (voir plus bas),
     toujours appliqué avec cette classe — pas besoin d'une deuxième
     transition ici, elle serait de toute façon masquée par la sienne. */
  /* PAS de content-visibility: auto ici (retiré une seconde fois, cette
     fois définitivement) — troisième épisode de cette propriété cette
     session, cette fois avec une cause confirmée par mesure directe (pas
     une suspicion) : depuis que les cartes restent montées en permanence
     et rejouent leur animation d'entrée via un mécanisme qui ne les
     démonte/remonte jamais (voir RecipeCard.jsx, l'effet useLayoutEffect
     posé sur useAnimate), une carte qui repasse de display:none à visible
     porte encore content-visibility: auto au moment exact où la nouvelle
     animation démarre — Chromium peut alors ne jamais la faire progresser
     tant qu'il n'a pas confirmé la "pertinence" de l'élément pour
     l'utilisateur (vérifié : la classe change bien, l'animation démarre
     bien dans le moteur, mais elle restait figée à sa toute première
     image). Sans lien avec le bug de défilement tactile déjà corrigé
     ailleurs (touch-action dans index.html) : deux causes différentes,
     qui concernaient toutes les deux cette même propriété à des moments
     différents de la session. Le gain de rendu qu'elle apportait (sauter
     la mise en page/peinture des cartes hors écran) ne vaut pas une
     animation d'entrée cassée — le nombre de recettes d'un grimoire
     personnel reste de toute façon modeste.
     Ne pas la rétablir sans revoir aussi le mécanisme de relance de
     l'animation dans RecipeCard.jsx. */
}
/* Rétrécissement INSTANTANÉ au contact du doigt, via :active plutôt que
   via l'état JS "pressing" (voir .press-pressing plus bas, volontairement
   retardé de 100ms pour ne jamais interférer avec le défilement — voir
   RecipeCard.jsx/useLongPress.js). Un :active est posé par le moteur de
   rendu du navigateur lui-même au moment du toucher, PAS par un rendu React
   déclenché en plein milieu de l'arbitrage scroll-vs-appui : il ne peut
   donc pas reproduire le blocage de scroll déjà corrigé. Seule
   contrepartie connue (documentée ici volontairement) : sur un balayage de
   défilement qui démarre pile sur une carte, un très bref flash de
   rétrécissement peut apparaître avant que le navigateur ne confirme le
   scroll et ne retire :active — un compromis accepté pour avoir un retour
   tactile instantané, plutôt que le délai actuel avant tout effet visible. */
.recipe-card:active {
  transform: scale(0.95);
}
/* Le rebond ".press-fired" (voir .press-anim.press-fired plus bas, partagé
   avec NavButton/les rangées à appui long) reste visible un instant même
   une fois RecipeOptionsModal ouverte par-dessus — sur demande, désactivé
   spécifiquement pour les cartes de recette (sélecteur à 3 classes,
   volontairement plus spécifique que .press-anim.press-fired ET que
   .recipe-card:active pour gagner dans les deux cas, quel que soit l'ordre
   dans la feuille de style, voir la même technique déjà utilisée pour
   .recipe-picker-modal). transform: scale(1) explicite (pas juste
   "animation: none") : sans lui, la carte restait visuellement enfoncée
   tant que le doigt n'était pas relevé, puisque :active continuait sinon
   de s'appliquer — ici elle revient à sa taille normale dès l'ouverture de
   la modale, doigt encore posé ou non. Les autres appuis longs de l'app
   (foyer, navigation...) gardent leur comportement d'origine (rebond +
   attente du relâchement), non concernés par cette demande. */
.press-anim.press-fired.recipe-card {
  animation: none;
  transform: scale(1);
}
/* --- Retour tactile d'appui long (enfoncement puis rebond) -----------
   Piloté en JS par un état "idle" | "pressing" | "fired" (voir
   hooks/useLongPress.js, RecipeCard.jsx, NavButton.jsx) plutôt que par le
   pseudo-état natif :active seul — plus fiable sur mobile (:active est
   parfois retardé/ignoré pendant un scroll) et ça permet de distinguer
   "maintenu" (léger enfoncement) de "geste déclenché" (rebond). --- */
.press-anim { transition: transform 0.16s cubic-bezier(0.4, 0, 0.2, 1); }
.press-anim.press-pressing { transform: scale(0.95); }
.press-anim.press-fired { animation: pressBounce 0.36s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pressBounce {
  0% { transform: scale(0.95); }
  55% { transform: scale(1.045); }
  100% { transform: scale(1); }
}
/* Repli visuel du retour haptique sur iOS (voir utils/haptics.js) : pas de
   vibreur matériel accessible, donc une micro-pulsation de luminosité sert
   de substitut perceptif au moment où l'action se déclenche. */
.haptic-pulse { animation: hapticPulse 0.18s ease; }
@keyframes hapticPulse { 0% { filter: brightness(1); } 45% { filter: brightness(1.12); } 100% { filter: brightness(1); } }

.card-body { padding: 10px 12px 14px; }
.card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.recipe-card h3 { font-family: 'Cinzel', serif; font-size: 0.92rem; margin: 4px 0; line-height: 1.25; }
.card-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.72rem; color: var(--ink-soft); align-items: center; }
.card-meta span { display: inline-flex; align-items: center; gap: 3px; }
.carbs-badge {
  font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.4px;
  background: rgba(179,135,42,0.15); color: var(--gold); border: 1px solid rgba(179,135,42,0.4);
  padding: 3px 8px; border-radius: 999px;
}

.chip {
  font-family: 'Cinzel', serif;
  font-size: 0.58rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
}
.chip-sale { background: var(--wine); }
.chip-sucre { background: var(--plum); }

.nutri-badge {
  width: 20px; height: 20px; border-radius: 50%;
  color: #fff; font-weight: 700; font-size: 0.68rem;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cinzel', serif;
}

.illus {
  width: 100%; aspect-ratio: 4/3;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.illus-wrap { position: relative; }
.illus-art svg { display: block; }

/* --- Photo ou illustration IA : rendu net, cadre rectangulaire --- */
.illus-photo-frame { position: relative; background: var(--parchment); }
.illus-photo {
  display: block; width: 100%; height: 100%; object-fit: cover;
  -webkit-touch-callout: none !important; /* bloque le menu iOS (Copier / Enregistrer) sur appui long */
  -webkit-user-select: none !important; user-select: none !important;
  pointer-events: none; /* le doigt ne touche jamais l'<img> elle-même, voir .illus-photo-guard */
  /* Zoom très léger uniquement sur les points d'entrée qui ONT un vrai
     survol de souris — "hover: hover" ET "pointer: fine" ensemble
     excluent le tactile, où :hover resterait "collé" jusqu'au prochain
     tap ailleurs (aucune sortie de survol possible au doigt), donnant un
     flash de zoom qui semblerait figé plutôt que réagir au geste. */
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) and (pointer: fine) {
  .recipe-card:hover .illus-photo { transform: scale(1.04); }
}
/* --- Effet de chargement (voile chatoyant) --------------------------------
   Affiché par-dessus la zone image tant que la photo (ou l'illustration IA)
   n'a pas fini de se décoder — voir DishArt.jsx, état "photoLoaded". Un
   simple dégradé qui balaie l'écran, pas un spinner : cohérent avec le
   reste de l'app (aucun spinner ailleurs pour une image individuelle), et
   évite un changement brutal image manquante -> image nette une fois le
   réseau ou le cache lents. */
.illus-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 20%, rgba(179,135,42,0.16) 50%, transparent 80%);
  background-size: 200% 100%;
  background-color: var(--parchment);
  animation: illusShimmer 1.4s ease-in-out infinite;
}
@keyframes illusShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.illus-photo-guard {
  position: absolute; inset: 0;
  background: transparent;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important; user-select: none !important;
  /* auto (pas pan-y) : le doigt doit pouvoir faire défiler la page en
     glissant par-dessus une photo — seul le menu iOS natif (Copier/
     Enregistrer) doit être bloqué, via -webkit-touch-callout ci-dessus, sans
     rapport avec touch-action. Repassé à "auto" en même temps que
     .recipe-card ci-dessus (voir son commentaire) : "pan-y" ici aussi
     semblait contribuer au défilement au geste bloqué en portrait sur
     desktop. */
  touch-action: auto;
}
.fav-btn {
  position: absolute; top: 8px; right: 8px;
  width: 30px; height: 30px; border-radius: 50%; border: none;
  /* Pas de backdrop-filter ici (retiré) : Chrome ne peut pas le composer
     sur le thread de composition pendant un défilement — le contenu
     derrière le bouton doit être ré-échantillonné et flouté à NOUVEAU à
     chaque frame de scroll, ce qui force un repaint sur le thread
     principal pour toute la zone qui défile en dessous (visible dans
     Chrome DevTools, onglet Rendering > "Scrolling performance issues",
     surligné "main thread scroll repaint" sur toute la grille de
     recettes — un bouton par carte, potentiellement des dizaines à la
     fois). C'est exactement le genre de coût qui peut faire "geler" le
     scroll sur un appareil Android plus modeste. Le fond semi-opaque
     ci-dessous (40% d'opacité) donne déjà assez de contraste au cœur
     blanc par-dessus n'importe quelle photo sans ce flou. */
  background: rgba(20,14,4,0.4); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.fav-btn.active { color: #e8607a; background: rgba(20,14,4,0.55); }
.spin-wand { animation: spin 1.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Fiche recette --- */
.detail-drag-handle {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 4px; border-radius: 999px; background: var(--drag-handle); z-index: 4;
}
.detail-hero { position: relative; margin: -22px -20px 0; width: calc(100% + 40px); aspect-ratio: 16/10; overflow: hidden; }
.detail-hero .illus { aspect-ratio: auto; height: 100%; }
.detail-hero-fade {
  position: absolute; inset: 0;
  /* Fondu resserré en bas de la photo (75% -> 100%, contre 55% -> 100%
     avant) : à la demande, pour laisser la photo bien visible plus
     longtemps avant qu'elle ne s'estompe vers le fond de la page. */
  background: linear-gradient(to bottom, transparent 75%, var(--parchment) 100%);
  pointer-events: none;
}
.detail-scroll { position: relative; overscroll-behavior: contain; touch-action: pan-y; }
.detail-scroll-hint { text-align: center; color: var(--line); font-size: 1.2rem; margin-top: 18px; letter-spacing: 4px; }
.portions-adjuster {
  display: flex; align-items: center; justify-content: space-between;
  margin: 6px 0 14px; font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--ink-soft);
}
.portions-adjuster > span:first-child { display: inline-flex; align-items: center; gap: 6px; }
.portions-stepper { display: flex; align-items: center; gap: 10px; }
.portions-stepper button {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--gold);
  background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.portions-stepper span { min-width: 18px; text-align: center; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink); }
.scaled-note { font-style: italic; font-weight: normal; text-transform: none; letter-spacing: 0; font-size: 0.78rem; color: var(--ink-soft); }
.detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.detail-actions .seal { flex: 1; justify-content: center; }

/* --- Sceaux / boutons --- */
.seal {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1px solid var(--seal-border);
  background: var(--seal-bg);
  color: var(--seal-text);
  cursor: pointer;
  box-shadow: 0 3px 0 var(--seal-shadow), 0 6px 12px rgba(0,0,0,0.15);
  transition: transform 0.08s ease, background 0.15s ease;
}
.seal:hover:not(:disabled) { background: var(--seal-bg-hover); }
.seal:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--seal-shadow); }
.seal:disabled { opacity: 0.45; cursor: not-allowed; }

.fab {
  /* Ancré directement aux coins du viewport plutôt que calculé depuis la
     largeur supposée du conteneur (l'ancienne formule
     "right: calc(50% - 240px + 18px)" supposait que .grimoire-app restait
     toujours un conteneur centré de 480px de large — ce qui n'est plus le
     cas en paysage : voir la grille 300px/1fr définie plus bas, où
     .grimoire-app passe à 1400px de large. Le bouton se retrouvait alors
     recalculé pour un conteneur qui n'existe plus, et atterrissait au
     milieu de l'écran au lieu de rester dans le coin). Un simple ancrage
     fixe au coin de l'écran, comme un FAB Material Design classique,
     fonctionne correctement quel que soit le layout. "bottom: 132px" en
     portrait (relevé depuis 96px : voir .bottom-nav, modalsBase.css.js,
     désormais un dock flottant avec sa propre marge basse + sa hauteur à
     dégager, pas juste une barre soudée au bord) laisse la place à la nav ;
     la règle landscape plus bas la ramène à 24px puisque la nav passe en
     colonne latérale statique dans ce mode et ne peut plus chevaucher. */
  position: fixed;
  right: 24px;
  bottom: 132px;
  z-index: 50;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--chrome); color: var(--gold-light);
  border: 2px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 14px rgba(0,0,0,0.3);
  cursor: pointer;
}
/* Rapproché de la nav (plus agrandie, voir .bottom-nav dans
   modalsBase.css.js), seulement en PWA installée : 100px au lieu du 96px du
   navigateur normal — un espace resserré plutôt que le +10px complet qui
   suivait exactement la nouvelle hauteur de la nav (trop d'écart demandé).
   ":where(...)" : voir le commentaire détaillé dans modalsBase.css.js —
   ramène la spécificité à zéro pour ne pas gagner contre la règle paysage
   juste au-dessus ("bottom: 24px") sur une tablette en PWA installée. */
:where(html[data-standalone="true"]) .fab { bottom: 144px; }

`;
