import { useState } from "react";
import { useTranslation } from "../../contexts/LanguageContext";
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
/* ------------------------------------------------------------------ */
export default function PlanningMealItem({ entry, course, label, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const itemLongPress = useLongPress(() => setShowOptions(true), LONG_PRESS_DURATION_MS);

  const closeOptions = () => {
    setShowOptions(false);
    itemLongPress.resetPressState();
  };

  return (
    <>
      <div
        ref={itemLongPress.ref}
        className={`planning-meal-item press-anim press-${itemLongPress.pressState}`}
        onClick={() => { itemLongPress.wasLongPress(); }}
        {...itemLongPress.handlers}
      >
        {course && (
          <span className="planning-meal-course-icon" aria-hidden="true">{course.icon}</span>
        )}
        <span className="planning-meal-item-info">
          {course && (
            <span className="planning-meal-course-label">{t(`courseTypes.${course.key}`)}</span>
          )}
          <span className="planning-meal-recipe">{label}</span>
        </span>
      </div>

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
    </>
  );
}
