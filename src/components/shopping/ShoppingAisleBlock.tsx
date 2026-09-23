import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";
import { aisleIcon, aisleVectorIcon } from "../../utils/helpers";
import { triggerHaptic } from "../../utils/haptics";
import CategoryIcon from "../common/CategoryIcon";
import ShoppingItemRow from "./ShoppingItemRow";
import type { ShoppingItem } from "../../hooks/useShoppingLists";

interface ShoppingItemRowSharedProps {
  onToggle: (id: string) => void;
  onAdjust?: (id: string, delta: number) => void;
  onDelete?: (id: string) => void;
  onOpenWheel: (item: ShoppingItem) => void;
  pressDuration?: number;
}

interface ShoppingAisleBlockProps {
  aisle: string;
  list: ShoppingItem[];
  aisleLabel: string;
  onCommitOrder: () => void;
  itemProps: ShoppingItemRowSharedProps;
}

/* ------------------------------------------------------------------ */
/*  BLOC D'UN RAYON DE COURSES (voir ShoppingView.jsx) — extrait en         */
/*  composant séparé comme PlanningMealItem.jsx/RecipeForm.jsx              */
/*  (IngredientRow/StepRow) : useDragControls est un hook, il ne peut pas     */
/*  être appelé un nombre de fois variable dans le .map() de ShoppingView.     */
/*                                                                                */
/*  Glisser-déposer via une poignée DÉDIÉE dans l'en-tête (comme                  */
/*  RecipeForm/PlanningMealItem, "dragListener={false}" + `dragControls`           */
/*  géré ici) — jamais sur le bloc entier ni sur les articles qu'il contient.         */
/*  Seuls les RAYONS se réordonnent entre eux (portée confirmée avec               */
/*  l'utilisateur) : les articles restent groupés et triés alphabétiquement          */
/*  DANS leur rayon exactement comme avant, ce composant ne touche jamais à            */
/*  leur ordre — `list` arrive déjà triée par ShoppingView.jsx.                          */
/* ------------------------------------------------------------------ */
export default function ShoppingAisleBlock({ aisle, list, aisleLabel, onCommitOrder, itemProps }: ShoppingAisleBlockProps) {
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => { triggerHaptic(15); dragControls.start(e); };
  // Un seul retour haptique + une seule écriture localStorage, au
  // relâchement — voir ShoppingView.jsx pour pourquoi l'état affiché,
  // lui, se met à jour en direct pendant tout le glissement (onReorder).
  const commitDrag = () => { triggerHaptic(12); onCommitOrder(); };

  return (
    <Reorder.Item
      value={aisle}
      as="div"
      className="aisle-block"
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={commitDrag}
    >
      <h4>
        <button
          type="button"
          className="aisle-drag-handle"
          onPointerDown={startDrag}
          aria-label="Glisser pour réordonner ce rayon"
        >
          <GripVertical size={16} />
        </button>
        <CategoryIcon className="aisle-icon" emoji={aisleIcon(aisle)} icon={aisleVectorIcon(aisle)} />
        {aisleLabel}
        <span className="aisle-count">{list.length}</span>
      </h4>
      <ul className="shopping-list">
        {/* mode="popLayout" : l'article qui sort (suppression ou coche) est
            retiré du flux dès le début de son fondu — voir ShoppingView.jsx
            pour l'explication complète, identique ici. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((it) => (
            <ShoppingItemRow key={it.id} item={it} checked={false} {...itemProps} />
          ))}
        </AnimatePresence>
      </ul>
    </Reorder.Item>
  );
}
