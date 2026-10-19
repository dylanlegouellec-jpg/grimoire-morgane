import { translateRecipeText } from "./recipeTranslation";

/* ------------------------------------------------------------------ */
/*  UNITÉ DES PORTIONS — « pour 4 personnes » ou « pour 20 cookies »     */
/*                                                                        */
/*  Stockée dans `recipes.servings_unit` (texte libre) : `null` (ou vide)  */
/*  = « personnes », le comportement historique — une recette créée avant  */
/*  ce champ n'a donc rien à migrer. Sinon, l'unité est gardée TELLE QUE    */
/*  SAISIE (« cookies », « parts », « petits pots »...) et affichée après   */
/*  le nombre. La mise à l'échelle des quantités ne change pas : elle reste */
/*  proportionnelle au nombre, quelle que soit l'unité.                     */
/*                                                                        */
/*  Accord volontairement simple et prévisible :                          */
/*  - plus d'une portion : l'unité telle qu'écrite (« 20 cookies ») ;       */
/*  - une seule : chaque mot AVANT un mot de liaison (de, d', à, au, of...) */
/*    perd son pluriel final (« s », ou « x » après eau/au/eu) — « 1 cookie », */
/*    « 1 tranche de cake », « 1 petit pot », « 1 gâteau ». Rien d'autre : un  */
/*    mot écrit au singulier reste tel quel (« 20 cookie » si c'est ce qui a  */
/*    été tapé — les suggestions du formulaire sont donc au pluriel).         */
/* ------------------------------------------------------------------ */

/** Longueur maximale d'une unité (au-delà, tronquée à l'enregistrement). */
export const SERVINGS_UNIT_MAX_LENGTH = 24;

/** Bornes du nombre de portions : personnes (comme avant) / à l'unité. */
export const SERVINGS_MAX_PEOPLE = 24;
export const SERVINGS_MAX_UNITS = 99;

// Mots qui veulent dire « personnes » : ramenés à `null` (le défaut), pour
// qu'un import « 4 personnes » ou une saisie « pers. » ne crée pas une
// unité libre qui doublonnerait le mode Personnes.
const PEOPLE_WORDS = /^(personnes?|pers\.?|people|persons?|convives?|couverts?)$/;

/** Unité propre (espaces resserrés, longueur bornée), ou `null` pour « personnes ». */
export function normalizeServingsUnit(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const unit = raw.replace(/\s+/g, " ").trim().slice(0, SERVINGS_UNIT_MAX_LENGTH).trim();
  if (!unit) return null;
  if (PEOPLE_WORDS.test(unit.toLowerCase())) return null;
  return unit;
}

const LINK_WORDS = /^(de|d['’].*|du|des|à|a|au|aux|en|pour|of|for|per)$/i;

function singularWord(word: string): string {
  if (word.length > 3 && /(eau|au|eu)x$/i.test(word)) return word.slice(0, -1);
  if (word.length > 3 && /[^s]s$/i.test(word)) return word.slice(0, -1);
  return word;
}

/** L'unité accordée au nombre (voir la règle en tête de fichier). */
export function servingsUnitFor(unit: string, count: number): string {
  if (Number(count) > 1) return unit;
  const words = unit.split(" ");
  let linked = false;
  return words
    .map((w) => {
      if (linked) return w;
      if (LINK_WORDS.test(w)) { linked = true; return w; }
      return singularWord(w);
    })
    .join(" ");
}

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string;

/**
 * « 20 cookies » pour une recette à l'unité, `null` pour une recette en
 * personnes — l'appelant garde alors son propre texte (« 4 pers. »,
 * « 4 servings »...), inchangé. L'unité passe par translateRecipeText
 * (traduction « au mieux » du vocabulaire culinaire, sans effet en
 * français) : elle reste sinon telle que saisie.
 */
export function unitServingsText(
  t: TranslateFn,
  count: number,
  unit: unknown,
  language: string
): string | null {
  const word = unitWord(count, unit, language);
  return word ? t("servingsUnit.value", { count, unit: word }) : null;
}

/** Le seul mot d'unité accordé et traduit au mieux, ou `null` (personnes). */
export function unitWord(count: number, unit: unknown, language: string): string | null {
  const clean = normalizeServingsUnit(unit);
  if (!clean) return null;
  return translateRecipeText(servingsUnitFor(clean, count), language);
}
