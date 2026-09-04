import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { ingredientKey } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { collectPantryOptions, missingIngredients, normalizeIngredientLabel, FRIDGE_CATEGORIES } from "./pantryUtils";
import DishArt from "../art/DishArt";
import SwipeFlourish from "../shopping/SwipeFlourish";

// Au-delà de ce nombre d'ingrédients manquants, une recette est reléguée
// hors de la liste par défaut (voir le bouton "Afficher aussi..." plus
// bas pour la faire quand même apparaître) — sinon "Réalisable avec ton
// frigo" redevenait le même nuage illisible que celui qu'on corrige ici,
// juste déplacé un peu plus bas dans l'écran.
const MAX_MISSING_SHOWN = 4;
// Seuil "presque prêt" : le détail des ingrédients manquants n'est
// affiché en clair que jusqu'à ce nombre — au-delà, juste le compte,
// pour ne pas allonger la carte inutilement.
const DETAIL_MISSING_THRESHOLD = 2;

export default function FridgeView({ recipes, pantry, setPantry, basics, search, onMoveBasicToVariable, onRemoveBasic, onResetPantry, onOpen }) {
  const { t, dict } = useTranslation();
  const q = search.trim().toLowerCase();
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [showBasics, setShowBasics] = useState(true);

  const basicKeys = basics.map((b) => ingredientKey(normalizeIngredientLabel(b)));
  const baseOptions = collectPantryOptions(recipes).filter((opt) => !basicKeys.includes(opt.key));
  const extraFromPantry = pantry
    .filter((key) => !baseOptions.some((o) => o.key === key) && !basicKeys.includes(key))
    .map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), category: "epicerie" }));
  const options = [...baseOptions, ...extraFromPantry];
  const filteredOptions = q ? options.filter((opt) => opt.label.toLowerCase().includes(q)) : options;

  const pantrySet = new Set(pantry);
  const ownedSet = new Set([...pantry, ...basicKeys]);
  const totalOwned = pantry.length + basics.length;

  const toggle = (key) => {
    triggerHaptic(12);
    setPantry((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };
  const toggleCategory = (key) => {
    triggerHaptic(10);
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const showQuickAdd = q.length > 0 && filteredOptions.length === 0;
  const handleQuickAdd = () => {
    const label = normalizeIngredientLabel(search);
    const key = ingredientKey(label);
    if (!key) return;
    triggerHaptic(15);
    setPantry((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const grouped = FRIDGE_CATEGORIES.reduce((acc, cat) => { acc[cat.key] = []; return acc; }, {});
  filteredOptions.forEach((opt) => { (grouped[opt.category] || grouped.epicerie).push(opt); });

  const sortedBasics = [...basics].sort((a, b) => a.localeCompare(b, "fr"));
  const filteredBasics = q ? sortedBasics.filter((name) => name.toLowerCase().includes(q)) : sortedBasics;

  const ranked = recipes
    .map((r) => ({ recipe: r, missing: missingIngredients(r, ownedSet) }))
    .sort((a, b) => a.missing.length - b.missing.length || a.recipe.title.localeCompare(b.recipe.title, "fr"));
  const visibleRanked = showAllRecipes ? ranked : ranked.filter(({ missing }) => missing.length <= MAX_MISSING_SHOWN);
  const hiddenCount = ranked.length - visibleRanked.length;

  return (
    <div className="view">
      <div className="fridge-counter">
        {t("fridge.counter", { count: totalOwned, plural: totalOwned > 1 ? "s" : "" })}
      </div>

      <button
        type="button"
        className="basics-title basics-title-toggle"
        onClick={() => { triggerHaptic(10); setShowBasics((v) => !v); }}
      >
        <span>🧂 {t("fridge.basicsTitle")} <span className="hint-inline">{t("fridge.basicsHint")}</span></span>
        <ChevronDown size={16} className={`fridge-category-chevron ${showBasics ? "open" : ""}`} />
      </button>
      {showBasics && (
        <div className="basics-grid">
          {filteredBasics.map((name) => (
            <div className="basic-chip" key={name}>
              <span>{name}</span>
              <button
                type="button"
                className="basic-action"
                onClick={() => onMoveBasicToVariable(name)}
                aria-label={t("fridge.toggleBasicAria", { name })}
                title={t("fridge.toggleBasicTitle")}
              >
                ⇄
              </button>
              <button
                type="button"
                className="basic-action basic-action-remove"
                onClick={() => onRemoveBasic(name)}
                aria-label={t("fridge.removeBasicAria", { name })}
                title={t("fridge.removeBasicTitle")}
              >
                ✕
              </button>
            </div>
          ))}
          {filteredBasics.length === 0 && (
            <p className="hint" style={{ margin: 0 }}>
              {q ? t("fridge.noBasicsMatch") : t("fridge.noBasicsYet")}
            </p>
          )}
        </div>
      )}

      <p className="hint">{t("fridge.checkHint")}</p>

      {showQuickAdd && (
        <button type="button" className="fridge-quick-add" onClick={handleQuickAdd}>
          <Plus size={14} /> {t("fridge.quickAdd", { term: search.trim() })}
        </button>
      )}

      {filteredOptions.length === 0 && !showQuickAdd ? (
        <p className="hint">{q ? t("fridge.noIngredientMatch") : t("fridge.addRecipesHint")}</p>
      ) : (
        <div className="fridge-categories">
          {FRIDGE_CATEGORIES.map((cat) => {
            const items = grouped[cat.key];
            if (!items.length) return null;
            const isOpen = q ? true : openCategories.has(cat.key);
            const ownedInCategory = items.filter((opt) => pantrySet.has(opt.key)).length;
            return (
              <div className="fridge-category" key={cat.key}>
                <button type="button" className="fridge-category-header" onClick={() => toggleCategory(cat.key)}>
                  <span className="fridge-category-icon" aria-hidden="true">{cat.icon}</span>
                  <span className="fridge-category-label">{dict.labels[cat.label] || cat.label}</span>
                  <span className="fridge-category-count">{ownedInCategory}/{items.length}</span>
                  <ChevronDown size={16} className={`fridge-category-chevron ${isOpen ? "open" : ""}`} />
                </button>
                {isOpen && (
                  <div className="pantry-grid">
                    {items.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`pantry-chip ${pantrySet.has(opt.key) ? "active" : ""}`}
                        onClick={() => toggle(opt.key)}
                      >
                        {pantrySet.has(opt.key) && <Check size={12} />} {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SwipeFlourish onSwipeLeft={onResetPantry} onSwipeRight={() => {}} />
      <h4>{t("fridge.feasibleTitle")}</h4>
      {visibleRanked.length === 0 ? (
        <p className="hint">{t("fridge.noFeasible")}</p>
      ) : (
        <div className="fridge-results">
          {visibleRanked.map(({ recipe, missing }, i) => {
            const tier = missing.length === 0 ? "ready" : missing.length <= DETAIL_MISSING_THRESHOLD ? "almost" : "far";
            return (
              <div
                className={`card fridge-row card-enter fridge-row-${tier}`}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                key={recipe.id}
                onClick={() => onOpen(recipe)}
              >
                <div className="fridge-thumb"><DishArt recipe={recipe} /></div>
                <div className="fridge-row-body">
                  <h5>{recipe.title}</h5>
                  {tier === "ready" ? (
                    <span className="fridge-badge fridge-badge-ready"><Check size={12} /> {t("fridge.ready")}</span>
                  ) : tier === "almost" ? (
                    <span className="fridge-missing">{t("fridge.missingPrefix")}{missing.map((m) => m.name).join(", ")}</span>
                  ) : (
                    <span className="fridge-missing fridge-missing-far">{t("fridge.missingCount", { count: missing.length })}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!showAllRecipes && hiddenCount > 0 && (
        <button type="button" className="link-btn fridge-show-more" onClick={() => setShowAllRecipes(true)}>
          {t("fridge.showMore", { count: hiddenCount })}
        </button>
      )}
    </div>
  );
}
