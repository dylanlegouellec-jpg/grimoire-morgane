import { memo, useRef } from "react";
import { motion, useMotionValue, animate, useReducedMotion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useLongPress from "../../hooks/useLongPress";
import type { ShoppingItem } from "../../hooks/useShoppingLists";

/* ------------------------------------------------------------------ */
/*  LIGNE D'ARTICLE — tap pour cocher, appui long pour la molette de     */
/*  quantité, + swipe tactile : à droite pour cocher/décocher, à gauche   */
/*  pour supprimer.                                                       */
/*                                                                         */
/*  MIGRATION vers Framer Motion `drag="x"` (même principe que               */
/*  SwipeFlourish.jsx, déjà migré) — remplace le suivi maison               */
/*  (onTouchMove + verrouillage d'axe calculé à la main). Vérifié               */
/*  empiriquement AVANT cette migration que Framer laisse bien                   */
/*  "transform: none" au repos (jamais "translateX(0px)") : le hand-rolled          */
/*  d'origine évitait spécifiquement une transform TOUJOURS présente,                */
/*  même à 0px, qui avait perturbé le rendu de .bottom-nav (position:                 */
/*  fixed + backdrop-filter) sur iOS Safari avec plusieurs lignes de                    */
/*  cette liste montées à la fois — Framer gère déjà ça correctement de                  */
/*  lui-même, pas besoin de reproduire cette prudence à la main ici.                       */
/*  Framer pose aussi lui-même "touch-action: pan-y" sur l'élément dès que                   */
/*  "drag=\"x\"" est utilisé (vérifié) : le défilement vertical natif de la                    */
/*  liste reste donc intact, sans avoir à verrouiller l'axe nous-mêmes.                          */
/*                                                                                                   */
/*  L'appui long (molette de quantité) reste géré par le hook partagé                                  */
/*  useLongPress.js (déjà utilisé ailleurs dans l'app) plutôt qu'un minuteur                             */
/*  maison : ses propres écouteurs tactiles NATIFS (pas des props JSX)                                     */
/*  cohabitent sans le moindre conflit avec les écouteurs internes de                                        */
/*  Framer sur ce même nœud — aucun des deux n'appelle jamais                                                  */
/*  preventDefault()/stopPropagation() contre l'autre. Son propre                                                */
/*  verrouillage sur le mouvement (voir son commentaire de fichier)                                                */
/*  annule déjà l'appui long dès qu'un vrai geste (swipe OU défilement)                                             */
/*  commence, exactement comme avant.                                                                                */
/* ------------------------------------------------------------------ */
const SWIPE_COMMIT_PX = 72;
const RELEASE_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
// Sortie de liste (suppression ou coche) : fondu + léger rétrécissement,
// pas de translation — la remontée des articles suivants pour combler le
// vide vient déjà de "layout" ci-dessous (voir <AnimatePresence
// mode="popLayout"> dans ShoppingView.jsx, qui sort cet article du flux DÈS
// le début de sa sortie pour que ses voisins glissent tout de suite, sans
// attendre la fin de son fondu).
const EXIT_VARIANT = { opacity: 0, scale: 0.92 };
const EXIT_TRANSITION: { duration: number; ease: [number, number, number, number] } = { duration: 0.2, ease: [0.22, 1, 0.36, 1] };

type DivDragProps = HTMLMotionProps<"div">;
type DragEventParam = Parameters<NonNullable<DivDragProps["onDrag"]>>[0];
type DragInfoParam = Parameters<NonNullable<DivDragProps["onDrag"]>>[1];

interface ShoppingItemRowProps {
  item: ShoppingItem;
  checked: boolean;
  onToggle: (id: string) => void;
  onAdjust?: (id: string, delta: number) => void;
  onDelete?: (id: string) => void;
  onOpenWheel: (item: ShoppingItem) => void;
  pressDuration?: number;
}

function ShoppingItemRow({ item, checked, onToggle, onAdjust, onDelete, onOpenWheel, pressDuration }: ShoppingItemRowProps) {
  const { language } = useTranslation();
  const x = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  // useLongPress déclenche déjà lui-même un retour haptique à l'ouverture
  // (voir hooks/useLongPress.js, triggerHapticFeedback) — pas besoin de le
  // dupliquer ici comme le faisait l'ancien minuteur maison.
  const itemLongPress = useLongPress<HTMLDivElement>(() => onOpenWheel(item), pressDuration);
  // Le navigateur émet quand même un événement "click" natif juste après le
  // relâchement d'un VRAI swipe (Framer ne le supprime pas lui-même, à la
  // différence de son propre système de tap) — sans ce garde-fou, un swipe
  // qui bascule déjà l'article via handleDragEnd se ferait annuler aussitôt
  // par ce clic fantôme qui rebascule une seconde fois. Alimenté en direct
  // par onDrag (pas seulement dans handleDragEnd) car ce clic fantôme peut
  // arriver avant que handleDragEnd n'ait fini de s'exécuter.
  const lastDragDxRef = useRef(0);

  const handleDrag = (_event: DragEventParam, info: DragInfoParam) => { lastDragDxRef.current = info.offset.x; };

  const handleClick = () => {
    if (itemLongPress.wasLongPress()) return;
    if (Math.abs(lastDragDxRef.current) > SWIPE_COMMIT_PX) {
      lastDragDxRef.current = 0;
      return;
    }
    onToggle(item.id);
  };

  const handleDragEnd = (_event: DragEventParam, info: DragInfoParam) => {
    animate(x, 0, RELEASE_SPRING);
    const dx = info.offset.x;
    if (Math.abs(dx) <= SWIPE_COMMIT_PX) return;
    if (dx > 0) { triggerHaptic(15); onToggle(item.id); }
    else if (onDelete) { triggerHaptic(20); onDelete(item.id); }
  };

  return (
    <motion.li
      layout={!prefersReducedMotion}
      initial={false}
      exit={prefersReducedMotion ? { opacity: 0 } : EXIT_VARIANT}
      transition={prefersReducedMotion ? { duration: 0 } : EXIT_TRANSITION}
      className={checked ? "checked" : ""}
    >
      <div className="shopping-item-swipe">
        <div className="shopping-item-swipe-hint hint-check" aria-hidden="true"><Check size={16} /></div>
        {onDelete && <div className="shopping-item-swipe-hint hint-delete" aria-hidden="true"><Trash2 size={16} /></div>}
        <motion.div
          ref={itemLongPress.ref}
          className="shopping-item-content"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          {...itemLongPress.handlers}
        >
          <span className="checkbox-row" onClick={handleClick}>
            <span className="checkbox">{checked && <Check size={11} />}</span>
            <span>{item.qty > 0 ? `${Math.round(item.qty * 100) / 100}${item.unit ? ` ${translateRecipeText(item.unit, language)}` : ""} — ` : ""}{translateRecipeText(item.name, language)}</span>
          </span>
          {!checked && onAdjust && (
            <span className="qty-stepper">
              <motion.button
                type="button"
                whileTap={{ scale: 0.82 }}
                onClick={(e) => { e.stopPropagation(); onAdjust(item.id, -1); }}
                aria-label={`Diminuer la quantité de ${translateRecipeText(item.name, language)}`}
              >
                <Minus size={11} />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.82 }}
                onClick={(e) => { e.stopPropagation(); onAdjust(item.id, 1); }}
                aria-label={`Augmenter la quantité de ${translateRecipeText(item.name, language)}`}
              >
                <Plus size={11} />
              </motion.button>
            </span>
          )}
        </motion.div>
      </div>
    </motion.li>
  );
}

// Callbacks stables côté ShoppingView (useCallback dans useShoppingLists.js,
// ou des setState directs) et mise à jour immutable qui préserve la
// référence des articles NON modifiés (voir useShoppingLists.js, .map avec
// repli `: it`) — memo() peut donc réellement sauter le re-rendu d'un
// article quand un autre article de la liste change, plutôt que de
// re-rendre toute la liste à chaque frappe dans "Ajouter un article".
export default memo(ShoppingItemRow);
