import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import { ChevronDown, Plus, ShoppingBasket, User, Users } from "lucide-react";
import { DEFAULT_AISLE_ORDER, copyText } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import { getStoredAisleOrder, storeAisleOrder } from "../../utils/localSettings";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import Seal from "../common/Seal";
import SegmentedControl from "../common/SegmentedControl";
import QuantitySheet from "../common/QuantitySheet";
import AnimatedNumber from "../common/AnimatedNumber";
import RecipePickerModal from "./RecipePickerModal";
import SwipeFlourish from "./SwipeFlourish";
import ShoppingItemRow from "./ShoppingItemRow";
import ShoppingAisleBlock from "./ShoppingAisleBlock";
import type { Recipe } from "../../hooks/useRecipes";
import type { ShoppingItem, ShoppingList } from "../../hooks/useShoppingLists";

// "shopping.recap" reste une SEULE phrase traduite interpolée (voir
// translations.js, "{bought}/{total} article{plural}...") — t() ne rend
// que du texte brut, jamais du JSX, donc impossible d'y glisser directement
// un <AnimatedNumber>. Plutôt que d'éclater cette clé de traduction en
// plusieurs morceaux (risque de casser l'ordre grammatical dans une langue
// où les nombres ne tombent pas au même endroit), on redécoupe ICI le texte
// déjà traduit sur les suites de chiffres : ça fonctionne quelle que soit la
// langue ou la position des nombres dans la phrase, sans toucher aux clés
// de traduction elles-mêmes.
function withAnimatedNumbers(text: string): ReactNode[] {
  return text.split(/(\d+)/).map((part, i) => (
    /^\d+$/.test(part) ? <AnimatedNumber key={i} value={Number(part)} /> : <Fragment key={i}>{part}</Fragment>
  ));
}

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
// Même transition que la bascule Foyer/Personnel du Planning (voir
// PlanningView.jsx, SCOPE_SWITCH_*) — copiée ici plutôt que partagée : les
// deux vues n'ont d'autre lien qu'une coïncidence de nom de prop, un import
// croisé entre elles pour trois constantes serait plus de bruit que
// d'économie.
const SCOPE_SWITCH_DURATION_S = 0.24;
const SCOPE_SWITCH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SCOPE_SWITCH_SLIDE_PX = 14;

interface ShoppingViewProps {
  recipes: Recipe[];
  activeList: ShoppingList | null;
  scope: string;
  onChangeScope: (scope: string) => void;
  onAddManualItem: (name: string) => void;
  onToggleItem: (id: string) => void;
  onAdjustQty: (id: string, delta: number) => void;
  onSetItemQty: (id: string, qty: number, unit: string) => void;
  onDeleteItem: (id: string) => void;
  onGenerateFromRecipes: (ids: string[]) => void;
  onResetActiveList: () => void;
  onOpenManager: () => void;
  showToast: (msg: string) => void;
  pressDuration?: number;
}

export default function ShoppingView({
  recipes,
  activeList,
  scope,
  onChangeScope,
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
}: ShoppingViewProps) {
  const { t, dict, language } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [manualInput, setManualInput] = useState("");
  const [wheelItem, setWheelItem] = useState<ShoppingItem | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showBought, setShowBought] = useState(false);
  // Ordre personnalisé des RAYONS (pas des articles), glissé-déposé par
  // en-tête de rayon (voir ShoppingAisleBlock.jsx) et mémorisé localement
  // sur cet appareil (utils/localSettings.js) — jamais synchronisé
  // Supabase, comme la portée du plan de repas.
  const [aisleOrder, setAisleOrder] = useState<string[]>(() => getStoredAisleOrder() || DEFAULT_AISLE_ORDER);

  // Mémoïsé pour que la branche `[]` (aucune liste active) garde elle
  // aussi une référence stable d'un rendu à l'autre — sinon le useMemo
  // ci-dessous (bought/grouped/aisleCount) la verrait comme "changée" à
  // chaque rendu tant qu'aucune liste n'est active, et perdrait son intérêt
  // documenté juste en dessous.
  const items = useMemo(() => (activeList ? activeList.items : []), [activeList]);

  // "/" permet de saisir plusieurs articles d'un coup (ex. "Lait / Pain /
  // Œufs") — même geste que pour les repas personnalisés du planning (voir
  // AddMealModal.jsx) : chacun devient une ligne distincte de la liste.
  const addManual = () => {
    const raw = manualInput.trim();
    if (!raw) return;
    const names = raw.split("/").map((part) => part.trim()).filter(Boolean);
    if (!names.length) return;
    names.forEach((name) => onAddManualItem(name));
    setManualInput("");
  };

  // Recalculé seulement quand `items` change réellement (référence stable
  // tant que la liste active ne change pas, voir activeList dans
  // AppShell.jsx) — pas à chaque frappe dans le champ "Ajouter un article"
  // ni à chaque re-render déclenché ailleurs dans la vue (ouverture d'une
  // roue de quantité, dépliage de la section "achetés"...). Avant, ce
  // filtrage/regroupement/tri (deux .sort() avec localeCompare inclus)
  // tournait sur toute la liste à chaque rendu, quelle qu'en soit la cause.
  const { bought, grouped, aisleCount } = useMemo(() => {
    const unchecked = items.filter((i) => !i.checked);
    const bought = [...items.filter((i) => i.checked)].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const grouped = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
      acc[item.aisle] = acc[item.aisle] || [];
      acc[item.aisle].push(item);
      return acc;
    }, {});
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, "fr")));
    return { unchecked, bought, grouped, aisleCount: Object.keys(grouped).length };
  }, [items]);

  // Rayons actuellement affichés (ceux de `grouped`), triés selon l'ordre
  // personnalisé mémorisé — un rayon absent de `aisleOrder` (jamais vu, ex.
  // ajout futur à AISLES) se positionne selon l'ordre par défaut plutôt
  // qu'en toute fin. Recalculé seulement quand `grouped` ou `aisleOrder`
  // changent réellement, pas à chaque rendu.
  const orderedAisleKeys = useMemo(() => {
    const present = Object.keys(grouped);
    const known = aisleOrder.filter((a) => present.includes(a));
    const unknown = present
      .filter((a) => !aisleOrder.includes(a))
      .sort((a, b) => DEFAULT_AISLE_ORDER.indexOf(a) - DEFAULT_AISLE_ORDER.indexOf(b));
    return [...known, ...unknown];
  }, [grouped, aisleOrder]);

  // État local pour l'affichage EN DIRECT pendant le glissement (Framer
  // appelle onReorder en continu, pas seulement au relâchement) — même
  // principe que `localEntries` dans PlanningMealItemsList.jsx. Resynchronisé
  // dès que l'ordre affiché change pour une raison EXTÉRIEURE au glissement
  // (article coché/décoché faisant apparaître/disparaître un rayon...).
  const [visibleAisles, setVisibleAisles] = useState(orderedAisleKeys);
  useEffect(() => { setVisibleAisles(orderedAisleKeys); }, [orderedAisleKeys]);

  // Un seul commit (mémorisation) au relâchement du glissement, jamais
  // pendant (voir ShoppingAisleBlock.jsx, commitDrag) — les rayons non
  // affichés en ce moment (ex. "Autre" si aucun article non classé) gardent
  // leur position relative d'avant, ajoutée à la suite.
  const commitAisleOrder = () => {
    const others = aisleOrder.filter((a) => !visibleAisles.includes(a));
    const next = [...visibleAisles, ...others];
    setAisleOrder(next);
    storeAisleOrder(next);
  };

  const buildListText = () => {
    const lines = [`🛒 ${activeList ? activeList.name : t("shopping.defaultListName")} — Le Grimoire de Morgane`, ""];
    orderedAisleKeys.forEach((aisle) => {
      const list = grouped[aisle];
      lines.push(`${(dict.labels as Record<string, string>)[aisle] || aisle} :`);
      list.forEach((it) => lines.push(`- ${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} ${translateRecipeText(it.name, language)}`));
      lines.push("");
    });
    if (bought.length) {
      lines.push(t("shopping.alreadyBought"));
      bought.forEach((it) => lines.push(`- ${translateRecipeText(it.name, language)}`));
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
      {/* La ligne reste toujours affichée, même sans liste active dans la
          portée courante (ex. "personal" avant la toute première liste
          perso créée) — sinon le toggle lui-même disparaîtrait avec elle,
          coinçant l'utilisateur sans moyen de revenir sur "household". */}
      <div className="active-list-header">
        {activeList ? (
          <button type="button" className="active-list-name" onClick={onOpenManager}>
            <span className="active-list-name-text">{activeList.name}</span>
            <span className="active-list-switch">{t("shopping.changeList")} ▾</span>
          </button>
        ) : (
          <button type="button" className="active-list-name active-list-name-empty" onClick={onOpenManager}>
            <span className="active-list-name-text">{t("shopping.noListYet")}</span>
            <span className="active-list-switch">{t("shopping.changeList")} ▾</span>
          </button>
        )}
        <SegmentedControl
          compact
          ariaLabel={t("shopping.scopeToggleLabel")}
          value={scope}
          onChange={onChangeScope}
          options={[
            { value: "household", label: "", icon: Users, ariaLabel: t("shopping.scopeHousehold") },
            { value: "personal", label: "", icon: User, ariaLabel: t("shopping.scopePersonal") },
          ]}
        />
      </div>

      <div className="manual-add-row">
        <input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          placeholder={t("shopping.addPlaceholder")}
          aria-label={t("shopping.addPlaceholder")}
        />
        <button type="button" onClick={addManual} aria-label={t("shopping.addPlaceholder")}><Plus size={16} /></button>
      </div>

      <div className="recipe-picker-trigger">
        <Seal tone="gold" onClick={() => setShowRecipePicker(true)}>
          <ShoppingBasket size={15} /> {t("shopping.generateFromRecipes")}
        </Seal>
      </div>

      {/* Fondu/glissement léger à chaque bascule Foyer <-> Personnel (voir
          `scope`, prop reçue du parent) — avant, le contenu changeait
          instantanément d'un état à l'autre (signalé comme trop sec).
          `mode="wait"` : l'ancienne portée finit de sortir avant que la
          nouvelle ne commence à entrer, pour éviter tout chevauchement/saut
          de mise en page (la liste "personal" est souvent bien plus courte
          que "household", donc leurs hauteurs diffèrent). `key={scope}`
          (pas `activeList.id`) : changer de liste au sein d'une même portée
          (voir "changer ▾", onOpenManager) ne doit jamais rejouer cette
          animation, seule la bascule Foyer/Personnel elle-même le doit. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scope}
          className="shopping-scope-scroll"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: scope === "personal" ? SCOPE_SWITCH_SLIDE_PX : -SCOPE_SWITCH_SLIDE_PX }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: scope === "personal" ? -SCOPE_SWITCH_SLIDE_PX : SCOPE_SWITCH_SLIDE_PX }}
          transition={{ duration: SCOPE_SWITCH_DURATION_S, ease: SCOPE_SWITCH_EASE }}
        >
        {items.length > 0 ? (
          <div className="shopping-result">
            <div className="parchment-recap">
              {withAnimatedNumbers(t("shopping.recap", {
                bought: bought.length,
                total: items.length,
                plural: items.length > 1 ? "s" : "",
                aisles: aisleCount,
                aislesPlural: aisleCount > 1 ? "s" : "",
              }))}
            </div>
            <div className="shopping-progress" aria-hidden="true">
              <div
                className="shopping-progress-fill"
                style={{ width: `${items.length ? (bought.length / items.length) * 100 : 0}%` }}
              />
            </div>
            <div className="apple-bar">
              <SwipeFlourish onSwipeRight={handleAppleCopy} onSwipeLeft={handleAppleReset} onTap={handleAppleReset} />
            </div>

            {/* Un seul <Reorder.Group> pour les BLOCS DE RAYON eux-mêmes
                (pas pour les articles qu'ils contiennent, voir
                ShoppingAisleBlock.jsx pour l'AnimatePresence par-article
                qui reste inchangée à l'intérieur de chacun) — glisser
                réordonne les rayons entre eux, "apprend" l'agencement du
                magasin de l'utilisateur, et mémorise cet ordre localement
                (voir commitAisleOrder ci-dessus). */}
            <Reorder.Group as="div" axis="y" values={visibleAisles} onReorder={setVisibleAisles}>
              {visibleAisles.map((aisle) => (
                <ShoppingAisleBlock
                  key={aisle}
                  aisle={aisle}
                  list={grouped[aisle]}
                  aisleLabel={(dict.labels as Record<string, string>)[aisle] || aisle}
                  onCommitOrder={commitAisleOrder}
                  itemProps={{
                    onToggle: onToggleItem,
                    onAdjust: onAdjustQty,
                    onDelete: onDeleteItem,
                    onOpenWheel: setWheelItem,
                    pressDuration,
                  }}
                />
              ))}
            </Reorder.Group>

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
                    <AnimatePresence mode="popLayout" initial={false}>
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
                    </AnimatePresence>
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
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showRecipePicker && (
          <RecipePickerModal
            recipes={recipes}
            onGenerate={(ids) => onGenerateFromRecipes(ids)}
            onClose={() => setShowRecipePicker(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {wheelItem && (
          <QuantitySheet
            item={wheelItem}
            onChange={(value, unit) => onSetItemQty(wheelItem.id, value, unit)}
            onClose={() => setWheelItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
