import { memo, useState } from "react";
import { Clock, Heart, Users } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useLongPress from "../../hooks/useLongPress";
import DishArt from "../art/DishArt";
import RecipeOptionsModal from "../common/RecipeOptionsModal";

function RecipeCard({
  recipe,
  hidden = false,
  filterGeneration = 0,
  onOpen,
  isTransitionSource = false,
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

  // Relance le fondu/zoom d'entrée sur TOUTE carte visible à chaque
  // changement de filtre (Tout/Salé/Sucré/Favoris) — pas seulement celles
  // qui viennent individuellement de passer de masquée à visible (sinon,
  // passer de "Tout" à "Sucré" ne révèle aucune carte sucrée au sens
  // strict — elle était déjà visible sous "Tout" — et rien n'animait sur ce
  // changement précis). `filterGeneration` (fourni par RecipesView,
  // incrémenté à chaque changement de filtre/favoris réel — jamais à la
  // recherche texte) porte ce déclenchement. La condition `!hidden` évite
  // tout travail (état, comparaison) pour les cartes actuellement masquées :
  // aucune raison de les toucher tant qu'elles ne sont pas affichées.
  //
  // La carte n'est jamais démontée/remontée pour ça (voir `hidden` ->
  // display:none plus bas) : son <img> ne bouge jamais, donc jamais
  // rechargée. Le mécanisme de relance : deux classes strictement
  // identiques visuellement (.card-enter / .card-enter-alt, voir
  // recipeCards.css.js) qu'on alterne à chaque déclenchement — le nom de
  // classe change réellement d'une frame à l'autre, ce qui suffit au
  // navigateur pour démarrer une nouvelle instance d'animation SANS lecture
  // de mise en page forcée (coût qui ne grandit donc pas avec le nombre de
  // cartes concernées — vérifié sur 20+ cartes en conditions réelles). La
  // bascule se fait pendant le rendu (pas dans un effet), le mécanisme
  // React recommandé pour "réagir" à un changement de prop sans laisser
  // passer une frame sans animation avant de la corriger.
  const [enterVariant, setEnterVariant] = useState(0);
  const [prevGeneration, setPrevGeneration] = useState(filterGeneration);
  if (!hidden && filterGeneration !== prevGeneration) {
    setPrevGeneration(filterGeneration);
    setEnterVariant((v) => (v === 0 ? 1 : 0));
  }
  const enterClass = enterVariant === 0 ? "card-enter" : "card-enter-alt";

  return (
    <>
      <div
        ref={cardLongPress.ref}
        className={`card recipe-card ${enterClass} press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Le
        // fondu/zoom d'entrée, lui, est relancé plus haut (voir enterClass)
        // à chaque changement de filtre.
        style={hidden ? { display: "none" } : { animationDelay: `${enterDelay}ms` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={hidden ? -1 : 0}
        aria-label={translateRecipeText(recipe.title, language)}
        {...cardLongPress.handlers}
      >
        <div
          className="illus-wrap"
          // `view-transition-name` posé UNIQUEMENT le temps du morphing vers
          // la fiche recette (voir AppShell.jsx, openRecipeWithTransition) —
          // jamais présent en dehors de cet instant précis, pour ne jamais se
          // retrouver sur deux éléments à la fois (la photo hero de
          // RecipeDetail porte le même nom, voir son commentaire).
          style={isTransitionSource ? { viewTransitionName: "rgm-recipe-photo" } : undefined}
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
        </div>
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
    </>
  );
}

// Chaque frappe dans la barre de recherche ou changement de filtre
// re-render RecipesView, donc potentiellement toutes ses cartes — memo()
// évite qu'une carte dont les props n'ont pas changé ne se re-rende pour
// autant (cf. audit, point 6).
export default memo(RecipeCard);
