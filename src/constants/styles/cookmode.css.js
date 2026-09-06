/* ------------------------------------------------------------------ */
/*  MODE CUISINE — étapes, molette de portions, feuille de quantité, listes */
/*  Extrait de styles.css.js (lignes 1199-1404 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const COOKMODE_CSS = `
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

`;
