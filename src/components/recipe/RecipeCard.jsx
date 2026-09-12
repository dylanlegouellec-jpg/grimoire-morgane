import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
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

function RecipeCard({
  recipe,
  hidden = false,
  filterGeneration = 0,
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

  const handleClick = () => {
    if (cardLongPress.wasLongPress()) return;
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

  // Fondu/zoom d'entrée — Framer Motion, animate() impératif via useAnimate
  // (PAS motion.div : cet élément porte déjà ses propres écouteurs tactiles
  // natifs posés par useLongPress, voir cardLongPress.ref/setCardNode plus
  // bas ; useAnimate anime directement le noeud DOM qu'on lui désigne, sans
  // rien exiger de plus sur le composant qui le porte). Rejoué à chaque fois
  // que la carte (re)devient visible : soit qu'elle vienne de sortir de
  // display:none (recherche texte OU changement de filtre — voir `hidden`
  // plus bas), soit que `filterGeneration` ait changé alors qu'elle restait
  // déjà affichée (ex. Tout -> Sucré ne masque aucune carte sucrée, donc
  // aucune transition display:none->visible ne se produit sur elle, mais la
  // grille se réorganise quand même sous ses yeux : sans ce second
  // déclencheur, ce changement de filtre précis ne jouerait aucune
  // animation du tout). `filterGeneration` (fourni par RecipesView,
  // incrémenté à chaque changement de filtre/favoris réel — jamais à la
  // recherche texte) porte ce second cas.
  //
  // La carte n'est jamais démontée/remontée pour ça (voir `hidden` ->
  // display:none plus bas) : son <img> ne bouge jamais, donc jamais
  // rechargée. `useLayoutEffect` (pas `useEffect`) : s'exécute avant que le
  // navigateur peigne la frame, pour que le "from" de l'animation (opacity
  // 0, léger décalage vers le bas) soit posé sans qu'un flash de la carte
  // déjà pleinement visible ne soit jamais peint entre-temps.
  const prevHiddenRef = useRef(true); // "true" au tout premier rendu : force l'entrée si la carte démarre visible
  const prevGenerationRef = useRef(null); // "null" : force aussi l'entrée au tout premier rendu
  const [scope, animate] = useAnimate();
  useLayoutEffect(() => {
    const becameVisible = prevHiddenRef.current && !hidden;
    const generationChanged = filterGeneration !== prevGenerationRef.current;
    prevHiddenRef.current = hidden;
    prevGenerationRef.current = filterGeneration;
    if (hidden || (!becameVisible && !generationChanged)) return;
    animate(
      scope.current,
      { opacity: [0, 1], y: [14, 0], scale: [0.97, 1] },
      { duration: CARD_ENTER_DURATION_S, ease: CARD_ENTER_EASE, delay: enterDelay / 1000 }
    );
  }, [hidden, filterGeneration, enterDelay, animate, scope]);

  // Fusionne la ref DOM de useLongPress (nodeRef, pour ses propres écouteurs
  // tactiles natifs) et celle de useAnimate (scope, pour l'animation
  // d'entrée ci-dessus) — deux refs indépendantes posées sur le MÊME noeud.
  const setCardNode = useCallback((node) => {
    cardLongPress.ref.current = node;
    scope.current = node;
  }, [cardLongPress.ref, scope]);

  return (
    <>
      <div
        ref={setCardNode}
        className={`card recipe-card press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Le
        // fondu/zoom d'entrée, lui, est relancé plus haut (voir l'effet
        // useLayoutEffect ci-dessus) à chaque changement de filtre.
        style={hidden ? { display: "none" } : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={hidden ? -1 : 0}
        aria-label={translateRecipeText(recipe.title, language)}
        {...cardLongPress.handlers}
      >
        <motion.div
          className="illus-wrap"
          // layoutId Framer Motion (remplace l'ancien view-transition-name de
          // l'API navigateur — voir AppShell.jsx pour l'historique) : présent
          // tant que cette recette n'est PAS la fiche actuellement ouverte,
          // absent dès qu'elle l'est (voir `isOpenRecipe`, fourni par
          // AppShell.jsx via RecipesView.jsx) — jamais deux éléments montés
          // avec le MÊME layoutId à la fois, la fiche (RecipeDetail.jsx) le
          // récupère alors pile à cet instant, ce qui déclenche le morphing
          // Framer entre les deux. `undefined` aussi avec "Réduire les
          // animations" système (prefers-reduced-motion) : la fiche s'ouvre
          // alors normalement, juste sans ce morphing précis.
          layoutId={!isOpenRecipe && !prefersReducedMotion ? `recipe-photo-${recipe.id}` : undefined}
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
