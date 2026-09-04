import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  VERROU DE SCROLL DU FOND (fiable sur iOS Safari)                   */
/*  `overflow: hidden` seul ne suffit pas sur iOS : le body défile     */
/*  quand même sous la modale. La technique fiable consiste à figer    */
/*  le <body> en `position: fixed` à sa position de scroll actuelle,   */
/*  puis à restaurer + rescroller à cette position à la fermeture.     */
/* ------------------------------------------------------------------ */
export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      touchAction: body.style.touchAction,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "contain";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.width = previous.width;
      body.style.touchAction = previous.touchAction;
      body.style.overscrollBehavior = previous.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
