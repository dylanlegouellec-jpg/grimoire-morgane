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
  filterGeneration = 0,
  suppressMorph = false,
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
  // la carte elle-même : celle-ci ne porte ni `layout` ni `layoutId` (voir
  // `.illus-wrap` plus bas pour l'historique des deux bugs distincts que ces
  // props y ont causés) — ce fondu-ci, purement opacity/transform via WAAPI,
  // n'a jamais été en cause dans ni l'un ni l'autre et reste totalement
  // indépendant du système de layout de Framer.
  //
  // Rejoué à chaque fois que la carte (re)devient visible (recherche texte
  // OU changement de filtre) OU que `filterGeneration` change alors qu'elle
  // restait déjà affichée (ex. Tout -> Salé ne masque aucune carte salée,
  // déjà visibles sous "Tout" : sans ce second déclencheur, la seule chose
  // qui se produit pour elles est un saut instantané de position — perçu
  // comme une absence totale d'animation, signalé par l'utilisateur).
  // `filterGeneration` (fourni par RecipesView, incrémenté à chaque
  // changement de filtre/favoris réel — jamais à la recherche texte) porte
  // ce second cas. Mesuré (voir git log) qu'un burst de dizaines de ces
  // fondus déclenchés en même temps ne coûte rien en performance (0 frame
  // perdue) : rien n'empêche de les rejouer largement.
  //
  // La carte n'est jamais démontée/remontée pour ça (voir `hidden` ->
  // display:none plus bas) : son <img> ne bouge jamais, donc jamais
  // rechargée. `useLayoutEffect` (pas `useEffect`) : s'exécute avant que le
  // navigateur peigne la frame, pour que le "from" de l'animation (opacity
  // 0, léger décalage vers le bas) soit posé sans qu'un flash de la carte
  // déjà pleinement visible ne soit jamais peint entre-temps.
  const prevHiddenRef = useRef(true); // "true" au tout premier rendu : force l'entrée si la carte démarre visible
  const prevGenerationRef = useRef(filterGeneration);
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

  return (
    <>
      <div
        ref={cardLongPress.ref}
        className={`card recipe-card press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Cette
        // carte elle-même n'anime jamais sa POSITION (aucun `layout` Framer,
        // voir l'effet ci-dessus pour l'historique) : elle saute
        // instantanément à sa nouvelle place dans la grille, mais son
        // CONTENU (voir `.card-fade-wrap` plus bas) rejoue un fondu/zoom
        // d'entrée à ce moment précis — assez pour signaler visuellement le
        // changement sans jamais risquer de rejouer les bugs de
        // repositionnement animé rencontrés précédemment.
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
            // de l'API navigateur — voir AppShell.jsx pour l'historique) :
            // présent tant que cette recette n'est PAS la fiche actuellement
            // ouverte, absent dès qu'elle l'est — jamais deux éléments montés
            // avec le MÊME layoutId à la fois, la fiche (RecipeDetail.jsx) le
            // récupère alors pile à cet instant, ce qui déclenche le
            // morphing Framer entre les deux (l'effet "aspiré" du clic).
            //
            // ESSAYÉ PUIS ABANDONNÉ : n'armer ce layoutId que ponctuellement,
            // juste avant l'ouverture (via flushSync dans `handleClick`),
            // plutôt qu'en continu — pour éviter que Framer ne suive cette
            // photo pendant un simple changement de filtre qui réorganise la
            // grille sans ouvrir aucune fiche (voir plus bas, `suppressMorph`,
            // qui règle maintenant ce cas précis autrement). Mesuré (traceur
            // de taille du hero pendant l'ouverture) que Framer ne réalise
            // ALORS PLUS AUCUN morphing du tout — la fiche apparaît déjà à sa
            // taille quasi finale dès la première frame, sans jamais grandir
            // depuis la petite photo de la carte (l'effet "aspiré" disparu,
            // signalé par l'utilisateur) — quel que soit le délai ajouté
            // avant d'ouvrir (testé jusqu'à 50ms) : Framer ne semble tout
            // simplement pas traiter un layoutId qui vient tout juste d'être
            // assigné à un composant déjà monté comme une source valide pour
            // un morphing. Une présence CONTINUE (comme ici) reste donc
            // nécessaire au bon fonctionnement du morphing lui-même.
            //
            // Absent aussi pendant `suppressMorph` (voir son commentaire,
            // RecipesView.jsx) — la fenêtre courte d'un changement de filtre
            // réel, où cette carte peut changer de position dans la grille
            // sans qu'aucune fiche ne s'ouvre — et avec "Réduire les
            // animations" système (prefers-reduced-motion).
            layoutId={!isOpenRecipe && !suppressMorph && !prefersReducedMotion ? `recipe-photo-${recipe.id}` : undefined}
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
