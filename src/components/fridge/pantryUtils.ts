import { Beef, Carrot, Droplet, Milk, Wheat } from "lucide-react";
import { ingredientKey } from "../../utils/helpers";
import type { LucideIcon } from "lucide-react";
import type { Recipe } from "../../hooks/useRecipes";

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
// "d[e'’]" (pas juste "d[e']") : couvre aussi bien l'apostrophe droite que
// l'apostrophe courbe — celle que la correction automatique iOS/Android
// insère par défaut ("gousse d'ail" devient "gousse d'ail" à l'affichage,
// mais PAS le même caractère Unicode) — sans les deux, "gousse d'ail" tapé
// depuis un téléphone échappait déjà à ce nettoyage.
const LEADING_MEASURE_PREFIX = /^(c\.?\s?à\.?\s?s\.?|càs|cas|c\.?\s?à\.?\s?c\.?|cc|gousses?|sachets?|pinc[ée]es?|verres?|tasses?|tranches?|bottes?|cuill[eè]res?(\s+à\s+(soupe|caf[ée]))?)\s+d[e'’]\s*/i;
// Résidu de préposition française isolé (sans mot de mesure devant) —
// typiquement "d'eau" ou "de sucre" laissé tel quel par un parseur de
// texte libre qui n'a pas su séparer la préposition du reste.
const LEADING_PREPOSITION = /^d['’]|^de\s+/i;

function stripLeadingMeasure(name: string): string {
  return name.replace(LEADING_MEASURE_PREFIX, "").replace(LEADING_PREPOSITION, "").trim();
}

// Note/qualificatif entre parenthèses ("(facultatif)", "(au choix)",
// "(bœuf ou mélange bœuf/porc)"...) : jamais le nom réel de l'ingrédient,
// juste une précision annexe — retirée AVANT toute autre étape. Sans ça,
// une même précision répétée sur deux recettes ("Œufs (bio)" / "Œufs (à
// température ambiante)") produisait deux options de frigo distinctes pour
// un seul ingrédient réel, et un mot comme "bœuf" niché dans la parenthèse
// pouvait accidentellement faire "matcher" une tout autre catégorie que la
// viande (voir FRIDGE_CATEGORIES plus bas).
function stripParenthetical(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

// "Beurre" et pas "beurre" / "BEURRE" : seule la première lettre est
// capitalisée (convention française pour un nom commun, contrairement à
// l'anglais qui capitaliserait chaque mot).
function toDisplayCase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Déclinaisons courantes -> nom canonique unique affiché comme option du
// frigo. Chaque motif est testé sur le nom déjà débarrassé de son préfixe
// de mesure — la première correspondance gagne, du plus spécifique au
// plus générique pour éviter qu'un nom générique n'avale un cas
// particulier qui mériterait sa propre entrée.
interface CanonicalIngredient {
  test: RegExp;
  label: string;
}

const CANONICAL_INGREDIENTS: CanonicalIngredient[] = [
  { test: /^beurre\b/i, label: "Beurre" },
  // Pas de "$" final (contrairement à avant) : une déclinaison comme
  // "Œufs extra-frais" ou "Œufs bio" doit fusionner avec "Œufs" au lieu de
  // rester une option à part — seul un vrai qualificatif de format ("Jaunes
  // d'œuf"/"Blancs d'œuf") mérite encore un test dédié, tout le reste après
  // "œuf(s)" est une précision annexe, pas un ingrédient différent.
  // Même remarque sur l'apostrophe courbe que LEADING_MEASURE_PREFIX
  // ci-dessus : "Blancs d'œuf" tapé depuis un téléphone (apostrophe
  // courbe) échappait sinon à la fusion vers "Œufs".
  { test: /(jaunes?|blancs?)\s+d[e'’]\s*(oeuf|œuf)s?|^(oeuf|œuf)s?\b/i, label: "Œufs" },
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
  { test: /^colorant\b/i, label: "Colorant" },
  // Bac large, en dernier : qu'elle vienne d'une gousse, d'un extrait ou
  // d'une fiche mal saisie ("Ousse de vanille", coquille pour "Gousse de
  // vanille"), toute mention de vanille devient une seule et même option —
  // c'est la précision (gousse/extrait/poudre) qui est ici jugée superflue
  // pour une case à cocher "j'en ai dans mon frigo", pas l'ingrédient
  // lui-même.
  { test: /vanille/i, label: "Vanille" },
];

// Point d'entrée unique de normalisation — retire les parenthèses et
// préfixes de mesure parasites, fusionne les déclinaisons connues vers un
// nom canonique, et harmonise la casse pour celles qui n'ont pas de règle
// dédiée.
export function normalizeIngredientLabel(rawName?: string | null): string {
  const withoutParens = stripParenthetical(String(rawName || ""));
  const stripped = stripLeadingMeasure(withoutParens);
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

function isIgnoredIngredient(label: string): boolean {
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
interface FridgeCategory {
  key: string;
  label: string;
  icon: string;
  vectorIcon: LucideIcon;
  test: RegExp;
}

export const FRIDGE_CATEGORIES: FridgeCategory[] = [
  {
    key: "frais", label: "Frais & Crèmerie", icon: "🧀", vectorIcon: Milk,
    // "(?<!b)" exclut "bœuf"/"boeuf" : ces mots CONTIENNENT littéralement
    // "œuf"/"oeuf" (b-œuf), un pur hasard orthographique qui faisait
    // classer toute viande de bœuf dans "Frais & Crèmerie" au lieu de
    // "Viandes & Poissons" (la catégorie testée juste après ne s'exécutait
    // jamais, la première correspondance l'emportant toujours).
    test: /beurre|crème|lait|(?<!b)(oeuf|œuf)|fromage|yaourt|parmesan|gruyère|mascarpone|mozzarella|comté/i,
  },
  {
    key: "fruits-legumes", label: "Fruits & Légumes", icon: "🥦", vectorIcon: Carrot,
    // "\bail\b" (double frontière, pas juste finale) : "ail" seul en fin de
    // mot matchait aussi "corail" (comme dans "lentilles corail") ou
    // "détail", qui n'ont rien à voir avec la gousse d'ail.
    test: /oignon|\bail\b|carotte|tomate|pomme|citron|herbe|persil|basilic|thym|laurier|échalote|poireau|courgette|champignon|salade|pêche|fraise|orange|banane|aubergine|poivron|céleri|chou|radis|artichaut|avocat|mangue|raisin|abricot|framboise|myrtille|betterave|endive|navet|brocoli|épinard/i,
  },
  {
    key: "viandes-poissons", label: "Viandes & Poissons", icon: "🥩", vectorIcon: Beef,
    // "viande" en toutes lettres, pas seulement les espèces citées : une
    // "Viande hachée" générique (sans précision bœuf/porc, ou dont la
    // précision a été retirée par stripParenthetical) doit atterrir ici,
    // pas dans "Épicerie & Placard" par défaut faute de meilleur candidat.
    test: /poulet|boeuf|bœuf|porc|veau|agneau|viande|lardon|jambon|poisson|saumon|crevette|canard|thon|cabillaud|dinde|chorizo|merguez|andouille|bacon|saucisse/i,
  },
  {
    key: "epices", label: "Épices, Huiles & Condiments", icon: "🧂", vectorIcon: Droplet,
    test: /^sel\b|poivre|huile|vinaigre|moutarde|épice|cannelle|paprika|cumin|curry|piment|vanille|câpre|bouillon/i,
  },
  {
    key: "epicerie", label: "Épicerie & Placard", icon: "🌾", vectorIcon: Wheat,
    test: /farine|sucre|riz|pâtes?|lentille|pois chiche|quinoa|avoine|chocolat|miel|levure|confiture|pain|biscuit|conserve|amande|noisette|noix/i,
  },
];
const DEFAULT_FRIDGE_CATEGORY = "epicerie";

export function categorizeIngredient(label: string): string {
  const found = FRIDGE_CATEGORIES.find((c) => c.test.test(label));
  return found ? found.key : DEFAULT_FRIDGE_CATEGORY;
}

export interface PantryOption {
  key: string;
  label: string;
  category: string;
}

export function collectPantryOptions(recipes: Recipe[]): PantryOption[] {
  const seen = new Map<string, string>();
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      if ("isSection" in ing || !ing.name) return;
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
export function missingIngredients(recipe: Recipe, ownedSet: Set<string>) {
  return recipe.ingredients.filter((ing) => {
    if ("isSection" in ing || !ing.name) return false;
    const label = normalizeIngredientLabel(ing.name);
    if (isIgnoredIngredient(label)) return false; // jamais "manquant"
    return !ownedSet.has(ingredientKey(label));
  });
}
