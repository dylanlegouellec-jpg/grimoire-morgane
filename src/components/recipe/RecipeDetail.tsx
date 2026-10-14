import { useState, useRef, useEffect, useLayoutEffect, lazy, Suspense, type WheelEvent, type TouchEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import DocumentTitle from "../common/DocumentTitle";
import { X } from "lucide-react";
import { DEFAULT_HERO_TREATMENT } from "../../constants";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import usePageTurn, { type TurnDir } from "../../hooks/usePageTurn";
import RecipePage, { type RecipeFolio } from "./RecipePage";
import { baseServingsOf, rawIngredientsOf, scaleIngredients } from "./recipePageData";
import { RecipePageFold, RecipePageUnder } from "./RecipePageUnder";
import type { Recipe } from "../../hooks/useRecipes";

// Chargée à la demande : RecipeDetail est monté dès qu'on ouvre une seule
// recette (voir AppShell.jsx), mais partager n'est qu'une action parmi
// d'autres sur cet écran — pas besoin d'alourdir le bundle initial pour un
// panneau que la plupart des visites n'ouvriront jamais.
const ShareRecipeModal = lazy(() => import("../common/ShareRecipeModal"));

interface RecipeDetailProps {
  recipe: Recipe | null;
  onClose: () => void;
  /** `servings` : parts choisies sur la fiche, reprises par le mode cuisine. */
  onCook?: (recipe: Recipe, servings?: number) => void;
  onEdit?: (recipe: Recipe) => void;
  shareText: (text: string, label: string) => void;
  showToast: (msg: string) => void;
  showNutriscore?: boolean;
  heroTreatment?: string;
  /** « Vue livre » : recettes de la grille affichée, dans son ordre (voir
   *  useRecipePager.ts). Vide ou absente : fiche seule, pas de pages. */
  pages?: Recipe[];
  /** Affiche une autre recette dans la même fiche (page tournée). */
  onNavigate?: (recipe: Recipe) => void;
}

const NO_PAGES: Recipe[] = [];

// Éléments où les flèches gauche/droite du clavier gardent leur rôle
// habituel (curseur dans un champ…) au lieu de tourner la page.
const KEEP_ARROWS_SELECTOR = "input, textarea, select, [contenteditable], [role='slider']";

export default function RecipeDetail({ recipe, onClose, onCook, onEdit, shareText, showToast, showNutriscore = true, heroTreatment = DEFAULT_HERO_TREATMENT, pages = NO_PAGES, onNavigate }: RecipeDetailProps) {
  // Sécurisation du nombre de portions initiales
  const baseServings = baseServingsOf(recipe);
  const [servings, setServings] = useState(() => baseServings);
  // La fiche reste ouverte pendant une modification (le formulaire s'empile
  // par-dessus) : si le nombre de portions de la recette change, on repart
  // de la nouvelle valeur, sinon les quantités affichées seraient fausses.
  // Idem en tournant la page (vue livre) : chaque recette repart de ses
  // propres portions — d'où l'id dans la clé, pas seulement le nombre.
  const servingsKey = `${recipe?.id ?? ""}|${baseServings}`;
  const [servingsBase, setServingsBase] = useState(servingsKey);
  const [showShare, setShowShare] = useState(false);
  if (servingsBase !== servingsKey) {
    setServingsBase(servingsKey);
    setServings(baseServings);
    setShowShare(false);
  }
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Trois refs à poser sur le même conteneur (scrollRef pour le geste de
  // fermeture par glissement ET pour l'appui prolongé en bas de page,
  // celle du piège à focus pour Échap/Tab) — combinées dans setScrollRef un
  // peu plus bas, un seul <div ref=...> ne pouvant recevoir qu'une seule
  // ref (même principe que SecretSettingsModal).
  const focusTrapRef = useFocusTrap<HTMLDivElement>(onClose);
  // "Tirer pour fermer" (voir useDismissibleSheet.js — remplace l'ancienne
  // logique maison de ce fichier, qui dupliquait ce que ce hook partagé
  // fait déjà pour ~25 autres modales). Reste géré ICI, pas seulement dans
  // le hook, pour cohabiter avec le geste "tirer vers le HAUT en bas de
  // page pour éditer" ci-dessous (voir handleTouchMove) : les deux
  // partagent le même conteneur scrollable, mais concernent des bords
  // opposés (haut/bas) et ne peuvent jamais se déclencher en même temps.
  const sheet = useDismissibleSheet(onClose, { scrollRef });
  const setScrollRef = (node: HTMLDivElement | null) => {
    scrollRef.current = node;
    focusTrapRef.current = node;
  };
  const overscrollRef = useRef(0);
  const touchYRef = useRef<number | null>(null);
  const { language, t } = useTranslation();
  const prefersReducedMotion = !!useReducedMotion();

  // --- Vue livre : glisser à gauche/droite tourne la page (voir
  // usePageTurn.ts). Position de la recette affichée dans la grille ; -1
  // (pas dans la liste, ex. ouverte depuis le Frigo) = pas de pages.
  const pageIndex = recipe ? pages.findIndex((r) => r.id === recipe.id) : -1;
  const neighbor = (dir: TurnDir): Recipe | null => {
    if (pageIndex < 0) return null;
    return pages[pageIndex + dir] ?? null;
  };
  // Vrai dès la première page tournée : les pages suivantes s'affichent
  // d'emblée (ni morphing de photo depuis la grille, ni fondu des lignes),
  // exactement comme la page découverte dessous pendant le geste.
  const [hasTurned, setHasTurned] = useState(false);
  const refocusDirRef = useRef<TurnDir | null>(null);
  const pageTurn = usePageTurn<Recipe>(scrollRef, {
    getTarget: neighbor,
    onTurn: (target, dir) => {
      // Le contenu de la page est remonté pour la nouvelle recette : si le
      // focus clavier y était (flèche du folio…), on le reposera sur la
      // flèche du même sens de la nouvelle page (voir l'effet plus bas).
      const active = document.activeElement;
      refocusDirRef.current = active && scrollRef.current?.querySelector(".detail-columns")?.contains(active) ? dir : null;
      setHasTurned(true);
      if (onNavigate) onNavigate(target);
    },
    reducedMotion: prefersReducedMotion,
    // « Tirer pour fermer » déjà en cours (son drapeau touch-action) — pas
    // `sheet.y`, que l'animation d'entrée de la feuille anime aussi.
    isBlocked: () => sheet.panHandlers.style.touchAction === "none",
  });
  // Nouvelle page affichée : on la reprend en haut, et la feuille revient à
  // plat (avant d'être peinte : la page découverte dessous était déjà
  // identique, la bascule ne se voit pas).
  const recipeId = recipe?.id;
  const shownIdRef = useRef(recipeId);
  useLayoutEffect(() => {
    if (shownIdRef.current === recipeId) return;
    shownIdRef.current = recipeId;
    const sheetEl = scrollRef.current;
    if (sheetEl) sheetEl.scrollTop = 0;
    pageTurn.settle();
    const dir = refocusDirRef.current;
    refocusDirRef.current = null;
    if (dir && sheetEl) {
      // Flèche du même sens, ou l'autre si on vient d'atteindre un bout.
      const arrows = Array.from(sheetEl.querySelectorAll<HTMLButtonElement>(".recipe-pager-arrow"));
      const same = arrows[dir === 1 ? 1 : 0];
      const target = same && !same.disabled ? same : arrows.find((a) => !a.disabled);
      target?.focus({ preventScroll: true });
    }
  });

  // Photos des pages voisines chargées à l'avance : la page découverte
  // dessous pendant le geste montre déjà sa photo, pas un voile d'attente.
  const prevUrl = pageIndex > 0 ? pages[pageIndex - 1]?.imageUrl : null;
  const nextUrl = pageIndex >= 0 ? pages[pageIndex + 1]?.imageUrl : null;
  useEffect(() => {
    for (const url of [prevUrl, nextUrl]) {
      if (!url) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [prevUrl, nextUrl]);

  // Fige le <body> (technique position:fixed, fiable sur iOS Safari —
  // overflow:hidden seul ne suffit pas) tant que la fiche recette est
  // ouverte, pour empêcher l'arrière-plan de défiler en même temps que
  // le panneau glissé vers le bas. Restauré à la fermeture.
  const isPresent = useBodyScrollLock(true);

  if (!recipe) return null;

  const folioFor = (r: Recipe): RecipeFolio | null => {
    const index = pages.findIndex((p) => p.id === r.id);
    if (index < 0 || pages.length < 2) return null;
    return {
      current: index + 1,
      total: pages.length,
      prev: pages[index - 1] ?? null,
      next: pages[index + 1] ?? null,
      onPrev: () => pageTurn.turn(-1),
      onNext: () => pageTurn.turn(1),
    };
  };

  const scaledIngredients = scaleIngredients(rawIngredientsOf(recipe), servings / baseServings);

  const triggerEdit = () => {
    overscrollRef.current = 0;
    if (onEdit) onEdit(recipe);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
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

  // Flèches gauche/droite du clavier : page précédente/suivante.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const target = e.target as Element | null;
    if (target && typeof target.closest === "function" && target.closest(KEEP_ARROWS_SELECTOR)) return;
    const dir: TurnDir = e.key === "ArrowRight" ? 1 : -1;
    if (!neighbor(dir)) return;
    e.preventDefault();
    pageTurn.turn(dir);
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
  // (Le glissement horizontal de la vue livre, lui, passe par des écouteurs
  // natifs — usePageTurn.ts — qui arrêtent l'événement avant qu'il
  // n'atteigne ces deux gestionnaires-ci dès que le geste est horizontal.)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
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

  // Fait tourner les deux systèmes de geste tactile en même temps sur ce
  // même nœud (voir commentaire au-dessus de handleTouchStart) — sans ça,
  // `{...sheet.panHandlers}` écrase silencieusement onTouchStart/onTouchMove
  // ci-dessus rien qu'en étant étalé après eux dans le JSX.
  const composedTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    handleTouchStart(e);
    sheet.panHandlers.onTouchStart(e);
  };
  const composedTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    handleTouchMove(e);
    sheet.panHandlers.onTouchMove(e);
  };

  const turning = pageTurn.turning;

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION} style={isPresent ? undefined : { pointerEvents: "none" }}>
      {turning && (
        <RecipePageUnder dir={turning.dir} geom={turning.geom} angle={pageTurn.angle}>
          <RecipePage
            recipe={turning.target}
            servings={baseServingsOf(turning.target)}
            scrollRef={scrollRef}
            heroTreatment={heroTreatment}
            showNutriscore={showNutriscore}
            reducedMotion={prefersReducedMotion}
            morph="none"
            animateItems={false}
            folio={folioFor(turning.target)}
            preview
          />
        </RecipePageUnder>
      )}
      <motion.div
        className="modal grimoire-page detail-scroll modal-swipeable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={setScrollRef}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
        style={{ ...sheet.panHandlers.style, ...pageTurn.pageStyle }}
        onTouchStart={composedTouchStart}
        onTouchMove={composedTouchMove}
      >
        <DocumentTitle page={translateRecipeText(recipe.title, language)} />
        <div className="detail-drag-handle" aria-hidden="true" />
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>

        <motion.div style={prefersReducedMotion ? { opacity: pageTurn.contentOpacity } : undefined}>
          <RecipePage
            key={recipe.id}
            recipe={recipe}
            servings={servings}
            onServingsChange={setServings}
            onCook={() => onCook && onCook(recipe, servings)}
            onShare={() => setShowShare(true)}
            scrollRef={scrollRef}
            heroTreatment={heroTreatment}
            showNutriscore={showNutriscore}
            reducedMotion={prefersReducedMotion}
            morph={hasTurned ? "paged" : "open"}
            animateItems={!hasTurned}
            folio={folioFor(recipe)}
          />
          <div className="detail-scroll-hint">· · ·</div>
        </motion.div>
        {/* Annonce la nouvelle page aux lecteurs d'écran. */}
        <div className="recipe-pager-sr" aria-live="polite">
          {hasTurned && pageIndex >= 0 ? t("recipePager.announce", { title: translateRecipeText(recipe.title, language), current: pageIndex + 1, total: pages.length }) : ""}
        </div>
      </motion.div>
      {turning && <RecipePageFold dir={turning.dir} geom={turning.geom} angle={pageTurn.angle} pageStyle={pageTurn.pageStyle} />}
      <AnimatePresence>
        {showShare && (
          <Suspense fallback={null}>
            <ShareRecipeModal
              recipe={recipe}
              servings={servings}
              ingredients={scaledIngredients as never}
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
