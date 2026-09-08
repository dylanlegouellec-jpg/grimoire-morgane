import { useCallback, useEffect, useRef, useState } from "react";
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

// Un swipe de défilement commence lui aussi par un touchstart : déclencher
// pressState="pressing" (donc .press-pressing { transform: scale(0.95) })
// de façon synchrone dès cet instant appliquait une transition CSS active
// sur l'élément touché pile pendant les ~160ms où un doigt qui fait
// défiler bouge le plus — de quoi perturber l'arbitrage scroll-vs-appui du
// navigateur sur Android Chrome, même sans aucun preventDefault() (voir
// RecipeCard.jsx, où ce même bug a été diagnostiqué puis corrigé pour la
// grille de recettes avant d'être remonté ici, source commune à tous les
// consommateurs de ce hook). Retarder l'apparition du retour visuel de
// quelques dizaines de ms suffit : un balayage rapide dépasse le seuil
// d'annulation de `move` bien avant ce délai et ne la voit donc jamais.
const PRESS_VISUAL_DELAY_MS = 100;

// touchstart/touchmove/touchend attachés nativement (pas via les props JSX
// onTouchStart/onTouchMove) et explicitement { passive: true } — repéré
// dans Chrome DevTools (Rendering > "Scrolling performance issues") comme
// cause du signal "main thread scroll repaint" sur toute la grille de
// recettes : le navigateur ne peut composer le défilement sur son propre
// thread QUE s'il sait à l'avance qu'aucun gestionnaire ne pourra appeler
// preventDefault() dessus. Passer par les props JSX ne garantit pas ce mode
// de façon assez explicite ; ce hook n'appelle de toute façon jamais
// preventDefault() sur un événement tactile, donc { passive: true } est
// toujours sûr ici.
const TOUCH_LISTENER_OPTS = { passive: true };

export default function useLongPress(onLongPress, pressDuration = 750) {
  const nodeRef = useRef(null);
  const timer = useRef(null);
  const visualTimer = useRef(null);
  const fired = useRef(false);
  const startPos = useRef(null);
  const startScrollY = useRef(0);
  const [pressState, setPressState] = useState("idle");

  // Toujours les dernières valeurs reçues, sans jamais recréer/réattacher
  // les écouteurs tactiles natifs ci-dessous (même principe que
  // useFocusTrap.js) — utile en particulier pour `onLongPress`, souvent une
  // fonction fléchée inline recréée à chaque rendu du composant appelant.
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;
  const pressDurationRef = useRef(pressDuration);
  pressDurationRef.current = pressDuration;

  const cancel = useCallback(() => {
    if (visualTimer.current) {
      clearTimeout(visualTimer.current);
      visualTimer.current = null;
    }
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPos.current = null;
    setPressState((s) => (s === "fired" ? s : "idle"));
  }, []);

  const start = useCallback((e) => {
    fired.current = false;
    startPos.current = e && e.touches && e.touches[0]
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
    // Filet de sécurité contre une vraie course entre ce minuteur et
    // `move()` ci-dessous : `move()` n'annule que sur un `touchmove` REÇU
    // À TEMPS — sur un appareil sous charge (CPU faible, thread principal
    // occupé), ces événements peuvent être livrés en retard, après même que
    // ce minuteur ait déjà déclenché l'appui long. `touch-action: pan-y`
    // (voir recipeCards.css.js) laisse pourtant le navigateur défiler la
    // page sur le thread de composition sans attendre JS — la page a donc
    // déjà réellement bougé même si `move()` n'a encore rien vu passer.
    // Comparer le défilement réel juste avant de déclencher rattrape ce
    // cas : mémorisé ici, revérifié dans le minuteur plus bas.
    startScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
    const currentTarget = e && e.currentTarget;
    visualTimer.current = setTimeout(() => setPressState("pressing"), PRESS_VISUAL_DELAY_MS);
    timer.current = setTimeout(() => {
      const scrolled = typeof window !== "undefined"
        && Math.abs(window.scrollY - startScrollY.current) > MOVE_CANCEL_THRESHOLD_PX;
      if (scrolled) {
        cancel();
        return;
      }
      fired.current = true;
      setPressState("fired");
      triggerHapticFeedback(currentTarget, 20);
      onLongPressRef.current();
    }, pressDurationRef.current);
  }, [cancel]);

  const move = useCallback((e) => {
    if (!startPos.current || !timer.current || !e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    if (Math.abs(dx) > MOVE_CANCEL_THRESHOLD_PX || Math.abs(dy) > MOVE_CANCEL_THRESHOLD_PX) cancel();
  }, [cancel]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;
    node.addEventListener("touchstart", start, TOUCH_LISTENER_OPTS);
    node.addEventListener("touchmove", move, TOUCH_LISTENER_OPTS);
    node.addEventListener("touchend", cancel, TOUCH_LISTENER_OPTS);
    node.addEventListener("touchcancel", cancel, TOUCH_LISTENER_OPTS);
    return () => {
      node.removeEventListener("touchstart", start, TOUCH_LISTENER_OPTS);
      node.removeEventListener("touchmove", move, TOUCH_LISTENER_OPTS);
      node.removeEventListener("touchend", cancel, TOUCH_LISTENER_OPTS);
      node.removeEventListener("touchcancel", cancel, TOUCH_LISTENER_OPTS);
    };
  }, [start, move, cancel]);

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
    // À poser sur l'élément qui porte `handlers` ci-dessous (ex.
    // ref={cardLongPress.ref}) : c'est ce qui permet à ce hook d'attacher
    // ses propres écouteurs tactiles natifs plutôt que de dépendre des
    // props JSX onTouchStart/onTouchMove.
    ref: nodeRef,
    handlers: {
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
