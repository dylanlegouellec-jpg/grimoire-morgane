import { useMemo } from "react";
import { Plus } from "lucide-react";
import { normalize, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
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

  // Recalculé seulement quand une de ces valeurs change réellement — pas
  // à chaque rendu du parent (ex. un toast qui apparaît ailleurs dans
  // l'app). Avant, ce filtrage/tri tournait à chaque frappe ET à chaque
  // re-render du composant racine, quelle qu'en soit la cause.
  const filtered = useMemo(() => {
    return recipes
      .filter((r) => {
        if (filter !== "tout" && normalize(r.category) !== filter) return false;
        if (favoritesOnly && !r.favorite) return false;
        if (q) {
          const inTitle = r.title.toLowerCase().includes(q);
          const inIngredients = r.ingredients.some((ing) => !ing.isSection && ing.name.toLowerCase().includes(q));
          if (!inTitle && !inIngredients) return false;
        }
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }, [recipes, filter, favoritesOnly, q]);

  // Pas de `key` dynamique sur .recipes-grid (ex-key={filter-favoritesOnly},
  // retiré) : ça forçait React à démonter/remonter TOUTES les cartes à
  // chaque changement de filtre, même celles qui restaient visibles dans
  // les deux cas — chaque image redécodée, chaque .card-enter (animation
  // d'entrée décalée) rejouée pour rien. Chaque <RecipeCard> a déjà son
  // propre key={r.id} : React réconcilie donc par id, garde en place (sans
  // remonter, donc sans rejouer l'animation) les cartes qui restent dans la
  // liste filtrée, et ne monte réellement QUE celles qui viennent
  // d'apparaître — c'est sur celles-là, et seulement celles-là, que
  // .card-enter se déclenche naturellement.
  return (
    <div className="view">
      {filtered.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>{t("recipes.noMatch")}</p>
      ) : (
        <div className="recipes-grid">
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
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
      )}
      <button className="fab" onClick={() => { triggerHaptic(15); onAddRequest(); }}>
        <Plus size={22} />
      </button>
    </div>
  );
}
