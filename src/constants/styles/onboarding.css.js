export const ONBOARDING_CSS = `
/* ------------------------------------------------------------------ */
/*  TUTORIEL GUIDÉ (ONBOARDING) — voir components/onboarding/            */
/*  OnboardingTour.jsx pour la logique (mesure/positionnement du trou,    */
/*  étapes, restauration de l'onglet à la fermeture).                     */
/*                                                                          */
/*  z-index: 65 — au-dessus de .bottom-nav (40) et du fond de n'importe      */
/*  quelle modale encore visible en cours de fermeture (.modal-backdrop,      */
/*  60 ; CookMode, 60) : le tuto ferme toujours la modale Réglages AVANT       */
/*  de s'ouvrir (voir SecretSettingsModal.jsx, bouton "Revoir le tutoriel"),     */
/*  mais reste au-dessus de son animation de sortie pendant le court instant       */
/*  où les deux coexistent. Sous le toast (70, misc.css.js), qui doit rester         */
/*  visible même pendant le tuto.                                                      */
/* ------------------------------------------------------------------ */
.onboarding-overlay {
  position: fixed; inset: 0; z-index: 65;
}
/* Le "trou" fait AUSSI office de fond assombri, via un box-shadow géant
   (0 0 0 9999px) plutôt qu'un second calque séparé — voir le commentaire de
   fichier d'OnboardingTour.jsx pour pourquoi une étape SANS cible (bienvenue)
   n'est alors qu'un cas particulier (taille nulle) de ce même trou, plutôt
   qu'un fond plein géré à part. "pointer-events: none" : les boutons de nav
   mis en avant restent volontairement NON cliquables pendant le tuto — on le
   fait progresser uniquement via ses propres boutons Suivant/Précédent, pour
   ne jamais risquer un aller-retour d'état à moitié fait pendant qu'il tourne. */
.onboarding-hole {
  position: fixed;
  border-radius: 999px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 3px var(--gold-light);
  pointer-events: none;
}
.onboarding-card {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: max(118px, calc(env(safe-area-inset-bottom) + 108px));
  width: min(92vw, 380px);
  background: var(--parchment);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px 22px 16px;
  box-shadow: 0 14px 34px rgba(0,0,0,0.35);
  text-align: center;
  color: var(--ink);
}
/* Même décalage qu'Android pour .bottom-nav (voir modalsBase.css.js,
   data-platform="android") : la carte doit rester au-dessus du dock quel
   que soit son propre décalage bas sur cette plateforme précise. */
:where(html[data-platform="android"]) .onboarding-card {
  bottom: max(108px, calc(env(safe-area-inset-bottom) + 96px));
}
.onboarding-card-icon {
  width: 44px; height: 44px; margin: 0 auto 6px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-light); color: var(--ink);
}
.onboarding-card p { margin: 4px 0 0; }
.onboarding-step-counter { margin: 10px 0 0 !important; }
.onboarding-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 16px;
}
.onboarding-nav-buttons { display: flex; gap: 8px; }
.onboarding-skip {
  background: none; border: none; padding: 8px 4px;
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.82rem;
  color: var(--ink-soft); text-decoration: underline; cursor: pointer;
}
`;
