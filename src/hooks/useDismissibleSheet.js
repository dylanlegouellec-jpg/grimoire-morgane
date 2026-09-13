import { useRef, useState } from "react";
import { useMotionValue, useTransform, animate } from "motion/react";

/* ------------------------------------------------------------------ */
/*  "TIRER POUR FERMER" — version Framer Motion de useSwipeToDismiss.js */
/*  (retiré : ce hook le remplace partout, voir git log pour l'ancienne */
/*  implémentation 100% CSS/JS maison — reprise ici quasi telle quelle    */
/*  pour la RECONNAISSANCE du geste, voir plus bas, seul le RENDU change   */
/*  vraiment : `y.set()` — une MotionValue Framer — au lieu d'un useState  */
/*  redessinant tout à chaque pixel).                                      */
/*                                                                          */
/*  RÉGRESSION CORRIGÉE (bug réel, jamais détecté avant la mise en          */
/*  production) : une première réécriture Framer de ce hook reposait sur     */
/*  le geste "pan" (onPanStart/onPan/onPanEnd), délibérément passif — jamais   */
/*  preventDefault() — pour ne jamais gêner le défilement natif du contenu.     */
/*  Testée uniquement à la souris (Playwright `page.mouse`, qui génère de        */
/*  vrais PointerEvent mais ne passe JAMAIS par l'arbitrage tactile natif du       */
/*  navigateur) : ça marchait très bien. Sur un vrai écran tactile en revanche,     */
/*  `.modal`/`.grimoire-page` porte `touch-action: pan-y` (pour le défilement        */
/*  natif du contenu) — et un navigateur qui voit ce `touch-action` tranche EN        */
/*  FAVEUR DU DÉFILEMENT NATIF dès le premier `touchmove`, quoi que fasse le JS :       */
/*  il annule alors le suivi de pointeur de Framer via un `pointercancel` (vérifié :     */
/*  tous les `touchmove` suivants deviennent `cancelable: false`). Le geste de           */
/*  fermeture se voyait donc interrompu après quelques pixels et repartait en             */
/*  ressort vers 0 — jamais assez pour déclencher la fermeture. Un remplacement            */
/*  par `drag`+`dragControls` (censé, à la différence de "pan", prendre la main sur         */
/*  le geste) a été tenté ensuite mais n'a RIEN changé : `touch-action: pan-y` est            */
/*  une décision prise par le compositeur du navigateur dès le premier `touchmove`             */
/*  (avant même qu'aucun JS ne s'exécute) — aucune API Framer ne peut la contourner              */
/*  après coup, quel que soit le système de geste utilisé par-dessus.                              */
/*                                                                                                     */
/*  D'où le retour à des écouteurs tactiles NATIFS (onTouchStart/onTouchMove/onTouchEnd,               */
/*  exactement comme l'ancien hook) plutôt qu'un système de geste Framer : le seul                       */
/*  moyen fiable de gagner cet arbitrage est de POSITIVEMENT faire basculer                                */
/*  `touch-action` sur CET ÉLÉMENT à "none" dès que le tirage vers le bas est confirmé                      */
/*  (verrouillage d'axe à 8px, voir AXIS_LOCK_THRESHOLD_PX) — suffisamment tôt pour                           */
/*  gagner de vitesse le seuil de "commit" du navigateur — plutôt que d'espérer          */
/*  qu'un système de geste plus haut niveau y parvienne à notre place.               */
const AXIS_LOCK_THRESHOLD_PX = 8;
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

  const startYRef = useRef(null);
  const draggingRef = useRef(false);
  // Deux derniers échantillons (position + horodatage) : sert à calculer une
  // vitesse INSTANTANÉE au relâchement (celle du tout dernier mouvement), pas
  // une moyenne depuis le début du geste — un "flick" rapide doit fermer la
  // modale même si la distance totale tirée reste sous le seuil.
  const prevSampleRef = useRef({ y: 0, time: 0 });
  const lastSampleRef = useRef({ y: 0, time: 0 });
  // Seul bout d'état React de ce hook : un SEUL re-rendu au moment où le
  // tirage bascule confirmé/non confirmé (pour faire suivre `touch-action`,
  // voir le commentaire de tête) — jamais à chaque pixel, `y` (MotionValue)
  // s'en charge sans re-rendu.
  const [isDragging, setIsDragging] = useState(false);

  const atScrollTop = () => {
    const el = scrollRef && scrollRef.current;
    return !el || el.scrollTop <= 0;
  };

  const recordSample = (clientY) => {
    prevSampleRef.current = lastSampleRef.current;
    lastSampleRef.current = { y: clientY, time: Date.now() };
  };

  const reset = () => {
    startYRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
  };

  const handleTouchStart = (event) => {
    if (disabled) return;
    const t = event.touches && event.touches[0];
    if (!t) return;
    startYRef.current = t.clientY;
    draggingRef.current = false;
    prevSampleRef.current = { y: t.clientY, time: Date.now() };
    lastSampleRef.current = prevSampleRef.current;
  };

  const handleTouchMove = (event) => {
    if (disabled || startYRef.current == null) return;
    const t = event.touches && event.touches[0];
    if (!t) return;
    const dy = t.clientY - startYRef.current;

    if (!draggingRef.current) {
      // Pas encore confirmé : sous le seuil, ou pas au sommet du scroll — on
      // ne touche à rien, le scroll natif (ou l'immobilité d'un appui) se
      // déroule normalement.
      if (dy < AXIS_LOCK_THRESHOLD_PX || !atScrollTop()) {
        recordSample(t.clientY);
        return;
      }
      draggingRef.current = true;
      setIsDragging(true);
    }

    if (!atScrollTop()) {
      // Le contenu a défilé entre-temps (ex. remonté puis re-tiré) : on
      // abandonne proprement et on laisse le scroll natif reprendre la main.
      y.set(0);
      reset();
      return;
    }

    recordSample(t.clientY);

    if (dy <= 0) {
      y.set(0);
      return;
    }

    // Tirage vers le bas confirmé depuis le sommet : on prend la main sur CE
    // geste précis (voir le commentaire de fichier). `stopPropagation` évite
    // aussi de faire remonter le geste vers un éventuel ancêtre React (ex. le
    // swipe de semaine du Planning) — les modales sont montées via
    // createPortal dans <body>, mais React fait remonter ses événements
    // synthétiques le long de l'arbre REACT (pas du DOM) à travers les
    // portails.
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    y.set(dy);
  };

  const handleTouchEnd = (event) => {
    if (disabled) return;
    const wasDragging = draggingRef.current;
    const distance = y.get();
    const { y: prevY, time: prevTime } = prevSampleRef.current;
    const { y: lastY, time: lastTime } = lastSampleRef.current;
    const elapsed = Math.max(1, lastTime - prevTime);
    const velocity = Math.max(0, ((lastY - prevY) / elapsed) * 1000); // px/s
    reset();

    if (!wasDragging) return;

    const shouldDismiss = distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_PER_S;
    if (shouldDismiss) {
      // Empêche toute inertie de défilement résiduelle que le navigateur
      // pourrait vouloir appliquer à ce relâchement précis (même l'ancien
      // hook 100% maison le faisait ici).
      if (event && event.cancelable) event.preventDefault();
      // Pas d'animation manuelle "vers l'écran suivant" ici : `onDismiss`
      // retire ce composant de son parent, et son propre `exit` (variants
      // Framer posées par l'appelant, voir MODAL_SHEET_MOTION) prend le
      // relais — en repartant de LA VALEUR ACTUELLE de `y` (déjà avancée par
      // le tirage), pas de zéro, puisque c'est le même MotionValue.
      onDismiss();
    } else {
      animate(y, 0, CLOSE_SPRING);
    }
  };

  return {
    // À étaler sur le <motion.div> de la feuille elle-même (celui qui a déjà
    // `initial`/`animate`/`exit`, voir MODAL_SHEET_MOTION) — jamais sur un
    // enfant : ces écouteurs doivent être posés directement sur l'élément qui
    // doit suivre le doigt.
    panHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      style: { y, touchAction: isDragging ? "none" : undefined },
    },
    // Optionnel — à étaler sur un <motion.div> ENVELOPPANT le contenu
    // (jamais la feuille elle-même) si cette modale doit estomper son
    // contenu pendant le tirage. Ignoré (mais inoffensif) si non utilisé.
    contentStyle: { opacity: contentOpacity },
    y,
  };
}
