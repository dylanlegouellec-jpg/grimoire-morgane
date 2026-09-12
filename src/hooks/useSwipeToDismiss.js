import { useEffect, useRef, useState } from "react";

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
// Doit rester cohérente avec la courbe de transition CSS ci-dessous
// (style.transition, cas `isClosing`) : le vrai `onDismiss` — qui démonte
// la modale et débloque donc le scroll du fond via useBodyScrollLock — n'est
// appelé qu'UNE FOIS cette animation de sortie terminée, jamais au moment du
// relâchement du doigt. Sans ce délai, le nœud DOM que le doigt était en
// train de suivre disparaît EN PLEIN GESTE : le navigateur reporte alors la
// fin du geste (touchend/inertie résiduelle) sur ce qui se trouve maintenant
// en dessous (le <body>, tout juste redevenu scrollable), provoquant un
// sursaut de scroll brutal de l'arrière-plan pile au moment de la fermeture.
const CLOSE_ANIMATION_MS = 250;

export default function useSwipeToDismiss(onDismiss, { scrollRef, disabled = false, fade = false } = {}) {
  const startYRef = useRef(null);
  const draggingRef = useRef(false);
  // true dès que le seuil de fermeture est franchi au relâchement : plus
  // aucun nouveau geste n'est pris en compte pendant que la feuille achève
  // sa sortie (voir onTouchStart/onTouchMove/onTouchEnd ci-dessous).
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  // Deux derniers échantillons (position + horodatage) : sert à calculer une
  // vitesse INSTANTANÉE au relâchement (celle du tout dernier mouvement),
  // pas une moyenne depuis le début du geste — un "flick" rapide doit
  // fermer la modale même si la distance totale tirée reste sous le seuil.
  const prevSampleRef = useRef({ y: 0, time: 0 });
  const lastSampleRef = useRef({ y: 0, time: 0 });
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

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
    if (disabled || closingRef.current) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    startYRef.current = t.clientY;
    draggingRef.current = false;
    prevSampleRef.current = { y: t.clientY, time: Date.now() };
    lastSampleRef.current = prevSampleRef.current;
  };

  const onTouchMove = (e) => {
    if (disabled || closingRef.current || startYRef.current === null) return;
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
    // Empêche aussi la remontée du geste vers un éventuel ancêtre React
    // (ex. le swipe de semaine du Planning, voir PlanningView.jsx) : les
    // modales sont montées via createPortal dans <body>, mais React fait
    // bien remonter ses événements synthétiques le long de l'arbre REACT
    // (pas de l'arbre DOM) à travers les portails.
    e.stopPropagation();
    setTranslateY(dy);
  };

  const onTouchEnd = (e) => {
    if (disabled || closingRef.current) return;
    const wasDragging = draggingRef.current;
    const distance = translateY;
    const { y: prevY, time: prevTime } = prevSampleRef.current;
    const { y: lastY, time: lastTime } = lastSampleRef.current;
    const elapsed = Math.max(1, lastTime - prevTime);
    const velocity = Math.max(0, (lastY - prevY) / elapsed); // px/ms, vers le bas seulement
    const shouldDismiss = wasDragging && (distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_PER_MS);

    startYRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);

    if (!shouldDismiss) {
      setTranslateY(0);
      return;
    }

    // Geste de fermeture confirmé : on empêche tout traitement natif résiduel
    // de CE relâchement (inertie de défilement que le navigateur pourrait
    // vouloir appliquer ensuite) et on termine l'animation de sortie AVANT
    // d'appeler le vrai onDismiss — voir CLOSE_ANIMATION_MS ci-dessus.
    if (e && e.cancelable) e.preventDefault();
    closingRef.current = true;
    setIsClosing(true);
    // Grande valeur volontairement générique (pas besoin de mesurer la
    // feuille) : pousse n'importe quelle modale hors de n'importe quel
    // écran, portrait ou paysage.
    setTranslateY(Math.max(window.innerHeight || 0, 800) + 200);
    closeTimerRef.current = setTimeout(() => {
      onDismiss();
    }, CLOSE_ANIMATION_MS);
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
      // Fondu progressif pendant le tirage, comme RecipeDetail.jsx (seule
      // modale à avoir eu ce geste jusqu'ici, via sa propre logique de
      // glissement plutôt que ce hook partagé) : sans lui, seule la
      // position suivait le doigt, jamais l'opacité — le geste "marchait"
      // mais paraissait moins vivant, moins "physique" que sur la fiche
      // recette. Même formule (plafond à 0.4, jamais totalement invisible
      // avant que le seuil de fermeture ne soit franchi).
      //
      // DÉSACTIVÉ PAR DÉFAUT (`fade: true` explicite pour l'activer) : la
      // moitié des ~20 appelants de ce hook sont des modales empilées
      // PAR-DESSUS une autre modale déjà affichée (RecipeForm par-dessus
      // RecipeDetail en édition, ProfileEditor par-dessus les Réglages,
      // les sous-modales Foyer empilées jusqu'à 3 niveaux...). Rendre la
      // feuille elle-même translucide pendant le tirage y laisse
      // transparaître la modale du dessous À TRAVERS son propre contenu
      // (pas seulement dans l'espace qu'elle libère en glissant) : les deux
      // écrans de texte se superposent en un fouillis illisible — signalé
      // comme un "bug chelou" après l'avoir activé partout par défaut, sur
      // le panneau Accessibilité (empilé sur le panneau principal des
      // Réglages). Sans danger seulement quand rien de chargé/lisible ne se
      // trouve juste derrière (un simple onglet, une grille de recettes) —
      // à activer au cas par cas, pas par défaut.
      opacity: fade && translateY > 0 ? Math.max(1 - translateY / 300, 0.4) : 1,
      // Courbe élastique UNIQUEMENT pour le retour à la position de repos
      // (tirage relâché sous le seuil de fermeture) — une fermeture
      // confirmée (`isClosing`) accélère au contraire vers la sortie
      // (ease-in), comme une feuille qui tombe une fois lâchée : jamais de
      // rebond une fois que la décision de fermer est prise.
      transition: isDragging
        ? "none"
        : isClosing
          ? `transform ${CLOSE_ANIMATION_MS}ms cubic-bezier(0.4, 0, 1, 1)${fade ? `, opacity ${CLOSE_ANIMATION_MS}ms ease` : ""}`
          : `transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)${fade ? ", opacity 0.25s ease" : ""}`,
      // Bloque toute reconnaissance de geste native (scroll, rebond
      // élastique) tant qu'un tirage est en cours OU que l'animation de
      // fermeture joue — en complément de preventDefault()/stopPropagation()
      // ci-dessus, jamais un substitut : certains navigateurs entament leur
      // propre traitement du geste avant même que le premier touchmove
      // n'atteigne ce handler.
      touchAction: translateY > 0 ? "none" : undefined,
    },
    // Variante sûre pour une feuille empilée sur une autre modale déjà
    // affichée (voir le pavé ci-dessus) : à poser sur un DIV ENVELOPPANT
    // le contenu, PAS sur l'élément .modal lui-même (qui garde alors son
    // propre fond opaque `background: var(--parchment)` intact, voir
    // modalsBase.css.js). Le contenu s'estompe donc sur son propre fond
    // plein, jamais sur ce qu'il y a derrière — même formule que
    // `style.opacity` ci-dessus, disponible que `fade` soit actif ou non.
    contentStyle: {
      opacity: translateY > 0 ? Math.max(1 - translateY / 300, 0.4) : 1,
      transition: isDragging ? "none" : `opacity ${isClosing ? CLOSE_ANIMATION_MS : 250}ms ease`,
    },
    isDragging,
    isClosing,
  };
}
