/* ------------------------------------------------------------------ */
/*  THÈME — polices, variables de couleur (clair/sombre), fond de page */
/*  Extrait de styles.css.js (lignes 7-135 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const THEME_CSS = `
:root {
  --parchment: #f1e6c8;
  --parchment-deep: #e6d5a8;
  --ink: #2a2013;
  --ink-soft: #5c4a30;
  --gold: #b3872a;
  --gold-light: #d9b45c;
  --wine: #7c3232;
  --plum: #5a3a63;
  --line: rgba(42,32,19,0.18);
  --page-bg: #fcf8f2;
  --page-glow: rgba(255,255,255,0.35);
  --card-shadow: rgba(0,0,0,0.15);
  /* Surfaces translucides ("effet verre") — theme-aware */
  --surface: rgba(255,255,255,0.4);
  --surface-strong: rgba(255,255,255,0.5);
  --surface-soft: rgba(255,255,255,0.08);
  --header-glow: rgba(255,255,255,0.25);
  --modal-close-bg: rgba(0,0,0,0.06);
  --drag-handle: rgba(42,32,19,0.25);
  /* "Reliure en cuir" — accents (nav basse, FAB, toast…) TOUJOURS sombres,
     avec leur texte clair assorti, quel que soit le thème actif. */
  --chrome: #2a2013;
  --chrome-text: #f1e6c8;
  /* Fond de la nav basse : teinte donnée en composantes RVB brutes (pas en
     #hex) pour pouvoir y injecter une opacité variable via rgba() — celle-ci
     est réglable dans Réglages > Apparence (voir .bottom-nav et
     utils/localSettings.js). Même teinte que --parchment ci-dessus.
     --nav-opacity n'est PAS redéfini dans le thème sombre : c'est un choix
     de l'utilisateur, pas une couleur. Sa valeur réelle est posée en style
     inline sur <html> au démarrage (applyNavOpacity), qui prend le pas sur
     la valeur par défaut ci-dessous. */
  --nav-bg-rgb: 241, 230, 200;
  --nav-opacity: 0;
  /* Réglages façon iOS (liste groupée) : fond légèrement plus sombre que
     le reste de l'app pour faire ressortir les cartes arrondies posées
     dessus (voir .ios-settings-modal / .ios-group ci-dessous). */
  --grouped-bg: #d9c193;
  --grouped-card-bg: var(--parchment);
  --forest: #3E7A3E;
  /* Boutons d'action principaux (.seal — "Lancer la préparation", "Partager
     la recette", "Sceller la recette"...) : ambre mat chic, texte clair
     lisible dessus. Distinct de --gold/--gold-light (utilisés ailleurs pour
     du texte/liserés sur fond clair) — voir l'override sombre ci-dessous
     pour le contraste inverse recherché sur fond noir. */
  --seal-bg: linear-gradient(180deg, #d99a4a, #b87333);
  --seal-bg-hover: #a8651f;
  --seal-border: rgba(180,115,40,0.35);
  --seal-text: #fff7ec;
  --seal-shadow: #8a651c;
}

/* --- Thème Sombre — même esprit grimoire/parchemin, en veille de nuit --- */
[data-theme="dark"] {
  --parchment: #1c1917;
  --parchment-deep: #2b2621;
  --ink: #e7e5e4;
  --ink-soft: #c9b993;
  --gold: #d97706;
  --gold-light: #f3ad4b;
  --wine: #c1666b;
  --plum: #a884b8;
  --line: rgba(231,229,228,0.14);
  --page-bg: #131110;
  --page-glow: rgba(255,255,255,0.04);
  --card-shadow: rgba(0,0,0,0.45);
  --surface: rgba(255,255,255,0.05);
  --surface-strong: rgba(255,255,255,0.09);
  --surface-soft: rgba(255,255,255,0.04);
  --header-glow: rgba(255,255,255,0.05);
  --modal-close-bg: rgba(255,255,255,0.08);
  --drag-handle: rgba(231,229,228,0.25);
  /* --chrome / --chrome-text ne sont volontairement PAS redéfinis ici :
     ces accents restent identiques dans les deux thèmes. */
  --nav-bg-rgb: 28, 25, 23;
  --grouped-bg: #0e0c0a;
  --grouped-card-bg: var(--parchment-deep);
  --forest: #4f9e52;
  /* Sur fond noir, un remplissage ambre plein serait criard — on inverse la
     logique : fond bronze/chocolat profond, contour et texte dorés bien
     définis, pour un bouton qui reste lisible et élégant plutôt qu'agressif. */
  --seal-bg: linear-gradient(180deg, #332516, #2b1f13);
  --seal-bg-hover: #3d2c19;
  --seal-border: rgba(217,180,92,0.6);
  --seal-text: #f7e2bc;
  --seal-shadow: #140d07;
}

html[data-theme="dark"] { color-scheme: dark; }
/* Taille de texte (Réglages > Accessibilité) : agrandit le rem de base
   plutôt qu'une propriété isolée — comme tout le texte de l'app est en
   rem, ça le fait grossir uniformément sans toucher aux espacements en px. */
html { font-size: 16px; }
html[data-text-size="large"] { font-size: 18px; }
html {
  /* Réserve la place de la scrollbar en permanence, plutôt que de la
     laisser apparaître/disparaître selon que l'onglet actif déborde ou
     non de l'écran (Recettes déborde généralement, Courses vide non) :
     sans ça, .grimoire-app (centré via margin: 0 auto un peu plus bas)
     gagne/perd la largeur de cette scrollbar à chaque changement d'onglet
     et se recentre visiblement d'un coup — signalé comme "la page se
     décale légèrement en arrivant sur Courses" (PC, où la scrollbar est
     dans le flux, contrairement à Android/iOS où elle se superpose déjà
     au contenu sans jamais en changer la largeur). */
  scrollbar-gutter: stable;
}
html, body {
  margin: 0;
  padding: 0;
  /* "height: 100%", pas "100dvh" : mesuré en direct sur un appareil réel
     (PWA installée, iOS), window.innerHeight vaut 874 juste au lancement
     PUIS se stabilise sur 812 quelques secondes plus tard — TOUTE unité
     basée sur le viewport (vh/dvh/svh/lvh) partage cette même source et
     peut donc figer une mise en page sur la valeur instable de départ.
     document.documentElement.clientHeight, lui, est resté fiable à 812
     dans toutes les mesures prises (avant et après stabilisation) : une
     chaîne de hauteurs en pourcentage (html/body/#root ci-dessous, puis
     .grimoire-app en min-height: 100% un peu plus bas) se cale sur cette
     même mesure fiable plutôt que sur le viewport instable. */
  height: 100%;
  /* --parchment, pas --page-bg (blanc cassé) : sécurité si un enfant
     n'atteint malgré tout pas tout à fait le bas réel de l'écran — même
     couleur que .grimoire-app juste en dessous, donc invisible. */
  background: var(--parchment);
}

#root { height: 100%; }

.grimoire-app, .loading-screen {
  font-family: 'EB Garamond', Georgia, serif;
  color: var(--ink);
  background:
    radial-gradient(ellipse at top left, var(--page-glow), transparent 60%),
    var(--parchment);
  /* "100%", pas "100dvh"/"100vh" — voir le commentaire sur html/body
     juste au-dessus : dvh avait semblé corriger le bandeau clair en bas
     (mesuré à l'instant T où il collait, par hasard, à window.innerHeight
     à ce moment précis), mais génère à la place un excédent d'espace
     ailleurs (RecipeOptionsModal) une fois figé sur la valeur instable de
     départ (874 au lieu de 812). "100%" hérite de la chaîne de hauteurs
     fiables ci-dessus (html/body/#root), pas du viewport. */
  min-height: 100%;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  padding-top: env(safe-area-inset-top);
  /* Relevé pour laisser la place au dock flottant (voir .bottom-nav,
     modalsBase.css.js) : il ne colle plus au bord de l'écran, ce padding
     doit désormais couvrir sa marge basse ET sa propre hauteur, pas
     seulement l'ancienne barre pleine largeur (qui n'avait qu'une hauteur
     à couvrir). Valeur mesurée sur le rendu réel du dock (bottom + hauteur
     + une petite marge de respiration) plutôt qu'estimée à l'œil. */
  padding-bottom: 130px;
  box-shadow: 0 0 40px var(--card-shadow);
  /* "overflow-x: hidden" forçait la spec CSS à calculer overflow-y en
     "auto" (dès qu'un axe n'est pas "visible", l'autre l'est aussi tout
     seul, quoi que ce soit écrit ici) — .grimoire-app devenait donc malgré
     lui son propre conteneur de défilement. Deux dégâts concrets : (1)
     .bottom-nav (position: fixed, enfant direct) hérite d'un bug WebKit
     connu où un "fixed" niché dans un ancêtre non "visible" peut se recaler
     par rapport à CET ancêtre plutôt que par rapport au vrai écran — signalé
     comme "la nav est remontée/coupée" ; (2) le point ci-dessus dans ce
     fichier sur scrollbar-gutter. "overflow-x: clip" évite ce couplage
     (contrairement à "hidden") : overflow-y reste réellement "visible", et
     le défilement de la page continue de remonter normalement vers le
     document (rien ne change dans le flux ci-dessus). */
  overflow-x: clip;
  overflow-y: visible;
}
/* Reprend, seulement en PWA installée, le +10px de hauteur donné à
   .bottom-nav en portrait (voir modalsBase.css.js) : la dernière ligne de
   contenu défilable ne doit pas se retrouver plus serrée contre la barre
   dans l'app installée, sans changer quoi que ce soit dans un navigateur
   normal. .loading-screen exclu à dessein : rien n'y défile derrière la nav
   (elle n'est même pas montée à cet écran), ce padding n'y sert à rien.
   ":where(...)" : voir le commentaire détaillé dans modalsBase.css.js —
   ramène la spécificité à zéro, par cohérence avec .bottom-nav/.fab. */
:where(html[data-standalone="true"]) .grimoire-app { padding-bottom: 150px; }

.loading-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 100%; color: var(--gold);
}
.loading-screen p { color: var(--ink-soft); font-style: italic; }
.view-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 200px; color: var(--gold);
}
.login-screen { padding: 24px; text-align: center; }
.login-title { font-family: 'Cinzel Decorative', 'Cinzel', serif; font-size: 1.6rem; color: var(--ink); margin: 0; }

* { box-sizing: border-box; }

`;
