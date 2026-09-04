import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  VERROU DE SCROLL DU FOND (fiable sur iOS Safari)                   */
/*  `overflow: hidden` seul ne suffit pas sur iOS : le body défile     */
/*  quand même sous la modale. La technique fiable consiste à figer    */
/*  le <body> en `position: fixed` à sa position de scroll actuelle,   */
/*  puis à restaurer + rescroller à cette position à la fermeture.     */
/*                                                                        */
/*  COMPTEUR PARTAGÉ (module-level, PAS un état par composant) : ce       */
/*  correctif remplace une version où chaque appelant capturait/          */
/*  restaurait le style du <body> indépendamment. Avec plusieurs           */
/*  modales imbriquées (ex. ProfileEditor ouvert par-dessus                */
/*  SecretSettingsModal, ou une confirmation par-dessus RecipeOptionsModal) */
/*  et un démontage dans un ordre inattendu (retour Android, changement    */
/*  d'onglet en plein milieu d'une animation...), la modale qui se ferme   */
/*  EN PREMIER restaurait le style "avant TOUTE modale" même si une autre  */
/*  modale restait affichée derrière — ou, à l'inverse, un verrou pouvait   */
/*  ne jamais être restauré si son propre démontage ne s'exécutait pas      */
/*  proprement, laissant tout le corps de la page bloqué en                */
/*  `touch-action: none` indéfiniment, même après fermeture de toute        */
/*  modale visible. Avec un compteur partagé, le <body> n'est figé qu'au    */
/*  passage 0→1 et restauré qu'au retour 1→0, quel que soit l'ordre         */
/*  d'ouverture/fermeture des modales. */
let lockCount = 0;
let savedBodyStyle = null;
let savedScrollY = 0;

function lockBody() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    savedBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      touchAction: body.style.touchAction,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "contain";
  }
  lockCount += 1;
}

function unlockBody() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && savedBodyStyle) {
    const body = document.body;
    body.style.position = savedBodyStyle.position;
    body.style.top = savedBodyStyle.top;
    body.style.left = savedBodyStyle.left;
    body.style.width = savedBodyStyle.width;
    body.style.touchAction = savedBodyStyle.touchAction;
    body.style.overscrollBehavior = savedBodyStyle.overscrollBehavior;
    window.scrollTo(0, savedScrollY);
    savedBodyStyle = null;
  }
}

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    lockBody();
    return () => { unlockBody(); };
  }, [active]);
}
