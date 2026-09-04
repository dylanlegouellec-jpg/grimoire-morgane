import { useState } from "react";
import { ChevronDown, Plus, ShoppingBasket } from "lucide-react";
import { aisleIcon, copyText } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import Seal from "../common/Seal";
import QuantitySheet from "../common/QuantitySheet";
import RecipePickerModal from "./RecipePickerModal";
import SwipeFlourish from "./SwipeFlourish";
import ShoppingItemRow from "./ShoppingItemRow";

/* ------------------------------------------------------------------ */
/*  VUE COURSES                                                        */
/*  Une seule barre d'ajout d'article, ancrée sous l'en-tête — plus de   */
/*  bouton "+" flottant (la création d'une nouvelle liste reste            */
/*  accessible via "changer ▾" -> Mes listes de courses -> "+ Nouvelle     */
/*  liste"). Les rayons sont générés depuis `item.aisle` (voir              */
/*  utils/helpers.js, guessAisle) et se masquent d'eux-mêmes dès que        */
/*  tous leurs articles sont cochés, puisqu'ils ne sont construits qu'à     */
/*  partir des articles NON cochés (`unchecked`) — ceux-ci rejoignent la    */
/*  section "Articles achetés" repliable tout en bas.                       */
/* ------------------------------------------------------------------ */
export default function ShoppingView({
  recipes,
  activeList,
  onAddManualItem,
  onToggleItem,
  onAdjustQty,
  onSetItemQty,
  onDeleteItem,
  onGenerateFromRecipes,
  onResetActiveList,
  onOpenManager,
  showToast,
  pressDuration,
}) {
  const { t, dict } = useTranslation();
  const [manualInput, setManualInput] = useState("");
  const [wheelItem, setWheelItem] = useState(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showBought, setShowBought] = useState(false);

  const items = activeList ? activeList.items : [];

  const addManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    onAddManualItem(name);
    setManualInput("");
  };

  const unchecked = items.filter((i) => !i.checked);
  const bought = [...items.filter((i) => i.checked)].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const grouped = unchecked.reduce((acc, item) => {
    acc[item.aisle] = acc[item.aisle] || [];
    acc[item.aisle].push(item);
    return acc;
  }, {});
  Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, "fr")));
  const aisleCount = Object.keys(grouped).length;

  const buildListText = () => {
    const lines = [`🛒 ${activeList ? activeList.name : t("shopping.defaultListName")} — Le Grimoire de Morgane`, ""];
    Object.entries(grouped).forEach(([aisle, list]) => {
      lines.push(`${dict.labels[aisle] || aisle} :`);
      list.forEach((it) => lines.push(`- ${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} ${it.name}`));
      lines.push("");
    });
    if (bought.length) {
      lines.push(t("shopping.alreadyBought"));
      bought.forEach((it) => lines.push(`- ${it.name}`));
    }
    return lines.join("\n").trim();
  };

  const handleAppleCopy = async () => {
    await copyText(buildListText());
    showToast(t("shopping.listCopied"));
    triggerHaptic(40);
  };
  const handleAppleReset = () => {
    onResetActiveList();
  };

  return (
    <div className="view">
      {activeList && (
        <div className="active-list-header">
          <button type="button" className="active-list-name" onClick={onOpenManager}>
            {activeList.name} <span className="active-list-switch">{t("shopping.changeList")} ▾</span>
          </button>
        </div>
      )}

      <div className="manual-add-row">
        <input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          placeholder={t("shopping.addPlaceholder")}
        />
        <button type="button" onClick={addManual}><Plus size={16} /></button>
      </div>

      <div className="recipe-picker-trigger">
        <Seal tone="gold" onClick={() => setShowRecipePicker(true)}>
          <ShoppingBasket size={15} /> {t("shopping.generateFromRecipes")}
        </Seal>
      </div>

      {items.length > 0 ? (
        <div className="shopping-result">
          <div className="parchment-recap">
            {t("shopping.recap", {
              bought: bought.length,
              total: items.length,
              plural: items.length > 1 ? "s" : "",
              aisles: aisleCount,
              aislesPlural: aisleCount > 1 ? "s" : "",
            })}
          </div>
          <div className="apple-bar">
            <SwipeFlourish onSwipeRight={handleAppleCopy} onSwipeLeft={handleAppleReset} onTap={handleAppleReset} />
          </div>

          {Object.entries(grouped).map(([aisle, list]) => (
            <div key={aisle} className="aisle-block">
              <h4>
                <span className="aisle-icon" aria-hidden="true">{aisleIcon(aisle)}</span>
                {dict.labels[aisle] || aisle}
                <span className="aisle-count">{list.length}</span>
              </h4>
              <ul className="shopping-list">
                {list.map((it) => (
                  <ShoppingItemRow
                    key={it.id}
                    item={it}
                    checked={false}
                    onToggle={onToggleItem}
                    onAdjust={onAdjustQty}
                    onDelete={onDeleteItem}
                    onOpenWheel={setWheelItem}
                    pressDuration={pressDuration}
                  />
                ))}
              </ul>
            </div>
          ))}

          {bought.length > 0 && (
            <div className="aisle-block bought-block">
              <button
                type="button"
                className="bought-toggle"
                onClick={() => { triggerHaptic(10); setShowBought((v) => !v); }}
              >
                <h4>{t("shopping.boughtSection")} <span className="aisle-count">{bought.length}</span></h4>
                <ChevronDown size={16} className={`bought-chevron ${showBought ? "open" : ""}`} />
              </button>
              {showBought && (
                <ul className="shopping-list bought-list">
                  {bought.map((it) => (
                    <ShoppingItemRow
                      key={it.id}
                      item={it}
                      checked
                      onToggle={onToggleItem}
                      onDelete={onDeleteItem}
                      onOpenWheel={setWheelItem}
                      pressDuration={pressDuration}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="hint" style={{ textAlign: "center", marginTop: 24 }}>
          {t("shopping.emptyList")}
        </p>
      )}

      {showRecipePicker && (
        <RecipePickerModal
          recipes={recipes}
          onGenerate={(ids) => onGenerateFromRecipes(ids)}
          onClose={() => setShowRecipePicker(false)}
        />
      )}

      {wheelItem && (
        <QuantitySheet
          item={wheelItem}
          onChange={(value, unit) => onSetItemQty(wheelItem.id, value, unit)}
          onClose={() => setWheelItem(null)}
        />
      )}
    </div>
  );
}
