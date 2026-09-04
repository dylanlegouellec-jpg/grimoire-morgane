import { useRef, useState } from "react";
import { triggerHapticFeedback } from "../utils/haptics";

/* ------------------------------------------------------------------ */
/*  APPUI LONG — geste générique                                       */
/*  Troisième implémentation quasi identique de ce pattern dans le code  */
/*  (RecipeCard, NavButton) : extrait ici plutôt que recopié une         */
/*  quatrième fois pour les lignes de foyer.                             */
/*                                                                        */
/*  Le timer n'est annulé sur `touchmove` que si le doigt a réellement    */
/*  bougé de plus de 5px — jamais via preventDefault() — pour laisser le  */
/*  scroll natif se dérouler sans à-coup pendant qu'on distingue encore   */
/*  un tremblement (qui ne doit pas annuler l'appui long) d'un vrai        */
/*  défilement (qui doit l'annuler tout de suite).                        */
/*                                                                        */
/*  `pressState` ("idle" | "pressing" | "fired") pilote l'animation        */
/*  d'enfoncement/rebond partagée (voir .press-anim dans styles.css.js) : */
/*  scale(0.95) tant que l'appui est maintenu, puis un léger rebond au      */
/*  moment où le geste se déclenche réellement.                            */
/* ------------------------------------------------------------------ */
const MOVE_CANCEL_THRESHOLD_PX = 5;

export default function useLongPress(onLongPress, pressDuration = 750) {
  const timer = useRef(null);
  const fired = useRef(false);
  const startPos = useRef(null);
  const [pressState, setPressState] = useState("idle");

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPos.current = null;
    setPressState((s) => (s === "fired" ? s : "idle"));
  };

  const start = (e) => {
    fired.current = false;
    startPos.current = e && e.touches && e.touches[0]
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
    setPressState("pressing");
    timer.current = setTimeout(() => {
      fired.current = true;
      setPressState("fired");
      triggerHapticFeedback(e && e.currentTarget, 20);
      onLongPress();
    }, pressDuration);
  };

  const move = (e) => {
    if (!startPos.current || !timer.current || !e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    if (Math.abs(dx) > MOVE_CANCEL_THRESHOLD_PX || Math.abs(dy) > MOVE_CANCEL_THRESHOLD_PX) cancel();
  };

  // À utiliser sur onClick : ignore le clic qui suit un appui long déjà
  // déclenché (sinon l'action "courte" du bouton se déclenche aussi).
  const wasLongPress = () => {
    if (fired.current) {
      fired.current = false;
      return true;
    }
    return false;
  };

  // À appeler quand le consommateur referme ce que l'appui long a ouvert
  // (ex. une modale) pour remettre l'animation à zéro pour le prochain geste.
  const resetPressState = () => setPressState("idle");

  return {
    handlers: {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: move,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e) => e.preventDefault(),
    },
    wasLongPress,
    pressState,
    resetPressState,
  };
}
