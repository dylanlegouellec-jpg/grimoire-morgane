/* ------------------------------------------------------------------ */
/*  VARIANTS FRAMER MOTION PARTAGÉS — modales/feuilles                  */
/*  Un seul jeu de constantes pour que TOUTES les modales de l'app       */
/*  (voir src/components/**, useDismissibleSheet.js) partagent           */
/*  exactement la même sensation d'ouverture/fermeture, plutôt que de     */
/*  redéfinir ces nombres dans chacun des ~25 fichiers concernés.          */
/* ------------------------------------------------------------------ */

// Fond assombri derrière la feuille — simple fondu, pas de ressort (un
// fond qui "rebondit" n'aurait aucun sens visuel).
export const MODAL_BACKDROP_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22 },
};

// La feuille elle-même : glisse depuis le bas avec un très léger effet de
// "pop" (scale 0.98 -> 1), ressort à l'entrée ET à la sortie. `y` reste une
// clé "libre" ici : useDismissibleSheet.js pilote la MÊME propriété via sa
// propre MotionValue pendant un tirage — voir son commentaire pour pourquoi
// ça ne rentre pas en conflit avec ces variants déclaratifs.
export const MODAL_SHEET_MOTION = {
  initial: { y: 30, opacity: 0, scale: 0.98 },
  animate: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 30, opacity: 0, scale: 0.98 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
};
