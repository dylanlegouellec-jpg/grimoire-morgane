/* ------------------------------------------------------------------ */
/*  FORMULAIRE RECETTE — champs, ingrédients/étapes structurés */
/*  Extrait de styles.css.js (lignes 1020-1121 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const FORMS_CSS = `
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

`;
