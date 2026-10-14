import { describe, it, expect } from "vitest";
import { visibleRecipes } from "../recipeSearch";
import type { Recipe } from "../../hooks/useRecipes";

// « Vue livre » de la fiche : les pages qu'on feuillette doivent être
// exactement les cartes de la grille, dans le même ordre.
const r = (id: string, title: string, category: string, time: number, favorite = false) =>
  ({ id, title, category, time, favorite, ingredients: [{ qty: 1, unit: "", name: id === "d" ? "poireau" : "farine" }], steps: [] }) as unknown as Recipe;

// Ordre reçu = du plus récent au plus ancien.
const RECIPES = [
  r("a", "Tarte aux poireaux", "Salé", 50),
  r("b", "Crêpes", "Sucré", 20, true),
  r("c", "Brioche", "Sucré", 90),
  r("d", "Quiche", "Salé", 40, true),
  r("e", "Abricots rôtis", "Sucré", 15),
];
const ids = (list: Recipe[]) => list.map((x) => x.id);

describe("visibleRecipes (pages de la fiche = grille affichée)", () => {
  it("suit le tri choisi dans Réglages > Apparence", () => {
    const base = { filter: "tout", favoritesOnly: false, search: "" };
    expect(ids(visibleRecipes(RECIPES, { ...base, sort: "name" }))).toEqual(["e", "c", "b", "d", "a"]);
    expect(ids(visibleRecipes(RECIPES, { ...base, sort: "recent" }))).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids(visibleRecipes(RECIPES, { ...base, sort: "quick" }))).toEqual(["e", "b", "d", "a", "c"]);
  });

  it("applique le filtre de catégorie, les favoris et la recherche", () => {
    expect(ids(visibleRecipes(RECIPES, { filter: "sucre", favoritesOnly: false, search: "", sort: "name" }))).toEqual(["e", "c", "b"]);
    expect(ids(visibleRecipes(RECIPES, { filter: "tout", favoritesOnly: true, search: "", sort: "name" }))).toEqual(["b", "d"]);
    // La recherche porte aussi sur les ingrédients (« poireau » trouve la quiche).
    expect(ids(visibleRecipes(RECIPES, { filter: "sale", favoritesOnly: false, search: "poireau", sort: "recent" }))).toEqual(["a", "d"]);
  });
});
