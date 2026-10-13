import { describe, it, expect } from "vitest";
import { buildSearchEntry, editDistance, matchesSearch, parseQuery, sortRecipes } from "../recipeSearch";
import type { Recipe } from "../../hooks/useRecipes";

const recipe = (id: string, title: string, ingredients: string[], time = 30) =>
  ({ id, title, time, ingredients: ingredients.map((name) => ({ qty: 1, unit: "", name })) } as unknown as Recipe);

const find = (r: Recipe, q: string) => matchesSearch(buildSearchEntry(r), parseQuery(q));

describe("recherche de recettes", () => {
  const creme = recipe("1", "Crème brûlée", ["crème liquide", "sucre"]);
  const quiche = recipe("2", "Quiche aux poireaux", ["poireaux", "pâte brisée", "œufs"]);
  const tarte = recipe("3", "Tarte aux pommes", ["pommes", "beurre"]);

  it("ignore accents et majuscules", () => {
    expect(find(creme, "creme")).toBe(true);
    expect(find(creme, "BRULEE")).toBe(true);
  });
  it("cherche aussi dans les ingrédients", () => {
    expect(find(quiche, "poireau")).toBe(true);
    expect(find(quiche, "brisee")).toBe(true);
  });
  it("tous les mots doivent correspondre, dans n'importe quel ordre", () => {
    expect(find(tarte, "pomme tarte")).toBe(true);
    expect(find(tarte, "tarte poireau")).toBe(false);
  });
  it("tolère une petite faute de frappe", () => {
    expect(find(tarte, "pommmes")).toBe(true);
    expect(find(quiche, "qiuche")).toBe(true);
    expect(find(recipe("4", "Fondant au chocolat", ["chocolat"]), "chocolta")).toBe(true);
    expect(find(recipe("4", "Fondant au chocolat", ["chocolat"]), "choco")).toBe(true);
  });
  it("ne devient pas trop large pour les mots courts", () => {
    expect(find(tarte, "riz")).toBe(false);
    expect(find(creme, "poulet")).toBe(false);
  });
  it("distance d'édition avec inversion de deux lettres", () => {
    expect(editDistance("qiuche", "quiche", 2)).toBe(1);
    expect(editDistance("abc", "abcdef", 1)).toBe(2);
  });
});

describe("tri de la grille", () => {
  const list = [recipe("a", "Zeste", [], 10), recipe("b", "Brioche", [], 90), recipe("c", "Crêpes", [], 10)];
  it("par nom", () => expect(sortRecipes(list, "name").map((r) => r.id)).toEqual(["b", "c", "a"]));
  it("plus récentes = ordre reçu", () => expect(sortRecipes(list, "recent").map((r) => r.id)).toEqual(["a", "b", "c"]));
  it("plus rapides, puis par nom", () => expect(sortRecipes(list, "quick").map((r) => r.id)).toEqual(["c", "a", "b"]));
});
