/* ------------------------------------------------------------------ */
/*  RÉGLAGES — liste groupée façon iOS, contrôle segmenté */
/*  Extrait de styles.css.js (lignes 1545-1617 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const SETTINGS_IOS_CSS = `
/* ------------------------------------------------------------------ */
/*  RÉGLAGES — liste groupée façon iOS (Human Interface Guidelines)     */
/*  Utilisé par SecretSettingsModal et ses sous-panneaux (Apparence &   */
/*  Langue, Accessibilité, Sauvegarde & Importation) : fond légèrement   */
/*  plus sombre que le reste de l'app (.ios-settings-modal) pour faire   */
/*  ressortir des cartes arrondies groupées (.ios-group), chacune         */
/*  composée de rangées de navigation (.ios-row) avec icône carrée        */
/*  ("squircle"), titre et chevron — la palette reste celle du grimoire   */
/*  (or/parchemin/lie-de-vin), seule la structure vient d'iOS.            */
/* ------------------------------------------------------------------ */
.ios-settings-modal { background: var(--grouped-bg); }

.ios-group-title {
  font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--ink-soft); opacity: 0.85; margin: 22px 6px 8px;
}

.ios-group {
  background: var(--grouped-card-bg); border-radius: 14px; overflow: hidden;
  box-shadow: 0 1px 3px var(--card-shadow);
}
.ios-group-padded { padding: 10px; }
/* Deux ".ios-group" collés sans ".ios-group-title" entre eux (ex. le
   bloc "Effets sonores" de AccessibilitySettingsModal, qui suit
   directement la carte "Taille de texte" sans titre de section propre)
   n'avaient sinon aucun espace vertical entre eux : c'est normalement
   la marge du titre de section (margin: 22px 6px 8px, voir
   .ios-group-title ci-dessus) qui sépare les cartes, donc une carte
   sans titre restait visuellement soudée à celle du dessus. */
.ios-group + .ios-group { margin-top: 22px; }

.ios-row {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 14px; border: none; background: none;
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  text-align: left; cursor: pointer;
}
.ios-group .ios-row + .ios-row { border-top: 1px solid var(--line); }
.ios-row:active { background: var(--surface); }
.ios-row-icon {
  flex-shrink: 0; width: 29px; height: 29px; border-radius: 8px; /* squircle */
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.ios-row-title { flex: 1; min-width: 0; }
.ios-chevron { color: var(--ink-soft); opacity: 0.5; flex-shrink: 0; }

.ios-row-danger {
  justify-content: center; color: var(--wine); cursor: pointer;
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; text-transform: uppercase;
}

.ios-group .settings-row { padding: 11px 14px; }
.ios-group .settings-row + .settings-row { border-top: 1px solid var(--line); }

/* --- Contrôle segmenté (Thème, Langue, appui long, taille de texte) --- */
.segmented { display: flex; background: var(--surface-strong); border-radius: 10px; padding: 3px; gap: 2px; }
.segmented-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  border: none; background: none; padding: 8px 4px; border-radius: 8px;
  font-family: 'EB Garamond', serif; font-size: 0.85rem; color: var(--ink-soft); cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.segmented-btn.active { background: var(--parchment); color: var(--ink); box-shadow: 0 1px 3px var(--card-shadow); font-weight: 600; }
/* Variante compacte (voir SegmentedControl.jsx, prop "compact") : largeur
   au contenu plutôt qu'étirée sur toute la ligne — pour une variante
   uniquement iconographique à 2 options (ex. portée du plan de repas,
   voir PlanningView.jsx) qui n'a pas besoin d'occuper toute la largeur
   comme Thème/Langue dans les Réglages. */
.segmented-compact { display: inline-flex; flex-shrink: 0; }
.segmented-compact .segmented-btn { flex: none; padding: 6px 9px; }

/* --- Relevé viewport (TEMPORAIRE — voir ViewportDiagnostic.jsx) --- */
.viewport-diagnostic {
  font-family: ui-monospace, Menlo, monospace; font-size: 0.62rem; line-height: 1.5;
  color: var(--ink-soft); word-break: break-word;
}

/* --- Curseur glissant (opacité du fond de la nav basse) --- */
.settings-slider-row { display: flex; flex-direction: column; gap: 6px; padding: 11px 14px; }
.settings-slider-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.settings-slider-value {
  flex-shrink: 0;
  font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.5px; color: var(--gold);
}
.settings-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px; margin: 8px 0 2px;
  border-radius: 999px; background: var(--surface-strong); outline: none;
  /* Le doigt qui traîne le curseur ne doit jamais faire défiler la page
     derrière — recommandation standard pour tout contrôle glissant. */
  touch-action: none;
}
.settings-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--gold); border: 2px solid var(--grouped-card-bg);
  box-shadow: 0 1px 4px var(--card-shadow); cursor: pointer;
}
.settings-slider::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--gold); border: 2px solid var(--grouped-card-bg);
  box-shadow: 0 1px 4px var(--card-shadow); cursor: pointer;
}

/* --- Retour vers Réglages (navigation par couches, sous-panneaux) --- */
.modal-back {
  position: absolute; top: 14px; left: 14px; z-index: 5;
  display: flex; align-items: center;
  background: none; border: none; padding: 5px 8px 5px 2px; border-radius: 8px;
  color: var(--gold); font-family: 'EB Garamond', serif; font-size: 0.95rem; cursor: pointer;
}
.modal-back:active { background: var(--modal-close-bg); }

`;
