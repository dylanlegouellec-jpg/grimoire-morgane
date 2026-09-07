/* ------------------------------------------------------------------ */
/*  DIVERS — flourish courses, liens, import/partage, export livre, toast */
/*  Extrait de styles.css.js (lignes 1122-1198 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const MISC_CSS = `
/* --- Flourish glissant (onglet Courses) --- */
.flourish-swipe {
  cursor: grab; touch-action: pan-y; user-select: none;
}
.flourish-swipe.hint-right { color: var(--forest); }
.flourish-swipe.hint-left { color: var(--wine); }

/* --- Petits liens texte --- */
.link-btn {
  background: none; border: none; color: var(--gold);
  font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 0.5px;
  display: inline-flex; align-items: center; gap: 5px;
  cursor: pointer; padding: 4px 0; text-transform: uppercase;
}
.link-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.add-custom-meal-btn { margin-bottom: 14px; }

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

`;
