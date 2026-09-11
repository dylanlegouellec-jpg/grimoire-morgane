import { useCallback, useEffect, useRef, useState } from "react";

// Doit rester synchronisé avec la durée de l'animation "closing"
// (modalsBase.css.js : @keyframes slideDown / .modal-backdrop.closing).
export const CLOSE_ANIMATION_MS = 220;

/* ------------------------------------------------------------------ */
/*  FERMETURE ANIMÉE D'UNE MODALE — pas de lib d'animation dans ce         */
/*  projet (pas de Framer Motion) : l'OUVERTURE d'une modale a déjà une      */
/*  animation (slideUp, modalsBase.css.js), mais sa fermeture n'en avait       */
/*  aucune — un clic sur "Fermer"/"Retour" appelait directement onClose,        */
/*  React retirait alors le nœud DOM du .modal-backdrop au rendu suivant,        */
/*  donc tout ce qu'il masquait (nav basse, vue derrière) apparaissait d'un        */
/*  coup sec plutôt que progressivement — repéré en particulier dans la            */
/*  chaîne Réglages -> Accessibilité -> retour, où DEUX fermetures instantanées      */
/*  qui se suivent de près donnent l'impression d'un "sursaut" de la nav basse.       */
/*                                                                                     */
/*  Usage : const { closing, requestClose } = useAnimatedClose(onClose);                */
/*  Remplacer onClose par requestClose sur les déclencheurs "tap" (bouton                */
/*  fermer/retour, clic sur le fond, Échap/retour Android via useFocusTrap) —              */
/*  PAS sur useSwipeToDismiss, dont le geste de tirage anime déjà lui-même la               */
/*  sortie (mélanger les deux ferait rejouer l'animation CSS depuis sa position              */
/*  de départ plutôt que depuis la position du doigt, un "saut" visible). Ajouter              */
/*  `${closing ? "closing" : ""}` aux classNames de .modal-backdrop et                          */
/*  .modal/.grimoire-page (voir les keyframes slideDown/la transition d'opacité                  */
/*  du fond, modalsBase.css.js) — le vrai onClose n'est appelé qu'une fois                        */
/*  l'animation terminée, le composant restant monté entre-temps.                                  */
/* ------------------------------------------------------------------ */
export default function useAnimatedClose(onClose) {
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const requestClose = useCallback(() => {
    setClosing((already) => {
      if (already) return already;
      timerRef.current = setTimeout(() => { onCloseRef.current(); }, CLOSE_ANIMATION_MS);
      return true;
    });
  }, []);

  return { closing, requestClose };
}
