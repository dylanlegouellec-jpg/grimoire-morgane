import { useEffect, useRef, useState, type RefObject } from "react";
import { animate, useMotionValue, useTransform, type AnimationPlaybackControls } from "motion/react";
import { triggerHaptic } from "../utils/helpers";

/* ------------------------------------------------------------------ */
/*  TOURNER LA PAGE — geste horizontal de la fiche recette (vue livre)   */
/*                                                                      */
/*  La feuille entière pivote autour de sa « reliure » (bord gauche pour */
/*  aller à la page suivante, bord droit pour revenir) : son bord libre   */
/*  suit le doigt, la page voisine se découvre en dessous (voir          */
/*  RecipePageUnder.tsx). Uniquement transform (rotateY + perspective) et  */
/*  opacity : rien qui redessine la mise en page, fluide sur iPhone.        */
/*                                                                      */
/*  Écouteurs tactiles NATIFS sur la feuille (pas les gestionnaires React) :  */
/*  - `touchmove` non passif : une fois le geste reconnu horizontal, on        */
/*    bloque tout défilement vertical résiduel (preventDefault) — React pose   */
/*    ses propres écouteurs tactiles en passif, sans ce pouvoir ;              */
/*  - stopPropagation() dès le verrouillage horizontal : les écouteurs React   */
/*    (« tirer pour fermer » de useDismissibleSheet, « tirer pour éditer » de    */
/*    RecipeDetail) sont posés à la racine de l'app et ne voient donc plus du    */
/*    tout ce geste — aucun des deux ne peut démarrer pendant un tournage.        */
/*  Tant que le sens n'est pas tranché, rien n'est bloqué : un geste surtout      */
/*  vertical reste un défilement (ou un tirage pour fermer), jamais une page.     */
/* ------------------------------------------------------------------ */

/** 1 = page suivante (on glisse vers la gauche), -1 = page précédente. */
export type TurnDir = 1 | -1;

export interface PageGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PageTurnState<T> {
  dir: TurnDir;
  target: T;
  geom: PageGeometry;
}

// Distance avant de trancher le sens du geste.
const AXIS_LOCK_PX = 10;
// « Clairement horizontal » : le déplacement horizontal doit dépasser
// nettement le vertical — un geste en diagonale reste un défilement.
const HORIZONTAL_RATIO = 1.4;
// Zone du geste système iOS « retour » (bord gauche de l'écran) : un geste
// qui y commence ne tourne jamais de page.
export const EDGE_GUARD_PX = 24;
// Validation au relâchement : distance (part de la largeur) OU vitesse.
const COMMIT_RATIO = 0.3;
const COMMIT_MIN_PX = 70;
const COMMIT_VELOCITY_PX_S = 450;
const FLICK_MIN_PX = 24;
// Profondeur de la scène 3D, proportionnelle à la largeur de la page :
// assez grande pour que le bord soulevé ne déborde pas trop de l'écran
// (feuille large du paysage comprise), assez courte pour sentir le relief.
const PERSPECTIVE_PER_WIDTH = 6.5;
// Délai de secours de settle() (voir finishTurn).
const SETTLE_SAFETY_MS = 400;
// Butée (première/dernière page) : la page se soulève à peine, puis retombe.
const BUMP_MAX_DEG = 14;

// Éléments où un glissement a déjà un sens propre (curseurs, champs…) :
// un geste qui y commence ne tourne pas la page.
const NO_TURN_SELECTOR = "input, textarea, select, [contenteditable], [role='slider'], .portions-adjuster, [data-no-page-turn]";

/** Sens du geste une fois le seuil franchi : "x" seulement s'il est clairement horizontal. */
export function decideAxis(dx: number, dy: number): "x" | "y" | null {
  if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO ? "x" : "y";
}

/** Sens de la page demandée par un déplacement horizontal (vers la gauche = suivante). */
export function dirFromDx(dx: number): TurnDir {
  return dx < 0 ? 1 : -1;
}

/** La page doit-elle tourner au relâchement ? (`velocity` en px/s, signée comme dx) */
export function shouldCommitTurn(dx: number, velocity: number, width: number): boolean {
  const dist = Math.abs(dx);
  if (dist >= Math.max(COMMIT_MIN_PX, width * COMMIT_RATIO)) return true;
  return dist >= FLICK_MIN_PX && Math.sign(velocity) === Math.sign(dx) && Math.abs(velocity) >= COMMIT_VELOCITY_PX_S;
}

/** Angle (degrés) de la page soulevée : le bord libre suit le doigt (projection w·cos θ). */
export function angleForDrag(dx: number, width: number): number {
  const ratio = Math.min(1, Math.abs(dx) / Math.max(1, width));
  return (Math.acos(1 - ratio) * 180) / Math.PI;
}

/** Butée élastique : la page résiste de plus en plus, sans jamais dépasser BUMP_MAX_DEG. */
export function bumpAngle(dx: number): number {
  return BUMP_MAX_DEG * (1 - Math.exp(-Math.abs(dx) / 110));
}

interface UsePageTurnOptions<T> {
  /** Page voisine dans ce sens, ou null au bout du livre. */
  getTarget: (dir: TurnDir) => T | null;
  /** Appelé page tournée (bord libre à 90°, invisible) : afficher `target`. */
  onTurn: (target: T, dir: TurnDir) => void;
  reducedMotion: boolean;
  /** Vrai quand un autre geste a déjà pris la main (ex. tirer pour fermer). */
  isBlocked?: () => boolean;
}

export default function usePageTurn<T>(sheetRef: RefObject<HTMLElement | null>, options: UsePageTurnOptions<T>) {
  // Angle de la page soulevée (0 = à plat, 90 = tranche, invisible).
  const angle = useMotionValue(0);
  // 1 : reliure à gauche (vers la page suivante) ; -1 : reliure à droite.
  const side = useMotionValue<number>(1);
  const rotateY = useTransform(() => -angle.get() * side.get());
  const originX = useTransform(() => (side.get() === 1 ? 0 : 1));
  // Perspective seulement pendant un tournage : à plat (angle 0), la
  // feuille retrouve `transform: none` (aucun calque 3D permanent sur ce
  // long conteneur qui défile, texte toujours net).
  const pageWidthRef = useRef(400);
  const transformPerspective = useTransform(() => (angle.get() === 0 ? 0 : pageWidthRef.current * PERSPECTIVE_PER_WIDTH));
  // Fondu du contenu, seule « animation » avec Réduire les animations.
  const contentOpacity = useMotionValue(1);
  const [turning, setTurning] = useState<PageTurnState<T> | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const animRef = useRef<AnimationPlaybackControls | null>(null);
  // Vrai entre la validation d'un tournage et l'affichage de la nouvelle
  // page (settle) : aucun nouveau geste ne démarre pendant ce temps.
  const busyRef = useRef(false);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = (): PageGeometry | null => {
    const sheet = sheetRef.current;
    const parent = sheet?.parentElement;
    if (!sheet || !parent) return null;
    const r = sheet.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    pageWidthRef.current = r.width || pageWidthRef.current;
    return { left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height };
  };

  // Valide le tournage : la page finit de pivoter jusqu'à la tranche, puis
  // l'appelant affiche la nouvelle recette (onTurn) et rappelle settle().
  const finishTurn = (dir: TurnDir, target: T, from: number) => {
    busyRef.current = true;
    const done = () => {
      optionsRef.current.onTurn(target, dir);
      // Filet : si la nouvelle page n'est finalement pas affichée (aucun
      // appel à settle()), la feuille ne reste pas figée sur la tranche.
      safetyRef.current = setTimeout(settle, SETTLE_SAFETY_MS);
    };
    triggerHaptic(8);
    const { reducedMotion } = optionsRef.current;
    animRef.current?.stop();
    if (reducedMotion) {
      animRef.current = animate(contentOpacity, 0, {
        duration: 0.14,
        onComplete: done,
      });
      return;
    }
    const remaining = Math.max(0, 1 - from / 90);
    animRef.current = animate(angle, 90, {
      duration: 0.16 + 0.26 * remaining,
      ease: [0.45, 0, 0.75, 0.6],
      onComplete: done,
    });
  };

  const cancelTurn = () => {
    animRef.current?.stop();
    animRef.current = animate(angle, 0, {
      type: "spring",
      stiffness: 420,
      damping: 30,
      onComplete: () => {
        if (!busyRef.current) setTurning(null);
      },
    });
  };

  /** Tourne la page sans geste (boutons précédent/suivant, flèches du clavier). */
  const turn = (dir: TurnDir) => {
    if (busyRef.current) return;
    const target = optionsRef.current.getTarget(dir);
    if (target == null) return;
    if (!optionsRef.current.reducedMotion) {
      const geom = measure();
      if (!geom) return optionsRef.current.onTurn(target, dir);
      side.set(dir);
      setTurning({ dir, target, geom });
    }
    finishTurn(dir, target, 0);
  };

  /** À appeler une fois la nouvelle page affichée (useLayoutEffect de l'appelant). */
  function settle() {
    if (safetyRef.current) clearTimeout(safetyRef.current);
    safetyRef.current = null;
    if (!busyRef.current) return;
    busyRef.current = false;
    animRef.current?.stop();
    angle.set(0);
    if (optionsRef.current.reducedMotion) {
      animRef.current = animate(contentOpacity, 1, { duration: 0.2 });
    }
    // La page voisine (dessous) reste une image de plus : la feuille, de
    // nouveau à plat, la recouvre déjà — la retirer avant que l'angle remis
    // à 0 ne soit peint laisserait voir le fond pendant une image.
    requestAnimationFrame(() => requestAnimationFrame(() => setTurning(null)));
  }

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return undefined;
    let start: { x: number; y: number } | null = null;
    let axis: "x" | "y" | null = null;
    let dir: TurnDir | null = null;
    let target: T | null = null;
    let width = 1;
    let samples: { x: number; t: number }[] = [];

    const reset = () => {
      start = null;
      axis = null;
      dir = null;
      target = null;
      samples = [];
    };

    const onStart = (e: TouchEvent) => {
      reset();
      if (busyRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (touch.clientX < EDGE_GUARD_PX) return;
      const node = e.target as Element | null;
      if (node && typeof node.closest === "function" && node.closest(NO_TURN_SELECTOR)) return;
      start = { x: touch.clientX, y: touch.clientY };
      samples = [{ x: touch.clientX, t: e.timeStamp || Date.now() }];
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1) {
        if (axis === "x") cancelTurn();
        reset();
        return;
      }
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (axis == null) {
        axis = decideAxis(dx, dy);
        if (axis == null) return;
        if (axis === "x" && optionsRef.current.isBlocked?.()) axis = "y";
        if (axis === "y") return;
        animRef.current?.stop();
        width = el.getBoundingClientRect().width || 1;
      }
      if (axis !== "x") return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      samples.push({ x: touch.clientX, t: e.timeStamp || Date.now() });
      if (samples.length > 4) samples.shift();

      const nextDir = dirFromDx(dx);
      if (nextDir !== dir) {
        // Premier mouvement, ou demi-tour du doigt : on change de page voisine.
        dir = nextDir;
        target = optionsRef.current.getTarget(dir);
        side.set(dir);
        const geom = measure();
        if (target != null && geom && !optionsRef.current.reducedMotion) setTurning({ dir, target, geom });
        else setTurning(null);
      }
      if (optionsRef.current.reducedMotion) return;
      angle.set(target != null ? angleForDrag(dx, width) : bumpAngle(dx));
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || axis !== "x" || dir == null) {
        reset();
        return;
      }
      const touch = e.changedTouches[0];
      const dx = (touch ? touch.clientX : samples[samples.length - 1].x) - start.x;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const velocity = last && first && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0;
      const finalDir = dirFromDx(dx);
      const finalTarget = finalDir === dir ? target : null;
      reset();
      if (finalTarget != null && shouldCommitTurn(dx, velocity, width)) {
        finishTurn(finalDir, finalTarget, angle.get());
      } else {
        cancelTurn();
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
    // Écouteurs posés une fois : options lues via optionsRef, fonctions
    // internes ne dépendant que de refs/MotionValues stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRef]);

  useEffect(() => () => {
    animRef.current?.stop();
    if (safetyRef.current) clearTimeout(safetyRef.current);
  }, []);

  return {
    angle,
    side,
    turning,
    turn,
    settle,
    contentOpacity,
    /** À étaler dans le `style` de la feuille. */
    pageStyle: { rotateY, originX, transformPerspective },
  };
}
