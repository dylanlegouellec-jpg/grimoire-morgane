import { useState, useRef } from "react";
import { ChefHat, Clock, Minus, Plus, Share2, Users, X } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass, groupSteps, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import DishArt from "../art/DishArt";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";
import ShareRecipeModal from "../common/ShareRecipeModal";

export default function RecipeDetail({ recipe, onClose, onCook, onEdit, shareText, showToast }) {
  // Sécurisation du nombre de portions initiales
  const baseServings = Number(recipe?.servings) || 1;
  const [servings, setServings] = useState(() => baseServings);
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef(null);
  const overscrollRef = useRef(0);
  const touchYRef = useRef(null);
  const closeStartYRef = useRef(null);
  const [closeDragY, setCloseDragY] = useState(0);

  // Garantit qu'ingredients est toujours un tableau
  const rawIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  // Même principe que RecipeCard : valeur stockée, calculée une seule
  // fois côté serveur à la création/édition — aucun appel réseau ici.
  const nutri = recipe?.nutriscoreGrade || estimateNutriscoreLocal(rawIngredients, recipe?.category);
  const { language, dict } = useTranslation();

  // Fige le <body> (technique position:fixed, fiable sur iOS Safari —
  // overflow:hidden seul ne suffit pas) tant que la fiche recette est
  // ouverte, pour empêcher l'arrière-plan de défiler en même temps que
  // le panneau glissé vers le bas. Restauré à la fermeture.
  useBodyScrollLock(true);

  if (!recipe) return null;

  // Calcul du ratio sécurisé
  const ratio = servings / baseServings;

  // Rendu et calcul robuste des ingrédients (gère les chaînes brutes et les objets de section)
  const scaledIngredients = rawIngredients.map((ing) => {
    if (typeof ing === "string") return ing;
    if (ing?.isSection) return ing;
    
    const qty = Number(ing?.qty || ing?.amount) || 0;
    return {
      ...ing,
      qty: qty ? Math.round(qty * ratio * 100) / 100 : "",
    };
  });

  const triggerEdit = () => {
    overscrollRef.current = 0;
    if (onEdit) onEdit(recipe);
  };

  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    if (atBottom && e.deltaY > 0) {
      overscrollRef.current += e.deltaY;
      if (overscrollRef.current > 180) triggerEdit();
    } else {
      overscrollRef.current = 0;
    }
  };

  const handleTouchStart = (e) => {
    touchYRef.current = e.touches[0].clientY;
    closeStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const currentY = e.touches[0].clientY;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;

    if (atTop && closeStartYRef.current != null) {
      const totalDy = currentY - closeStartYRef.current;
      if (totalDy > 0) {
        // Geste de fermeture en cours : on empêche l'événement de
        // remonter jusqu'au fond de page (et son rebond de scroll natif)
        // pendant que le panneau suit le doigt vers le bas.
        e.stopPropagation();
        e.preventDefault();
        setCloseDragY(Math.min(totalDy, 240));
      } else if (closeDragY !== 0) {
        setCloseDragY(0);
      }
    } else if (closeDragY !== 0) {
      setCloseDragY(0);
    }

    if (touchYRef.current == null) return;
    const dy = touchYRef.current - currentY;
    if (atBottom && dy > 0) {
      overscrollRef.current += dy;
      touchYRef.current = currentY;
      if (overscrollRef.current > 130) triggerEdit();
    } else {
      overscrollRef.current = 0;
      touchYRef.current = currentY;
    }
  };

  const handleTouchEnd = () => {
    if (closeDragY > 110) {
      onClose();
      return;
    }
    setCloseDragY(0);
    closeStartYRef.current = null;
  };

  const safeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page detail-scroll"
        onClick={(e) => e.stopPropagation()}
        ref={scrollRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: closeDragY ? `translateY(${closeDragY}px)` : undefined,
          transition: closeDragY ? "none" : "transform 0.2s ease",
          opacity: closeDragY ? Math.max(1 - closeDragY / 300, 0.4) : 1,
        }}
      >
        <div className="detail-drag-handle" aria-hidden="true" />
        <button className="modal-close" onClick={onClose}><X size={20} /></button>

        <div className="detail-columns">
          <div className="detail-info-col">
            <div className="detail-hero">
              <DishArt recipe={recipe} />
              <div className="detail-hero-fade" />
            </div>
            <div className="card-top-row" style={{ marginTop: 4 }}>
              <span className={`chip ${categoryClass(recipe)}`}>{dict.labels[categoryLabel(recipe)] || categoryLabel(recipe)}</span>
              <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
            </div>
            <h2 className="dropcap-title">{translateRecipeText(recipe.title, language)}</h2>
            <div className="card-meta" style={{ marginBottom: 10 }}>
              <span><Clock size={13} /> {recipe.time || recipe.prep_time || 0} min</span>
              {recipe.carbs ? (
                <span className="carbs-badge">🍞 {Math.round(recipe.carbs * servings)} g glucides</span>
              ) : null}
            </div>
            <div className="portions-adjuster">
              <span><Users size={14} /> Portions</span>
              <div className="portions-stepper">
                <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Math.max(1, Number(s) - 1)); }}><Minus size={14} /></button>
                <span>{servings}</span>
                <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Number(s) + 1); }}><Plus size={14} /></button>
              </div>
            </div>
            <div className="detail-actions">
              <Seal tone="gold" onClick={() => onCook && onCook(recipe)}>
                <ChefHat size={16} /> Lancer la préparation
              </Seal>
              <Seal tone="gold" onClick={() => setShowShare(true)}>
                <Share2 size={16} /> Partager la recette
              </Seal>
            </div>
            <Flourish />
          </div>

          <div className="detail-body-col">
            <h4>Ingrédients {ratio !== 1 && <span className="scaled-note">(ajustés pour {servings} pers.)</span>}</h4>
            <ul className="ingredient-list">
              {scaledIngredients.map((ing, i) => {
                if (typeof ing === "string") {
                  return <li key={i}>{translateRecipeText(ing, language)}</li>;
                }
                if (ing?.isSection) {
                  return <li key={i} className="ingredient-section-title">{translateRecipeText(ing.title, language)}</li>;
                }
                return (
                  <li key={i}>
                    {ing.qty ? `${ing.qty} ` : ""}{ing.unit || ""} {translateRecipeText(ing.name || ing.title || "", language)}
                  </li>
                );
              })}
            </ul>
            <h4>Préparation</h4>
            {groupSteps(safeSteps).map((group, gi) => (
              <div key={gi} className="steps-group">
                {group.title && <h5 className="steps-group-title">{translateRecipeText(group.title, language)}</h5>}
                <ol className="steps-list">
                  {group.steps.map((s, si) => (
                    <li key={si}>{translateRecipeText(typeof s === "string" ? s : s.text || s.title, language)}</li>
                  ))}
                </ol>
              </div>
            ))}
            {recipe.notes && (
              <>
                <h4>Remarques &amp; astuces</h4>
                <p className="recipe-notes">{translateRecipeText(recipe.notes, language)}</p>
              </>
            )}
          </div>
        </div>

        <div className="detail-scroll-hint">· · ·</div>
      </div>
      {showShare && (
        <ShareRecipeModal
          recipe={recipe}
          servings={servings}
          ingredients={scaledIngredients}
          onClose={() => setShowShare(false)}
          shareText={shareText}
          showToast={showToast}
        />
      )}
    </div>
  );
}
