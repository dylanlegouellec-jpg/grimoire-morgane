/* ------------------------------------------------------------------ */
/*  THÈME — polices, variables de couleur (clair/sombre), fond de page */
/*  Extrait de styles.css.js (lignes 7-135 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cinzel+Decorative:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');

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
html, body {
  margin: 0;
  padding: 0;
  background: var(--page-bg);
}

.grimoire-app, .loading-screen {
  font-family: 'EB Garamond', Georgia, serif;
  color: var(--ink);
  background:
    radial-gradient(ellipse at top left, var(--page-glow), transparent 60%),
    var(--parchment);
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  padding-top: env(safe-area-inset-top);
  padding-bottom: 84px;
  box-shadow: 0 0 40px var(--card-shadow);
  /* Correctif historique erroné : écrire overflow-y: visible ici ne
     suffit PAS à empêcher .grimoire-app de devenir son propre conteneur
     de défilement — la spec CSS force le calcul d'un axe "visible" à
     "auto" dès que l'AUTRE axe (ici overflow-x: hidden) ne l'est pas, quoi
     que ce soit écrit pour overflow-y (vérifié : la valeur CALCULÉE reste
     "auto" malgré cette ligne). Gardée pour la lisibilité de l'intention
     (et parce qu'écrire "visible" ne fait de mal à rien), mais ce n'est
     PAS ce qui protège du vrai risque : .grimoire-app calcule bel et bien
     overflow-y: auto. Ce qui évite un problème concret ici, c'est
     l'absence de tout overscroll-behavior restrictif sur cet élément
     (contrairement à .app-content, qui avait "contain" — voir
     shell.css.js pour le bug que ça causait) : un geste qui ne trouve
     rien à faire défiler dans .grimoire-app remonte donc normalement vers
     le document, qui lui déborde réellement. */
  overflow-x: hidden;
  overflow-y: visible;
}

.loading-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 100vh; color: var(--gold);
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
