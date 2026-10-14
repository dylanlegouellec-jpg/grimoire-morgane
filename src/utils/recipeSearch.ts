import { normalize } from "./helpers";
import type { Recipe } from "../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  RECHERCHE ET TRI DES RECETTES (grille)                             */
/*                                                                      */
/*  Recherche tolérante : sans accents ni majuscules (« creme » trouve */
/*  « Crème brûlée »), dans le titre ET les ingrédients (« poireau »   */
/*  trouve la quiche), mot par mot (« tarte pomme » trouve « Tarte aux */
/*  pommes »), et une petite faute de frappe passe (« chocolta »,       */
/*  « poulte ») : 1 lettre de différence dès 4 lettres, 2 dès 8.        */
/* ------------------------------------------------------------------ */

const splitWords = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Distance d'édition (insertion, suppression, remplacement, inversion de 2 lettres voisines), arrêtée dès qu'elle dépasse `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prevPrev[j - 2] + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (term: string) => (term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0);

/** Un mot cherché correspond à un mot de la recette : contenu dedans, ou presque identique (début du mot compris). */
function termMatchesWord(term: string, word: string): boolean {
  if (word.includes(term)) return true;
  const max = allowedTypos(term);
  if (!max) return false;
  if (editDistance(term, word, max) <= max) return true;
  // Mot en cours de frappe : « chocla » ~ début de « chocolat ».
  return word.length > term.length && editDistance(term, word.slice(0, term.length), max) <= max;
}

export interface SearchIndexEntry {
  text: string;
  words: string[];
}

/** Texte recherchable d'une recette : titre + noms des ingrédients (sans les titres de section). */
export function buildSearchEntry(recipe: Recipe): SearchIndexEntry {
  const parts = [recipe.title, ...recipe.ingredients.filter((i) => !("isSection" in i)).map((i) => ("name" in i ? i.name : ""))];
  const text = normalize(parts.join(" "));
  return { text, words: splitWords(parts.join(" ")) };
}

/** Termes de la recherche, normalisés. Vide = pas de recherche. */
export function parseQuery(query: string): string[] {
  return splitWords(query);
}

/** Tous les mots cherchés doivent se retrouver dans la recette (titre ou ingrédients). */
export function matchesSearch(entry: SearchIndexEntry, terms: string[]): boolean {
  return terms.every((term) => entry.text.includes(term) || entry.words.some((word) => termMatchesWord(term, word)));
}

/* --- Tri ------------------------------------------------------------ */

export type RecipeSort = "name" | "recent" | "quick";
export const RECIPE_SORTS: RecipeSort[] = ["name", "recent", "quick"];

/**
 * « recent » s'appuie sur l'ordre reçu : le serveur renvoie les recettes de
 * la plus récente à la plus ancienne, et une recette créée ou importée est
 * ajoutée en tête (hooks/useRecipes.ts) — pas besoin d'une date en plus.
 */
export function sortRecipes(recipes: Recipe[], sort: RecipeSort): Recipe[] {
  const byName = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, "fr");
  if (sort === "recent") return [...recipes];
  if (sort === "quick") return [...recipes].sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0) || byName(a, b));
  return [...recipes].sort(byName);
}

/* --- Liste visible (grille ET « vue livre » de la fiche) ------------- */

export interface RecipeViewFilters {
  /** Clé du filtre de catégorie (« tout », « sale », « sucre »…, voir FILTERS). */
  filter: string;
  favoritesOnly: boolean;
  /** Termes déjà passés par parseQuery(). */
  terms: string[];
}

/**
 * La recette passe-t-elle le filtre de catégorie, les favoris et la
 * recherche de la grille ? Seule source de vérité de « ce que montre la
 * grille » : utilisée par RecipesView (cartes affichées) ET par
 * visibleRecipes() ci-dessous (pages de la fiche, voir useRecipePager.ts).
 * `entry` : texte recherchable déjà préparé (index de RecipesView), sinon
 * calculé ici.
 */
export function matchesRecipeView(recipe: Recipe, { filter, favoritesOnly, terms }: RecipeViewFilters, entry?: SearchIndexEntry): boolean {
  if (filter !== "tout" && normalize(recipe.category) !== filter) return false;
  if (favoritesOnly && !recipe.favorite) return false;
  if (terms.length && !matchesSearch(entry ?? buildSearchEntry(recipe), terms)) return false;
  return true;
}

/**
 * Recettes affichées par la grille, dans son ordre exact (même tri, même
 * filtre, mêmes favoris, même recherche) — l'ordre des pages quand on
 * feuillette la fiche recette d'un glissement horizontal.
 */
export function visibleRecipes(
  recipes: Recipe[],
  { filter, favoritesOnly, search, sort }: { filter: string; favoritesOnly: boolean; search: string; sort: RecipeSort }
): Recipe[] {
  const terms = parseQuery(search);
  return sortRecipes(recipes, sort).filter((r) => matchesRecipeView(r, { filter, favoritesOnly, terms }));
}
