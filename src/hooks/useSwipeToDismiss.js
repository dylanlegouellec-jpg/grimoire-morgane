import { useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  "TIRER POUR FERMER" — geste générique pour feuilles/modales en bas   */
/*  d'écran (bottom sheets)                                              */
/*                                                                        */
/*  Ne s'active QUE si le tirage commence en haut du défilement interne   */
/*  (scrollTop <= 0, voir `scrollRef`) ET va vers le bas — dans tous les   */
/*  autres cas (scroll normal, tirage vers le haut, appui simple), aucun   */
/*  handler ici ne fait quoi que ce soit et le comportement natif reste     */
/*  intact, exactement comme les autres gestes tactiles de l'app           */
/*  (RecipeCard, ShoppingItemRow) : jamais de preventDefault() par défaut.  */
/*                                                                          */
/*  Seule exception, volontaire et étroitement bornée : une fois le          */
/*  tirage vers le bas CONFIRMÉ (axe verrouillé + au sommet du scroll),       */
/*  on appelle preventDefault() pour empêcher le rebond élastique natif       */
/*  de la zone de scroll de se battre visuellement avec notre propre          */
/*  suivi du doigt (translateY). C'est le seul preventDefault tactile de       */
/*  toute l'application — strictement local à ce cas précis, il ne peut        */
/*  donc pas reproduire les régressions de scroll déjà rencontrées ailleurs      */
/*  cette session (celles-là venaient d'une transform appliquée dès le           */
/*  touchstart, avant même de savoir s'il s'agissait d'un scroll — ici on         */
/*  attend une preuve de mouvement réel, vers le bas, depuis le sommet).          */
/* ------------------------------------------------------------------ */
const AXIS_LOCK_THRESHOLD_PX = 8;
const DISMISS_DISTANCE_PX = 100;
const DISMISS_VELOCITY_PX_PER_MS = 0.6;

export default function useSwipeToDismiss(onDismiss, { scrollRef, disabled = false, resetInstantlyOnDismiss = false } = {}) {
  const startYRef = useRef(null);
  const draggingRef = useRef(false);
  // Deux derniers échantillons (position + horodatage) : sert à calculer une
  // vitesse INSTANTANÉE au relâchement (celle du tout dernier mouvement),
  // pas une moyenne depuis le début du geste — un "flick" rapide doit
  // fermer la modale même si la distance totale tirée reste sous le seuil.
  const prevSampleRef = useRef({ y: 0, time: 0 });
  const lastSampleRef = useRef({ y: 0, time: 0 });
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Vrai le temps d'UN SEUL rendu : le tirage vient de déclencher onDismiss()
  // ET resetInstantlyOnDismiss est demandé (voir plus bas) — évite le rebond
  // ressort du retour à translateY(0) juste après. Utile quand `onDismiss`
  // ne referme pas vraiment ce panneau mais bascule son CONTENU (ex.
  // SecretSettingsModal.jsx, retour à la liste principale des Réglages
  // depuis une sous-vue) : ce panneau reste monté, donc l'animation de
  // relâchement a le temps de jouer pour de vrai — sans ce drapeau, on
  // verrait le nouveau contenu apparaître instantanément PENDANT que tout le
  // panneau rebondit visuellement vers sa position de repos, comme s'il se
  // refermait puis se rouvrait, alors que l'écran affiché "était déjà là".
  const skipNextResetTransitionRef = useRef(false);

  const atScrollTop = () => {
    const el = scrollRef && scrollRef.current;
    return !el || el.scrollTop <= 0;
  };

  const recordSample = (y) => {
    prevSampleRef.current = lastSampleRef.current;
    lastSampleRef.current = { y, time: Date.now() };
  };

  const reset = () => {
    startYRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
    setTranslateY(0);
  };

  const onTouchStart = (e) => {
    if (disabled) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    startYRef.current = t.clientY;
    draggingRef.current = false;
    prevSampleRef.current = { y: t.clientY, time: Date.now() };
    lastSampleRef.current = prevSampleRef.current;
    // Reconsommé à chaque nouveau geste (jamais pendant un rendu — voir la
    // lecture dans `style` plus bas) : ne doit rester vrai QUE le temps du
    // repos qui suit le tirage instantané qui l'a posé, pas indéfiniment.
    skipNextResetTransitionRef.current = false;
  };

  const onTouchMove = (e) => {
    if (disabled || startYRef.current === null) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dy = t.clientY - startYRef.current;

    if (!draggingRef.current) {
      // Pas encore confirmé : sous le seuil, ou pas au sommet du scroll —
      // on ne touche à rien, le scroll natif (ou l'immobilité d'un appui)
      // se déroule normalement.
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
      reset();
      return;
    }

    recordSample(t.clientY);

    if (dy <= 0) {
      // Retour vers le haut en cours de geste : plus rien à suivre.
      setTranslateY(0);
      return;
    }

    // Tirage vers le bas confirmé depuis le sommet : on prend la main sur
    // CE geste précis (voir le commentaire de fichier ci-dessus).
    if (e.cancelable) e.preventDefault();
    setTranslateY(dy);
  };

  const onTouchEnd = () => {
    if (disabled) return;
    const wasDragging = draggingRef.current;
    const distance = translateY;
    const { y: prevY, time: prevTime } = prevSampleRef.current;
    const { y: lastY, time: lastTime } = lastSampleRef.current;
    const elapsed = Math.max(1, lastTime - prevTime);
    const velocity = Math.max(0, (lastY - prevY) / elapsed); // px/ms, vers le bas seulement
    const shouldDismiss = wasDragging && (distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_PER_MS);

    // Posé AVANT reset() (donc lu dès le rendu qu'il déclenche) : sans lui,
    // translateY reviendrait à 0 avec la transition ressort habituelle
    // pendant que `onDismiss` change le CONTENU du panneau — un rebond
    // visible juste après l'apparition du nouvel écran, perçu à tort comme
    // "il se referme puis se rouvre" (signalé sur SecretSettingsModal,
    // retour à la liste principale des Réglages depuis une sous-vue tiré
    // vers le bas). N'a d'effet que si `onDismiss` ne démonte pas ce
    // panneau : une vraie fermeture (le panneau disparaît) n'a de toute
    // façon jamais le temps de jouer ce rebond.
    if (shouldDismiss && resetInstantlyOnDismiss) skipNextResetTransitionRef.current = true;

    reset();

    if (shouldDismiss) onDismiss();
  };

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    style: {
      transform: translateY > 0 ? `translateY(${translateY}px)` : undefined,
      transition: (isDragging || skipNextResetTransitionRef.current) ? "none" : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    isDragging,
  };
}
