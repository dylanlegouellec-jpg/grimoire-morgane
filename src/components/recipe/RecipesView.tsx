import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { normalize, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import RecipeCard from "./RecipeCard";
import type { Recipe } from "../../hooks/useRecipes";
import { ENTER_STAGGER_MAX_INDEX, ENTER_STAGGER_MS, FILTER_EXIT_MS } from "../../constants/motion";

interface RecipesViewProps {
  recipes: Recipe[];
  filter: string;
  search: string;
  favoritesOnly: boolean;
  onToggleFavorite: (id: string) => void;
  onAddRequest: () => void;
  onOpen: (recipe: Recipe) => void;
  openRecipeId: string | null;
  onRequestDelete: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  pressDuration?: number;
  showNutriscore?: boolean;
  householdId: string | null;
  showToast?: (msg: string) => void;
}

export default function RecipesView({
  recipes,
  filter,
  search,
  favoritesOnly,
  onToggleFavorite,
  onAddRequest,
  onOpen,
  openRecipeId,
  onRequestDelete,
  onUpdateRecipe,
  pressDuration,
  showNutriscore,
  householdId,
  showToast,
}: RecipesViewProps) {
  const { t } = useTranslation();
  const q = search.trim().toLowerCase();

  // Triée UNE SEULE FOIS sur TOUTES les recettes, pas seulement celles du
  // filtre actif (voir visibleIds ci-dessous, qui décide seule quelles
  // cartes sont affichées) — trier puis exclure donne le même ordre relatif
  // qu'exclure puis trier, donc aucun changement visuel pour l'ensemble
  // effectivement visible dans un filtre donné.
  const sorted = useMemo(
    () => [...recipes].sort((a, b) => a.title.localeCompare(b.title, "fr")),
    [recipes]
  );

  // Filtre/favoris réellement APPLIQUÉS à la grille — en retard de
  // FILTER_EXIT_MS sur les props `filter`/`favoritesOnly` (voir l'effet
  // "changement de filtre en deux temps" plus bas) pour laisser aux cartes
  // affichées le temps de se fondre avant que la grille ne bascule. La
  // pastille dorée de la barre de filtres (AppShell.tsx) suit, elle, les props
  // immédiatement : elle glisse pendant que les cartes sortent.
  const [applied, setApplied] = useState({ filter, favoritesOnly });

  // Quelles recettes correspondent au filtre/à la recherche actifs — un Set
  // d'ids, pas un nouveau tableau filtré : chaque carte de .recipes-grid reste
  // TOUJOURS montée, quel que soit le filtre (seule sa visibilité CSS change
  // via la prop `hidden`, voir RecipeCard.tsx). Démonter/remonter une carte
  // recréait sa balise <img>, que le navigateur devait redécoder/repeindre à
  // chaque passage Tout/Salé/Sucré/Favoris, même avec l'image en cache HTTP.
  // `visibleIds` (correspondance filtre/recherche) ET `visibleIndexById`
  // (position DANS la liste effectivement visible, pas dans la liste
  // complète) sont calculés dans le même passage : le second sert au délai
  // d'entrée échelonné, pour que chaque filtre retrouve son propre
  // échelonnement quel que soit son effectif.
  const { visibleIds, visibleIndexById } = useMemo(() => {
    const ids = new Set<string>();
    const indexById = new Map<string, number>();
    sorted.forEach((r) => {
      if (applied.filter !== "tout" && normalize(r.category) !== applied.filter) return;
      if (applied.favoritesOnly && !r.favorite) return;
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q);
        const inIngredients = r.ingredients.some((ing) => !("isSection" in ing) && ing.name.toLowerCase().includes(q));
        if (!inTitle && !inIngredients) return;
      }
      indexById.set(r.id, ids.size);
      ids.add(r.id);
    });
    return { visibleIds: ids, visibleIndexById: indexById };
  }, [sorted, applied, q]);

  const hasVisible = visibleIds.size > 0;

  const prefersReducedMotion = useReducedMotion();
  const hasVisibleRef = useRef(hasVisible);
  hasVisibleRef.current = hasVisible;

  // Changement de filtre/favoris en DEUX TEMPS (les props `filter`/
  // `favoritesOnly` changent tout de suite, la grille ne suit qu'ensuite) :
  //  1. `exiting` passe à vrai — chaque carte affichée se fond vers le
  //     transparent (voir RecipeCard.tsx, prop `exiting`) pendant
  //     FILTER_EXIT_MS ;
  //  2. `applied` prend alors les nouvelles valeurs : la grille bascule
  //     (instantanément, CSS Grid, cartes déjà fondues donc invisibles) et
  //     `filterGeneration` s'incrémente, ce qui fait rejouer à chaque carte
  //     visible son fondu/zoom d'entrée en cascade.
  // Avant ce changement, les anciennes cartes disparaissaient d'un coup
  // (display: none) puis les nouvelles apparaissaient en fondu — la coupure
  // brute masquait toute transition. `filterGeneration` est incrémenté à
  // chaque VRAI changement de filtre/favoris (jamais à la recherche texte, ni
  // au premier rendu) : une carte déjà visible avant ET après (ex. Tout ->
  // Salé pour les cartes salées) rejoue ainsi elle aussi son entrée plutôt que
  // de sauter à sa nouvelle place sans rien.
  // Sans carte à faire sortir (grille vide) ou avec "Réduire les animations"
  // système, la grille bascule immédiatement. Un clic rapide sur un autre
  // filtre pendant la sortie relance simplement le délai vers la dernière
  // valeur demandée ; revenir sur le filtre déjà appliqué l'annule (`exiting`
  // retombe à faux, les cartes sont alors ré-affichées par RecipeCard.tsx).
  const [exiting, setExiting] = useState(false);
  const [filterGeneration, setFilterGeneration] = useState(0);
  const [justApplied, setJustApplied] = useState(false);
  useEffect(() => {
    if (filter === applied.filter && favoritesOnly === applied.favoritesOnly) {
      setExiting(false);
      return undefined;
    }
    const commit = () => {
      setApplied({ filter, favoritesOnly });
      setExiting(false);
      setFilterGeneration((g) => g + 1);
      setJustApplied(true);
    };
    if (prefersReducedMotion || !hasVisibleRef.current) {
      commit();
      return undefined;
    }
    setExiting(true);
    const timer = setTimeout(commit, FILTER_EXIT_MS);
    return () => clearTimeout(timer);
  }, [filter, favoritesOnly, applied, prefersReducedMotion]);

  // Vrai pendant la sortie des cartes ET un court instant après la bascule de
  // la grille — passé à chaque carte pour qu'elle retire TEMPORAIREMENT le
  // layoutId de morphing de sa photo (voir RecipeCard.tsx, `.illus-wrap`).
  // Ce layoutId doit rester présent EN CONTINU le reste du temps pour que le
  // morphing carte -> fiche fonctionne (l'armer seulement au clic empêche
  // Framer de le jouer), mais présent pendant que les cartes sautent à leur
  // nouvelle place dans la grille, il faisait traîner leur photo loin derrière
  // elles. `justApplied` est posé au MÊME rendu que le changement de `applied`
  // (même lot de setState dans `commit`), donc le tout premier rendu commité
  // pour la bascule porte déjà `suppressMorph = true` ; le court délai
  // ci-dessous laisse passer d'éventuels rendus en cascade (effets React,
  // mesures Framer) avant de redonner la main au morphing normal.
  useEffect(() => {
    if (!justApplied) return undefined;
    const timer = setTimeout(() => setJustApplied(false), 60);
    return () => clearTimeout(timer);
  }, [justApplied]);
  const suppressMorph = exiting || justApplied;

  // Remonte en haut de page à la bascule de la grille (pas à la recherche
  // texte, ni au tout premier montage) — au moment où les cartes sont déjà
  // fondues, donc le saut de défilement n'est jamais visible. Toutes les
  // recettes restent montées en permanence : passer d'un filtre qui en affiche
  // beaucoup (ex. "Sucré", 20 recettes) à un filtre qui n'en affiche que
  // quelques-unes (ex. "Salé", 4) réduit brutalement la hauteur de la page ;
  // sans remise à zéro, le défilement resterait au-delà des cartes restantes,
  // rien de visible à l'écran.
  useLayoutEffect(() => {
    if (filterGeneration === 0) return;
    window.scrollTo(0, 0);
  }, [filterGeneration]);

  return (
    <div className="view">
      {!hasVisible && (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>{t("recipes.noMatch")}</p>
      )}
      <div className="recipes-grid" style={hasVisible ? undefined : { display: "none" }}>
        {sorted.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            hidden={!visibleIds.has(r.id)}
            filterGeneration={filterGeneration}
            suppressMorph={suppressMorph}
            exiting={exiting}
            onOpen={onOpen}
            isOpenRecipe={openRecipeId === r.id}
            onToggleFavorite={onToggleFavorite}
            onRequestDelete={onRequestDelete}
            onUpdateRecipe={onUpdateRecipe}
            enterDelay={Math.min(visibleIndexById.get(r.id) || 0, ENTER_STAGGER_MAX_INDEX) * ENTER_STAGGER_MS}
            pressDuration={pressDuration}
            showNutriscore={showNutriscore}
            householdId={householdId}
            showToast={showToast}
          />
        ))}
      </div>
      {/* whileTap plutôt qu'un ".fab:active" en CSS : pas d'effet d'enfoncement
          existant sur ce bouton (contrairement à .seal, qui a déjà le sien —
          voir recipeCards.css.js — non repris ici pour ne pas y toucher). */}
      <motion.button className="fab" whileTap={{ scale: 0.88 }} onClick={() => { triggerHaptic(15); onAddRequest(); }}>
        <Plus size={22} />
      </motion.button>
    </div>
  );
}
