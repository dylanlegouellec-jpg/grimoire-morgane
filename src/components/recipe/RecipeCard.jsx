import { memo, useLayoutEffect, useRef, useState } from "react";
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
  onOpen,
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

  // Relance le fondu/zoom d'entrée (.card-enter) UNIQUEMENT sur une carte
  // qui redevient visible après avoir été masquée par un changement de
  // filtre (Tout/Salé/Sucré/Favoris) — jamais sur celles déjà affichées qui
  // le restent ("ne rejouer l'animation que sur les éléments concernés").
  // La carte n'est toujours pas démontée/remontée pour ça (voir `hidden` ->
  // display:none plus bas) : son <img> ne bouge jamais. Un simple passage
  // display:none -> visible ne relance PAS l'animation CSS de façon fiable
  // dans la pratique (constaté sur appareil réel) ; la manière garantie de
  // la relancer sans toucher au DOM des enfants est de retirer la classe,
  // forcer un recalcul de style (lecture d'offsetWidth), puis la remettre.
  // useLayoutEffect (avant peinture, pas après un useEffect classique) pour
  // que ce cycle retrait/remise se fasse avant que le navigateur n'ait la
  // moindre chance de peindre la carte dans son état final le temps d'un
  // instant, ce qui produirait un flash disgracieux.
  const cardRef = useRef(null);
  const prevHiddenRef = useRef(hidden);
  useLayoutEffect(() => {
    const wasHidden = prevHiddenRef.current;
    prevHiddenRef.current = hidden;
    if (wasHidden && !hidden && cardRef.current) {
      const el = cardRef.current;
      el.classList.remove("card-enter");
      void el.offsetWidth;
      el.classList.add("card-enter");
    }
  }, [hidden]);

  return (
    <>
      <div
        ref={cardRef}
        className={`card recipe-card card-enter press-anim press-${cardLongPress.pressState}`}
        // display: none (pas un retrait du DOM) quand la carte ne correspond
        // plus au filtre actif — voir RecipesView.jsx : elle reste montée,
        // son <img> déjà chargée n'est jamais redémontée/redécodée. Le
        // fondu/zoom d'entrée, lui, est relancé à la main plus haut
        // (voir useLayoutEffect) à chaque réapparition.
        style={hidden ? { display: "none" } : { animationDelay: `${enterDelay}ms` }}
        onClick={handleClick}
        {...cardLongPress.handlers}
      >
        <div className="illus-wrap">
          <DishArt recipe={recipe} />
          <button
            type="button"
            className={`fav-btn ${recipe.favorite ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id);
              triggerHaptic(15);
            }}
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
