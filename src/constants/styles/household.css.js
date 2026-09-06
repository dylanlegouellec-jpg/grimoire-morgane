/* ------------------------------------------------------------------ */
/*  FOYER (admin/profil/switch/ligne de réglage) + listes ingrédients/étapes */
/*  Extrait de styles.css.js (lignes 901-1019 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const HOUSEHOLD_CSS = `
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

`;
