/* ------------------------------------------------------------------ */
/*  PLANIFICATION DES REPAS — utilitaires de semaine (lundi -> dimanche)  */
/*  Pas de librairie de dates (aucune dans les dépendances du projet) :   */
/*  tout ici repose sur l'API Date native, volontairement simple —        */
/*  une seule notion de "semaine" (le lundi qui la commence) sert de       */
/*  pivot pour la navigation ET pour regrouper les entrées du plan.        */
/* ------------------------------------------------------------------ */

export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const MEAL_TYPES = [
  { key: "petit-dejeuner", label: "Petit-déjeuner", icon: "🌅" },
  { key: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { key: "diner", label: "Dîner", icon: "🌙" },
  { key: "encas", label: "En-cas", icon: "🍪" },
];
const MEAL_TYPE_BY_KEY = MEAL_TYPES.reduce((acc, m) => { acc[m.key] = m; return acc; }, {});
export function mealTypeInfo(key) {
  return MEAL_TYPE_BY_KEY[key] || MEAL_TYPES[0];
}

// TYPE DE PLAT — dimension distincte du MOMENT du repas ci-dessus (on peut
// avoir une "Entrée" comme un "Plat" au Dîner) : choisie à côté du moment,
// à l'étape "Quel repas ?" de AddMealModal.jsx. "plat" par défaut
// (DEFAULT_COURSE_TYPE) — le cas le plus courant, pour ne pas obliger à
// changer le sélecteur à chaque ajout.
export const COURSE_TYPES = [
  { key: "aperitif", label: "Apéro", icon: "🍸" },
  { key: "entree", label: "Entrée", icon: "🥗" },
  { key: "plat", label: "Plat", icon: "🍲" },
  { key: "dessert", label: "Dessert", icon: "🍰" },
];
export const DEFAULT_COURSE_TYPE = "plat";
const COURSE_TYPE_BY_KEY = COURSE_TYPES.reduce((acc, c) => { acc[c.key] = c; return acc; }, {});
export function courseTypeInfo(key) {
  return COURSE_TYPE_BY_KEY[key] || COURSE_TYPE_BY_KEY[DEFAULT_COURSE_TYPE];
}
// Moments pour lesquels le type de plat a un sens (on ne mange pas une
// "Entrée" ou un "Dessert" au petit-déjeuner ou en en-cas) : le sélecteur
// de type de plat n'a donc d'effet que pour ceux-ci — voir AddMealModal.jsx
// (rien n'est enregistré pour les autres moments) et PlanningView.jsx
// (rien n'est affiché sur leur carte, même sur d'éventuelles anciennes
// entrées qui auraient une valeur stockée).
export const COURSE_TYPE_MEAL_KEYS = ["dejeuner", "diner"];
export function mealTypeHasCourse(mealTypeKey) {
  return COURSE_TYPE_MEAL_KEYS.includes(mealTypeKey);
}

// Lundi 00:00 de la semaine contenant `date`.
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const isoDay = d.getDay() === 0 ? 7 : d.getDay(); // 1 = lundi ... 7 = dimanche
  d.setDate(d.getDate() - (isoDay - 1));
  return d;
}

export function addWeeks(weekStart, delta) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

// Locale Intl à partir de la langue de l'app ("fr" | "en" — voir
// contexts/LanguageContext.jsx) : les fonctions ci-dessous acceptaient un
// "fr-FR" figé, ce qui gardait les dates en français même une fois la
// langue basculée sur l'anglais dans les Réglages.
export function localeFor(language) {
  return language === "en" ? "en-US" : "fr-FR";
}

// "31 août - 06 sept. 2026" (ou "28 déc. 2026 - 03 janv. 2027" à cheval
// sur deux années — l'année n'est alors précisée qu'une fois si elle est
// commune aux deux bornes, sinon aux deux).
export function formatWeekRange(weekStart, language) {
  const locale = localeFor(language);
  const days = getWeekDays(weekStart);
  const start = days[0];
  const end = days[6];
  const sameYear = start.getFullYear() === end.getFullYear();
  const fmt = (d, withYear) =>
    new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: withYear ? "numeric" : undefined }).format(d);
  return `${fmt(start, !sameYear)} - ${fmt(end, true)}`;
}

// "lundi 31 août" — utilisé comme titre de chaque jour dans la vue
// chronologique (voir PlanningView.jsx) : le nom du jour seul ne suffisait
// pas à distinguer, par exemple, "lundi" cette semaine de "lundi" la
// semaine prochaine une fois qu'on a navigué.
export function formatDayLabel(date, language) {
  return new Intl.DateTimeFormat(localeFor(language), { weekday: "long", day: "numeric", month: "long" }).format(date);
}
