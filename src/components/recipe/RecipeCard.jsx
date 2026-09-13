import { memo, useLayoutEffect, useRef, useState } from "react";
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

  // Fondu/zoom d'entrée — Framer Motion, animate() impératif via useAnimate,
  // posé sur un ENFANT dédié (`.card-fade-wrap`, voir plus bas), jamais sur
  // la carte elle-même : celle-ci porte maintenant `layout` (voir plus bas,
  // pour le réagencement fluide de la grille) qui pilote lui aussi
  // `transform` par projection — les deux se battraient pour la même
  // propriété sur le même noeud sinon (même principe déjà rencontré cette
  // session entre `y` et une valeur dérivée dans useDismissibleSheet.js).
  //
  // Rejoué UNIQUEMENT quand la carte passe de masquée à visible (recherche
  // texte OU changement de filtre) — PAS à chaque changement de filtre pour
  // les cartes qui restaient déjà affichées (ex. Tout -> Sucré ne masque
  // aucune carte sucrée) : celles-là se contentent maintenant de GLISSER
  // jusqu'à leur nouvelle place dans la grille (voir `layout` plus bas), un
  // réagencement bien plus lisible qu'un fondu répété sur toute la grille à
  // chaque bascule — et surtout, sans un burst de dizaines d'animations
  // simultanées venant parasiter le glissement de la pastille de filtre
  // (AppShell.jsx) au même instant, cause du rendu saccadé signalé.
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

  // `layout` (réagencement fluide, voir juste au-dessus) désactivé PILE sur
  // le rendu où `hidden` bascule : à cet instant précis, la carte passe
  // d'une boîte 0×0 (display:none) à sa taille normale — Framer y verrait un
  // changement de TAILLE massif et tenterait de l'animer par projection, en
  // plein sur le fondu/zoom d'entrée ci-dessus, sur le même genre de conflit
  // que documenté plus haut. Comparaison faite PENDANT le rendu (pas dans un
  // effet), même mécanisme déjà utilisé ailleurs dans ce fichier avant cette
  // passe (l'ancien `enterVariant`/`prevGeneration`) : réagir à un
  // changement de prop sans laisser passer une frame avec la mauvaise valeur
  // de `layout`.
  const prevHiddenForLayoutRef = useRef(hidden);
  const justToggledVisibility = prevHiddenForLayoutRef.current !== hidden;
  prevHiddenForLayoutRef.current = hidden;

  return (
    <>
      <motion.div
        ref={cardLongPress.ref}
        layout={!justToggledVisibility}
        transition={{ layout: { type: "spring", stiffness: 400, damping: 38 } }}
        className={`card recipe-card press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Le
        // fondu/zoom d'entrée, lui, est relancé plus haut (voir l'effet
        // useLayoutEffect ci-dessus) uniquement quand elle (re)devient
        // visible ; les autres cartes se contentent de GLISSER jusqu'à leur
        // nouvelle place (voir `layout` ci-dessus).
        style={hidden ? { display: "none" } : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={hidden ? -1 : 0}
        aria-label={translateRecipeText(recipe.title, language)}
        {...cardLongPress.handlers}
      >
        {/* Enveloppe dédiée au fondu/zoom d'entrée (voir useAnimate plus
            haut) — jamais la carte elle-même, qui porte `layout` (juste
            au-dessus) : les deux animeraient sinon `transform` sur le même
            noeud, en concurrence directe. Un simple <div>, sans incidence
            sur la mise en page (aucun style propre : .illus-wrap/.card-body
            s'empilaient déjà normalement l'un sous l'autre). */}
        <div ref={scope} className="card-fade-wrap">
          <motion.div
            className="illus-wrap"
            // layoutId Framer Motion (remplace l'ancien view-transition-name
            // de l'API navigateur — voir AppShell.jsx pour l'historique) :
            // présent tant que cette recette n'est PAS la fiche actuellement
            // ouverte, absent dès qu'elle l'est (voir `isOpenRecipe`, fourni
            // par AppShell.jsx via RecipesView.jsx) — jamais deux éléments
            // montés avec le MÊME layoutId à la fois, la fiche
            // (RecipeDetail.jsx) le récupère alors pile à cet instant, ce qui
            // déclenche le morphing Framer entre les deux. `undefined` aussi
            // avec "Réduire les animations" système (prefers-reduced-motion)
            // : la fiche s'ouvre alors normalement, juste sans ce morphing
            // précis.
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
      </motion.div>

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
