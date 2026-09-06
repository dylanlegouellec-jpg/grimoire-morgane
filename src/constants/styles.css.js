/* ------------------------------------------------------------------ */
/*  CSS — styles isolés du Grimoire de Morgane                         */
/*  Injecté via <style>{CSS}</style> dans le composant principal.      */
/*                                                                      */
/*  Ce fichier n'est plus qu'un assembleur : le CSS lui-même vit dans   */
/*  src/constants/styles/*.css.js, découpé par domaine (thème, recettes, */
/*  frigo, courses, planification, formulaire, modales, mode cuisine,   */
/*  responsive...) — un seul fichier de ~1700 lignes était devenu       */
/*  pénible à naviguer et fragile à éditer (plusieurs corruptions du    */
/*  template literal cette session, à chaque fois faute de repérer la   */
/*  bonne zone dans un mur de texte). Chaque section peut désormais     */
/*  être ouverte, relue et modifiée isolément.                          */
/*                                                                      */
/*  L'ORDRE de concaténation ci-dessous reproduit EXACTEMENT l'ordre    */
/*  des règles dans l'ancien fichier unique : en CSS, deux règles de     */
/*  même spécificité se départagent par leur ordre d'apparition (voir   */
/*  par ex. le commentaire sur .modal.recipe-picker-modal dans          */
/*  modalsBase.css.js) — changer cet ordre pourrait changer visuellement */
/*  quelle règle gagne la cascade. Ne pas réordonner ces imports.       */
/* ------------------------------------------------------------------ */
import { THEME_CSS } from "./styles/theme.css";
import { SHELL_CSS } from "./styles/shell.css";
import { RECIPE_CARDS_CSS } from "./styles/recipeCards.css";
import { FRIDGE_CSS } from "./styles/fridge.css";
import { SHOPPING_CSS } from "./styles/shopping.css";
import { MODALS_BASE_CSS } from "./styles/modalsBase.css";
import { HOUSEHOLD_CSS } from "./styles/household.css";
import { FORMS_CSS } from "./styles/forms.css";
import { MISC_CSS } from "./styles/misc.css";
import { COOKMODE_CSS } from "./styles/cookmode.css";
import { RESPONSIVE_CSS } from "./styles/responsive.css";
import { SETTINGS_IOS_CSS } from "./styles/settingsIos.css";
import { PLANNING_CSS } from "./styles/planning.css";

export const CSS = [
  THEME_CSS,
  SHELL_CSS,
  RECIPE_CARDS_CSS,
  FRIDGE_CSS,
  SHOPPING_CSS,
  MODALS_BASE_CSS,
  HOUSEHOLD_CSS,
  FORMS_CSS,
  MISC_CSS,
  COOKMODE_CSS,
  RESPONSIVE_CSS,
  SETTINGS_IOS_CSS,
  PLANNING_CSS,
].join("\n");
