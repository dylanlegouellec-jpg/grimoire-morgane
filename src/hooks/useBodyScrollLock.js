import { useEffect, useState } from "react";

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

// Abonnés à useIsAnyModalOpen ci-dessous — notifiés à chaque franchissement
// de lockCount (pas à chaque appel de lockBody/unlockBody : plusieurs
// modales peuvent rester empilées sans que "au moins une modale est
// ouverte" ne change). Sert par exemple à couper le swipe de semaine du
// Planning tant qu'une modale/feuille est affichée par-dessus (voir
// PlanningView.jsx) — plutôt qu'un état remonté manuellement depuis
// chacune des modales imbriquées à plusieurs niveaux (PlanningMealGroup ->
// PlanningCourseGroup -> PlanningMealItem), ce compteur déjà partagé par
// TOUTES les modales de l'app (voir plus haut) donne directement ce
// signal "au moins une modale ouverte" sans plomberie supplémentaire.
const listeners = new Set();

function notifyListeners() {
  const open = lockCount > 0;
  listeners.forEach((fn) => fn(open));
}

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
  if (lockCount === 1) notifyListeners();
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
    notifyListeners();
  }
}

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    lockBody();
    return () => { unlockBody(); };
  }, [active]);
}

// À utiliser quand un geste doit se couper tant qu'une modale/feuille
// quelconque est ouverte quelque part dans l'app (ex. le swipe de semaine
// du Planning, voir PlanningView.jsx) — reflète le MÊME compteur partagé
// que useBodyScrollLock ci-dessus, donc toujours cohérent avec le verrou de
// scroll du fond déjà en place : si le fond est gelé, ce booléen vaut déjà
// `true`, sans readjustement séparé à maintenir.
export function useIsAnyModalOpen() {
  const [open, setOpen] = useState(() => lockCount > 0);
  useEffect(() => {
    // Resynchronise au montage : lockCount a pu changer entre le rendu de
    // cet appelant et l'exécution de cet effet (ex. une modale déjà montée
    // ailleurs dans le même lot de rendus).
    setOpen(lockCount > 0);
    listeners.add(setOpen);
    return () => { listeners.delete(setOpen); };
  }, []);
  return open;
}
