import { useState, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChefHat, Clock, Minus, Plus, Share2, Users, X } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass, groupSteps, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import DishArt from "../art/DishArt";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";

// Chargée à la demande : RecipeDetail est monté dès qu'on ouvre une seule
// recette (voir AppShell.jsx), mais partager n'est qu'une action parmi
// d'autres sur cet écran — pas besoin d'alourdir le bundle initial pour un
// panneau que la plupart des visites n'ouvriront jamais.
const ShareRecipeModal = lazy(() => import("../common/ShareRecipeModal"));

export default function RecipeDetail({ recipe, onClose, onCook, onEdit, shareText, showToast, showNutriscore = true }) {
  // Sécurisation du nombre de portions initiales
  const baseServings = Number(recipe?.servings) || 1;
  const [servings, setServings] = useState(() => baseServings);
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef(null);
  // Trois refs à poser sur le même conteneur (scrollRef pour le geste de
  // fermeture par glissement ET pour l'appui prolongé en bas de page,
  // celle du piège à focus pour Échap/Tab) — combinées dans setScrollRef un
  // peu plus bas, un seul <div ref=...> ne pouvant recevoir qu'une seule
  // ref (même principe que SecretSettingsModal).
  const focusTrapRef = useFocusTrap(onClose);
  // "Tirer pour fermer" (voir useDismissibleSheet.js — remplace l'ancienne
  // logique maison de ce fichier, qui dupliquait ce que ce hook partagé
  // fait déjà pour ~25 autres modales). Reste géré ICI, pas seulement dans
  // le hook, pour cohabiter avec le geste "tirer vers le HAUT en bas de
  // page pour éditer" ci-dessous (voir handleTouchMove) : les deux
  // partagent le même conteneur scrollable, mais concernent des bords
  // opposés (haut/bas) et ne peuvent jamais se déclencher en même temps.
  const sheet = useDismissibleSheet(onClose, { scrollRef });
  const setScrollRef = (node) => {
    scrollRef.current = node;
    focusTrapRef.current = node;
  };
  const overscrollRef = useRef(0);
  const touchYRef = useRef(null);

  // Garantit qu'ingredients est toujours un tableau
  const rawIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  // Même principe que RecipeCard : valeur stockée, calculée une seule
  // fois côté serveur à la création/édition — aucun appel réseau ici.
  const nutri = recipe?.nutriscoreGrade || estimateNutriscoreLocal(rawIngredients, recipe?.category);
  const { language, dict } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

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

  // Ne gère plus QUE le tirage vers le haut en bas de page (déclenche
  // l'édition) — le tirage vers le bas en haut de page (fermeture) est
  // désormais entièrement délégué à useDismissibleSheet.js (voir `sheet`
  // ci-dessus, étalé sur le même conteneur via `sheet.panHandlers`) :
  // Framer reçoit ses propres événements en parallèle de ceux-ci (deux
  // systèmes indépendants sur le même nœud, jamais en concurrence puisqu'ils
  // suivent des bords opposés du contenu).
  const handleTouchStart = (e) => {
    touchYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const el = scrollRef.current;
    if (!el || touchYRef.current == null) return;
    const currentY = e.touches[0].clientY;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
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

  const safeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page detail-scroll modal-swipeable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={setScrollRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <div className="detail-drag-handle" aria-hidden="true" />
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        <div className="detail-columns">
          <div className="detail-info-col">
            {/* Même layoutId Framer Motion que la carte source (voir
                RecipeCard.jsx/AppShell.jsx) — porté en continu tant que la
                fiche reste montée : sans risque, la carte correspondante
                dans la grille a déjà relâché ce layoutId au moment où cette
                fiche apparaît (voir `isOpenRecipe`), c'est justement ce
                passage de témoin qui déclenche le morphing. Absent avec
                "Réduire les animations" système, comme côté carte. */}
            <motion.div
              className="detail-hero"
              layoutId={prefersReducedMotion ? undefined : `recipe-photo-${recipe.id}`}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <DishArt recipe={recipe} />
              <div className="detail-hero-fade" />
            </motion.div>
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
      </motion.div>
      <AnimatePresence>
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
      </AnimatePresence>
    </motion.div>
  );
}
