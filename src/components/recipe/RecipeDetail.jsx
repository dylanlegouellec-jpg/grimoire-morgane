import { useState, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, useInView } from "motion/react";
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

// Décalage max (px) de la photo par rapport au défilement du panneau — voir
// heroImageY plus bas. Doit rester sous la marge donnée à
// .detail-hero-parallax (inset -12%, recipeCards.css.js) pour ne jamais
// découvrir de bord vide de l'image pendant le glissement.
const HERO_PARALLAX_RANGE_PX = 24;

const FADE_ITEM_HIDDEN = { opacity: 0, y: 10 };
const FADE_ITEM_VISIBLE = { opacity: 1, y: 0 };
const FADE_ITEM_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

// Ingrédient/étape qui apparaît en fondu dès qu'il entre dans la zone
// visible du panneau qui défile ("root", voir RecipeDetail -> scrollRef) —
// useInView() gère lui-même l'IntersectionObserver correspondant, plus
// besoin d'en réimplémenter un à la main comme l'ancien handleTouchMove/
// handleWheel de ce fichier pour le tirage en bas de page. "once: true" :
// l'apparition ne se rejoue pas en remontant, seul le premier passage
// compte. Composant à part (pas inline dans le .map()) parce que
// useInView() est un hook et ne peut pas être appelé un nombre variable de
// fois à l'intérieur d'une boucle — même contrainte que useDragControls()
// pour IngredientRow/StepRow (voir RecipeForm.jsx).
function FadeInItem({ root, reducedMotion, className, children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { root, once: true, margin: "0px 0px -60px 0px" });
  if (reducedMotion) {
    return <li className={className}>{children}</li>;
  }
  return (
    <motion.li
      ref={ref}
      className={className}
      initial={FADE_ITEM_HIDDEN}
      animate={inView ? FADE_ITEM_VISIBLE : FADE_ITEM_HIDDEN}
      transition={FADE_ITEM_TRANSITION}
    >
      {children}
    </motion.li>
  );
}

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
  // Parallax léger sur la photo pendant le défilement du panneau : la photo
  // se déplace un peu MOINS vite que le contenu qui défile autour d'elle,
  // donnant une impression de profondeur au lieu de suivre le scroll au
  // pixel près. offset ["start start", "end start"] : la progression va de
  // 0 (photo en haut du panneau, position de départ) à 1 (photo entièrement
  // sortie par le haut) — tout l'effet se joue donc pendant que la photo
  // quitte l'écran, jamais après. N'a d'effet que dans la mise en page
  // mobile à une colonne (voir responsive.css.js) : en paysage/desktop, la
  // colonne photo est fixe et ne défile pas, "scrollYProgress" reste à 0.
  const heroRef = useRef(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    container: scrollRef,
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageY = useTransform(heroScrollProgress, [0, 1], [0, HERO_PARALLAX_RANGE_PX]);

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
  // deux systèmes indépendants sur le même nœud, jamais en concurrence
  // puisqu'ils suivent des bords opposés du contenu — mais tous deux
  // définissent onTouchStart/onTouchMove sur ce même <motion.div>. En JSX,
  // un attribut répété plus loin écrase silencieusement le précédent : sans
  // composition explicite (voir composedTouchStart/Move ci-dessous, posés
  // sur l'élément plus bas), `{...sheet.panHandlers}` finissait par
  // remplacer purement et simplement ces deux gestionnaires-ci, désactivant
  // le "tirer pour éditer" en bas de page (régression signalée).
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

  // Fait tourner les deux systèmes de geste tactile en même temps sur ce
  // même nœud (voir commentaire au-dessus de handleTouchStart) — sans ça,
  // `{...sheet.panHandlers}` écrase silencieusement onTouchStart/onTouchMove
  // ci-dessus rien qu'en étant étalé après eux dans le JSX.
  const composedTouchStart = (e) => {
    handleTouchStart(e);
    sheet.panHandlers.onTouchStart(e);
  };
  const composedTouchMove = (e) => {
    handleTouchMove(e);
    sheet.panHandlers.onTouchMove(e);
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page detail-scroll modal-swipeable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={setScrollRef}
        onWheel={handleWheel}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
        onTouchStart={composedTouchStart}
        onTouchMove={composedTouchMove}
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
              ref={heroRef}
              className="detail-hero"
              layoutId={prefersReducedMotion ? undefined : `recipe-photo-${recipe.id}`}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div
                className="detail-hero-parallax"
                style={prefersReducedMotion ? undefined : { y: heroImageY }}
              >
                <DishArt recipe={recipe} />
              </motion.div>
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
                <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => { triggerHaptic(10); setServings((s) => Math.max(1, Number(s) - 1)); }} aria-label="Diminuer le nombre de portions"><Minus size={14} /></motion.button>
                <span>{servings}</span>
                <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => { triggerHaptic(10); setServings((s) => Number(s) + 1); }} aria-label="Augmenter le nombre de portions"><Plus size={14} /></motion.button>
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
                  return (
                    <FadeInItem key={i} root={scrollRef} reducedMotion={prefersReducedMotion}>
                      {translateRecipeText(ing, language)}
                    </FadeInItem>
                  );
                }
                if (ing?.isSection) {
                  return (
                    <FadeInItem key={i} root={scrollRef} reducedMotion={prefersReducedMotion} className="ingredient-section-title">
                      {translateRecipeText(ing.title, language)}
                    </FadeInItem>
                  );
                }
                return (
                  <FadeInItem key={i} root={scrollRef} reducedMotion={prefersReducedMotion}>
                    {ing.qty ? `${ing.qty} ` : ""}{ing.unit || ""} {translateRecipeText(ing.name || ing.title || "", language)}
                  </FadeInItem>
                );
              })}
            </ul>
            <h4>Préparation</h4>
            {groupSteps(safeSteps).map((group, gi) => (
              <div key={gi} className="steps-group">
                {group.title && <h5 className="steps-group-title">{translateRecipeText(group.title, language)}</h5>}
                <ol className="steps-list">
                  {group.steps.map((s, si) => (
                    <FadeInItem key={si} root={scrollRef} reducedMotion={prefersReducedMotion}>
                      {translateRecipeText(typeof s === "string" ? s : s.text || s.title, language)}
                    </FadeInItem>
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
