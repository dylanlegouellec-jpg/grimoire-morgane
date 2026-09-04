/* ------------------------------------------------------------------ */
/*  CSS — styles isolés du Grimoire de Morgane                         */
/*  Injecté via <style>{CSS}</style> dans le composant principal.      */
/* ------------------------------------------------------------------ */

export const CSS = `
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
  overflow-x: hidden;
}

.loading-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 100vh; color: var(--gold);
}
.loading-screen p { color: var(--ink-soft); font-style: italic; }
.login-screen { padding: 24px; text-align: center; }
.login-title { font-family: 'Cinzel Decorative', 'Cinzel', serif; font-size: 1.6rem; color: var(--ink); margin: 0; }

* { box-sizing: border-box; }

.app-header {
  position: relative;
  text-align: center;
  padding: 28px 20px 16px;
  border-bottom: 2px solid var(--line);
  background: linear-gradient(180deg, var(--header-glow), transparent);
}
/* --- Bouton de réglages de l'en-tête — remplace l'ancien déclencheur
   "triple-clic sur le titre" (invisible, jamais découvert par un
   utilisateur sans qu'on le lui dise) par une vraie porte d'entrée
   visible : la photo de profil si elle existe (avec la pastille de
   statut de connexion, comme sur la carte de profil des Réglages),
   sinon une icône d'engrenage. --- */
.app-header-settings-btn {
  position: absolute; top: 22px; right: 16px; z-index: 2;
  width: 36px; height: 36px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 50%;
  color: var(--ink-soft); cursor: pointer;
}
/* Avec une photo de profil, le cadre du bouton lui-même s'efface — le
   halo doré porté par la photo (ci-dessous) suffit comme cadre, un double
   anneau (bouton + photo) aurait l'air non fini. */
.app-header-settings-btn.has-avatar { background: none; border: none; }
.app-header-avatar-wrap { position: relative; width: 100%; height: 100%; }
.app-header-avatar {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;
  border: 1.5px solid rgba(179,135,42,0.45);
  /* Bloque le menu iOS natif (Copier / Enregistrer l'image) sur appui
     long — même traitement que .illus-photo dans DishArt.jsx. pointer-events:
     none fait "passer" le doigt à travers l'<img> jusqu'au <button> parent
     qui l'englobe déjà entièrement : pas besoin ici du calque de garde
     séparé de DishArt.jsx (cette image n'a pas besoin de laisser défiler
     la page par-dessus, contrairement à une photo de recette en pleine
     carte). */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
}
/* Pastille de statut réseau miniature, propre à ce contexte (l'avatar de
   36px de l'en-tête, bien plus petit que celui de la carte de profil des
   Réglages) — combinée à .connection-status-dot pour la couleur (voir
   plus bas), juste la taille/le liseré changent ici. */
/* Sélecteur composé (deux classes) plutôt que simple : la taille par défaut
   de .connection-status-dot est définie plus bas dans ce fichier, APRÈS ce
   bloc — sans les deux classes combinées ici, cette règle-ci perdrait la
   bataille de cascade (même spécificité, mais déclarée avant) et la pastille
   du header resterait à la taille de celle de la carte de profil (16px). */
.connection-status-dot.app-header-status-dot {
  width: 8px; height: 8px;
  bottom: 0; right: 0;
  border-width: 1.5px;
  border-color: var(--page-bg);
}
.app-header h1 {
  font-family: 'Cinzel Decorative', 'Cinzel', serif;
  font-size: 1.55rem;
  margin: 0;
  color: var(--ink);
  letter-spacing: 0.5px;
}
.subtitle {
  margin: 6px 0 0;
  font-family: 'Cinzel', serif;
  font-size: 0.62rem;
  letter-spacing: 3px;
  color: var(--gold);
  text-transform: uppercase;
}
.offline-queue-badge {
  margin: 8px auto 0; max-width: 260px; padding: 4px 10px;
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.75rem;
  color: var(--ink-soft); background: var(--surface-soft);
  border: 1px solid var(--line); border-radius: 999px;
}
/* Bannière "Hors ligne" — pilotée par le statut de connexion RÉEL (ping
   Supabase, voir hooks/useConnectionStatus.js), jamais par navigator.onLine
   seul : elle disparaît dès que le ping suivant réussit. */
.offline-banner {
  margin: 8px auto 0; max-width: 300px; padding: 5px 12px;
  font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: #ff3b30; background: rgba(255,59,48,0.12);
  border: 1px solid rgba(255,59,48,0.4); border-radius: 999px;
}

.search-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 14px 16px 0; padding: 9px 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 999px;
  color: var(--ink-soft);
}
.search-bar input {
  border: none; background: transparent; outline: none; flex: 1;
  font-family: 'EB Garamond', serif; font-size: 0.95rem; color: var(--ink);
}

.filter-bar {
  display: flex; gap: 8px; padding: 14px 16px 4px; overflow-x: auto;
}
.filter-pill {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  letter-spacing: 1px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.filter-pill.active { background: var(--chrome); color: var(--chrome-text); border-color: var(--chrome); }
.heart-pill { display: inline-flex; align-items: center; gap: 5px; }
.heart-pill.active { color: #e8607a; border-color: #e8607a; background: rgba(232,96,122,0.12); }

.app-content {
  padding: 16px; min-height: 50vh; overflow-x: hidden;
  /* Neutralise le rebond élastique (iOS) qui, sans ça, pouvait geler le
     scroll 3 à 5s en butant sur les bords haut/bas de la vue Recettes. */
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}
.view { animation: fadeIn 0.35s ease; }
/* Pas de transform ici (volontairement) : un .view contient des boutons
   position: fixed (ex. .fab dans Recettes) — tant qu'un ancêtre a un
   transform actif (même juste le temps d'une animation), il devient le
   "containing block" de ces descendants fixes à la place du viewport
   (règle CSS), les repositionnant temporairement par rapport à .view
   (plus étroit, décalé) au lieu de l'écran. Résultat : le bouton "+"
   apparaissait décalé pendant les 0,35s de cette animation puis
   "sautait" à sa vraie position une fois l'animation terminée et le
   transform retiré. Un fondu à l'opacité seule ne crée aucun containing
   block, donc plus aucun saut. */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.hint { color: var(--ink-soft); font-style: italic; font-size: 0.92rem; margin: 4px 0 14px; }

/* --- Cartes --- */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 2px 0 rgba(42,32,19,0.06), 0 6px 14px rgba(42,32,19,0.07);
}

.recipes-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 110px;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}
.card-enter { animation: cardEnter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
.recipe-card {
  overflow: hidden; cursor: pointer;
  /* Le fondu d'enfoncement/rebond vient de .press-anim (voir plus bas),
     toujours appliqué avec cette classe — pas besoin d'une deuxième
     transition ici, elle serait de toute façon masquée par la sienne. */
  /* Les cartes hors écran ne sont ni mises en page ni peintes ni gardées
     en mémoire de rendu (mémoire vidéo/GPU incluse) tant qu'elles ne sont
     pas sur le point d'apparaître — la taille estimée ci-dessous évite un
     saut de mise en page quand une carte entre dans la zone visible. */
  content-visibility: auto;
  contain-intrinsic-size: 220px 255px;
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
}
.illus-photo-guard {
  position: absolute; inset: 0;
  background: transparent;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important; user-select: none !important;
  /* pan-y (pas none) : le doigt doit pouvoir faire défiler la page
     verticalement en glissant par-dessus une photo — seul le menu iOS
     natif (Copier/Enregistrer) doit être bloqué, via -webkit-touch-callout
     ci-dessus, pas le scroll lui-même. */
  touch-action: pan-y;
}
.fav-btn {
  position: absolute; top: 8px; right: 8px;
  width: 30px; height: 30px; border-radius: 50%; border: none;
  background: rgba(20,14,4,0.4); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(2px);
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
  background: linear-gradient(to bottom, transparent 55%, var(--parchment) 100%);
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
     fonctionne correctement quel que soit le layout. "bottom: 96px" en
     portrait laisse la place à la nav basse (voir .bottom-nav) ; la
     règle landscape plus bas la ramène à 24px puisque la nav passe en
     colonne latérale statique dans ce mode et ne peut plus chevaucher. */
  position: fixed;
  right: 24px;
  bottom: 96px;
  z-index: 50;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--chrome); color: var(--gold-light);
  border: 2px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 14px rgba(0,0,0,0.3);
  cursor: pointer;
}

/* --- Mon Frigo ---------------------------------------------------------
   Compteur global, accordéons par catégorie (au lieu du nuage de puces
   en vrac), et une liste "Réalisable avec ton frigo" triée par niveau de
   complétude (voir FridgeView.jsx et pantryUtils.js). --- */
.fridge-counter {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--gold); background: rgba(179,135,42,0.12); border: 1px solid rgba(179,135,42,0.3);
  border-radius: 999px; padding: 6px 14px; margin-bottom: 16px;
}
.basics-title {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--gold);
  margin: 4px 0 8px; display: flex; align-items: baseline; gap: 8px;
}
/* Variante repliable (accordéon), voir FridgeView.jsx : mêmes réglages
   typographiques, mais en pleine largeur avec un chevron aligné à droite. */
.basics-title-toggle {
  width: 100%; background: none; border: none; padding: 0; cursor: pointer;
  align-items: center; justify-content: space-between;
}
.hint-inline { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.75rem; letter-spacing: 0; text-transform: none; color: var(--ink-soft); }
.basics-grid {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
  padding: 12px; border-radius: 10px;
  background: rgba(179,135,42,0.12); border: 1px solid rgba(179,135,42,0.3);
}
.basic-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'EB Garamond', serif; font-size: 0.86rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid rgba(179,135,42,0.4);
  border-radius: 999px; padding: 6px 6px 6px 13px;
}
.basic-action {
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: rgba(179,135,42,0.2); color: var(--gold); font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}
.basic-action-remove { background: rgba(124,50,50,0.15); color: var(--wine); }

.fridge-quick-add {
  display: flex; align-items: center; gap: 6px; width: 100%;
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.88rem; color: var(--gold);
  background: none; border: 1px dashed rgba(179,135,42,0.5); border-radius: 10px;
  padding: 10px 12px; margin-bottom: 10px; cursor: pointer;
}
.fridge-quick-add:active { background: rgba(179,135,42,0.1); }

.fridge-categories { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.fridge-category {
  border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--surface);
}
.fridge-category-header {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: none; border: none; padding: 11px 14px; cursor: pointer;
  font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.5px; color: var(--ink);
}
.fridge-category-icon { font-size: 1.05rem; line-height: 1; }
.fridge-category-label { flex: 1; text-align: left; }
.fridge-category-count { font-family: 'EB Garamond', serif; font-size: 0.78rem; font-style: italic; color: var(--ink-soft); }
.fridge-category-chevron { color: var(--ink-soft); transition: transform 0.2s ease; flex-shrink: 0; }
.fridge-category-chevron.open { transform: rotate(180deg); }
.pantry-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 14px 14px; }
.pantry-chip {
  font-family: 'EB Garamond', serif; font-size: 0.86rem;
  padding: 7px 13px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface-strong); color: var(--ink-soft); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
}
/* État actif accentué (doré/sombre) : bien plus voyant que le simple
   contour discret d'une puce non cochée. */
.pantry-chip.active { background: var(--chrome); color: var(--gold-light); border-color: var(--chrome); font-weight: 600; }

.fridge-results { display: flex; flex-direction: column; gap: 10px; }
.fridge-row {
  display: flex; align-items: center; gap: 12px; padding: 8px; cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: 100% 62px;
}
/* Recettes reléguées (>2 ingrédients manquants) : présentes mais moins
   engageantes visuellement, pour que l'œil aille d'abord vers ce qui est
   déjà réalisable ou presque. */
.fridge-row-far { opacity: 0.62; }
.fridge-thumb { width: 60px; height: 46px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.fridge-row-body h5 { margin: 0 0 4px; font-family: 'Cinzel', serif; font-size: 0.85rem; }
.fridge-badge {
  font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: 999px;
}
.fridge-badge-ready { color: #fff; background: #3E7A3E; }
.fridge-missing { color: var(--wine); font-size: 0.78rem; }
.fridge-missing-far { color: var(--ink-soft); font-style: italic; }
.fridge-show-more { display: block; margin: 10px auto 0; }

/* --- Courses --- */
.active-list-header { margin-bottom: 12px; }
.active-list-name {
  background: none; border: none; cursor: pointer; padding: 0;
  font-family: 'Cinzel', serif; font-size: 1rem; color: var(--ink);
  display: flex; align-items: baseline; gap: 8px;
}
.active-list-switch { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.78rem; color: var(--gold); }
.manual-add-row {
  display: flex; gap: 8px; margin-bottom: 16px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 4px 4px 4px 14px;
}
.manual-add-row input {
  flex: 1; border: none; background: transparent; outline: none;
  font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
}
.manual-add-row button {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: var(--gold); color: #2a1c07; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.recipe-picker-trigger { margin-bottom: 16px; }
.shopping-actions { display: flex; gap: 18px; margin-bottom: 10px; }
.recipe-picker-filters { padding: 0 0 8px; }
.recipe-select-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
/* --- "Générer à partir de recettes" (RecipePickerModal.jsx) — refonte en
   VRAI en-tête/corps/pied de page (flex column), plutôt qu'un bouton
   "position: sticky" flottant au-dessus d'une liste avec un padding
   calculé pour deviner sa hauteur (fragile : un mauvais calcul laissait
   le bouton chevaucher les dernières recettes). Avec cette structure,
   .recipe-picker-body est la SEULE zone qui défile ; .recipe-picker-footer
   est un enfant flex normal, jamais superposé au corps — aucune recette
   ne peut donc plus jamais se retrouver sous le bouton. */
/* Sélecteur composé (.modal.recipe-picker-modal, pas juste
   .recipe-picker-modal) : .modal/.grimoire-page (plus bas dans ce fichier)
   redéfinit aussi max-height/overflow avec la MÊME spécificité — sans le
   composé, c'est l'ORDRE dans la feuille de style qui aurait tranché, et
   .modal apparaissant après ce bloc aurait gagné, annulant purement et
   simplement overflow:hidden ici. Résultat observé : le conteneur externe
   retrouvait overflow-y:auto en plus du défilement interne de
   .recipe-picker-body, un double-scroll qui pouvait faire disparaître le
   bouton "Générer la liste" hors de la zone visible. Un sélecteur composé
   a une spécificité plus élevée et gagne toujours, quel que soit l'ordre. */
.modal.recipe-picker-modal {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
}
.recipe-picker-header { flex-shrink: 0; }
.recipe-picker-body {
  flex: 1 1 auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 0; /* indispensable pour qu'un enfant flex accepte de rétrécir et défiler plutôt que de déborder */
}
/* Étendue jusqu'aux bords de .modal via des marges négatives qui annulent
   son padding, puis un padding propre est réappliqué par-dessus pour le
   contenu du pied de page lui-même. Le padding bas réserve la zone sûre
   iOS (encoche/indicateur d'accueil) — la barre de nav de l'appli n'a PAS
   besoin d'être comptée en plus ici, contrairement aux autres correctifs
   de ce type : ce pied de page est un enfant flex de la feuille modale
   elle-même (déjà au-dessus de .bottom-nav dans l'empilement), pas un
   élément qui pourrait glisser derrière. */
.recipe-picker-footer {
  flex-shrink: 0;
  margin: 8px -20px -30px; padding: 12px 20px calc(env(safe-area-inset-bottom, 16px) + 16px);
  background: var(--parchment); box-shadow: 0 -6px 14px rgba(0,0,0,0.12);
  display: flex; justify-content: center;
}
.recipe-select-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
.recipe-select-row span:nth-child(2) { flex: 1; }
/* Variante <button> (sélection simple, une seule recette — voir
   AddMealModal.jsx) plutôt que <label>+checkbox (sélection multiple) :
   réinitialise le style natif du bouton, et .recipe-select-row-title
   porte le flex:1 explicitement plutôt que de compter sur l'ordre des
   enfants (différent ici : pas de case à cocher en premier). */
.recipe-select-row-btn {
  width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--line);
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
}
.recipe-select-row-title { flex: 1; }
/* .app-content (voir plus haut) n'a qu'un padding bas de 16px, bien moins
   que la hauteur de .bottom-nav (~70px) — la liste de courses est celle
   qui déborde le plus souvent en bas (beaucoup d'articles + rayons), donc
   le dernier article d'un rayon (ou de "Articles achetés" déplié) pouvait
   rester caché derrière la nav basse. Même formule que les autres
   correctifs de ce type (voir .recipe-options-modal, .planning-step-modal,
   .recipe-picker-modal). */
.shopping-result { margin-top: 20px; padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 110px); }
.parchment-recap {
  text-align: center; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--ink-soft); background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.3);
  border-radius: 999px; padding: 8px 14px; margin-bottom: 10px;
}
.apple-bar {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.aisle-block { margin-bottom: 16px; }
.aisle-block h4 {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 1px; color: var(--gold); text-transform: uppercase;
  margin-bottom: 8px; border-bottom: 1px dashed var(--line); padding-bottom: 4px;
}
.aisle-icon { font-size: 0.95rem; }
.aisle-count {
  margin-left: auto; font-family: 'EB Garamond', serif; font-style: italic; letter-spacing: 0; text-transform: none;
  color: var(--ink-soft); font-size: 0.72rem;
}
/* --- Section "Articles achetés" repliable --- */
.bought-block { margin-bottom: 4px; }
.bought-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: none; border: none; padding: 0; cursor: pointer; margin-bottom: 8px;
}
.bought-toggle h4 { flex: 1; margin: 0; border: none; padding: 0; color: var(--ink-soft); }
.bought-chevron { color: var(--ink-soft); transition: transform 0.2s ease; flex-shrink: 0; }
.bought-chevron.open { transform: rotate(180deg); }

/* --- Ligne d'article : contenu glissable (swipe) sur un fond qui révèle
   une action selon le sens du geste --- */
.shopping-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.shopping-item-swipe { position: relative; overflow: hidden; border-radius: 8px; }
.shopping-item-swipe-hint {
  position: absolute; inset: 0; display: flex; align-items: center;
  font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.5px; text-transform: uppercase; color: #fff;
}
.shopping-item-swipe-hint.hint-check { justify-content: flex-start; padding-left: 16px; background: #3E7A3E; }
.shopping-item-swipe-hint.hint-delete { justify-content: flex-end; padding-right: 16px; background: var(--wine); }
.shopping-item-content {
  position: relative; z-index: 1; background: var(--parchment);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 3px 1px; font-size: 0.92rem;
}
.shopping-list li.checked .shopping-item-content { opacity: 0.45; text-decoration: line-through; }
.checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; }
.checkbox {
  width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--gold);
  display: flex; align-items: center; justify-content: center; color: var(--gold); flex-shrink: 0;
}
.qty-stepper { display: flex; gap: 4px; opacity: 0.45; flex-shrink: 0; }
.qty-stepper button {
  width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface-strong); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer;
}

/* --- Navigation basse --- */
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  display: flex; justify-content: space-around;
  background: var(--chrome);
  border-top: 2px solid var(--gold);
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
}
.nav-btn {
  background: none; border: none; color: #b6a884;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  cursor: pointer; padding: 4px 10px;
}
.nav-btn.active { color: var(--gold-light); }

/* --- Modales / page de grimoire --- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(20,14,4,0.55);
  display: flex; align-items: flex-end; justify-content: center;
  /* Volontairement au-dessus du FAB "+" (voir .fab, z-index: 50) : les
     deux étaient à égalité avant ce correctif, un pur hasard d'ordre DOM
     décidait alors lequel des deux gagnait le dessus — le bouton flottant
     repassait parfois visuellement PAR-DESSUS une modale ouverte. */
  z-index: 55;
  padding: 0;
  touch-action: none; overscroll-behavior: contain;
}
.modal, .grimoire-page {
  background: var(--parchment);
  width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; overflow-x: hidden;
  border-radius: 18px 18px 0 0;
  padding: 22px 20px 30px;
  position: relative;
  border-top: 3px solid var(--gold);
  animation: slideUp 0.28s ease;
  overscroll-behavior: contain;
  touch-action: pan-y;
}
.form-clean { max-width: 100%; overflow-x: hidden; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
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
   Bottom sheet ancré en bas (voir .modal-backdrop) : sur mobile (PWA iOS
   en particulier), son contenu pouvait dépasser sous la barre de
   navigation basse et cacher le dernier bouton ("Supprimer la recette").
   z-index explicite au-dessus de .bottom-nav, hauteur plafonnée avec
   défilement interne garanti, et un padding bas qui réserve toute la
   hauteur de la nav basse (~70px) EN PLUS de la zone sûre iOS (encoche/
   indicateur d'accueil) — un simple env(safe-area-inset-bottom) seul ne
   suffisait pas : il protège de l'encoche du système, pas de la barre de
   navigation propre à l'appli, posée par-dessus. --- */
.modal.recipe-options-modal {
  z-index: 60;
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 70px);
}

/* --- Assistant "Ajouter un repas" (Planification) — même défaut que
   .recipe-options-modal ci-dessus : sur l'étape "Quel repas ?" (4 lignes
   pleine largeur), le bas de la feuille se retrouvait caché sous
   .bottom-nav. Même remède : hauteur plafonnée avec défilement interne
   garanti, plus un padding bas qui réserve la hauteur de la nav basse EN
   PLUS de la zone sûre iOS. --- */
.modal.planning-step-modal {
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 70px);
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

/* --- Panneau admin du foyer (Réglages secrets) --- */
.household-add-row { display: flex; gap: 8px; align-items: center; }
.household-email-input {
  flex: 1; font-family: 'EB Garamond', serif; font-size: 0.95rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  padding: 9px 10px;
}
.household-members-list { list-style: none; padding: 0; margin: 0 0 12px; display: flex; flex-direction: column; gap: 6px; }
.household-member-row {
  display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--ink-soft);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px;
}
/* Modale de gestion des foyers : bien plus longue depuis l'ajout des
   sections rejoindre/inviter/demandes en attente — même correctif que
   .recipe-picker-modal/.planning-step-modal (voir plus haut) pour que le
   dernier élément (le formulaire "Ajouter un membre") ne reste jamais
   caché sous .bottom-nav. */
.modal.household-manager-modal {
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 70px);
}
.household-admin-badge {
  flex-shrink: 0; font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--gold); background: rgba(179,135,42,0.15); border: 1px solid rgba(179,135,42,0.4);
  border-radius: 999px; padding: 2px 8px;
}
.household-member-badge {
  flex-shrink: 0; font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--ink-soft); background: var(--surface); border: 1px solid var(--line);
  border-radius: 999px; padding: 2px 8px;
}
.household-pending-row { gap: 10px; }
.household-pending-action {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.household-pending-action.approve { color: var(--forest); border-color: rgba(62,122,62,0.4); }
.household-pending-action.reject { color: var(--wine); border-color: rgba(124,50,50,0.35); }
.household-pending-action:disabled { opacity: 0.5; cursor: default; }
/* --- Partage d'invitation (lien + QR) --- */
.household-invite-panel {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  margin-top: 10px; padding: 14px; border: 1px dashed rgba(179,135,42,0.4); border-radius: 12px;
  background: var(--surface-soft);
}
.household-invite-panel .household-add-row { width: 100%; }
.household-invite-qr { border-radius: 8px; background: #fff; padding: 6px; border: 1px solid var(--line); }

/* --- Profil (prénom/nom/surnom + avatar) --- */
.profile-editor-row { display: flex; gap: 10px; align-items: center; }
.avatar-picker {
  flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; overflow: hidden;
  background: var(--surface-strong); border: 1px solid var(--line); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
}
.avatar-picker:disabled { opacity: 0.6; cursor: not-allowed; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-img-small { width: 20px; height: 20px; flex-shrink: 0; }

/* --- Carte de profil (en tête des Réglages) --- */
.profile-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 4px 0 20px; }
/* Enveloppe non-rognée : .profile-card-avatar garde son overflow:hidden
   (pour que la photo reste bien circulaire), donc la pastille de statut
   doit vivre ICI, à côté, pour pouvoir déborder légèrement du cercle sans
   se faire couper — même principe qu'un badge de statut iOS. */
.profile-card-avatar-wrap { position: relative; width: 88px; height: 88px; flex-shrink: 0; }
.profile-card-avatar {
  width: 88px; height: 88px; border-radius: 50%; overflow: hidden;
  background: var(--surface-strong); border: 2px solid var(--gold); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
}
.profile-card-avatar:disabled { opacity: 0.6; cursor: not-allowed; }
.profile-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
/* --- Pastille de statut Supabase (coin inférieur droit de l'avatar) --- */
.connection-status-dot {
  position: absolute; bottom: 2px; right: 2px; z-index: 2; pointer-events: none;
  width: 16px; height: 16px; border-radius: 50%;
  /* Liseré assorti au fond RÉEL derrière l'avatar (le fond plus sombre de
     .ios-settings-modal, pas le parchemin standard) — pour un effet de
     "découpe" propre plutôt qu'un anneau clair mal assorti. */
  border: 2.5px solid var(--grouped-bg);
  background: #ff9500; /* orange par défaut (connexion en cours) */
  transition: background-color 0.4s ease;
}
.connection-status-dot.connection-status-online { background: #34c759; }
.connection-status-dot.connection-status-offline { background: #ff3b30; }
.connection-status-dot.connection-status-checking { background: #ff9500; }
.profile-card-name {
  font-family: 'Cinzel', serif; font-size: 1.05rem; color: var(--ink); margin-top: 8px;
  background: none; border: none; padding: 0; cursor: pointer;
}
.profile-card-email { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.8rem; color: var(--ink-soft); margin: 0; }
.profile-card-edit-btn { margin-top: 12px; }

/* --- Interrupteur (switch) --- */
.switch {
  position: relative; flex-shrink: 0; width: 42px; height: 25px; padding: 2px;
  border-radius: 999px; border: 1px solid var(--line); background: var(--surface-strong);
  cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease;
}
.switch.on { background: var(--chrome); border-color: var(--chrome); }
.switch-knob {
  display: block; width: 19px; height: 19px; border-radius: 50%;
  background: var(--parchment); box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  transform: translateX(0); transition: transform 0.15s ease, background 0.15s ease;
}
.switch.on .switch-knob { transform: translateX(17px); background: var(--gold-light); }

/* --- Ligne de réglage (libellé + contrôle, ex. badge Nutri-Score) --- */
.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0 10px; }
.settings-row-label { display: flex; flex-direction: column; gap: 2px; }
.settings-row-title { font-family: 'EB Garamond', serif; font-size: 0.95rem; color: var(--ink); }
.settings-row-sub { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.78rem; color: var(--ink-soft); }
.settings-divider { border: none; border-top: 1px dashed var(--line); margin: 22px 0 0; }
.ingredient-list, .steps-list { padding-left: 20px; margin: 0 0 12px; }
.ingredient-list li, .steps-list li { margin-bottom: 5px; font-size: 0.95rem; }
.recipe-notes { font-style: italic; color: var(--ink-soft); font-size: 0.92rem; line-height: 1.5; margin: 0 0 12px; }

.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 0.82rem; color: var(--ink-soft); font-family: 'Cinzel', serif; letter-spacing: 0.3px; max-width: 100%; }
.field input, .field select, .field textarea {
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  padding: 9px 10px; resize: vertical; width: 100%; max-width: 100%;
}
.field-row { display: flex; gap: 10px; max-width: 100%; }
.field-row .field { flex: 1; min-width: 0; }
.field-discreet { opacity: 0.8; }
.field-discreet span { font-size: 0.72rem; }
/* Bouton qui ouvre le sélecteur à roues (Temps/Portions, voir
   WheelPickerModal) — même apparence que .field input pour rester
   visuellement identique aux autres champs du formulaire. */
.wheel-trigger-btn {
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  padding: 9px 10px; width: 100%; max-width: 100%; text-align: left; cursor: pointer;
}
.wheel-trigger-btn:active { background: var(--surface); }
.field-discreet input { font-size: 0.9rem; padding: 7px 9px; }

/* --- Section "Valeurs nutritionnelles" (formulaire recette) — pliable,
   même principe visuel que les autres rangées repliables de l'app
   (ex. .bought-toggle) : un bouton pleine largeur avec chevron qui pivote,
   le contenu ne se monte que si ouvert. --- */
.nutrition-toggle {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  width: 100%; padding: 10px 12px; margin-bottom: 10px;
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--ink-soft); cursor: pointer;
}
.nutrition-chevron { transition: transform 0.2s ease; flex-shrink: 0; }
.nutrition-chevron.open { transform: rotate(180deg); }
.nutrition-fields { margin-bottom: 10px; }
.nutrition-estimate-btn {
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px;
  color: var(--gold); font-family: 'EB Garamond', serif; font-size: 0.92rem;
}
.nutrition-estimate-btn:disabled { opacity: 0.6; cursor: default; }

/* --- Ingrédients structurés (formulaire) --- */
.ingredient-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.row-drag-handle {
  flex-shrink: 0; width: 26px; height: 30px; border: none; border-radius: 6px;
  background: rgba(179,135,42,0.15); color: var(--gold); font-size: 15px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none; user-select: none;
}
.row-drag-handle:active { cursor: grabbing; background: rgba(179,135,42,0.3); }
.ingredient-row { display: flex; gap: 6px; align-items: center; max-width: 100%; }
.ing-qty {
  width: 56px; flex-shrink: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 8px 6px;
}
.ing-unit {
  width: 92px; flex-shrink: 0; font-family: 'EB Garamond', serif; font-size: 0.82rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 8px 4px;
}
.ing-name {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 8px 9px;
}
.ing-remove {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface); color: var(--wine); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.ingredient-section-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.ing-section-title {
  flex: 1; min-width: 0; font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.3px; color: var(--gold);
  background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.4); border-radius: 8px; padding: 8px 10px;
}
.add-ingredient-btn { display: block; margin: 2px 0 18px; }
.long-press-hint { font-family: 'EB Garamond', serif; text-transform: none; letter-spacing: 0; font-style: italic; opacity: 0.65; font-size: 0.7rem; }

/* --- Étapes structurées (formulaire) --- */
.step-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.step-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.step-row-num {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  background: var(--gold); color: #2a1c07; font-family: 'Cinzel', serif; font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center;
}
.step-text {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 8px 9px;
}
.step-remove {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface); color: var(--wine); display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 0.8rem; line-height: 1;
}
.step-section-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.step-section-title {
  flex: 1; min-width: 0; font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.3px; color: var(--gold);
  background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.4); border-radius: 8px; padding: 8px 10px;
}
.add-step-btn { display: block; margin: 2px 0 18px; }
.delete-recipe-btn { display: block; margin: 6px auto 0; color: var(--wine); text-align: center; }
.form-footer { margin-top: 22px; padding-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.form-footer .seal { width: 100%; justify-content: center; }

/* --- Flourish glissant (onglet Courses) --- */
.flourish-swipe {
  cursor: grab; touch-action: pan-y; user-select: none;
}
.flourish-swipe.hint-right { color: #3E7A3E; }
.flourish-swipe.hint-left { color: var(--wine); }

/* --- Petits liens texte --- */
.link-btn {
  background: none; border: none; color: var(--gold);
  font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 0.5px;
  display: inline-flex; align-items: center; gap: 5px;
  cursor: pointer; padding: 4px 0; text-transform: uppercase;
}

/* --- Import / partage --- */
.import-panel { margin: 10px 0 6px; display: flex; flex-direction: column; gap: 8px; }
.import-panel textarea {
  font-family: 'EB Garamond', serif; font-size: 0.9rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px;
  width: 100%; max-width: 100%;
}
.import-panel-actions { display: flex; justify-content: space-between; align-items: center; }
.import-error { color: var(--wine); font-size: 0.8rem; margin: 0; }
.share-textarea {
  width: 100%; font-family: monospace; font-size: 0.78rem; color: var(--ink-soft);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  padding: 10px; margin-bottom: 14px; resize: vertical;
}
.share-option-row { display: flex; gap: 10px; flex-wrap: wrap; }
.share-option-row .seal { flex: 1; justify-content: center; }

/* --- Grille des 3 modes d'export "Livre de Cuisine" (ShareRecipeModal) --- */
.cookbook-export-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cookbook-export-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 16px 8px; border-radius: 14px; border: 1px solid var(--line);
  background: var(--surface); color: var(--gold); cursor: pointer;
  font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.3px; text-align: center;
}
.cookbook-export-tile:disabled { opacity: 0.55; cursor: default; }
.cookbook-export-tile:active:not(:disabled) { background: var(--surface-strong); }

/* --- Choix d'ajout / import de recette --- */
.add-choice-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.add-choice-list .seal { justify-content: center; }
.template-textarea {
  width: 100%; font-family: 'EB Garamond', serif; font-size: 0.88rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 8px;
  padding: 10px; margin: 4px 0 12px; resize: vertical; line-height: 1.5;
}

/* --- Thème (Clair / Sombre / Système) — utilisé par le sélecteur de     */
/*     foyer (HouseholdManagerModal/HouseholdAdminPanel) ; les réglages    */
/*     Thème/Appui long/Taille de texte utilisent désormais .segmented    */
/*     (voir la section "RÉGLAGES" plus bas). --- */
.theme-options { display: flex; gap: 8px; }
.theme-pill {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 6px; border-radius: 10px; border: 1px solid var(--line);
  background: var(--surface); cursor: pointer; color: var(--ink);
}
.theme-pill.active { background: var(--chrome); border-color: var(--chrome); color: var(--gold-light); }
.theme-pill-label { font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.5px; text-transform: uppercase; }

/* --- Toast --- */
.toast {
  position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%);
  background: var(--chrome); color: var(--gold-light);
  font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.5px;
  padding: 10px 18px; border-radius: 999px; border: 1px solid var(--gold);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3); z-index: 70; text-align: center;
  animation: fadeIn 0.25s ease;
}

/* --- Mode cuisine --- */
.cookmode-backdrop {
  position: fixed; inset: 0; z-index: 60; background: #2c221e;
  display: flex; align-items: center; justify-content: center;
}
.cookmode {
  width: 100%; max-width: 480px; height: 100%;
  padding: calc(30px + env(safe-area-inset-top)) 20px 30px;
  color: var(--chrome-text); position: relative;
  display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
}
.cookmode .modal-close { top: calc(14px + env(safe-area-inset-top)); background: rgba(255,255,255,0.12); color: var(--chrome-text); }
.cookmode-progress { flex-shrink: 0; font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 2px; color: var(--gold-light); text-transform: uppercase; }
.cookmode .dropcap-title { flex-shrink: 0; color: var(--chrome-text); margin: 0; }
.cookmode-steps { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.cookmode-step-card {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(217,180,92,0.3); border-radius: 12px;
  padding: 14px; display: flex; gap: 12px; cursor: pointer;
}
.cookmode-step-card.done { opacity: 0.5; }
.cookmode-step-card.done .cookmode-step-text { text-decoration: line-through; }
.step-check {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--gold-light);
  display: flex; align-items: center; justify-content: center; color: var(--gold-light); flex-shrink: 0; margin-top: 2px;
}
.step-body { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cookmode-step-text { font-size: 1.12rem; line-height: 1.5; margin: 0; }
.step-timer-btn {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid rgba(217,180,92,0.5);
  background: rgba(217,180,92,0.12);
  color: var(--gold-light);
  cursor: pointer;
}
.step-timer-btn.running { background: rgba(255,255,255,0.16); color: #fff; border-color: rgba(255,255,255,0.35); }
.step-timer-btn.done { background: rgba(95,154,74,0.25); color: #8fbf7a; border-color: #5f9a4a; }

/* --- Indicateur de portions compact (mode cuisine) --- */
.cookmode-ingredients-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-shrink: 0; position: relative;
}
.portion-badge-wrap { position: relative; flex-shrink: 0; }
.portion-badge {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(217,180,92,0.5);
  background: rgba(217,180,92,0.15); color: var(--gold-light);
  font-family: 'Cinzel', serif; font-size: 0.92rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}
.portion-badge.charging { animation: portionShake 0.4s ease forwards; background: rgba(217,180,92,0.3); }
.portion-badge.open { transform: scale(1.15); background: rgba(217,180,92,0.35); }
@keyframes portionShake {
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.05) rotate(-6deg); }
  40% { transform: scale(1.08) rotate(5deg); }
  60% { transform: scale(1.12) rotate(-3deg); }
  80% { transform: scale(1.14) rotate(2deg); }
  100% { transform: scale(1.15) rotate(0deg); }
}
.portion-badge-popover {
  position: absolute; top: 42px; right: 0; z-index: 20;
  background: #241a14; border: 1px solid rgba(217,180,92,0.4); border-radius: 14px;
  padding: 8px 10px 4px; box-shadow: 0 10px 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  animation: wheelPopIn 0.22s ease;
}
@keyframes wheelPopIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.92); }
  to { opacity: 1; transform: none; }
}
.portion-wheel-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  height: 120px;
}
.portion-wheel {
  height: 120px; width: 66px; overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.portion-wheel::-webkit-scrollbar { display: none; }
.portion-wheel-item {
  height: 40px; display: flex; align-items: center; justify-content: center;
  scroll-snap-align: center;
  font-family: 'Cinzel', serif; font-size: 1.05rem; color: rgba(252,248,242,0.32);
  transition: color 0.15s ease, font-size 0.15s ease;
}
.portion-wheel-item.active { color: var(--gold-light); font-size: 1.55rem; font-weight: 600; }
.portion-wheel-highlight {
  position: absolute; top: 50%; left: 0; right: 0; height: 40px; transform: translateY(-50%);
  border-top: 1px solid rgba(217,180,92,0.4); border-bottom: 1px solid rgba(217,180,92,0.4);
  pointer-events: none;
}
.portion-wheel-suffix {
  font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--chrome-text); opacity: 0.6;
}
.portion-wheel-wrap.light .portion-wheel-item { color: rgba(42,32,19,0.32); }
.portion-wheel-wrap.light .portion-wheel-item.active { color: var(--gold); }
.portion-wheel-wrap.light .portion-wheel-highlight { border-color: rgba(179,135,42,0.5); }
.portion-wheel-wrap.light .portion-wheel-suffix { color: var(--ink-soft); }

/* --- Feuille de quantité (courses) — voir QuantitySheet.jsx. Remplace
   l'ancienne molette à roue (peu lisible pour de grandes valeurs, geste
   de défilement capricieux dans une feuille déjà défilante) par une
   saisie directe + des raccourcis + un choix d'unité. --- */
.qty-wheel-modal { text-align: center; }
.qty-sheet-input {
  width: 100%; text-align: center; font-family: 'Cinzel', serif; font-size: 1.8rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 12px;
  padding: 14px 10px; margin: 6px 0 18px;
}
.qty-sheet-quick-picks { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.qty-sheet-chip {
  font-family: 'EB Garamond', serif; font-size: 0.88rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--line); border-radius: 999px;
  padding: 7px 15px; cursor: pointer;
}
.qty-sheet-chip:active { background: var(--surface); }
.qty-sheet-units { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.qty-sheet-unit-pill {
  font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--ink-soft); background: var(--surface); border: 1px solid var(--line); border-radius: 999px;
  padding: 8px 14px; cursor: pointer;
}
.qty-sheet-unit-pill.active { background: var(--chrome); color: var(--gold-light); border-color: var(--chrome); }
.qty-sheet-save { margin-top: 18px; display: flex; justify-content: center; }
/* Sélecteur à roues générique (voir WheelPickerModal) : une ou plusieurs
   roues .portion-wheel-wrap côte à côte (ex. Heures / Minutes). */
.time-wheel-wrap { display: flex; justify-content: center; align-items: center; gap: 18px; margin: 10px 0 4px; }

/* --- Gestion des listes de courses --- */
.lists-manager { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.lists-manager-row {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  border-radius: 10px; border: 1px solid var(--line); background: var(--surface);
}
.lists-manager-row.active { border-color: var(--gold); background: rgba(179,135,42,0.12); }
.lists-manager-name {
  flex: 1; min-width: 0; text-align: left; background: none; border: none; cursor: pointer;
  display: flex; flex-direction: column; gap: 2px; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
}
.lists-manager-count { font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.5px; color: var(--ink-soft); text-transform: uppercase; }
.lists-manager-rename-input {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid var(--gold); border-radius: 6px; padding: 6px 8px;
}
.lists-manager-icon-btn {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--surface-strong); color: var(--ink-soft); font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.lists-manager-delete { color: var(--wine); }

/* --- Rappel ingrédients (mode cuisine) --- */
.ingredients-toggle {
  flex-shrink: 0;
  align-self: flex-start;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(217,180,92,0.4);
  color: var(--gold-light); font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 1px;
  text-transform: uppercase; padding: 8px 14px; border-radius: 999px; cursor: pointer;
}
.cookmode-ingredients {
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(217,180,92,0.25); border-radius: 10px;
  padding: 12px 16px; max-height: 160px; overflow-y: auto;
}
.cookmode-ingredients ul { margin: 0; padding-left: 18px; list-style: disc; }
.cookmode-ingredients li { font-size: 0.9rem; margin-bottom: 5px; color: var(--chrome-text); }
.cookmode-ingredients li.ingredient-section-title,
.ingredient-list li.ingredient-section-title {
  list-style: none; margin-left: -18px; margin-top: 8px;
  font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--gold);
}
.cookmode-ingredients li.ingredient-section-title { color: var(--gold-light); }
.steps-group-title {
  font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.5px; color: var(--gold);
  margin: 14px 0 6px;
}
.group-nav {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 4px; flex-shrink: 0;
}
.group-nav-btn {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(217,180,92,0.4);
  background: rgba(255,255,255,0.08); color: var(--gold-light); cursor: pointer;
}
.group-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.group-nav-label { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.5px; color: var(--chrome-text); text-align: center; flex: 1; }
.group-nav-label em { font-style: normal; color: var(--gold-light); font-size: 0.7rem; }
.group-solo-title { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold-light); margin: 4px 0 0; flex-shrink: 0; }
.steps-group { margin-bottom: 6px; }
.steps-group-title:first-child { margin-top: 0; }
.cookmode-nav { display: flex; gap: 12px; justify-content: space-between; margin-top: auto; }
.cookmode-nav .seal { flex: 1; justify-content: center; }

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

  /* --- Fiche recette : deux colonnes, sans long défilement vertical --- */
  .detail-scroll { max-width: 900px; max-height: 84vh; }
  .detail-columns {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 28px;
    align-items: start;
  }
  .detail-info-col .detail-hero { border-radius: 12px; overflow: hidden; }
  .detail-body-col {
    max-height: calc(84vh - 90px);
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

/* ------------------------------------------------------------------ */
/*  RÉGLAGES — liste groupée façon iOS (Human Interface Guidelines)     */
/*  Utilisé par SecretSettingsModal et ses sous-panneaux (Apparence &   */
/*  Langue, Accessibilité, Sauvegarde & Importation) : fond légèrement   */
/*  plus sombre que le reste de l'app (.ios-settings-modal) pour faire   */
/*  ressortir des cartes arrondies groupées (.ios-group), chacune         */
/*  composée de rangées de navigation (.ios-row) avec icône carrée        */
/*  ("squircle"), titre et chevron — la palette reste celle du grimoire   */
/*  (or/parchemin/lie-de-vin), seule la structure vient d'iOS.            */
/* ------------------------------------------------------------------ */
.ios-settings-modal { background: var(--grouped-bg); }

.ios-group-title {
  font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--ink-soft); opacity: 0.85; margin: 22px 6px 8px;
}

.ios-group {
  background: var(--grouped-card-bg); border-radius: 14px; overflow: hidden;
  box-shadow: 0 1px 3px var(--card-shadow);
}
.ios-group-padded { padding: 10px; }

.ios-row {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 14px; border: none; background: none;
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  text-align: left; cursor: pointer;
}
.ios-group .ios-row + .ios-row { border-top: 1px solid var(--line); }
.ios-row:active { background: var(--surface); }
.ios-row-icon {
  flex-shrink: 0; width: 29px; height: 29px; border-radius: 8px; /* squircle */
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.ios-row-title { flex: 1; min-width: 0; }
.ios-chevron { color: var(--ink-soft); opacity: 0.5; flex-shrink: 0; }

.ios-row-danger {
  justify-content: center; color: var(--wine); cursor: pointer;
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; text-transform: uppercase;
}

.ios-group .settings-row { padding: 11px 14px; }
.ios-group .settings-row + .settings-row { border-top: 1px solid var(--line); }

/* --- Contrôle segmenté (Thème, Langue, appui long, taille de texte) --- */
.segmented { display: flex; background: var(--surface-strong); border-radius: 10px; padding: 3px; gap: 2px; }
.segmented-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  border: none; background: none; padding: 8px 4px; border-radius: 8px;
  font-family: 'EB Garamond', serif; font-size: 0.85rem; color: var(--ink-soft); cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.segmented-btn.active { background: var(--parchment); color: var(--ink); box-shadow: 0 1px 3px var(--card-shadow); font-weight: 600; }

/* --- Retour vers Réglages (navigation par couches, sous-panneaux) --- */
.modal-back {
  position: absolute; top: 14px; left: 14px; z-index: 5;
  display: flex; align-items: center;
  background: none; border: none; padding: 5px 8px 5px 2px; border-radius: 8px;
  color: var(--gold); font-family: 'EB Garamond', serif; font-size: 0.95rem; cursor: pointer;
}
.modal-back:active { background: var(--modal-close-bg); }

/* ------------------------------------------------------------------ */
/*  PLANIFICATION — plan de repas hebdomadaire (voir PlanningView.jsx)   */
/* ------------------------------------------------------------------ */
.planning-header { margin-bottom: 4px; }
.planning-week-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 10px; }
.planning-week-arrow {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: var(--surface-strong); border: 1px solid var(--line); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.planning-week-arrow:active { background: var(--surface); }
.planning-week-range {
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.9rem; color: var(--ink-soft);
  min-width: 190px; text-align: center;
}

.planning-days { display: flex; flex-direction: column; gap: 10px; margin: 18px 0 20px; }
.planning-day { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px 14px; }
.planning-day.today { border-color: var(--gold); background: rgba(179,135,42,0.08); }
.planning-day-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.planning-day-label {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--ink);
  display: flex; align-items: center; gap: 8px;
}
.planning-today-badge {
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase;
  background: var(--gold); color: #2a1c07; border-radius: 999px; padding: 2px 8px; flex-shrink: 0;
}
.planning-add-btn {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  border: 1px dashed rgba(179,135,42,0.5); background: none; color: var(--gold);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.planning-add-btn:active { background: rgba(179,135,42,0.12); }
.planning-meals { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.planning-meal-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface-strong); border-radius: 8px; padding: 7px 10px;
}
.planning-meal-icon { font-size: 1.1rem; flex-shrink: 0; line-height: 1; }
.planning-meal-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.planning-meal-type {
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink-soft);
}
.planning-meal-recipe {
  font-family: 'EB Garamond', serif; font-size: 0.9rem; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.planning-meal-remove {
  flex-shrink: 0; background: none; border: none; color: var(--ink-soft); opacity: 0.6; cursor: pointer;
  display: flex; align-items: center; padding: 4px;
}
.planning-meal-remove:active { opacity: 1; }

.planning-send-wrap { margin: 8px 0 100px; display: flex; justify-content: center; }

/* --- Calendrier mensuel (voir CalendarPicker.jsx, AddMealModal.jsx) --- */
.calendar-picker { margin: 4px 0 10px; }
.calendar-picker-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px; }
.calendar-picker-month {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--ink);
  text-transform: capitalize; min-width: 140px; text-align: center;
}
.calendar-picker-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-picker-weekdays { margin-bottom: 4px; }
.calendar-picker-weekdays span {
  text-align: center; font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  text-transform: uppercase; color: var(--ink-soft);
}
.calendar-picker-day {
  aspect-ratio: 1; border-radius: 50%; border: none; background: none;
  font-family: 'EB Garamond', serif; font-size: 0.88rem; color: var(--ink); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.calendar-picker-day.outside { color: var(--ink-soft); opacity: 0.4; }
.calendar-picker-day.today { border: 1px solid var(--gold); }
.calendar-picker-day.selected { background: var(--chrome); color: var(--gold-light); font-weight: 600; }
.calendar-picker-day:active { background: var(--surface-strong); }
.calendar-picker-day.selected:active { background: var(--chrome); }
`;
