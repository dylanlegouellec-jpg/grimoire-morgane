import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { Clock, Heart, Users } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useLongPress from "../../hooks/useLongPress";
import DishArt from "../art/DishArt";
import RecipeOptionsModal from "../common/RecipeOptionsModal";

// Même cubic-bezier que l'ancienne @keyframes cardEnter/cardEnterAlt (CSS),
// remplacées par cet animate() Framer Motion impératif — voir le commentaire
// juste avant l'effet ci-dessous pour le pourquoi de cette bascule.
const CARD_ENTER_EASE = [0.22, 1, 0.36, 1];
const CARD_ENTER_DURATION_S = 0.42;
// Doit couvrir la durée du morphing de fermeture (spring 300/30, voir
// .illus-wrap plus bas) avant de désarmer — voir son commentaire.
const MORPH_DISARM_DELAY_MS = 500;

function RecipeCard({
  recipe,
  hidden = false,
  onOpen,
  isOpenRecipe = false,
  onToggleFavorite,
  onRequestDelete,
  onUpdateRecipe,
  enterDelay = 0,
  pressDuration = 750,
  showNutriscore = true,
  householdId,
  showToast,
}) {
  // Le Nutri-Score est calculé UNE FOIS côté serveur à la création/édition
  // de la recette (voir utils/nutriscoreClient.js + api/nutriscore.js) et
  // stocké dans recipe.nutriscoreGrade — plus aucun appel réseau ici.
  // Le repli local ne sert que pour les recettes qui n'ont pas encore ce
  // champ (démo, recettes créées avant l'ajout de la colonne).
  const nutri = recipe.nutriscoreGrade || estimateNutriscoreLocal(recipe.ingredients, recipe.category);
  const { language, dict } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);

  // Même appui long, au geste près, que celui des membres du foyer, de la
  // navigation, etc. — voir hooks/useLongPress.js. Cette carte portait
  // auparavant sa propre copie de cette logique (minuteries, seuil
  // d'annulation au scroll, retour haptique...), qui pouvait silencieusement
  // diverger de l'original à chaque évolution de l'un sans l'autre. Une
  // seule implémentation partagée élimine ce risque : l'animation
  // d'enfoncement/rebond (voir .press-anim dans styles.css.js) est
  // désormais identique, pas seulement similaire.
  const cardLongPress = useLongPress(() => setShowOptions(true), pressDuration);
  const prefersReducedMotion = useReducedMotion();

  // Arme le layoutId du morph JUSTE avant d'ouvrir (voir `.illus-wrap` plus
  // bas) — jamais en continu tant que la fiche n'est pas ouverte (voir le
  // commentaire de l'effet ci-dessous pour le pourquoi de cet armement
  // ponctuel plutôt que permanent). `flushSync` : force React à committer ce
  // changement d'état AVANT d'appeler `onOpen` juste après, pour que Framer
  // ait déjà enregistré la position de CETTE carte au moment précis où
  // `onOpen` déclenche le montage de RecipeDetail.jsx (qui porte le même
  // layoutId) — sans ce commit synchrone intermédiaire, les deux
  // changements d'état arriveraient dans le même rendu et Framer ne verrait
  // jamais l'état "avant" nécessaire au morphing.
  const [morphArmed, setMorphArmed] = useState(false);
  const handleClick = () => {
    if (cardLongPress.wasLongPress()) return;
    if (!prefersReducedMotion) flushSync(() => setMorphArmed(true));
    onOpen(recipe);
  };

  // La carte est un <div> (pas un <button>) pour pouvoir contenir le
  // bouton favori sans imbriquer un <button> dans un autre, invalide en
  // HTML — mais un <div onClick> seul n'est ni focusable au clavier, ni
  // annoncé comme un contrôle par un lecteur d'écran. role="button" +
  // tabIndex + ce gestionnaire clavier (Entrée/Espace, comportement natif
  // d'un vrai bouton) comblent les deux à la main.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  // Fondu/zoom d'entrée — Framer Motion, animate() impératif via useAnimate,
  // posé sur un ENFANT dédié (`.card-fade-wrap`, voir plus bas), jamais sur
  // la carte elle-même (voir son historique dans git log : un `layout`
  // Framer y a été tenté puis retiré, voir plus bas).
  //
  // Rejoué UNIQUEMENT quand la carte passe de masquée à visible (recherche
  // texte OU changement de filtre) — PAS à chaque changement de filtre pour
  // les cartes qui restaient déjà affichées (ex. Tout -> Sucré ne masque
  // aucune carte sucrée) : rejouer l'entrée de TOUTE la grille à chaque
  // bascule créait un burst de dizaines d'animations simultanées qui
  // parasitait le glissement de la pastille de filtre (AppShell.jsx), cause
  // du rendu saccadé signalé. Les cartes qui restent visibles se contentent
  // maintenant de sauter DIRECTEMENT à leur nouvelle place dans la grille
  // (comportement natif de CSS Grid quand des cartes voisines passent en
  // display:none) — SANS animation de réagencement : un `layout` Framer
  // avait été ajouté ici pour glisser en douceur plutôt que sauter, mais
  // provoquait un chevauchement visuel (une carte se retrouvant un instant
  // au-dessus d'une autre, décalée) sur de vraies photos réseau — jamais
  // reproduit avec les illustrations SVG de la démo, seulement avec de
  // vraies recettes utilisateur (voir la vidéo du rapport de bug) — signe
  // probable d'une interaction entre la mesure de mise en page de Framer et
  // le décodage d'image encore en cours au moment de la capture "avant/
  // après" du FLIP. Retiré : un saut net et fiable vaut mieux qu'un
  // glissement séduisant mais parfois cassé.
  //
  // La carte n'est jamais démontée/remontée pour ça (voir `hidden` ->
  // display:none plus bas) : son <img> ne bouge jamais, donc jamais
  // rechargée. `useLayoutEffect` (pas `useEffect`) : s'exécute avant que le
  // navigateur peigne la frame, pour que le "from" de l'animation (opacity
  // 0, léger décalage vers le bas) soit posé sans qu'un flash de la carte
  // déjà pleinement visible ne soit jamais peint entre-temps.
  const prevHiddenRef = useRef(true); // "true" au tout premier rendu : force l'entrée si la carte démarre visible
  const [scope, animate] = useAnimate();
  useLayoutEffect(() => {
    const becameVisible = prevHiddenRef.current && !hidden;
    prevHiddenRef.current = hidden;
    if (hidden || !becameVisible) return;
    animate(
      scope.current,
      { opacity: [0, 1], y: [14, 0], scale: [0.97, 1] },
      { duration: CARD_ENTER_DURATION_S, ease: CARD_ENTER_EASE, delay: enterDelay / 1000 }
    );
  }, [hidden, enterDelay, animate, scope]);

  // Désarme le morph (voir `handleClick`/`.illus-wrap`) un court instant
  // après la fermeture de la fiche — assez tard pour laisser le morphing de
  // fermeture (retour de la photo dans la grille) se jouer jusqu'au bout,
  // mais pas indéfiniment : sans ce désarmement, cette carte garderait son
  // layoutId en permanence après un premier usage, la réexposant au bug de
  // "photo qui traîne derrière sa carte" lors d'un futur changement de
  // filtre qui la déplacerait dans la grille (voir le commentaire de
  // l'effet précédent) — exactement le problème qu'un layoutId permanent
  // causait pour TOUTES les cartes avant ce correctif.
  const wasOpenRecipeRef = useRef(isOpenRecipe);
  useEffect(() => {
    const justClosed = wasOpenRecipeRef.current && !isOpenRecipe;
    wasOpenRecipeRef.current = isOpenRecipe;
    if (!justClosed) return undefined;
    const timer = setTimeout(() => setMorphArmed(false), MORPH_DISARM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpenRecipe]);

  return (
    <>
      <div
        ref={cardLongPress.ref}
        className={`card recipe-card press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Le
        // fondu/zoom d'entrée, lui, est relancé plus haut (voir l'effet
        // useLayoutEffect ci-dessus) uniquement quand elle (re)devient
        // visible ; les cartes qui restent visibles sautent directement à
        // leur nouvelle place dans la grille (voir le commentaire de
        // l'effet ci-dessus pour le pourquoi de l'absence d'animation ici).
        style={hidden ? { display: "none" } : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={hidden ? -1 : 0}
        aria-label={translateRecipeText(recipe.title, language)}
        {...cardLongPress.handlers}
      >
        {/* Enveloppe dédiée au fondu/zoom d'entrée (voir useAnimate plus
            haut), jamais la carte elle-même — un simple <div>, sans
            incidence sur la mise en page (aucun style propre : .illus-wrap/
            .card-body s'empilaient déjà normalement l'un sous l'autre). */}
        <div ref={scope} className="card-fade-wrap">
          <motion.div
            className="illus-wrap"
            // layoutId Framer Motion (remplace l'ancien view-transition-name
            // de l'API navigateur — voir AppShell.jsx pour l'historique),
            // ARMÉ PONCTUELLEMENT PAR CETTE CARTE (voir `morphArmed`,
            // `handleClick`) plutôt que présent en continu tant que la fiche
            // n'est pas ouverte : une première version le laissait actif en
            // permanence sur les 24 cartes de la grille dès qu'aucune fiche
            // n'était ouverte — pratique pour que le morphing puisse se
            // déclencher à tout moment sur un simple tap, mais avec un effet
            // de bord découvert après coup (signalé avec vidéo à l'appui) :
            // Framer suit alors CE layoutId en continu, y compris pendant un
            // changement de filtre qui ne fait que RÉORGANISER la grille
            // (aucune fiche ne s'ouvre) — la carte elle-même saute alors
            // instantanément à sa nouvelle place (voir plus haut, `layout`
            // volontairement absent de la carte), mais Framer, lui, continue
            // de vouloir animer EN DOUCEUR la position de cette photo vers
            // sa nouvelle place réelle : elle se retrouve littéralement à
            // traîner loin derrière sa propre carte pendant plusieurs
            // centaines de ms ("les images viennent du bas"), le texte
            // (non suivi par Framer) restant lui bien aligné sur la carte.
            // `morphArmed` n'est vrai que juste avant l'ouverture (posé par
            // `flushSync` dans `handleClick`) et jusqu'à peu après la
            // fermeture (`MORPH_DISARM_DELAY_MS`, pour laisser le morphing
            // de fermeture se jouer) : cette carte n'est donc suivie par
            // Framer que pendant les quelques centaines de ms où un
            // morphing réel est en cours, jamais pendant un simple
            // changement de filtre. `undefined` aussi avec "Réduire les
            // animations" système (prefers-reduced-motion).
            layoutId={morphArmed && !prefersReducedMotion ? `recipe-photo-${recipe.id}` : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <DishArt recipe={recipe} />
            <button
              type="button"
              className={`fav-btn ${recipe.favorite ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(recipe.id);
                triggerHaptic(15);
              }}
              aria-label={recipe.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={recipe.favorite}
            >
              <Heart size={16} fill={recipe.favorite ? "currentColor" : "none"} />
            </button>
          </motion.div>
          <div className="card-body">
            <div className="card-top-row">
              <span className={`chip ${categoryClass(recipe)}`}>{dict.labels[categoryLabel(recipe)] || categoryLabel(recipe)}</span>
              {showNutriscore && (
                <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
              )}
            </div>
            <h3>{translateRecipeText(recipe.title, language)}</h3>
            <div className="card-meta">
              <span><Clock size={13} /> {recipe.time} min</span>
              <span><Users size={13} /> {recipe.servings}</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showOptions && (
          <RecipeOptionsModal
            recipe={recipe}
            onClose={() => { setShowOptions(false); cardLongPress.resetPressState(); }}
            onUpdateRecipe={onUpdateRecipe}
            onRequestDelete={onRequestDelete}
            householdId={householdId}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Chaque frappe dans la barre de recherche ou changement de filtre
// re-render RecipesView, donc potentiellement toutes ses cartes — memo()
// évite qu'une carte dont les props n'ont pas changé ne se re-rende pour
// autant (cf. audit, point 6).
export default memo(RecipeCard);
