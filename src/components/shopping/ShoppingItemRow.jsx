import { memo, useRef, useState } from "react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";

/* ------------------------------------------------------------------ */
/*  LIGNE D'ARTICLE — tap pour cocher, appui long pour la molette de     */
/*  quantité (inchangé), + swipe tactile : à droite pour cocher/décocher, */
/*  à gauche pour supprimer. Même principe que SwipeFlourish.jsx (drag    */
/*  CSS pur, pas de librairie) mais avec un verrouillage d'axe : si le     */
/*  geste est plutôt vertical, on annule tout de suite (appui long ET     */
/*  suivi du glissement) pour ne jamais gêner le scroll natif de la        */
/*  liste — jamais de preventDefault().                                    */
/* ------------------------------------------------------------------ */
const AXIS_LOCK_THRESHOLD_PX = 8;
const SWIPE_COMMIT_PX = 72;

function ShoppingItemRow({ item, checked, onToggle, onAdjust, onDelete, onOpenWheel, pressDuration }) {
  const { language } = useTranslation();
  const timer = useRef(null);
  const fired = useRef(false);
  const startPos = useRef(null);
  const axisRef = useRef(null); // null tant qu'indéterminé, puis "x" | "y"
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startLongPress = () => {
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; triggerHaptic(25); onOpenWheel(item); }, pressDuration);
  };
  const cancelLongPress = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  const handleClick = () => {
    if (fired.current) { fired.current = false; return; }
    onToggle(item.id);
  };

  const handleTouchStart = (e) => {
    startLongPress();
    const t = e.touches && e.touches[0];
    startPos.current = t ? { x: t.clientX, y: t.clientY } : null;
    axisRef.current = null;
  };
  const handleTouchMove = (e) => {
    const t = e.touches && e.touches[0];
    if (!t || !startPos.current) return;
    const dx = t.clientX - startPos.current.x;
    const dy = t.clientY - startPos.current.y;
    if (axisRef.current == null) {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX && Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "x") cancelLongPress(); // un vrai swipe annule l'appui long
    }
    if (axisRef.current !== "x") { cancelLongPress(); return; } // laisse le scroll vertical natif faire son travail
    setDragging(true);
    setDragX(dx);
  };
  const handleTouchEnd = () => {
    cancelLongPress();
    if (axisRef.current === "x" && Math.abs(dragX) > SWIPE_COMMIT_PX) {
      if (dragX > 0) { triggerHaptic(15); onToggle(item.id); }
      else if (onDelete) { triggerHaptic(20); onDelete(item.id); }
    }
    setDragging(false);
    setDragX(0);
    startPos.current = null;
    axisRef.current = null;
  };

  return (
    <li className={checked ? "checked" : ""}>
      <div className="shopping-item-swipe">
        <div className="shopping-item-swipe-hint hint-check" aria-hidden="true"><Check size={16} /></div>
        {onDelete && <div className="shopping-item-swipe-hint hint-delete" aria-hidden="true"><Trash2 size={16} /></div>}
        <div
          className="shopping-item-content"
          style={{
            // "undefined" au repos (dragX === 0), pas "translateX(0px)" : une
            // transform non vide force sa propre couche de composition GPU
            // même immobile — sur cette vue, avec potentiellement plusieurs
            // lignes en même temps, ça a fini par perturber le rendu de
            // .bottom-nav (position: fixed + backdrop-filter, ailleurs sur
            // la page) sur iOS Safari : la nav apparaissait plus haute et
            // opaque spécifiquement sur l'onglet Courses. Même principe déjà
            // appliqué dans hooks/useDismissibleSheet.js.
            transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
            transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="checkbox-row" onClick={handleClick}>
            <span className="checkbox">{checked && <Check size={11} />}</span>
            <span>{item.qty > 0 ? `${Math.round(item.qty * 100) / 100}${item.unit ? ` ${item.unit}` : ""} — ` : ""}{translateRecipeText(item.name, language)}</span>
          </span>
          {!checked && onAdjust && (
            <span className="qty-stepper">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdjust(item.id, -1); }}
                aria-label={`Diminuer la quantité de ${translateRecipeText(item.name, language)}`}
              >
                <Minus size={11} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdjust(item.id, 1); }}
                aria-label={`Augmenter la quantité de ${translateRecipeText(item.name, language)}`}
              >
                <Plus size={11} />
              </button>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// Callbacks stables côté ShoppingView (useCallback dans useShoppingLists.js,
// ou des setState directs) et mise à jour immutable qui préserve la
// référence des articles NON modifiés (voir useShoppingLists.js, .map avec
// repli `: it`) — memo() peut donc réellement sauter le re-rendu d'un
// article quand un autre article de la liste change, plutôt que de
// re-rendre toute la liste à chaque frappe dans "Ajouter un article".
export default memo(ShoppingItemRow);
