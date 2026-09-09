/* ------------------------------------------------------------------ */
/*  COQUILLE — en-tête, barre de recherche, filtres, zone de contenu */
/*  Extrait de styles.css.js (lignes 136-288 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const SHELL_CSS = `
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
  margin: 8px auto 0; max-width: 340px; padding: 5px 8px 5px 12px;
  font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: #ff3b30; background: rgba(255,59,48,0.12);
  border: 1px solid rgba(255,59,48,0.4); border-radius: 999px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.offline-banner-retry {
  flex-shrink: 0; border: 1px solid rgba(255,59,48,0.5); border-radius: 999px;
  background: rgba(255,59,48,0.18); color: #ff3b30;
  font-family: 'Cinzel', serif; font-size: 0.58rem; letter-spacing: 0.5px; text-transform: uppercase;
  padding: 3px 9px; cursor: pointer;
}
.offline-banner-retry:active { background: rgba(255,59,48,0.3); }

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
  /* iOS Safari masque déjà les barres de défilement au repos ; Android
     Chrome, lui, affiche un rail gris permanent pour tout overflow:auto
     sans cette règle — visible comme un liseré indésirable sous les puces
     de filtre. Même correctif déjà appliqué à .portion-wheel plus bas. */
  scrollbar-width: none;
}
.filter-bar::-webkit-scrollbar { display: none; }
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
     scroll 3 à 5s en butant sur les bords haut/bas de la vue Recettes.
     Conservé : overscroll-behavior-y (la partie qui agit réellement ici).
     -webkit-overflow-scrolling: touch RETIRÉ — cette propriété n'a de sens
     que sur un élément qui défile LUI-MÊME (overflow-y: auto/scroll), ce
     que .app-content n'est pas en portrait (c'est le document qui défile,
     voir theme.css.js) ; probablement un vestige d'une version antérieure
     où .app-content défilait par lui-même. Candidat plausible pour le
     rebond au geste constaté uniquement sous Chromium (Chrome/Edge
     desktop, Android) — jamais sous Safari iOS, la seule vraie
     destinataire de cette propriété. */
  overscroll-behavior-y: contain;
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

`;
