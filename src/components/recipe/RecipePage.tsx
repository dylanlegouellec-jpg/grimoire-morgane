import { useRef, type RefObject } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import { ChefHat, ChevronLeft, ChevronRight, Clock, Minus, Plus, Share2, Users, Wheat } from "lucide-react";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { categoryLabel, categoryClass, groupSteps, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { EASE_OUT, SPRING_SHEET } from "../../constants/motion";
import DishArt from "../art/DishArt";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";
import CategoryIcon from "../common/CategoryIcon";
import AnimatedNumber from "../common/AnimatedNumber";
import HeroTreatment, { heroTreatmentClassName, isLegendTreatment } from "./HeroTreatment";
import type { Recipe } from "../../hooks/useRecipes";
import type { StepEntry } from "../../utils/helpers";
import type { NutriscoreGrade } from "../../utils/nutriscoreClient";
import { baseServingsOf, rawIngredientsOf, scaleIngredients, type FlexibleStep, type LooseStep } from "./recipePageData";

/* ------------------------------------------------------------------ */
/*  CONTENU D'UNE PAGE DE FICHE RECETTE                                 */
/*  (photo, titre, portions, actions, ingrédients, étapes, notes)        */
/*                                                                      */
/*  Sorti de RecipeDetail.tsx pour la « vue livre » : la même page sert   */
/*  à la fiche ouverte ET à la page voisine qu'on découvre dessous en      */
/*  tournant la page (`preview`, voir RecipePageUnder.tsx) — une seule      */
/*  mise en page à maintenir, et une page découverte identique au pixel     */
/*  près à celle qui s'affiche ensuite : la bascule ne se voit pas.          */
/* ------------------------------------------------------------------ */

// Décalage max (px) de la photo par rapport au défilement du panneau — voir
// heroImageY plus bas. Doit rester sous la marge donnée à
// .detail-hero-parallax (inset -12%, recipeCards.css) pour ne jamais
// découvrir de bord vide de l'image pendant le glissement.
const HERO_PARALLAX_RANGE_PX = 24;

const FADE_ITEM_HIDDEN = { opacity: 0, y: 10 };
const FADE_ITEM_VISIBLE = { opacity: 1, y: 0 };
const FADE_ITEM_TRANSITION = { duration: 0.35, ease: EASE_OUT };
// Photo d'une page atteinte en tournant les pages : porte le layoutId de sa
// recette (pour que FERMER la fiche ramène la photo dans la bonne carte),
// mais sans morphing à l'arrivée — la photo ne doit pas « voler » depuis la
// carte de la grille, cachée derrière la fiche.
const NO_MORPH_TRANSITION = { duration: 0 };

interface FadeInItemProps {
  root: RefObject<HTMLElement | null>;
  reducedMotion?: boolean | null;
  className?: string;
  children: React.ReactNode;
}

// Ingrédient/étape qui apparaît en fondu dès qu'il entre dans la zone
// visible du panneau qui défile ("root", voir RecipeDetail -> scrollRef) —
// useInView() gère lui-même l'IntersectionObserver correspondant. "once:
// true" : l'apparition ne se rejoue pas en remontant, seul le premier
// passage compte. Composant à part (pas inline dans le .map()) parce que
// useInView() est un hook et ne peut pas être appelé un nombre variable de
// fois à l'intérieur d'une boucle — même contrainte que useDragControls()
// pour IngredientRow/StepRow (voir RecipeForm.jsx).
function FadeInItem({ root, reducedMotion, className, children }: FadeInItemProps) {
  const ref = useRef<HTMLLIElement>(null);
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

export interface RecipeFolio {
  /** Position (1…total) dans la grille affichée. */
  current: number;
  total: number;
  prev: Recipe | null;
  next: Recipe | null;
  onPrev: () => void;
  onNext: () => void;
}

interface DetailHeroProps {
  recipe: Recipe;
  scrollRef: RefObject<HTMLElement | null>;
  heroTreatment: string;
  showNutriscore: boolean;
  nutri: NutriscoreGrade;
  /** "open" : morphing depuis la carte ; "paged" : layoutId sans morphing d'arrivée ; "none" : ni l'un ni l'autre. */
  morph: "open" | "paged" | "none";
  parallax: boolean;
}

// Photo de la fiche. Composant à part pour que sa parallaxe (useScroll,
// attaché à CE nœud) reparte proprement à chaque page.
function DetailHero({ recipe, scrollRef, heroTreatment, showNutriscore, nutri, morph, parallax }: DetailHeroProps) {
  const { language, dict } = useTranslation();
  // Parallax léger sur la photo pendant le défilement du panneau : la photo
  // se déplace un peu MOINS vite que le contenu qui défile autour d'elle.
  // offset ["start start", "end start"] : la progression va de 0 (photo en
  // haut du panneau) à 1 (photo entièrement sortie par le haut). N'a
  // d'effet que dans la mise en page mobile à une colonne (voir
  // responsive.css) : en paysage/desktop, "scrollYProgress" reste à 0.
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef as RefObject<HTMLElement>,
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, HERO_PARALLAX_RANGE_PX]);
  return (
    // Même layoutId Framer Motion que la carte source (voir
    // RecipeCard.tsx/AppShell.tsx) — porté en continu tant que la page
    // reste affichée : la carte correspondante dans la grille a déjà relâché
    // ce layoutId au moment où cette fiche apparaît (voir `isOpenRecipe`),
    // c'est justement ce passage de témoin qui déclenche le morphing. Absent
    // avec "Réduire les animations" système, comme côté carte.
    <motion.div
      ref={heroRef}
      className={`detail-hero ${heroTreatmentClassName(heroTreatment)}`}
      layoutId={morph === "none" ? undefined : `recipe-photo-${recipe.id}`}
      transition={morph === "paged" ? NO_MORPH_TRANSITION : SPRING_SHEET}
    >
      <motion.div className="detail-hero-parallax" style={parallax ? { y: heroImageY } : undefined}>
        <DishArt recipe={recipe} />
      </motion.div>
      <HeroTreatment treatment={heroTreatment} />
      {isLegendTreatment(heroTreatment) && (
        <div className="hero-legende-caption">
          <div className="card-top-row">
            <span className={`chip ${categoryClass(recipe)}`}>{(dict.labels as Record<string, string>)[categoryLabel(recipe)] || categoryLabel(recipe)}</span>
            {showNutriscore && (
              <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
            )}
          </div>
          <h2 className="dropcap-title">{translateRecipeText(recipe.title, language)}</h2>
        </div>
      )}
    </motion.div>
  );
}

interface RecipePageProps {
  recipe: Recipe;
  servings: number;
  onServingsChange?: (updater: (s: number) => number) => void;
  onCook?: () => void;
  onShare?: () => void;
  scrollRef: RefObject<HTMLElement | null>;
  heroTreatment: string;
  showNutriscore: boolean;
  reducedMotion: boolean;
  morph: "open" | "paged" | "none";
  /** Faux : ingrédients/étapes affichés d'emblée, sans fondu d'apparition. */
  animateItems: boolean;
  folio?: RecipeFolio | null;
  /** Page voisine montrée sous la page qui tourne : rien d'interactif ni d'animé. */
  preview?: boolean;
}

export default function RecipePage({
  recipe,
  servings,
  onServingsChange,
  onCook,
  onShare,
  scrollRef,
  heroTreatment,
  showNutriscore,
  reducedMotion,
  morph,
  animateItems,
  folio,
  preview = false,
}: RecipePageProps) {
  const { language, dict, t } = useTranslation();
  const rawIngredients = rawIngredientsOf(recipe);
  // Même principe que RecipeCard : valeur stockée, calculée une seule
  // fois côté serveur à la création/édition — aucun appel réseau ici.
  const nutri = (recipe.nutriscoreGrade || estimateNutriscoreLocal(rawIngredients as never, recipe.category)) as NutriscoreGrade;
  const baseServings = baseServingsOf(recipe);
  const ratio = servings / baseServings;
  const scaledIngredients = scaleIngredients(rawIngredients, ratio);
  const safeSteps: FlexibleStep[] = Array.isArray(recipe.steps) ? (recipe.steps as unknown as FlexibleStep[]) : [];
  const staticItems = reducedMotion || !animateItems || preview;
  const title = translateRecipeText(recipe.title, language);

  return (
    <div className="detail-columns">
      <div className="detail-info-col">
        <DetailHero
          recipe={recipe}
          scrollRef={scrollRef}
          heroTreatment={heroTreatment}
          showNutriscore={showNutriscore}
          nutri={nutri}
          morph={reducedMotion || preview ? "none" : morph}
          parallax={!reducedMotion && !preview}
        />
        {!isLegendTreatment(heroTreatment) && (
          <>
            <div className="card-top-row" style={{ marginTop: 16 }}>
              <span className={`chip ${categoryClass(recipe)}`}>{(dict.labels as Record<string, string>)[categoryLabel(recipe)] || categoryLabel(recipe)}</span>
              {showNutriscore && (
                <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
              )}
            </div>
            <h2 className="dropcap-title">{title}</h2>
          </>
        )}
        <div className="card-meta" style={{ marginBottom: 10 }}>
          <span><Clock size={13} /> {recipe.time || 0} min</span>
          {recipe.carbs ? (
            <span className="carbs-badge"><CategoryIcon emoji="🍞" icon={Wheat} size={13} /> {t("recipeUi.detail.carbs", { value: Math.round(recipe.carbs * servings) })}</span>
          ) : null}
        </div>
        <div className="portions-adjuster">
          <span><Users size={14} /> {t("recipeUi.detail.servings")}</span>
          <div className="portions-stepper">
            <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => { triggerHaptic(10); onServingsChange?.((s) => Math.max(1, Number(s) - 1)); }} aria-label={t("recipeUi.detail.decreaseServings")}><Minus size={14} /></motion.button>
            {preview ? <span>{servings}</span> : <AnimatedNumber value={servings} />}
            <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => { triggerHaptic(10); onServingsChange?.((s) => Number(s) + 1); }} aria-label={t("recipeUi.detail.increaseServings")}><Plus size={14} /></motion.button>
          </div>
        </div>
        <div className="detail-actions">
          <Seal tone="gold" onClick={() => onCook && onCook()}>
            <ChefHat size={16} /> {t("recipeUi.detail.startCooking")}
          </Seal>
          <Seal tone="gold" onClick={() => onShare && onShare()}>
            <Share2 size={16} /> {t("recipeUi.detail.shareRecipe")}
          </Seal>
        </div>
        <Flourish />
        {folio && folio.total > 1 && (
          // Folio du grimoire : « 3 / 24 » entre deux fines flèches — indice
          // discret qu'on peut tourner les pages, et seule commande
          // accessible au clavier/lecteur d'écran pour le faire.
          <nav className="recipe-pager-folio" aria-label={t("recipePager.nav")}>
            <button
              type="button"
              className="recipe-pager-arrow"
              onClick={folio.onPrev}
              disabled={!folio.prev}
              aria-label={folio.prev ? t("recipePager.previous", { title: translateRecipeText(folio.prev.title, language) }) : t("recipePager.previousNone")}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="recipe-pager-folio-num" aria-hidden="true">
              {folio.current}<span className="recipe-pager-folio-sep">/</span>{folio.total}
            </span>
            <span className="recipe-pager-sr">{t("recipePager.position", { current: folio.current, total: folio.total })}</span>
            <button
              type="button"
              className="recipe-pager-arrow"
              onClick={folio.onNext}
              disabled={!folio.next}
              aria-label={folio.next ? t("recipePager.next", { title: translateRecipeText(folio.next.title, language) }) : t("recipePager.nextNone")}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>

      <div className="detail-body-col">
        <h4>{t("recipeUi.detail.ingredients")} {ratio !== 1 && <span className="scaled-note">{t("recipeUi.detail.scaledFor", { count: servings })}</span>}</h4>
        <ul className="ingredient-list">
          {scaledIngredients.map((ing, i) => {
            if (typeof ing === "string") {
              return (
                <FadeInItem key={i} root={scrollRef} reducedMotion={staticItems}>
                  {translateRecipeText(ing, language)}
                </FadeInItem>
              );
            }
            if (ing?.isSection) {
              return (
                <FadeInItem key={i} root={scrollRef} reducedMotion={staticItems} className="ingredient-section-title">
                  {translateRecipeText(ing.title || "", language)}
                </FadeInItem>
              );
            }
            return (
              <FadeInItem key={i} root={scrollRef} reducedMotion={staticItems}>
                {ing.qty ? `${ing.qty} ` : ""}{ing.unit ? translateRecipeText(ing.unit, language) : ""} {translateRecipeText(ing.name || ing.title || "", language)}
              </FadeInItem>
            );
          })}
        </ul>
        <h4>{t("recipeUi.detail.preparation")}</h4>
        {groupSteps(safeSteps as unknown as StepEntry[]).map((group, gi) => (
          <div key={gi} className="steps-group">
            {group.title && <h5 className="steps-group-title">{translateRecipeText(group.title, language)}</h5>}
            <ol className="steps-list">
              {group.steps.map((s, si) => (
                <FadeInItem key={si} root={scrollRef} reducedMotion={staticItems}>
                  {translateRecipeText(typeof s === "string" ? s : (s as unknown as LooseStep).text || (s as unknown as LooseStep).title || "", language)}
                </FadeInItem>
              ))}
            </ol>
          </div>
        ))}
        {recipe.notes && (
          <>
            <h4>{t("recipeUi.detail.notes")}</h4>
            <p className="recipe-notes">{translateRecipeText(recipe.notes, language)}</p>
          </>
        )}
      </div>
    </div>
  );
}
