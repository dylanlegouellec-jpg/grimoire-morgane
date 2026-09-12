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
/* Flèches + date + toggle de portée sur une seule ligne (voir
   PlanningView.jsx) : le toggle reste collé au bord droit
   (flex-shrink: 0 par défaut sur .segmented), tout le reste de la
   largeur va à .planning-week-date-group (flex: 1) — les flèches
   s'écartent jusqu'aux bords de cet espace restant et la date (elle
   aussi flex: 1, entre les deux flèches) se centre dans tout ce qui
   reste, donc utilise toute la largeur disponible au lieu de rester
   en cluster serré au milieu de l'écran. */
.planning-week-nav { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.planning-week-date-group { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; }
.planning-week-arrow {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: var(--surface-strong); border: 1px solid var(--line); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.planning-week-arrow:active { background: var(--surface); }
.planning-week-range {
  flex: 1; min-width: 0;
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.86rem; color: var(--ink-soft);
  white-space: nowrap; text-align: center;
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
/* Un bloc par MOMENT (Petit-déjeuner/Déjeuner/Dîner/En-cas) plutôt qu'une
   carte par plat — voir PlanningView.jsx (groupEntriesByMealType) : le
   titre du moment ne s'affiche qu'une fois dans .planning-meal-group-header,
   les plats de ce moment (triés dans l'ordre gastronomique, voir
   courseTypeOrder) s'empilent en-dessous dans .planning-meal-group-items. */
.planning-meal-group {
  background: var(--surface-strong); border-radius: 8px; padding: 7px 10px;
}
.planning-meal-group-header { display: flex; align-items: center; gap: 10px; }
.planning-meal-icon { font-size: 1.1rem; flex-shrink: 0; line-height: 1; }
.planning-meal-type {
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink-soft);
}
.planning-meal-group-items { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
/* Appui long -> menu Modifier/Supprimer (voir PlanningMealItem.jsx,
   MealOptionsModal.jsx) : plus de croix de suppression sur la ligne, le
   padding/border-radius sert de zone tactile et de forme au léger
   enfoncement (.press-anim, partagé avec RecipeCard/NavButton/les rangées
   du foyer — voir hooks/useLongPress.js) déclenché pendant l'appui. */
.planning-meal-item { display: flex; align-items: center; gap: 8px; padding: 3px 2px; border-radius: 6px; }
/* Icône du TYPE DE PLAT (Apéro/Entrée/Plat/Dessert) — absente du DOM pour
   petit-déjeuner/en-cas (voir mealTypeHasCourse), la ligne se réduit alors à
   son nom de recette sans indentation ni étiquette. */
.planning-meal-course-icon { font-size: 0.95rem; flex-shrink: 0; line-height: 1; width: 16px; text-align: center; }
.planning-meal-item-info { flex: 1; display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.planning-meal-course-label {
  font-family: 'Cinzel', serif; font-size: 0.55rem; letter-spacing: 0.4px; text-transform: uppercase; color: var(--ink-soft);
  flex-shrink: 0;
}
.planning-meal-recipe {
  font-family: 'EB Garamond', serif; font-size: 0.9rem; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.planning-send-wrap { margin: 8px 0 100px; display: flex; justify-content: center; }

/* --- Sélecteur de type de plat (AddMealModal.jsx, étape recette) ---
   En haut à droite, exactement là où .modal-close (top:14px; right:14px)
   se pose sur les autres étapes de cet assistant — cette étape-ci utilise
   .modal-back (haut GAUCHE) à la place, laissant ce coin libre. N'existe
   dans le DOM que pour Déjeuner/Dîner (voir mealTypeHasCourse) : masqué
   entièrement plutôt que désactivé/ignoré pour Petit-déjeuner/En-cas, sans
   quoi son intitulé ("Plat" par défaut) resterait visible sans jamais rien
   changer à ce qui est enregistré, ce qui est trompeur pour l'utilisateur.
   Un <select> natif plutôt qu'un contrôle personnalisé : le texte de
   l'option choisie (icône comprise) s'affiche déjà tel quel sans code
   supplémentaire pour synchroniser une icône séparée, et le clavier/
   lecteur d'écran du système gèrent son ouverture sans rien de plus ici. */
.meal-course-select {
  position: absolute; top: 12px; right: 14px; z-index: 5;
  max-width: 130px;
  background: var(--modal-close-bg); border: 1px solid var(--line); border-radius: 999px;
  padding: 6px 10px;
  font-family: 'EB Garamond', serif; font-size: 0.82rem; color: var(--ink);
  cursor: pointer;
}

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
