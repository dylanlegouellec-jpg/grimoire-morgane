/* ------------------------------------------------------------------ */
/*  FRIGO */
/*  Extrait de styles.css.js (lignes 546-638 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const FRIDGE_CSS = `
/* --- Mon Frigo ---------------------------------------------------------
   Compteur global, accordéons par catégorie (au lieu du nuage de puces
   en vrac), et une liste "Réalisable avec ton frigo" triée par niveau de
   complétude (voir FridgeView.jsx et pantryUtils.js). --- */
.fridge-counter {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--gold); background: rgba(179,135,42,0.12); border: 1px solid rgba(179,135,42,0.3);
  border-radius: 999px; padding: 6px 14px; margin-bottom: 16px;
}
.basics-title {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--gold);
  margin: 4px 0 8px; display: flex; align-items: baseline; gap: 8px;
}
/* Variante repliable (accordéon), voir FridgeView.jsx : mêmes réglages
   typographiques, mais en pleine largeur avec un chevron aligné à droite. */
.basics-title-toggle {
  width: 100%; background: none; border: none; padding: 0; cursor: pointer;
  align-items: center; justify-content: space-between;
}
.hint-inline { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.75rem; letter-spacing: 0; text-transform: none; color: var(--ink-soft); }
.basics-grid {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
  padding: 12px; border-radius: 10px;
  background: rgba(179,135,42,0.12); border: 1px solid rgba(179,135,42,0.3);
}
.basic-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'EB Garamond', serif; font-size: 0.86rem; color: var(--ink);
  background: var(--surface-strong); border: 1px solid rgba(179,135,42,0.4);
  border-radius: 999px; padding: 6px 6px 6px 13px;
}
.basic-action {
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: rgba(179,135,42,0.2); color: var(--gold); font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}
.basic-action-remove { background: rgba(124,50,50,0.15); color: var(--wine); }

.fridge-quick-add {
  display: flex; align-items: center; gap: 6px; width: 100%;
  font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.88rem; color: var(--gold);
  background: none; border: 1px dashed rgba(179,135,42,0.5); border-radius: 10px;
  padding: 10px 12px; margin-bottom: 10px; cursor: pointer;
}
.fridge-quick-add:active { background: rgba(179,135,42,0.1); }

.fridge-categories { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.fridge-category {
  border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--surface);
}
.fridge-category-header {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: none; border: none; padding: 11px 14px; cursor: pointer;
  font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.5px; color: var(--ink);
}
.fridge-category-icon { font-size: 1.05rem; line-height: 1; }
.fridge-category-label { flex: 1; text-align: left; }
.fridge-category-count { font-family: 'EB Garamond', serif; font-size: 0.78rem; font-style: italic; color: var(--ink-soft); }
.fridge-category-chevron { color: var(--ink-soft); transition: transform 0.2s ease; flex-shrink: 0; }
.fridge-category-chevron.open { transform: rotate(180deg); }
.pantry-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 14px 14px; }
.pantry-chip {
  font-family: 'EB Garamond', serif; font-size: 0.86rem;
  padding: 7px 13px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface-strong); color: var(--ink-soft); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
}
/* État actif accentué (doré/sombre) : bien plus voyant que le simple
   contour discret d'une puce non cochée. */
.pantry-chip.active { background: var(--chrome); color: var(--gold-light); border-color: var(--chrome); font-weight: 600; }

.fridge-results { display: flex; flex-direction: column; gap: 10px; }
.fridge-row {
  display: flex; align-items: center; gap: 12px; padding: 8px; cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: 100% 62px;
}
/* Recettes reléguées (>2 ingrédients manquants) : présentes mais moins
   engageantes visuellement, pour que l'œil aille d'abord vers ce qui est
   déjà réalisable ou presque. */
.fridge-row-far { opacity: 0.62; }
.fridge-thumb { width: 60px; height: 46px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.fridge-row-body h5 { margin: 0 0 4px; font-family: 'Cinzel', serif; font-size: 0.85rem; }
.fridge-badge {
  font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: 999px;
}
.fridge-badge-ready { color: #fff; background: #3E7A3E; }
.fridge-missing { color: var(--wine); font-size: 0.78rem; }
.fridge-missing-far { color: var(--ink-soft); font-style: italic; }
.fridge-show-more { display: block; margin: 10px auto 0; }

`;
