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

  return (
    <div className="view">
      {filtered.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>{t("recipes.noMatch")}</p>
      ) : (
        <div className="recipes-grid" key={`${filter}-${favoritesOnly}`}>
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
