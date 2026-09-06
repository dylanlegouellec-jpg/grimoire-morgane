/* ------------------------------------------------------------------ */
/*  NAV BASSE + MODALES (structure commune) + menu d'actions recette */
/*  Extrait de styles.css.js (lignes 793-900 d'origine), pour       */
/*  raccourcir un fichier CSS-in-JS jusque-là monolithique (~1700       */
/*  lignes) — voir styles.css.js pour l'assemblage final et l'ordre     */
/*  de concaténation (déterminant pour la cascade CSS entre fichiers).  */
/* ------------------------------------------------------------------ */

export const MODALS_BASE_CSS = `
/* --- Navigation basse --- */
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  display: flex; justify-content: space-around;
  background: var(--chrome);
  border-top: 2px solid var(--gold);
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
}
.nav-btn {
  background: none; border: none; color: #b6a884;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  cursor: pointer; padding: 4px 10px;
}
.nav-btn.active { color: var(--gold-light); }

/* --- Modales / page de grimoire --- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(20,14,4,0.55);
  display: flex; align-items: flex-end; justify-content: center;
  /* Volontairement au-dessus du FAB "+" (voir .fab, z-index: 50) : les
     deux étaient à égalité avant ce correctif, un pur hasard d'ordre DOM
     décidait alors lequel des deux gagnait le dessus — le bouton flottant
     repassait parfois visuellement PAR-DESSUS une modale ouverte. */
  z-index: 55;
  padding: 0;
  touch-action: none; overscroll-behavior: contain;
}
.modal, .grimoire-page {
  background: var(--parchment);
  width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; overflow-x: hidden;
  border-radius: 18px 18px 0 0;
  padding: 22px 20px 30px;
  position: relative;
  border-top: 3px solid var(--gold);
  animation: slideUp 0.28s ease;
  overscroll-behavior: contain;
  touch-action: pan-y;
}
/* Poignée de tirage — un ::before sur .modal (jamais .grimoire-page, qui
   n'est pas une feuille du bas mais le conteneur racine de l'appli) : une
   seule règle CSS l'ajoute automatiquement à TOUTE feuille modale de
   l'appli (Réglages/Foyer, RecipePickerModal, RecipeOptionsModal,
   confirmations...) sans avoir à toucher le JSX de chacune. top:8px, sous
   les 14px de .modal-close/.modal-back : aucun chevauchement. Purement
   visuel (aria-hidden implicite, un ::before n'est jamais focusable) —
   ne remplace pas le geste "tirer pour fermer" (voir useSwipeToDismiss),
   qui reste indépendant de la présence de cette barre. */
.modal::before {
  content: "";
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 4px; border-radius: 999px; background: var(--drag-handle);
  z-index: 4;
}
.form-clean { max-width: 100%; overflow-x: hidden; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-close {
  position: absolute; top: 14px; right: 14px; z-index: 5;
  background: var(--modal-close-bg); border: none; border-radius: 50%;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  color: var(--ink-soft); cursor: pointer;
}
.dropcap-title { font-family: 'Cinzel', serif; font-size: 1.3rem; margin: 10px 0 4px; }
.flourish { text-align: center; color: var(--gold); font-size: 1.1rem; margin: 12px 0; }
.modal h4 { font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; margin: 16px 0 8px; color: var(--ink-soft); }

/* --- Menu d'actions sur une recette (appui long) ----------------------
   Bottom sheet ancré en bas (voir .modal-backdrop) : sur mobile (PWA iOS
   en particulier), son contenu pouvait dépasser sous la barre de
   navigation basse et cacher le dernier bouton ("Supprimer la recette").
   z-index explicite au-dessus de .bottom-nav, hauteur plafonnée avec
   défilement interne garanti, et un padding bas qui réserve toute la
   hauteur de la nav basse (~70px) EN PLUS de la zone sûre iOS (encoche/
   indicateur d'accueil) — un simple env(safe-area-inset-bottom) seul ne
   suffisait pas : il protège de l'encoche du système, pas de la barre de
   navigation propre à l'appli, posée par-dessus. --- */
.modal.recipe-options-modal {
  z-index: 60;
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 70px);
}

/* --- Assistant "Ajouter un repas" (Planification) — même défaut que
   .recipe-options-modal ci-dessus : sur l'étape "Quel repas ?" (4 lignes
   pleine largeur), le bas de la feuille se retrouvait caché sous
   .bottom-nav. Même remède : hauteur plafonnée avec défilement interne
   garanti, plus un padding bas qui réserve la hauteur de la nav basse EN
   PLUS de la zone sûre iOS. --- */
.modal.planning-step-modal {
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 70px);
}

.recipe-options-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.recipe-option-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--line); background: var(--surface);
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  cursor: pointer; text-align: left;
}
.recipe-option-row:disabled { opacity: 0.6; cursor: default; }
.recipe-option-row.danger { color: #B33A2E; border-color: rgba(179,58,46,0.35); }
.recipe-options-error { color: #B33A2E; margin-top: 10px; text-align: center; }

`;
