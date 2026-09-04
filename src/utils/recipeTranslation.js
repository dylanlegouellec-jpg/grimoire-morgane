/* ------------------------------------------------------------------ */
/*  TRADUCTION "AU MIEUX" FR -> EN DES TEXTES DE RECETTE                */
/*  (titres, noms d'ingrédients, étapes)                                */
/*                                                                        */
/*  Il n'existe aucune vraie traduction automatique connectée à ce        */
/*  projet (pas d'API de traduction, pas de clé à gérer) — les titres,    */
/*  ingrédients et étapes sont du texte libre saisi par l'utilisateur,    */
/*  impossible à traduire parfaitement avec un simple dictionnaire.       */
/*  Ce qui suit est donc un repli VOLONTAIREMENT limité : un              */
/*  dictionnaire de correspondances FR -> EN pour le vocabulaire          */
/*  culinaire le plus courant (plats, ingrédients, techniques), appliqué  */
/*  par remplacement de la plus longue expression reconnue vers la plus   */
/*  courte. Tout ce qui n'est pas dans le dictionnaire reste affiché tel  */
/*  quel — un reste de français est préférable à un charabia mal traduit. */
/* ------------------------------------------------------------------ */

const CULINARY_FR_EN = [
  // Plats et desserts composés (du plus spécifique au plus général)
  ["tarte aux pommes", "apple tart"],
  ["tarte aux fraises", "strawberry tart"],
  ["tarte tatin", "tarte tatin"],
  ["pains au lait", "milk bread rolls"],
  ["pain au lait", "milk bread roll"],
  ["pain au chocolat", "chocolate croissant"],
  ["bûche de noël", "Christmas Yule log"],
  ["bûche", "Yule log"],
  ["crêpes", "crepes"],
  ["crêpe", "crepe"],
  ["galette des rois", "king cake"],
  ["galette", "galette"],
  ["quiche lorraine", "quiche Lorraine"],
  ["quiche", "quiche"],
  ["ratatouille", "ratatouille"],
  ["blanquette de veau", "veal blanquette"],
  ["pot au feu", "pot-au-feu"],
  ["pot-au-feu", "pot-au-feu"],
  ["boeuf bourguignon", "beef bourguignon"],
  ["bœuf bourguignon", "beef bourguignon"],
  ["poulet rôti", "roast chicken"],
  ["poulet basquaise", "Basque-style chicken"],
  ["gratin dauphinois", "potato gratin"],
  ["croque monsieur", "croque monsieur"],
  ["croque madame", "croque madame"],
  ["mousse au chocolat", "chocolate mousse"],
  ["île flottante", "floating island"],
  ["crème brûlée", "crème brûlée"],
  ["crème caramel", "crème caramel"],
  ["crème pâtissière", "pastry cream"],
  ["crème diplomate", "diplomat cream"],
  ["crème anglaise", "custard sauce"],
  ["pâte brisée", "shortcrust pastry"],
  ["pâte feuilletée", "puff pastry"],
  ["pâte sablée", "sweet shortcrust pastry"],
  ["biscuit madeleine", "madeleine sponge"],

  // Techniques / verbes courants (souvent en tête d'étape)
  ["préchauffer le four", "preheat the oven"],
  ["préchauffez le four", "preheat the oven"],
  ["laisser reposer", "let rest"],
  ["laissez reposer", "let rest"],
  ["laisser refroidir", "let cool"],
  ["laissez refroidir", "let cool"],
  ["laisser lever", "let rise"],
  ["laissez lever", "let rise"],
  ["porter à ébullition", "bring to a boil"],
  ["portez à ébullition", "bring to a boil"],
  ["faire fondre", "melt"],
  ["faites fondre", "melt"],
  ["faire revenir", "sauté"],
  ["faites revenir", "sauté"],
  ["faire cuire", "cook"],
  ["faites cuire", "cook"],
  ["saler et poivrer", "season with salt and pepper"],
  ["mélanger", "mix"],
  ["mélangez", "mix"],
  ["incorporer", "fold in"],
  ["incorporez", "fold in"],
  ["fouetter", "whisk"],
  ["fouettez", "whisk"],
  ["pétrir", "knead"],
  ["pétrissez", "knead"],
  ["verser", "pour"],
  ["versez", "pour"],
  ["ajouter", "add"],
  ["ajoutez", "add"],
  ["couper", "cut"],
  ["coupez", "cut"],
  ["éplucher", "peel"],
  ["épluchez", "peel"],
  ["assaisonner", "season"],
  ["assaisonnez", "season"],

  // Ingrédients courants
  ["farine", "flour"],
  ["beurre", "butter"],
  ["sucre glace", "icing sugar"],
  ["sucre roux", "brown sugar"],
  ["sucre vanillé", "vanilla sugar"],
  ["sucre", "sugar"],
  ["oeufs", "eggs"],
  ["œufs", "eggs"],
  ["oeuf", "egg"],
  ["œuf", "egg"],
  ["lait", "milk"],
  ["crème fraîche", "crème fraîche"],
  ["crème liquide", "heavy cream"],
  ["levure boulangère", "baker's yeast"],
  ["levure chimique", "baking powder"],
  ["levure", "yeast"],
  ["sel", "salt"],
  ["poivre", "pepper"],
  ["huile d'olive", "olive oil"],
  ["huile de tournesol", "sunflower oil"],
  ["huile", "oil"],
  ["ail", "garlic"],
  ["oignon", "onion"],
  ["échalote", "shallot"],
  ["carotte", "carrot"],
  ["pomme de terre", "potato"],
  ["tomate", "tomato"],
  ["citron", "lemon"],
  ["vanille", "vanilla"],
  ["chocolat noir", "dark chocolate"],
  ["chocolat au lait", "milk chocolate"],
  ["chocolat blanc", "white chocolate"],
  ["chocolat", "chocolate"],
  ["fromage râpé", "grated cheese"],
  ["fromage", "cheese"],
  ["poulet", "chicken"],
  ["boeuf", "beef"],
  ["bœuf", "beef"],
  ["porc", "pork"],
  ["saumon", "salmon"],
  ["persil", "parsley"],
  ["thym", "thyme"],
  ["laurier", "bay leaf"],
  ["cannelle", "cinnamon"],
  ["amandes", "almonds"],
  ["amande", "almond"],
  ["noisettes", "hazelnuts"],
  ["framboises", "raspberries"],
  ["framboise", "raspberry"],
  ["fraises", "strawberries"],
  ["fraise", "strawberry"],
  ["pommes", "apples"],
  ["pomme", "apple"],

  // Tournures qui traînent parfois dans le texte libre
  ["au four", "in the oven"],
  ["à feu doux", "over low heat"],
  ["à feu moyen", "over medium heat"],
  ["à feu vif", "over high heat"],
  ["four préchauffé", "preheated oven"],
];

// Triées une seule fois, de la plus longue expression vers la plus courte,
// pour qu'une entrée précise (ex. "pain au chocolat") ne soit jamais
// écrasée par une entrée plus générique testée avant elle (ex. "pain").
const SORTED_ENTRIES = [...CULINARY_FR_EN].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Frontières de mot "conscientes" des lettres accentuées (\b natif de JS
// ne considère que [A-Za-z0-9_] comme caractères de mot — une expression
// commençant ou finissant par une lettre accentuée, comme "œuf" ou
// "échalote", ne matcherait alors jamais en début/fin de phrase). \p{L}
// couvre correctement l'alphabet français avec le flag "u".
function buildEntryRegex(fr) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(fr)}(?![\\p{L}\\p{N}])`, "giu");
}

// Préserve la casse de la première lettre du texte d'origine trouvé — utile
// en tout début de phrase/titre : "Poulet rôti" -> "Roast chicken", pas
// "roast chicken".
function matchCase(replacement, original) {
  if (!original) return replacement;
  const firstChar = original.charAt(0);
  if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/* ------------------------------------------------------------------ */
/*  API PUBLIQUE                                                        */
/* ------------------------------------------------------------------ */

// Traduction "au mieux" d'un texte de recette (titre, nom d'ingrédient,
// texte d'étape, remarque...) — remplace les expressions culinaires
// reconnues par leur équivalent anglais, laisse tout le reste inchangé.
// N'agit QUE si `language === "en"` : en français, retourne le texte tel
// quel, sans aucun coût de calcul.
export function translateRecipeText(text, language) {
  if (language !== "en" || !text) return text;
  let result = String(text);
  for (const [fr, en] of SORTED_ENTRIES) {
    result = result.replace(buildEntryRegex(fr), (match) => matchCase(en, match));
  }
  return result;
}

export { CULINARY_FR_EN };
