import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { ChefHat, Clock, Minus, Plus, Share2, Users, X } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass, groupSteps, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import DishArt from "../art/DishArt";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";

// Chargée à la demande : RecipeDetail est monté dès qu'on ouvre une seule
// recette (voir AppShell.jsx), mais partager n'est qu'une action parmi
// d'autres sur cet écran — pas besoin d'alourdir le bundle initial pour un
// panneau que la plupart des visites n'ouvriront jamais.
const ShareRecipeModal = lazy(() => import("../common/ShareRecipeModal"));

// Doit rester cohérente avec la courbe de transition CSS plus bas (cas
// `isClosingSheet`) : le vrai `onClose` — qui démonte ce panneau et débloque
// donc le scroll du fond via useBodyScrollLock — n'est appelé qu'UNE FOIS
// cette animation de sortie terminée, jamais au relâchement du doigt (voir
// hooks/useSwipeToDismiss.js, qui a le même correctif pour la même raison :
// sans ce délai, le nœud DOM suivi par le doigt disparaît en plein geste, et
// le navigateur reporte la fin du geste sur le <body> tout juste redevenu
// scrollable — un sursaut de scroll brutal de l'arrière-plan à la fermeture).
const SWIPE_CLOSE_ANIMATION_MS = 200;

export default function RecipeDetail({ recipe, onClose, onCook, onEdit, shareText, showToast, showNutriscore = true }) {
  // Sécurisation du nombre de portions initiales
  const baseServings = Number(recipe?.servings) || 1;
  const [servings, setServings] = useState(() => baseServings);
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef(null);
  // Deux refs à poser sur le même conteneur (scrollRef pour le geste de
  // fermeture par glissement, celle du piège à focus pour Échap/Tab) —
  // combinées dans setScrollRef un peu plus bas, un seul <div ref=...> ne
  // pouvant recevoir qu'une seule ref (même principe que SecretSettingsModal).
  const focusTrapRef = useFocusTrap(onClose);
  const setScrollRef = (node) => {
    scrollRef.current = node;
    focusTrapRef.current = node;
  };
  const overscrollRef = useRef(0);
  const touchYRef = useRef(null);
  const closeStartYRef = useRef(null);
  const [closeDragY, setCloseDragY] = useState(0);
  // true dès que le seuil de fermeture est franchi au relâchement : plus
  // aucun nouveau geste n'est pris en compte pendant que le panneau achève
  // sa sortie (voir handleTouchStart/handleTouchMove/handleTouchEnd).
  const closingSheetRef = useRef(false);
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

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
    if (closingSheetRef.current) return;
    touchYRef.current = e.touches[0].clientY;
    closeStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (closingSheetRef.current) return;
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

  const handleTouchEnd = (e) => {
    if (closingSheetRef.current) return;
    if (closeDragY > 110) {
      // Geste de fermeture confirmé : on empêche tout traitement natif
      // résiduel de CE relâchement et on termine l'animation de sortie AVANT
      // d'appeler le vrai onClose — voir SWIPE_CLOSE_ANIMATION_MS plus haut.
      if (e && e.cancelable) e.preventDefault();
      closingSheetRef.current = true;
      setIsClosingSheet(true);
      // Grande valeur volontairement générique (pas besoin de mesurer le
      // panneau) : le pousse hors de n'importe quel écran, portrait ou
      // paysage.
      setCloseDragY(Math.max(window.innerHeight || 0, 800) + 200);
      closeTimerRef.current = setTimeout(() => { onClose(); }, SWIPE_CLOSE_ANIMATION_MS);
      return;
    }
    setCloseDragY(0);
    closeStartYRef.current = null;
  };

  const safeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page detail-scroll modal-swipeable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={setScrollRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: closeDragY ? `translateY(${closeDragY}px)` : undefined,
          // Courbe "ease" douce uniquement pour le retour à la position de
          // repos (tirage relâché sous le seuil) — une fermeture confirmée
          // (`isClosingSheet`) accélère au contraire vers la sortie
          // (ease-in), jamais de rebond une fois la décision de fermer prise.
          transition: closeDragY
            ? (isClosingSheet ? `transform ${SWIPE_CLOSE_ANIMATION_MS}ms cubic-bezier(0.4, 0, 1, 1)` : "none")
            : "transform 0.2s ease",
          opacity: closeDragY ? Math.max(1 - closeDragY / 300, 0.4) : 1,
          // Bloque toute reconnaissance de geste native (scroll, rebond
          // élastique) tant qu'un tirage ou l'animation de fermeture est en
          // cours — en complément de preventDefault()/stopPropagation() déjà
          // appelés ci-dessus, jamais un substitut.
          touchAction: closeDragY ? "none" : undefined,
        }}
      >
        <div className="detail-drag-handle" aria-hidden="true" />
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        <div className="detail-columns">
          <div className="detail-info-col">
            <div className="detail-hero">
              <DishArt recipe={recipe} />
              <div className="detail-hero-fade" />
            </div>
            <div className="card-top-row" style={{ marginTop: 4 }}>
              <span className={`chip ${categoryClass(recipe)}`}>{dict.labels[categoryLabel(recipe)] || categoryLabel(recipe)}</span>
              {showNutriscore && (
                <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
              )}
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
                <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Math.max(1, Number(s) - 1)); }} aria-label="Diminuer le nombre de portions"><Minus size={14} /></button>
                <span>{servings}</span>
                <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Number(s) + 1); }} aria-label="Augmenter le nombre de portions"><Plus size={14} /></button>
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
        <Suspense fallback={null}>
          <ShareRecipeModal
            recipe={recipe}
            servings={servings}
            ingredients={scaledIngredients}
            onClose={() => setShowShare(false)}
            shareText={shareText}
            showToast={showToast}
          />
        </Suspense>
      )}
    </div>
  );
}
