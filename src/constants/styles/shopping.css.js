/* ------------------------------------------------------------------ */
/*  COURSES */
/*  Extrait de styles.css.js (lignes 639-792 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const SHOPPING_CSS = `
/* --- Courses --- */
/* Ligne "Liste 1  changer ▾" + toggle foyer/personnel (voir
   ShoppingView.jsx) : même principe que la ligne semaine de la
   Planification — le toggle reste collé au bord droit
   (flex-shrink: 0 par défaut sur .segmented), le bouton nom-de-liste
   prend tout le reste (flex: 1, min-width: 0) et son propre texte
   s'ellipse (.active-list-name-text) plutôt que de pousser le toggle
   hors de l'écran si le nom de la liste est long. */
.active-list-header { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.active-list-name {
  flex: 1; min-width: 0;
  background: none; border: none; cursor: pointer; padding: 0;
  font-family: 'Cinzel', serif; font-size: 1rem; color: var(--ink);
  display: flex; align-items: baseline; gap: 8px;
}
.active-list-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.active-list-name-empty { color: var(--ink-soft); }
.active-list-name-empty .active-list-name-text { font-style: italic; }
.active-list-switch { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.78rem; color: var(--gold); flex-shrink: 0; }
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
.recipe-select-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 34px; }
/* --- "Générer à partir de recettes" (RecipePickerModal.jsx) — en-tête fixe
   + corps défilant (flex column). .recipe-picker-body est la SEULE zone
   qui défile. */
/* Sélecteur composé (.modal.recipe-picker-modal, pas juste
   .recipe-picker-modal) : .modal/.grimoire-page (plus bas dans ce fichier)
   redéfinit aussi max-height/overflow avec la MÊME spécificité — sans le
   composé, c'est l'ORDRE dans la feuille de style qui aurait tranché, et
   .modal apparaissant après ce bloc aurait gagné, annulant purement et
   simplement overflow:hidden ici. Un sélecteur composé a une spécificité
   plus élevée et gagne toujours, quel que soit l'ordre. */
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
  position: relative; /* contexte de positionnement pour le bouton flottant sticky ci-dessous */
}
/* Bouton "Générer la liste" : plus un pied de page séparé avec son propre
   bandeau (fond parchemin + ombre) — rendu comme DERNIER enfant de
   .recipe-picker-body lui-même, "position: sticky" pour rester ancré en
   bas de la zone visible pendant le défilement de la liste, sans aucun
   fond ni bordure : seul le sceau doré ressort, porté par sa propre ombre
   (voir .recipe-picker-floating-footer .seal). "pointer-events: none" sur
   le conteneur (transparent, il n'occupe visuellement rien) et "auto" sur
   le sceau lui-même : le doigt peut toujours faire défiler/toucher une
   carte de recette juste derrière le bouton, seul le bouton capte le clic
   à l'endroit précis où il est dessiné. Absent du DOM tant qu'aucune
   recette n'est cochée (voir RecipePickerModal.jsx). */
.recipe-picker-floating-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  /* +48px (au lieu de +28px, +16px à l'origine) au-dessus de la zone sûre
     iOS : encore trop proche de .bottom-nav en dessous à +28px. */
  padding: 16px 20px calc(env(safe-area-inset-bottom, 16px) + 48px);
  background: transparent;
  pointer-events: none;
}
.recipe-picker-floating-footer .seal {
  pointer-events: auto;
  box-shadow: 0 10px 28px rgba(0,0,0,0.4);
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
.shopping-item-swipe-hint.hint-check { justify-content: flex-start; padding-left: 16px; background: var(--forest); }
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

`;
