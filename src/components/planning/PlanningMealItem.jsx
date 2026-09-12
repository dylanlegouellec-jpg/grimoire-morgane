import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { GripVertical } from "lucide-react";
import useLongPress from "../../hooks/useLongPress";
import MealOptionsModal from "./MealOptionsModal";

const LONG_PRESS_DURATION_MS = 500;

/* ------------------------------------------------------------------ */
/*  LIGNE D'UN PLAT DANS LE PLAN (voir PlanningView.jsx) — extraite en   */
/*  composant séparé plutôt qu'inline dans le .map() du groupe :          */
/*  useLongPress est un hook, il ne peut pas être appelé un nombre de      */
/*  fois variable dans une boucle (même raison que MemberRow/HouseholdRow */
/*  dans HouseholdManagerModal.jsx, même geste).                           */
/*  Plus de croix de suppression sur la ligne elle-même : l'appui long      */
/*  ouvre un menu (Modifier/Supprimer, voir MealOptionsModal.jsx) — geste    */
/*  déjà utilisé pour les recettes/membres du foyer ailleurs dans l'app.     */
/*  Le type de plat (icône + libellé) ne s'affiche plus ici : il est          */
/*  maintenant porté par l'en-tête du sous-groupe qui entoure ces lignes       */
/*  (voir PlanningView.jsx, groupEntriesByCourse) — cette ligne ne montre     */
/*  plus que le nom de la recette.                                            */
/*  Poignée de glisser-déposer (⋮⋮) : visible seulement en mode              */
/*  réorganisation (voir `reorderMode`, PlanningView.jsx) — un élément à       */
/*  PART de la ligne à appui long ci-dessous (pas nichée dedans), puisque       */
/*  le glissement se pilote via ses propres gestionnaires pointer (voir         */
/*  `dragHandleProps`, hooks/useDragReorder.js), indépendants du minuteur        */
/*  d'appui long de la ligne. Placée à GAUCHE du nom du plat (pas à droite) :    */
/*  plus lisible, et cohérent avec la convention "poignée avant contenu" des      */
/*  listes réordonnables (ex. Réglages iOS, Reminders).                          */
/* ------------------------------------------------------------------ */
export default function PlanningMealItem({ entry, label, reorderMode, dragHandleProps, onEdit, onDelete }) {
  const [showOptions, setShowOptions] = useState(false);
  const itemLongPress = useLongPress(() => setShowOptions(true), LONG_PRESS_DURATION_MS);

  const closeOptions = () => {
    setShowOptions(false);
    itemLongPress.resetPressState();
  };

  return (
    <>
      <div className="planning-meal-item-row">
        {reorderMode && (
          <button type="button" className="planning-meal-drag-handle" aria-label="Glisser pour réordonner" {...dragHandleProps}>
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
