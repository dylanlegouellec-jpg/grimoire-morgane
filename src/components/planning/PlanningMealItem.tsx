import { useState, type PointerEvent } from "react";
import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import useLongPress from "../../hooks/useLongPress";
import MealOptionsModal from "./MealOptionsModal";

const LONG_PRESS_DURATION_MS = 500;

// Contrat minimal partagé par toute la chaîne planning/ — PlanningView.jsx
// (pas encore migré) enrichit ses entrées avec des champs supplémentaires
// (recette jointe, libellés...), mais seul `id` est réellement lu à
// l'intérieur de ces composants de présentation : le reste transite via
// `labelForEntry`/callbacks, jamais déstructuré ici.
export interface MealEntryLike {
  id: string;
}

interface PlanningMealItemProps {
  entry: MealEntryLike;
  bulleted: boolean;
  label: string;
  reorderMode: boolean;
  onCommitOrder: () => void;
  onEdit: (entry: MealEntryLike) => void;
  onDelete: (entry: MealEntryLike) => void;
}

/* ------------------------------------------------------------------ */
/*  LIGNE D'UN PLAT DANS LE PLAN (voir PlanningView.jsx) — extraite en   */
/*  composant séparé plutôt qu'inline dans le .map() du groupe :          */
/*  useLongPress ET useDragControls sont des hooks, ils ne peuvent pas      */
/*  être appelés un nombre de fois variable dans une boucle (même raison     */
/*  que MemberRow/HouseholdRow dans HouseholdManagerModal.jsx, même geste).   */
/*  Plus de croix de suppression sur la ligne elle-même : l'appui long        */
/*  ouvre un menu (Modifier/Supprimer, voir MealOptionsModal.jsx) — geste      */
/*  déjà utilisé pour les recettes/membres du foyer ailleurs dans l'app.       */
/*  Le type de plat (icône + libellé) ne s'affiche plus ici : il est            */
/*  maintenant porté par l'en-tête du sous-groupe qui entoure ces lignes         */
/*  (voir PlanningView.jsx, groupEntriesByCourse) — cette ligne ne montre        */
/*  plus que le nom de la recette.                                                */
/*                                                                                  */
/*  Cette ligne EST directement un <Reorder.Item> (voir PlanningMealItemsList.jsx, */
/*  qui rend le <Reorder.Group> englobant) — pas un wrapper séparé autour d'un       */
/*  contenu figé : Framer a besoin de mesurer CET élément précis pour animer            */
/*  sa position (et celle de ses voisins) pendant le glissement.                          */
/*  "dragListener={false}" + `dragControls` géré ici : seule la poignée (⋮⋮,               */
/*  visible seulement en mode réorganisation, voir `reorderMode`) démarre un                 */
/*  glissement via `dragControls.start(e)` — jamais un simple tap n'importe où sur             */
/*  la ligne, qui doit rester libre pour l'appui long (menu Modifier/Supprimer) et               */
/*  le clic normal, sans jamais déclencher de glissement par erreur.                               */
/* ------------------------------------------------------------------ */
export default function PlanningMealItem({ entry, bulleted, label, reorderMode, onCommitOrder, onEdit, onDelete }: PlanningMealItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const itemLongPress = useLongPress<HTMLDivElement>(() => setShowOptions(true), LONG_PRESS_DURATION_MS);
  const dragControls = useDragControls();

  const closeOptions = () => {
    setShowOptions(false);
    itemLongPress.resetPressState();
  };

  const startDrag = (e: PointerEvent<HTMLButtonElement>) => {
    triggerHaptic(15);
    dragControls.start(e);
  };

  return (
    <>
      <Reorder.Item
        value={entry}
        as={bulleted ? "li" : "div"}
        className={bulleted ? "planning-course-item" : "planning-meal-flat-item"}
        dragListener={false}
        dragControls={dragControls}
        // Un seul appel, au relâchement — voir le commentaire de fichier de
        // PlanningMealItemsList.jsx pour pourquoi jamais pendant le
        // glissement lui-même (retour haptique + écriture partagée du foyer
        // à chaque appel de onReorder côté hooks/useMealPlan.js — dont le
        // retour haptique côté "fin de glissement", pas besoin de le
        // dupliquer ici).
        onDragEnd={onCommitOrder}
      >
        <div className="planning-meal-item-row">
          {reorderMode && (
            <button
              type="button"
              className="planning-meal-drag-handle"
              aria-label="Glisser pour réordonner"
              onPointerDown={startDrag}
            >
              <GripVertical size={16} />
            </button>
          )}
          <div
            ref={itemLongPress.ref}
            className={`planning-meal-item press-anim press-${itemLongPress.pressState}`}
            onClick={() => { itemLongPress.wasLongPress(); }}
            {...itemLongPress.handlers}
          >
            <span className="planning-meal-recipe">{label}</span>
          </div>
        </div>
      </Reorder.Item>

      <AnimatePresence>
        {showOptions && (
          <MealOptionsModal
            label={label}
            onClose={closeOptions}
            onEdit={() => {
              closeOptions();
              // Contrairement à "Supprimer" ci-dessous (qui ne rouvre rien),
              // "Modifier" referme ce menu ET ouvre AUSSITÔT l'assistant en
              // mode édition (voir AddMealModal.jsx, prop `editEntry`) — deux
              // modales synchrones, l'une remplaçant l'autre plutôt que
              // s'empilant. Chacune pousse/dépile sa propre entrée d'historique
              // (voir hooks/useFocusTrap.js) : fermer celle-ci appelle
              // history.back() de façon ASYNCHRONE (le popstate ne part qu'au
              // tick suivant), alors qu'ouvrir la suivante dans la MÊME passe
              // synchrone appellerait history.pushState() AVANT que ce retour
              // n'ait eu lieu — la nouvelle entrée s'empile alors sur l'ancienne
              // position au lieu de la remplacer, ce qui finit par faire
              // remonter une fermeture ultérieure trop loin dans l'historique
              // (jusqu'à quitter l'app). Un setTimeout(0) laisse ce retour se
              // dérouler avant de pousser la nouvelle entrée.
              setTimeout(() => onEdit(entry), 0);
            }}
            onDelete={() => { closeOptions(); onDelete(entry); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
