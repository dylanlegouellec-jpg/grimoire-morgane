import { memo, useRef, useState } from "react";
import { Clock, Heart, Users } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass } from "../../utils/helpers";
import { triggerHaptic, triggerHapticFeedback } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import DishArt from "../art/DishArt";
import RecipeOptionsModal from "../common/RecipeOptionsModal";

// Un tremblement du doigt pendant l'appui ne doit pas annuler le geste,
// mais un vrai déplacement (le début d'un scroll) doit l'annuler tout de
// suite — sans jamais appeler preventDefault(), pour que le scroll natif
// de la grille de recettes reste fluide (voir hooks/useLongPress.js pour
// la même logique, partagée avec les autres appuis longs de l'app).
const MOVE_CANCEL_THRESHOLD_PX = 5;

function RecipeCard({
  recipe,
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
  const pressTimer = useRef(null);
  const pressVisualTimer = useRef(null);
  const longPressFired = useRef(false);
  const pressStartPos = useRef(null);
  const cardRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  // "idle" | "pressing" | "fired" — pilote l'animation d'enfoncement puis
  // de rebond (voir .press-anim dans styles.css.js) : scale(0.95) tant que
  // le doigt reste appuyé, léger rebond au moment où le menu s'ouvre.
  const [pressState, setPressState] = useState("idle");

  // Un balayage de défilement commence lui aussi par un touchstart — le
  // déclencher de façon synchrone (comme avant) applique immédiatement
  // .press-pressing { transform: scale(0.95) }, une transition CSS active
  // sur la carte pile pendant les ~160ms où un doigt qui fait défiler bouge
  // le plus. Sur Android Chrome, une mutation de transform en plein milieu
  // de l'arbitrage scroll-vs-appui du navigateur pouvait faire perdre le
  // geste de défilement, MÊME sans aucun preventDefault() nulle part
  // (confirmé : aucun listener ici n'en appelle). En retardant l'apparition
  // du retour visuel de quelques dizaines de ms, un balayage rapide (dont
  // le touchmove dépasse le seuil d'annulation bien avant ce délai, voir
  // handleTouchMove) ne déclenche jamais la transform — seul un doigt
  // immobile, donc un vrai appui, la voit apparaître.
  const PRESS_VISUAL_DELAY_MS = 100;

  const startPress = (e) => {
    longPressFired.current = false;
    pressStartPos.current = e && e.touches && e.touches[0]
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
    pressVisualTimer.current = setTimeout(() => setPressState("pressing"), PRESS_VISUAL_DELAY_MS);
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setPressState("fired");
      triggerHapticFeedback(cardRef.current, 30);
      setShowOptions(true);
    }, pressDuration);
  };
  const cancelPress = () => {
    if (pressVisualTimer.current) {
      clearTimeout(pressVisualTimer.current);
      pressVisualTimer.current = null;
    }
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStartPos.current = null;
    setPressState((s) => (s === "fired" ? s : "idle"));
  };
  const handleTouchMove = (e) => {
    if (!pressStartPos.current || !pressTimer.current || !e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - pressStartPos.current.x;
    const dy = e.touches[0].clientY - pressStartPos.current.y;
    if (Math.abs(dx) > MOVE_CANCEL_THRESHOLD_PX || Math.abs(dy) > MOVE_CANCEL_THRESHOLD_PX) cancelPress();
  };
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onOpen(recipe);
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`card recipe-card card-enter press-anim press-${pressState}`}
        style={{ animationDelay: `${enterDelay}ms` }}
        onClick={handleClick}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={handleTouchMove}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
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
          onClose={() => { setShowOptions(false); setPressState("idle"); }}
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
