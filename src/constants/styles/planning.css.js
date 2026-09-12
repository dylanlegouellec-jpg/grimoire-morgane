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
/* Accordéon par jour (voir PlanningView.jsx, isDayExpanded/toggleDay) : le
   "+" reste un bouton frère séparé (voir .planning-add-btn) plutôt que
   niché dans celui-ci — un <button> dans un <button> est invalide en HTML,
   et cliquer sur "+" ne doit de toute façon jamais (re)plier le jour (voir
   son propre e.stopPropagation() côté PlanningView.jsx). */
.planning-day-toggle {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
  background: none; border: none; padding: 0; margin: 0; text-align: left; cursor: pointer;
  font: inherit; color: inherit;
}
.planning-day-chevron {
  flex-shrink: 0; color: var(--ink-soft);
  transform: rotate(-90deg); transition: transform 0.18s ease;
}
.planning-day-chevron.expanded { transform: rotate(0deg); }
.planning-day-label {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--ink);
  display: flex; align-items: center; gap: 8px; min-width: 0;
}
.planning-today-badge {
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase;
  background: var(--gold); color: #2a1c07; border-radius: 999px; padding: 2px 8px; flex-shrink: 0;
}
/* Nombre de repas du jour, visible seulement replié (voir PlanningView.jsx)
   — garde le jour "scannable" sans avoir à le déplier juste pour savoir
   s'il contient déjà quelque chose. */
.planning-day-count {
  flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: var(--surface-strong); border: 1px solid var(--line); color: var(--ink-soft);
  font-family: 'Cinzel', serif; font-size: 0.65rem;
  display: flex; align-items: center; justify-content: center;
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
/* Appui long sur le TITRE du moment -> menu "Supprimer la section" (voir
   PlanningMealGroup.jsx, MealSectionOptionsModal.jsx) : padding/border-
   radius pour la zone tactile et pour la forme du léger enfoncement
   (.press-anim, même geste que .planning-course-header juste en-dessous). */
.planning-meal-group-header {
  display: flex; align-items: center; gap: 10px;
  padding: 2px; border-radius: 6px; margin: -2px -2px 0;
}
.planning-meal-icon { font-size: 1.1rem; flex-shrink: 0; line-height: 1; }
.planning-meal-type {
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink-soft);
}
.planning-meal-group-items { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
/* Sous-groupe par TYPE DE PLAT (Apéro/Entrée/Plat/Dessert) au sein d'un
   moment — voir PlanningView.jsx (groupEntriesByCourse) : un seul en-tête
   ("Entrées", au pluriel dès que ce type compte plusieurs plats — voir
   .planning-course-label) plutôt qu'une ligne répétée par recette. N'existe
   que pour Déjeuner/Dîner (voir mealTypeHasCourse) — pour les autres
   moments (petit-déjeuner/en-cas), .planning-meal-group-items contient
   directement les lignes, sans ce niveau intermédiaire. */
.planning-course-group + .planning-course-group { margin-top: 6px; }
/* Appui long sur l'en-tête -> menu Ajouter/Tout supprimer (voir
   PlanningCourseGroup.jsx, CourseOptionsModal.jsx) : padding/border-radius
   pour la zone tactile et pour la forme du léger enfoncement (.press-anim,
   même geste que .planning-meal-item — voir hooks/useLongPress.js). */
.planning-course-header {
  display: flex; align-items: center; gap: 8px;
  padding: 2px; border-radius: 6px; margin: -2px -2px 0;
}
.planning-meal-course-icon { font-size: 0.95rem; flex-shrink: 0; line-height: 1; width: 16px; text-align: center; }
.planning-course-label {
  font-family: 'Cinzel', serif; font-size: 0.58rem; letter-spacing: 0.4px; text-transform: uppercase; color: var(--ink-soft);
}
/* Liste à puces native (marqueur natif du navigateur, pas de ::before fait
   main) : le seul contenu de chaque <li> est déjà une ligne à appui long
   (.planning-meal-item, voir PlanningMealItem.jsx) — ::marker se contente
   d'en assortir la couleur au reste du texte discret de cette carte. */
.planning-course-items { list-style: disc; margin: 3px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 2px; }
.planning-course-item::marker { color: var(--ink-soft); }
/* Appui long -> menu Modifier/Supprimer (voir PlanningMealItem.jsx,
   MealOptionsModal.jsx) : plus de croix de suppression sur la ligne, le
   padding/border-radius sert de zone tactile et de forme au léger
   enfoncement (.press-anim, partagé avec RecipeCard/NavButton/les rangées
   du foyer — voir hooks/useLongPress.js) déclenché pendant l'appui. */
.planning-meal-item { display: flex; align-items: center; padding: 3px 2px; border-radius: 6px; flex: 1; min-width: 0; }
.planning-meal-recipe {
  flex: 1; min-width: 0;
  font-family: 'EB Garamond', serif; font-size: 0.9rem; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* Ligne d'un plat + sa poignée de glisser-déposer (voir PlanningMealItem.jsx,
   PlanningMealItemsList.jsx/hooks/useDragReorder.js) : deux gestes bien
   séparés côte à côte plutôt qu'imbriqués — .planning-meal-item garde son
   propre appui long (Modifier/Supprimer) inchangé, la poignée à droite
   pilote uniquement le glissement, visible seulement en mode réorganisation
   (voir "reorderMode", PlanningView.jsx). */
.planning-meal-item-row { display: flex; align-items: center; gap: 4px; }
.planning-meal-drag-handle {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 6px;
  background: none; border: none; color: var(--ink-soft); cursor: grab;
  display: flex; align-items: center; justify-content: center;
  touch-action: none;
}
.planning-meal-drag-handle:active { cursor: grabbing; background: var(--surface); }
.planning-meal-flat-item { display: flex; }
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
