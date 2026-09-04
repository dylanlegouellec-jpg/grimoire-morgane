import { ingredientKey } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  VUE MON FRIGO — utilitaires de gestion des basiques & du pantry    */
/*                                                                      */
/*  Les noms d'ingrédients viennent des recettes, saisies à la main ou   */
/*  importées depuis une fiche texte libre : sans nettoyage, "beurre      */
/*  pommade", "beurre fondu" et "càs de beurre" finissaient en TROIS       */
/*  options de frigo distinctes pour un seul ingrédient réel. Tout ce      */
/*  qui suit (normalizeIngredientLabel, catégorisation) passe par un       */
/*  point d'entrée unique pour que la liste d'options ET la vérification   */
/*  "cette recette est-elle réalisable ?" restent cohérentes entre elles.  */
/* ------------------------------------------------------------------ */

// Préfixes de mesure qui se retrouvent parfois concaténés DANS le nom de
// l'ingrédient lui-même (fiches importées depuis du texte libre, où le
// parseur n'a pas isolé l'unité dans son propre champ) plutôt que dans
// `ing.unit` — on les retire avant tout regroupement. "cas" couvre une
// abréviation courante de "cuillère à soupe" tapée à la volée (à ne pas
// confondre avec le mot "cas" — jamais suivi de "de" devant un ingrédient
// dans un vrai texte de recette).
const LEADING_MEASURE_PREFIX = /^(c\.?\s?à\.?\s?s\.?|càs|cas|c\.?\s?à\.?\s?c\.?|cc|gousses?|sachets?|pinc[ée]es?|verres?|tasses?|tranches?|bottes?|cuill[eè]res?(\s+à\s+(soupe|caf[ée]))?)\s+d[e']\s*/i;
// Résidu de préposition française isolé (sans mot de mesure devant) —
// typiquement "d'eau" ou "de sucre" laissé tel quel par un parseur de
// texte libre qui n'a pas su séparer la préposition du reste.
const LEADING_PREPOSITION = /^d['’]|^de\s+/i;

function stripLeadingMeasure(name) {
  return name.replace(LEADING_MEASURE_PREFIX, "").replace(LEADING_PREPOSITION, "").trim();
}

// "Beurre" et pas "beurre" / "BEURRE" : seule la première lettre est
// capitalisée (convention française pour un nom commun, contrairement à
// l'anglais qui capitaliserait chaque mot).
function toDisplayCase(name) {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Déclinaisons courantes -> nom canonique unique affiché comme option du
// frigo. Chaque motif est testé sur le nom déjà débarrassé de son préfixe
// de mesure — la première correspondance gagne, du plus spécifique au
// plus générique pour éviter qu'un nom générique n'avale un cas
// particulier qui mériterait sa propre entrée.
const CANONICAL_INGREDIENTS = [
  { test: /^beurre\b/i, label: "Beurre" },
  { test: /(jaunes?|blancs?)\s+d[e']\s*(oeuf|œuf)s?|^oeufs?$|^œufs?$/i, label: "Œufs" },
  { test: /^cr[eè]me\b/i, label: "Crème" },
  { test: /^farine\b/i, label: "Farine" },
  { test: /^sucre\b/i, label: "Sucre" },
  { test: /^lait\b(?!\s*de\s*coco)/i, label: "Lait" },
  { test: /^huile\b/i, label: "Huile" },
  { test: /^fromage\b/i, label: "Fromage" },
  { test: /^tomates?\b/i, label: "Tomate" },
  { test: /^oignons?\b/i, label: "Oignon" },
  { test: /^ail\b/i, label: "Ail" },
  { test: /^(pommes? de terre|patates?)\b/i, label: "Pomme de terre" },
  { test: /^chocolat\b/i, label: "Chocolat" },
  { test: /^citrons?\b/i, label: "Citron" },
  { test: /^pommes?\b(?!\s*de\s*terre)/i, label: "Pomme" },
];

// Point d'entrée unique de normalisation — retire les préfixes de mesure
// parasites, fusionne les déclinaisons connues vers un nom canonique, et
// harmonise la casse pour celles qui n'ont pas de règle dédiée.
export function normalizeIngredientLabel(rawName) {
  const stripped = stripLeadingMeasure(String(rawName || ""));
  if (!stripped) return "";
  const canonical = CANONICAL_INGREDIENTS.find((c) => c.test.test(stripped));
  return canonical ? canonical.label : toDisplayCase(stripped);
}

// L'eau (et ses déclinaisons de température : tiède, froide, chaude...)
// est une ressource toujours disponible, pas un ingrédient à cocher — y
// compris sous sa forme "d'eau"/"d'eau tiède" (préposition non détachée,
// voir LEADING_PREPOSITION ci-dessus — testée ici aussi en repli, au cas
// où un appelant passerait un nom brut sans passer par
// normalizeIngredientLabel). Ancrée avec $ pour ne PAS masquer une eau
// aromatisée bien réelle comme "Eau de rose" ou "Eau de fleur d'oranger"
// (un ingrédient à part entière, distinct de l'eau du robinet).
const IGNORED_INGREDIENT = /^(d['’]|de\s+)?eau(\s+(tiède|froide|chaude|bouillante|glacée|fraîche))?$/i;

function isIgnoredIngredient(label) {
  return IGNORED_INGREDIENT.test(label);
}

/* ------------------------------------------------------------------ */
/*  CATÉGORIES DU FRIGO (accordéons, voir FridgeView.jsx)               */
/*  Taxonomie propre au Frigo — distincte des rayons de courses           */
/*  (utils/helpers.js) : "conservation à la maison" plutôt que             */
/*  "parcours en magasin", donc pas de découpage Boissons/Hygiène ici,     */
/*  mais un rayon Épices/Huiles/Condiments qui n'a pas de sens au           */
/*  supermarché comme catégorie de courses à part entière.                 */
/* ------------------------------------------------------------------ */
export const FRIDGE_CATEGORIES = [
  {
    key: "frais", label: "Frais & Crèmerie", icon: "🧀",
    test: /beurre|crème|lait|oeuf|œuf|fromage|yaourt|parmesan|gruyère|mascarpone|mozzarella|comté/i,
  },
  {
    key: "fruits-legumes", label: "Fruits & Légumes", icon: "🥦",
    test: /oignon|ail\b|carotte|tomate|pomme|citron|herbe|persil|basilic|thym|laurier|échalote|poireau|courgette|champignon|salade|pêche|fraise|orange|banane|aubergine|poivron|céleri|chou|radis|artichaut|avocat|mangue|raisin|abricot|framboise|myrtille|betterave|endive|navet|brocoli|épinard/i,
  },
  {
    key: "viandes-poissons", label: "Viandes & Poissons", icon: "🥩",
    test: /poulet|boeuf|bœuf|porc|veau|agneau|lardon|jambon|poisson|saumon|crevette|canard|thon|cabillaud|dinde|chorizo|merguez|andouille|bacon|saucisse/i,
  },
  {
    key: "epices", label: "Épices, Huiles & Condiments", icon: "🧂",
    test: /^sel\b|poivre|huile|vinaigre|moutarde|épice|cannelle|paprika|cumin|curry|piment|vanille|câpre|bouillon/i,
  },
  {
    key: "epicerie", label: "Épicerie & Placard", icon: "🌾",
    test: /farine|sucre|riz|pâtes?|lentille|pois chiche|quinoa|avoine|chocolat|miel|levure|confiture|pain|biscuit|conserve|amande|noisette|noix/i,
  },
];
const DEFAULT_FRIDGE_CATEGORY = "epicerie";

export function categorizeIngredient(label) {
  const found = FRIDGE_CATEGORIES.find((c) => c.test.test(label));
  return found ? found.key : DEFAULT_FRIDGE_CATEGORY;
}

export function collectPantryOptions(recipes) {
  const seen = new Map();
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      if (ing.isSection || !ing.name) return;
      const label = normalizeIngredientLabel(ing.name);
      if (!label || isIgnoredIngredient(label)) return;
      const key = ingredientKey(label);
      if (key && !seen.has(key)) seen.set(key, label);
    });
  });
  return Array.from(seen.entries())
    .map(([key, label]) => ({ key, label, category: categorizeIngredient(label) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

// Utilise le même pipeline de normalisation que collectPantryOptions ci-
// dessus : sans ça, cocher l'option canonique "Beurre" dans le frigo ne
// suffirait pas à couvrir une recette dont l'ingrédient brut est "beurre
// fondu" (clé de normalisation différente si on comparait le texte brut).
export function missingIngredients(recipe, ownedSet) {
  return recipe.ingredients.filter((ing) => {
    if (ing.isSection || !ing.name) return false;
    const label = normalizeIngredientLabel(ing.name);
    if (isIgnoredIngredient(label)) return false; // jamais "manquant"
    return !ownedSet.has(ingredientKey(label));
  });
}
