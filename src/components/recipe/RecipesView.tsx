import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { normalize, triggerHaptic } from "../../utils/helpers";
import { buildSearchEntry, matchesSearch, parseQuery, sortRecipes, type RecipeSort } from "../../utils/recipeSearch";
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
  /** Ouvre l'import d'une recette (lien). Affiché sur l'écran d'accueil d'un grimoire vide. */
  onImportRequest?: () => void;
  onOpen: (recipe: Recipe) => void;
  openRecipeId: string | null;
  onRequestDelete: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  pressDuration?: number;
  showNutriscore?: boolean;
  householdId: string | null;
  showToast?: (msg: string) => void;
  /** Ordre de la grille, choisi dans Réglages > Apparence (voir AppShell). */
  sort?: RecipeSort;
}

export default function RecipesView({
  recipes,
  filter,
  search,
  favoritesOnly,
  onToggleFavorite,
  onAddRequest,
  onImportRequest,
  onOpen,
  openRecipeId,
  onRequestDelete,
  onUpdateRecipe,
  onEdit,
  pressDuration,
  showNutriscore,
  householdId,
  showToast,
  sort = "name",
}: RecipesViewProps) {
  const { t } = useTranslation();
  // Recherche tolérante (accents, fautes de frappe, plusieurs mots) : voir
  // utils/recipeSearch.ts. Le texte recherchable de chaque recette n'est
  // préparé qu'une fois par liste de recettes, pas à chaque frappe.
  const terms = useMemo(() => parseQuery(search), [search]);
  const searchIndex = useMemo(() => new Map(recipes.map((r) => [r.id, buildSearchEntry(r)])), [recipes]);

  // Triée UNE SEULE FOIS sur TOUTES les recettes, pas seulement celles du
  // filtre actif (voir visibleIds ci-dessous, qui décide seule quelles
  // cartes sont affichées) — trier puis exclure donne le même ordre relatif
  // qu'exclure puis trier, donc aucun changement visuel pour l'ensemble
  // effectivement visible dans un filtre donné.
  const sorted = useMemo(() => sortRecipes(recipes, sort), [recipes, sort]);

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
      if (terms.length) {
        const entry = searchIndex.get(r.id);
        if (!entry || !matchesSearch(entry, terms)) return;
      }
      indexById.set(r.id, ids.size);
      ids.add(r.id);
    });
    return { visibleIds: ids, visibleIndexById: indexById };
  }, [sorted, applied, terms, searchIndex]);

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
  // Garde la dernière bascule déjà traitée : l'onglet reste en mémoire
  // (<Activity>, voir AppShell) et React rejoue ses effets quand on y revient
  // — sans cette garde, revenir sur Recettes remettait la page en haut au
  // lieu de retrouver la position de défilement.
  const scrolledGenerationRef = useRef(0);
  useLayoutEffect(() => {
    if (filterGeneration === 0 || filterGeneration === scrolledGenerationRef.current) return;
    scrolledGenerationRef.current = filterGeneration;
    window.scrollTo(0, 0);
  }, [filterGeneration]);

  return (
    <div className="view">
      {/* Grimoire encore vide (nouvel utilisateur) : un accueil qui dit quoi
          faire, au lieu de « aucune recette ne correspond à ta recherche ». */}
      {recipes.length === 0 && (
        <div className="recipes-welcome">
          <h2 className="recipes-welcome-title">{t("recipes.welcome.title")}</h2>
          <p className="hint">{t("recipes.welcome.body")}</p>
          <div className="recipes-welcome-actions">
            <button type="button" className="seal seal-gold" onClick={() => { triggerHaptic(15); onAddRequest(); }}>
              <Plus size={16} aria-hidden="true" /> {t("recipes.welcome.add")}
            </button>
            {onImportRequest && (
              <button type="button" className="seal" onClick={onImportRequest}>
                {t("recipes.welcome.import")}
              </button>
            )}
          </div>
        </div>
      )}
      {recipes.length > 0 && !hasVisible && (
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
            onEdit={onEdit}
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
          voir recipeCards.css — non repris ici pour ne pas y toucher). */}
      <motion.button className="fab" aria-label={t("recipes.addRecipe")} whileTap={{ scale: 0.88 }} onClick={() => { triggerHaptic(15); onAddRequest(); }}>
        <Plus size={22} />
      </motion.button>
    </div>
  );
}
