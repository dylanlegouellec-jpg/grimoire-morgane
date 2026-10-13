import { createContext, useContext } from "react";
import { DEFAULT_COURSE_TYPE, mealTypeHasCourse } from "../../utils/planning";
import type { MealEntryLike } from "./PlanningMealItem";

/* ------------------------------------------------------------------ */
/*  DÉPLACER UN REPAS VERS UN AUTRE JOUR / MOMENT — logique partagée par    */
/*  les deux chemins proposés dans l'onglet Planning :                      */
/*   - le glisser-déposer à la poignée ⋮⋮ (mode réorganisation, voir         */
/*     PlanningMealItem.tsx) : la MÊME poignée que le réordonnancement,        */
/*     mais relâchée au-dessus d'un AUTRE jour ou d'un AUTRE moment, elle       */
/*     déplace le plat au lieu de le réordonner. Les zones de dépôt sont         */
/*     repérées dans le DOM par des attributs data-* (voir DROP_DATE_ATTR/        */
/*     DROP_MEAL_ATTR, posés par PlanningView.tsx/PlanningMealGroup.tsx) ;        */
/*   - l'option « Déplacer… » du menu d'appui long d'un plat (voir               */
/*     MealOptionsModal.tsx/MoveMealModal.tsx) : chemin accessible au clavier      */
/*     et au lecteur d'écran, et seul moyen d'atteindre une autre semaine.         */
/*  Les fonctions « pures » (resolveMoveTarget, buildMoveUpdates…) sont            */
/*  testées à part (voir __tests__/planningMove.test.ts).                           */
/* ------------------------------------------------------------------ */

/** Un emplacement du plan : un jour (ISO "YYYY-MM-DD") + un moment. */
export interface MealSlot {
  date: string;
  mealType: string;
}

/**
 * Une zone de dépôt lue dans le DOM : un bloc de moment précis
 * (`mealType` renseigné) ou une carte de jour entière (`mealType` null —
 * le plat garde alors son moment d'origine).
 */
export interface DropTarget {
  date: string;
  mealType: string | null;
}

export const DROP_DATE_ATTR = "data-plan-drop-date";
export const DROP_MEAL_ATTR = "data-plan-drop-meal";
/** Classe posée sur la zone survolée pendant un glissement (voir planning.css). */
export const DROP_ACTIVE_CLASS = "plan-drop-active";

/**
 * Calcule l'emplacement d'arrivée d'un plat lâché sur `target`, ou `null`
 * si le dépôt ne déplace rien (pas de cible, ou même jour ET même moment —
 * dans ce cas le geste reste un simple réordonnancement).
 */
export function resolveMoveTarget(source: MealSlot, target: DropTarget | null): MealSlot | null {
  if (!target || !target.date) return null;
  const mealType = target.mealType || source.mealType;
  if (target.date === source.date && mealType === source.mealType) return null;
  return { date: target.date, mealType };
}

/**
 * Champs à écrire via updateMealPlanEntry pour placer une entrée sur `slot`,
 * avec les mêmes règles de type de plat que moveMealPlanSection (voir
 * hooks/useMealPlan.ts) : `null` si le moment d'arrivée n'a pas de type de
 * plat (petit-déjeuner/en-cas), « plat » par défaut s'il en a un mais que
 * l'entrée n'en avait pas, sinon le type d'origine est conservé.
 */
export function buildMoveUpdates(entry: { courseType?: string | null }, slot: MealSlot) {
  return {
    date: slot.date,
    mealType: slot.mealType,
    courseType: mealTypeHasCourse(slot.mealType) ? (entry.courseType || DEFAULT_COURSE_TYPE) : null,
  };
}

/** Date ISO "YYYY-MM-DD" -> Date LOCALE (évite le décalage UTC de `new Date(iso)`). */
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Lit la zone de dépôt la plus proche d'un élément (bloc de moment > carte de jour). */
export function readDropTarget(el: Element | null): { element: Element; target: DropTarget } | null {
  const zone = el && el.closest(`[${DROP_DATE_ATTR}]`);
  if (!zone) return null;
  const date = zone.getAttribute(DROP_DATE_ATTR);
  if (!date) return null;
  return { element: zone, target: { date, mealType: zone.getAttribute(DROP_MEAL_ATTR) || null } };
}

/**
 * Zone de dépôt sous le point (x, y) de l'ÉCRAN, en ignorant l'élément en
 * cours de glissement lui-même (il est sous le doigt, par définition) et
 * tout ce qu'il contient. Regarde AUSSI sous les éléments fixes posés par-
 * dessus la liste (bannière du mode réorganisation, barre de navigation
 * basse) : sans ça, les derniers jours de la semaine, souvent cachés
 * derrière eux, ne pourraient jamais recevoir de plat.
 */
export function findDropTargetAt(x: number, y: number, dragged: Element | null): { element: Element; target: DropTarget } | null {
  if (typeof document === "undefined" || typeof document.elementsFromPoint !== "function") return null;
  for (const el of document.elementsFromPoint(x, y)) {
    if (dragged && dragged.contains(el)) continue;
    const hit = readDropTarget(el);
    if (hit) return hit;
  }
  return null;
}

/** Classe posée sur <body> pendant un glissement (voir planning.css). */
export const DRAGGING_BODY_CLASS = "plan-dragging";

/**
 * Signale qu'un glissement est en cours : estompe la bannière/la barre de
 * navigation fixes pour laisser voir les jours qu'elles recouvrent.
 */
export function setDragActive(active: boolean): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle(DRAGGING_BODY_CLASS, active);
}

let highlighted: Element | null = null;

/**
 * Met en évidence la zone survolée — directement dans le DOM plutôt que via
 * un état React : re-rendre PlanningView pendant le glissement
 * resynchroniserait la liste locale de PlanningMealItemsList (voir son
 * useEffect sur `entries`) et casserait le réordonnancement en cours.
 * Renvoie true si la zone mise en évidence a changé.
 */
export function setDropHighlight(el: Element | null): boolean {
  if (el === highlighted) return false;
  if (highlighted) highlighted.classList.remove(DROP_ACTIVE_CLASS);
  highlighted = el;
  if (el) el.classList.add(DROP_ACTIVE_CLASS);
  return true;
}

/** Point écran d'un événement de glissement (PointerEvent/MouseEvent/TouchEvent). */
export function clientPointOf(event: unknown, fallbackPage?: { x: number; y: number }): { x: number; y: number } | null {
  const e = event as { clientX?: number; clientY?: number; changedTouches?: ArrayLike<{ clientX: number; clientY: number }> };
  if (e && typeof e.clientX === "number" && typeof e.clientY === "number") return { x: e.clientX, y: e.clientY };
  const touch = e && e.changedTouches && e.changedTouches[0];
  if (touch) return { x: touch.clientX, y: touch.clientY };
  if (fallbackPage && typeof window !== "undefined") return { x: fallbackPage.x - window.scrollX, y: fallbackPage.y - window.scrollY };
  return null;
}

/**
 * Contexte fourni par PlanningView.tsx aux lignes de plats (évite de faire
 * transiter deux callbacks de plus par PlanningMealGroup/PlanningCourseGroup/
 * PlanningMealItemsList) :
 *  - `canDrop` : la zone survolée déplacerait-elle le plat ? (sa propre
 *    zone n'est pas mise en évidence : y lâcher = simple réordonnancement) ;
 *  - `dropEntry` : appelé au relâchement d'un glissement au-dessus d'une zone ;
 *    renvoie true si le plat a été déplacé (sinon, simple réordonnancement) ;
 *  - `requestMove` : ouvre le sélecteur « Déplacer… » (MoveMealModal.tsx).
 */
export interface PlanningMoveApi {
  /** true si lâcher `entry` sur `target` le déplacerait (sert à la mise en évidence). */
  canDrop: (entry: MealEntryLike, target: DropTarget) => boolean;
  dropEntry: (entry: MealEntryLike, target: DropTarget) => boolean;
  requestMove: (entry: MealEntryLike) => void;
}

export const PlanningMoveContext = createContext<PlanningMoveApi | null>(null);

export function usePlanningMove(): PlanningMoveApi | null {
  return useContext(PlanningMoveContext);
}
