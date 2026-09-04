import { useState } from "react";
import { CheckSquare, ShoppingBasket, Square, X } from "lucide-react";
import { FILTERS } from "../../constants";
import { normalize, categoryClass, categoryLabel } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "../common/Flourish";
import Seal from "../common/Seal";

/* ------------------------------------------------------------------ */
/*  GÉNÉRER LA LISTE DE COURSES À PARTIR DE RECETTES — bottom sheet      */
/*  dédiée (remplace l'ancien bloc "Choisir des recettes" toujours         */
/*  déplié dans ShoppingView.jsx). La fusion intelligente avec la liste    */
/*  existante se fait côté hook — voir generateShoppingList dans           */
/*  hooks/useShoppingLists.js.                                             */
/* ------------------------------------------------------------------ */
export default function RecipePickerModal({ recipes, onGenerate, onClose }) {
  useBodyScrollLock(true);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("tout");

  const toggleRecipe = (id) => {
    triggerHaptic(10);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAll = () => { triggerHaptic(15); setSelected(recipes.map((r) => r.id)); };
  const selectNone = () => { triggerHaptic(10); setSelected([]); };

  const filtered = [...recipes]
    .filter((r) => filter === "tout" || normalize(r.category) === filter)
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const handleGenerate = () => {
    if (!selected.length) return;
    onGenerate(selected);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page recipe-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* En-tête / corps scrollable / pied de page = trois enfants flex
            DISTINCTS (voir .recipe-picker-modal dans styles.css.js) — le
            corps est la SEULE zone qui défile, le pied de page ne peut donc
            plus jamais se retrouver superposé aux dernières recettes,
            quelle que soit sa propre hauteur. */}
        <div className="recipe-picker-header">
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
          <h2 className="dropcap-title">Générer à partir de recettes</h2>
          <Flourish />

          <div className="filter-bar recipe-picker-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-pill ${filter === f.key ? "active" : ""}`}
                onClick={() => { triggerHaptic(10); setFilter(f.key); }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="shopping-actions">
            <button type="button" className="link-btn" onClick={selectAll}><CheckSquare size={14} /> Tout cocher</button>
            <button type="button" className="link-btn" onClick={selectNone}><Square size={14} /> Tout décocher</button>
          </div>
        </div>

        <div className="recipe-picker-body">
          {filtered.length === 0 ? (
            <p className="hint">Aucune recette dans cette catégorie.</p>
          ) : (
            <div className="recipe-select-list">
              {filtered.map((r) => (
                <label className="recipe-select-row card" key={r.id}>
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleRecipe(r.id)} />
                  <span>{r.title}</span>
                  <span className={`chip ${categoryClass(r)}`}>{categoryLabel(r)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="recipe-picker-footer">
            <Seal tone="gold" onClick={handleGenerate}>
              <ShoppingBasket size={16} /> Générer la liste ({selected.length} recette{selected.length > 1 ? "s" : ""})
            </Seal>
          </div>
        )}
      </div>
    </div>
  );
}
