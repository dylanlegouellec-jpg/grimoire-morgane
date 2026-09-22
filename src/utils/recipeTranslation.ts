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

const CULINARY_FR_EN: [string, string][] = [
  // Recettes précises de la base (titres exacts, entrées prioritaires —
  // triées avant tout par longueur ci-dessous, donc pas besoin de les
  // ordonner à la main ici).
  ["danettes à la vanilla", "Vanilla Danettes"],
  ["danettes au chocolate", "Chocolate Danettes"],
  ["empanada à la viande", "Meat Empanada"],
  ["far breton de grand mamie monique", "Monique's Breton Far"],
  ["gâteau au chocolate et à la courgette", "Chocolate & Zucchini Cake"],
  ["moelleux au chocolate", "Chocolate Lava Cake"],
  ["marbré au chocolate", "Chocolate Marble Cake"],
  ["sablé breton", "Breton Shortbread"],
  ["samoussas au beef", "Beef Samosas"],

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
  ["crèmes brûlées", "Crème Brûlée"],
  ["crème brûlée", "Crème Brûlée"],
  ["crème caramel", "Crème Caramel"],
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
  ["laisser mijoter", "let simmer"],
  ["laissez mijoter", "let simmer"],
  ["mijoter", "simmer"],
  ["creuser un puits", "make a well"],
  ["creusez un puits", "make a well"],
  ["foncer un moule", "line a pan"],
  ["foncez un moule", "line a pan"],
  ["foncer", "line"],
  ["foncez", "line"],
  ["battre", "beat"],
  ["battez", "beat"],
  ["couvrir", "cover"],
  ["couvrez", "cover"],
  ["répartir", "spread"],
  ["répartissez", "spread"],
  ["frotter", "rub"],
  ["frottez", "rub"],
  ["enfourner", "put in the oven"],
  ["enfournez", "put in the oven"],
  ["arroser", "baste"],
  ["arrosez", "baste"],
  ["saupoudrer", "sprinkle"],
  ["saupoudrez", "sprinkle"],
  ["étaler", "roll out"],
  ["étalez", "roll out"],
  ["façonner", "shape"],
  ["façonnez", "shape"],
  ["délayer", "mix in"],
  ["délayez", "mix in"],
  ["tournant", "folding"],
  ["tourner", "turn"],
  ["tournez", "turn"],
  ["écrasé", "crushed"],
  ["écrasée", "crushed"],
  ["dorés", "golden"],
  ["dorées", "golden"],
  ["en dés", "into cubes"],

  // Unités de mesure — ces valeurs viennent du champ "unit" d'un
  // ingrédient (voir UNIT_OPTIONS, RecipeForm.jsx), affiché À CÔTÉ du nom
  // traduit ci-dessous mais jamais traduit lui-même avant ce correctif
  // (voir RecipeDetail.jsx/CookMode.jsx/ShoppingItemRow.jsx, désormais
  // passés eux aussi par translateRecipeText). Formes abrégées ET
  // épelées : un import texte/lien (voir RecipeLinkImportModal.jsx) ne
  // respecte pas forcément la liste fermée du formulaire.
  ["cuillères à soupe", "tablespoons"],
  ["cuillère à soupe", "tablespoon"],
  ["cuillères à café", "teaspoons"],
  ["cuillère à café", "teaspoon"],
  ["c. à soupe", "tbsp"],
  ["c. à café", "tsp"],
  ["gousses d'ail", "cloves of garlic"],
  ["gousse d'ail", "clove of garlic"],
  ["gousses", "cloves"],
  ["gousse", "clove"],
  ["pincées", "pinches"],
  ["pincée", "pinch"],
  ["pièces", "pieces"],
  ["pièce", "piece"],
  ["bottes", "bunches"],
  ["botte", "bunch"],
  ["sachets", "packets"],
  ["sachet", "packet"],
  ["unité", "unit"],

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
  ["eau", "water"],
  ["crème fraîche", "crème fraîche"],
  ["crème liquide", "heavy cream"],
  ["crème fleurette", "heavy cream"],
  // Pas de repli générique "crème" -> "cream" : entrerait en collision avec
  // les noms de desserts ci-dessus qui gardent délibérément "Crème" tel
  // quel (Crème Brûlée, Crème Caramel — déjà des mots adoptés tels quels en
  // anglais culinaire) — un remplacement plus court, testé après eux (voir
  // le tri par longueur), les re-matcherait et les casserait ("Crème
  // Brûlée" -> "Cream Brûlée"). "Crème" seule (sans qualificatif) reste
  // donc affichée telle quelle, comme "crème fraîche" ci-dessus.
  ["lardons", "bacon lardons"],
  ["lardon", "bacon lardon"],
  ["légumes", "vegetables"],
  ["légume", "vegetable"],
  ["courgettes", "zucchini"],
  ["courgette", "zucchini"],
  ["jaunes d'œufs", "egg yolks"],
  ["jaunes d'oeufs", "egg yolks"],
  ["jaune d'œuf", "egg yolk"],
  ["jaune d'oeuf", "egg yolk"],
  ["blancs d'œufs", "egg whites"],
  ["blancs d'oeufs", "egg whites"],
  ["blanc d'œuf", "egg white"],
  ["blanc d'oeuf", "egg white"],
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
  ["herbes", "herbs"],
  ["herbe", "herb"],
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
  ["façon", "style"],
  ["au four", "in the oven"],
  ["à feu doux", "over low heat"],
  ["à feu moyen", "over medium heat"],
  ["à feu vif", "over high heat"],
  ["four préchauffé", "preheated oven"],

  // Adverbes/connecteurs SANS risque de casser l'ordre des mots (un mot
  // isolé qui se substitue à un autre mot isolé, jamais une réorganisation
  // de la phrase) — volontairement limité à ceux-ci : le reste de la
  // grammaire française (articles, prépositions comme "à"/"en" très
  // polysémiques, ordre adjectif/nom...) resterait faux même traduit mot à
  // mot, et un français correct reste préférable à un charabia anglais
  // mal ordonné (voir le commentaire de fichier en tête).
  ["généreusement", "generously"],
  ["régulièrement", "regularly"],
  ["progressivement", "gradually"],
  ["ensemble", "together"],
  ["puis", "then"],
  ["environ", "about"],
  // Prépositions à correspondance stable dans ce contexte (jamais "pour",
  // qui entrerait en collision avec le "pour" anglais déjà utilisé comme
  // traduction de "verser"/"versez" ci-dessus — un mot français ajouté ici
  // ne doit jamais réutiliser un mot anglais déjà produit ailleurs dans ce
  // dictionnaire, sous peine d'un second remplacement en cascade).
  ["dans", "in"],
  ["avec", "with"],
  ["sur", "on"],
  ["au", "with"],
  ["aux", "with"],
];

// Triées une seule fois, de la plus longue expression vers la plus courte,
// pour qu'une entrée précise (ex. "pain au chocolat") ne soit jamais
// écrasée par une entrée plus générique testée avant elle (ex. "pain").
const SORTED_ENTRIES = [...CULINARY_FR_EN].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Frontières de mot "conscientes" des lettres accentuées (\b natif de JS
// ne considère que [A-Za-z0-9_] comme caractères de mot — une expression
// commençant ou finissant par une lettre accentuée, comme "œuf" ou
// "échalote", ne matcherait alors jamais en début/fin de phrase). \p{L}
// couvre correctement l'alphabet français avec le flag "u".
function buildEntryRegex(fr: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(fr)}(?![\\p{L}\\p{N}])`, "giu");
}

// Préserve la casse de la première lettre du texte d'origine trouvé — utile
// en tout début de phrase/titre : "Poulet rôti" -> "Roast chicken", pas
// "roast chicken".
function matchCase(replacement: string, original: string): string {
  if (!original) return replacement;
  const firstChar = original.charAt(0);
  if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// Tournure très courante dans les titres de recettes familiales ("Crêpes
// de maman", "Tarte de mamie") — un simple remplacement mot à mot la
// traduirait dans le mauvais ordre ("Crepes of mom" au lieu de "Mom's
// Crepes"). Repéré et réordonné à part, AVANT le remplacement du
// dictionnaire ci-dessus (qui traduira ensuite "Crêpes" normalement).
const POSSESSIVE_NAMES: Record<string, string> = {
  maman: "Mom's",
  papa: "Dad's",
  mamie: "Grandma's",
  "mémé": "Grandma's",
  meme: "Grandma's",
  "grand-mère": "Grandma's",
  "grand-maman": "Grandma's",
  papi: "Grandpa's",
  "pépé": "Grandpa's",
  pepe: "Grandpa's",
  "grand-père": "Grandpa's",
  "grand-papa": "Grandpa's",
};
const POSSESSIVE_RE = new RegExp(
  `^(.*?)\\s+de\\s+(${Object.keys(POSSESSIVE_NAMES).sort((a, b) => b.length - a.length).join("|")})\\s*$`,
  "i"
);
function applyPossessiveRewrite(text: string): string {
  const m = text.match(POSSESSIVE_RE);
  if (!m || !m[1].trim()) return text;
  const possessive = POSSESSIVE_NAMES[m[2].toLowerCase()];
  return `${possessive} ${m[1].trim()}`;
}

// Élisions "l'"/"d'" ("le/la"/"de" devant une voyelle ou un h muet — de
// très loin les deux plus fréquentes dans un texte de recette, les autres
// comme "n'"/"j'"/"qu'" n'y apparaissent quasiment jamais). Développées
// APRÈS le remplacement du dictionnaire ci-dessus, jamais avant : une
// entrée composée qui contient elle-même une élision ("huile d'olive")
// doit d'abord matcher telle quelle. Sans ce second passage, l'apostrophe
// reste collée telle quelle au mot anglais qui la suit ("d'ail" -> "d'garlic"
// au lieu de "of garlic") — un résidu plus étrange qu'utile, alors que
// "l'"/"d'" eux-mêmes n'ont pas leur place dans un dictionnaire de mots
// entiers (le mot qui suit une élision n'a par nature jamais de frontière
// non-lettre juste après l'apostrophe, voir buildEntryRegex ci-dessus).
const ELISION_EXPANSIONS: Record<string, string> = { l: "the", d: "of" };
const ELISION_RE = /\b([ld])['’](?=\p{L})/giu;
function expandElisions(text: string): string {
  return text.replace(ELISION_RE, (_match, article) => {
    const expansion = ELISION_EXPANSIONS[article.toLowerCase()];
    const isUpper = article === article.toUpperCase() && article !== article.toLowerCase();
    return (isUpper ? expansion.charAt(0).toUpperCase() + expansion.slice(1) : expansion) + " ";
  });
}

/* ------------------------------------------------------------------ */
/*  API PUBLIQUE                                                        */
/* ------------------------------------------------------------------ */

// Traduction "au mieux" d'un texte de recette (titre, nom d'ingrédient,
// texte d'étape, remarque...) — remplace les expressions culinaires
// reconnues par leur équivalent anglais, laisse tout le reste inchangé.
// N'agit QUE si `language === "en"` : en français, retourne le texte tel
// quel, sans aucun coût de calcul.
export function translateRecipeText(text: string, language: string): string {
  if (language !== "en" || !text) return text;
  let result = applyPossessiveRewrite(String(text));
  for (const [fr, en] of SORTED_ENTRIES) {
    result = result.replace(buildEntryRegex(fr), (match) => matchCase(en, match));
  }
  return expandElisions(result);
}

export { CULINARY_FR_EN };
