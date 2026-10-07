/* ------------------------------------------------------------------ */
/*  CONSTANTES D'ANIMATION PARTAGÉES                                    */
/*  Un seul endroit pour les courbes, ressorts et durées réutilisés par   */
/*  plusieurs fichiers (cartes, filtres, modales, navigation...), pour que   */
/*  l'app garde UNE seule sensation de mouvement plutôt que la même valeur    */
/*  recopiée une dizaine de fois, avec le risque qu'une copie dérive.          */
/*  Seules les valeurs réellement partagées sont ici : un réglage propre à      */
/*  un seul composant (ex. le ressort du tutoriel) reste dans son fichier.      */
/*  Le CSS pur (@keyframes de styles/*.css.ts) ne peut pas importer ces          */
/*  constantes — ses valeurs sont tenues à la main, avec un commentaire qui       */
/*  renvoie ici quand elles doivent rester alignées.                               */
/* ------------------------------------------------------------------ */

export type Bezier = [number, number, number, number];

// --- Courbes -----------------------------------------------------------
// Démarre vite, finit en douceur : l'entrée par défaut (cartes, fiches,
// ornements, glissements entre vues).
export const EASE_OUT: Bezier = [0.22, 1, 0.36, 1];
// Part doucement, finit vite : les sorties (une carte qui s'efface).
export const EASE_IN: Bezier = [0.4, 0, 1, 1];

// --- Ressorts ----------------------------------------------------------
// Feuilles/modales, et photo d'une carte qui s'ouvre en fiche (layoutId).
export const SPRING_SHEET = { type: "spring", stiffness: 300, damping: 30 } as const;
// Pastilles actives qui glissent (filtres, navigation basse, contrôle
// segmenté, sélecteur de recettes).
export const SPRING_PILL = { type: "spring", stiffness: 400, damping: 32 } as const;
// Retour au repos après un glissement de doigt (swipe d'un article de courses).
export const SPRING_RELEASE = { type: "spring", stiffness: 500, damping: 30 } as const;
// Fermeture d'une feuille tirée vers le bas (voir useDismissibleSheet.ts).
export const SPRING_CLOSE = { type: "spring", stiffness: 500, damping: 34 } as const;

// --- Cartes de recettes et changement de filtre ------------------------
// Voir RecipesView.tsx (bascule en deux temps) et RecipeCard.tsx.
export const CARD_ENTER_DURATION_S = 0.42;
export const CARD_EXIT_DURATION_S = 0.16;
// La grille bascule dès que les cartes ont fini de s'effacer : la durée
// d'attente DÉRIVE de celle du fondu, plus deux valeurs à garder alignées.
export const FILTER_EXIT_MS = Math.round(CARD_EXIT_DURATION_S * 1000) + 10;
// Décalage entre deux cartes qui entrent en cascade. Au-delà de
// ENTER_STAGGER_MAX_INDEX, il cesse de croître : un délai de plus d'une
// demi-seconde ne ferait que retarder des cartes que personne ne regarde.
export const ENTER_STAGGER_MS = 55;
export const ENTER_STAGGER_MAX_INDEX = 6;

// --- Glissements entre vues -------------------------------------------
// Bascule Foyer/Personnel (Planning, Courses) : même durée/courbe que le
// glissement entre onglets principaux (.tab-transition, shell.css.ts).
export const SCOPE_SWITCH_DURATION_S = 0.24;
export const SCOPE_SWITCH_SLIDE_PX = 14;

// --- Modales et feuilles ----------------------------------------------
interface FadeMotion {
  initial: { opacity: number };
  animate: { opacity: number };
  exit: { opacity: number };
  transition: { duration: number };
}

// Fond assombri derrière la feuille — simple fondu, pas de ressort (un
// fond qui "rebondit" n'aurait aucun sens visuel).
export const MODAL_BACKDROP_MOTION: FadeMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22 },
};

interface SheetMotion {
  initial: { y: number; opacity: number; scale: number };
  animate: { y: number; opacity: number; scale: number };
  exit: { y: number; opacity: number; scale: number };
  transition: { type: "spring"; stiffness: number; damping: number };
}

// La feuille elle-même : glisse depuis le bas avec un très léger effet de
// "pop" (scale 0.98 -> 1), ressort à l'entrée ET à la sortie. `y` reste une
// clé "libre" ici : useDismissibleSheet.ts pilote la MÊME propriété via sa
// propre MotionValue pendant un tirage — voir son commentaire pour pourquoi
// ça ne rentre pas en conflit avec ces variants déclaratifs.
export const MODAL_SHEET_MOTION: SheetMotion = {
  initial: { y: 30, opacity: 0, scale: 0.98 },
  animate: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 30, opacity: 0, scale: 0.98 },
  transition: SPRING_SHEET,
};
