import { useRef } from "react";
import { useMotionValue, useTransform, animate } from "motion/react";

/* ------------------------------------------------------------------ */
/*  "TIRER POUR FERMER" — version Framer Motion de useSwipeToDismiss.js */
/*  (retiré : ce hook le remplace partout, voir git log pour l'ancienne */
/*  implémentation 100% CSS/JS maison, sans dépendance).                */
/*                                                                      */
/*  Repose sur le geste "pan" de Framer (onPanStart/onPan/onPanEnd),    */
/*  PAS sur "drag" + dragControls : ce dernier capture le pointeur dès   */
/*  qu'on l'appelle, ce qui aurait empêché le défilement NATIF du       */
/*  contenu (ex. la liste d'ingrédients) de fonctionner normalement      */
/*  pour tout geste qui démarre pile au sommet du scroll — exactement le  */
/*  cas le plus courant ici. "onPan" ne prend jamais la main de force :    */
/*  tant que notre propre logique ci-dessous ne fait rien avec l'info du   */
/*  geste (voir `active.current`), le défilement natif du navigateur        */
/*  garde entièrement la main, comme avant.                                 */
/*                                                                            */
/*  Direction retenue UNE SEULE FOIS, à "panStart" (premier mouvement         */
/*  détecté par Framer, au-delà de son propre seuil interne) : si le           */
/*  contenu n'est pas au sommet de son défilement OU si ce premier               */
/*  mouvement n'est pas vers le bas, tout le geste est ignoré jusqu'au             */
/*  prochain "panStart" — jamais reconsidéré en cours de route, comme               */
/*  l'ancienne version (qui, elle, abandonnait le tirage si le contenu re-             */
/*  défilait pendant le geste : cas plus rare, non repris ici pour rester               */
/*  simple, un `onPan` qui ne fait rien de toute façon n'entrave jamais le                */
/*  scroll natif). */
const DISMISS_DISTANCE_PX = 100;
// L'ancien hook mesurait une vitesse en px/ms (0.6) ; Framer exprime la
// sienne en px/s (info.velocity) — même seuil, juste convertie.
const DISMISS_VELOCITY_PX_PER_S = 600;
const CLOSE_SPRING = { type: "spring", stiffness: 500, damping: 34 };

export default function useDismissibleSheet(onDismiss, { scrollRef, disabled = false } = {}) {
  const y = useMotionValue(0);
  // Estompe le CONTENU pendant le tirage (jamais la feuille elle-même, ni
  // son fond) — inconditionnel, à l'appelant de s'en servir ou non (voir
  // `contentStyle` plus bas, à étaler sur un DIV ENVELOPPANT LE CONTENU).
  // PAS posé dans `panHandlers.style` à côté de `y` : "opacity" y est déjà
  // la cible de l'animation d'entrée/sortie de la feuille elle-même
  // (MODAL_SHEET_MOTION, src/constants/motion.js) — une valeur DÉRIVÉE
  // (useTransform) sur cette même clé viendrait se battre avec elle. `y`
  // seul n'a pas ce problème : une MotionValue "brute" (useMotionValue, pas
  // useTransform) qu'on anime PAR-DESSUS avec `animate`/`exit` est un usage
  // prévu et documenté de Framer Motion (pas une valeur calculée en
  // continu comme celle-ci) — d'où pourquoi la feuille entière ne peut pas
  // s'estomper pendant le tirage ici (l'ancien hook le permettait via une
  // option `fade`, retirée : un seul appelant s'en servait, voir
  // SecretSettingsModal.jsx, qui utilise désormais `contentStyle` comme les
  // autres — différence visuelle mineure, la feuille garde son propre fond
  // opaque pendant le tirage au lieu de laisser transparaître la page
  // derrière).
  const contentOpacity = useTransform(y, [0, 300], [1, 0.4]);
  const active = useRef(false);

  const handlePanStart = (_event, info) => {
    if (disabled) { active.current = false; return; }
    const el = scrollRef && scrollRef.current;
    const atTop = !el || el.scrollTop <= 0;
    active.current = atTop && info.offset.y > 0;
  };

  const handlePan = (_event, info) => {
    if (!active.current) return;
    y.set(Math.max(0, info.offset.y));
  };

  const handlePanEnd = (_event, info) => {
    if (!active.current) return;
    active.current = false;
    const shouldDismiss = info.offset.y > DISMISS_DISTANCE_PX || info.velocity.y > DISMISS_VELOCITY_PX_PER_S;
    if (shouldDismiss) {
      // Pas d'animation manuelle "vers l'écran suivant" ici : `onDismiss`
      // retire ce composant de son parent, et son propre `exit` (variants
      // Framer posées par l'appelant, voir MODAL_SHEET_MOTION) prend le
      // relais — en repartant de LA VALEUR ACTUELLE de `y` (déjà avancée
      // par le tirage), pas de zéro, puisque c'est le même MotionValue.
      onDismiss();
    } else {
      animate(y, 0, CLOSE_SPRING);
    }
  };

  return {
    // À étaler sur le <motion.div> de la feuille elle-même (celui qui a
    // déjà `initial`/`animate`/`exit`, voir MODAL_SHEET_MOTION) — jamais
    // sur un enfant : Framer a besoin de ces gestionnaires directement sur
    // l'élément qui doit suivre le doigt.
    panHandlers: {
      onPanStart: handlePanStart,
      onPan: handlePan,
      onPanEnd: handlePanEnd,
      style: { y },
    },
    // Optionnel — à étaler sur un <motion.div> ENVELOPPANT le contenu
    // (jamais la feuille elle-même) si cette modale doit estomper son
    // contenu pendant le tirage. Ignoré (mais inoffensif) si non utilisé.
    contentStyle: { opacity: contentOpacity },
    y,
  };
}
