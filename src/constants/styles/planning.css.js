/* ------------------------------------------------------------------ */
/*  PLANIFICATION — semaine, jours, calendrier */
/*  Extrait de styles.css.js (lignes 1618-1696 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const PLANNING_CSS = `
/* ------------------------------------------------------------------ */
/*  PLANIFICATION — plan de repas hebdomadaire (voir PlanningView.jsx)   */
/* ------------------------------------------------------------------ */
.planning-header { margin-bottom: 4px; }
.planning-scope-toggle-wrap { display: flex; justify-content: center; margin-top: 10px; }
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
