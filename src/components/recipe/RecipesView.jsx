import { useLayoutEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { normalize, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { isGuestMode, debugLog } from "../../utils/guestDebug";
import RecipeCard from "./RecipeCard";

export default function RecipesView({
  recipes,
  filter,
  search,
  favoritesOnly,
  onToggleFavorite,
  onAddRequest,
  onOpen,
  onRequestDelete,
  onUpdateRecipe,
  pressDuration,
  showNutriscore,
  householdId,
  showToast,
}) {
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

  // Quelles recettes correspondent au filtre/à la recherche actifs — un Set
  // d'ids, pas un nouveau tableau filtré : voir plus bas, chaque carte de
  // .recipes-grid reste désormais TOUJOURS montée, quel que soit le filtre
  // (seule sa visibilité CSS change via la prop `hidden`, voir
  // RecipeCard.jsx). Avant, repasser de "Salé" à "Tout" démontait puis
  // remontait chaque carte sucrée — donc sa balise <img> aussi, forçant le
  // navigateur à la redécoder/repeindre depuis zéro à chaque passage, même
  // avec l'image déjà en cache HTTP (le blocage constaté par l'utilisateur
  // à chaque changement d'onglet Tout/Salé/Sucré/Favoris). Garder chaque
  // carte montée en permanence élimine ce rechargement visuel : basculer
  // entre les filtres ne fait plus qu'afficher/masquer des cartes déjà
  // prêtes, jamais recréer leurs images.
  const visibleIds = useMemo(() => {
    const set = new Set();
    sorted.forEach((r) => {
      if (filter !== "tout" && normalize(r.category) !== filter) return;
      if (favoritesOnly && !r.favorite) return;
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q);
        const inIngredients = r.ingredients.some((ing) => !ing.isSection && ing.name.toLowerCase().includes(q));
        if (!inTitle && !inIngredients) return;
      }
      set.add(r.id);
    });
    return set;
  }, [sorted, filter, favoritesOnly, q]);

  const hasVisible = visibleIds.size > 0;

  // Compteur incrémenté à chaque VRAI changement de filtre/favoris (jamais
  // à la recherche texte, ni au premier rendu) — passé à chaque carte pour
  // qu'elle rejoue son animation d'entrée dès que ce compteur bouge, tant
  // qu'elle est visible après le changement. Avant, seules les cartes qui
  // passaient individuellement de masquée à visible rejouaient l'entrée —
  // ce qui semblait correct en théorie ("ne rejouer l'animation que sur
  // les éléments concernés"), mais donnait l'impression d'un bug très
  // concret : passer de "Tout" à "Sucré" ne RÉVÈLE aucune carte sucrée
  // (elles étaient déjà visibles sous "Tout", donc jamais masquée->visible)
  // — résultat, aucune animation ne se jouait du tout sur ce changement de
  // filtre précis, alors que la grille se réorganisait quand même sous les
  // yeux. Rejouer l'entrée de TOUTES les cartes visibles à chaque
  // changement de filtre retrouve la cascade attendue à chaque bascule,
  // pas seulement quand une carte apparaît individuellement — sans
  // réintroduire le problème d'origine (démontage/rechargement d'image),
  // puisque c'est toujours le même mécanisme sans démontage (voir
  // RecipeCard.jsx) qui s'en charge.
  const filterGenerationRef = useRef(0);
  const prevFilterKeyRef = useRef(`${filter}|${favoritesOnly}`);
  const filterKey = `${filter}|${favoritesOnly}`;
  if (filterKey !== prevFilterKeyRef.current) {
    prevFilterKeyRef.current = filterKey;
    filterGenerationRef.current += 1;
  }
  const filterGeneration = filterGenerationRef.current;

  // Remonte en haut de page à chaque changement de filtre catégorie/favoris
  // (pas à la recherche texte, ni au tout premier montage). Toutes les
  // recettes restent montées en permanence désormais (voir visibleIds
  // ci-dessus) : passer d'un filtre qui en affiche beaucoup (ex. "Sucré",
  // 20 recettes chez certains utilisateurs) à un filtre qui n'en affiche
  // que quelques-unes (ex. "Salé", 4 recettes) réduit brutalement la
  // hauteur de la page. Sans remise à zéro, le défilement restait à sa
  // position précédente — potentiellement bien plus bas que la nouvelle
  // hauteur totale de la page, donc au-delà des quelques cartes restantes :
  // rien de visible à l'écran (et le navigateur doit recaler la position de
  // défilement à la volée), ce qui pouvait ressembler à un bug d'animation
  // ou à un petit temps de latence alors que les cartes étaient en réalité
  // déjà là, juste hors de vue.
  const mountedRef = useRef(false);
  useLayoutEffect(() => {
    if (isGuestMode()) {
      debugLog(`RecipesView render: filter=${filter} favoris=${favoritesOnly} visibles=${visibleIds.size}/${sorted.length} docHeight=${document.documentElement.scrollHeight} scrollY=${window.scrollY}`);
    }
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    window.scrollTo(0, 0);
    if (isGuestMode()) debugLog(`scrollTo(0,0) exécuté, nouvelle docHeight=${document.documentElement.scrollHeight}`);
  }, [filter, favoritesOnly]);

  return (
    <div className="view">
      {!hasVisible && (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>{t("recipes.noMatch")}</p>
      )}
      <div className="recipes-grid" style={hasVisible ? undefined : { display: "none" }}>
        {sorted.map((r, i) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            hidden={!visibleIds.has(r.id)}
            filterGeneration={filterGeneration}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onRequestDelete={onRequestDelete}
            onUpdateRecipe={onUpdateRecipe}
            enterDelay={Math.min(i, 10) * 45}
            pressDuration={pressDuration}
            showNutriscore={showNutriscore}
            householdId={householdId}
            showToast={showToast}
          />
        ))}
      </div>
      <button className="fab" onClick={() => { triggerHaptic(15); onAddRequest(); }}>
        <Plus size={22} />
      </button>
    </div>
  );
}
