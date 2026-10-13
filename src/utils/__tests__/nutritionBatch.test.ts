import { describe, it, expect, vi } from "vitest";
import {
  hasNoNutrition,
  selectRecipesWithoutNutrition,
  hasEstimableIngredients,
  initialBatchItems,
  runNutritionBatch,
  type NutritionBatchItem,
  type NutritionBatchRecipe,
} from "../nutritionBatch";

const EST = { calories: 320, protein: 12, carbs: 40, fat: 9 };

function recipe(id: string, extra: Partial<NutritionBatchRecipe> & Record<string, unknown> = {}) {
  return {
    id,
    title: `Recette ${id}`,
    servings: 2,
    ingredients: [{ qty: 200, unit: "g", name: "farine" }],
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    notes: "garder",
    nutriscoreGrade: "b",
    ...extra,
  };
}

const noSleep = () => Promise.resolve();

describe("sélection des recettes sans nutrition", () => {
  it("considère vides null, undefined, chaîne vide et 0", () => {
    expect(hasNoNutrition(recipe("a"))).toBe(true);
    expect(hasNoNutrition(recipe("a", { calories: 0, protein: "", carbs: undefined }))).toBe(true);
  });

  it("exclut toute recette ayant au moins une valeur", () => {
    expect(hasNoNutrition(recipe("a", { fat: 3 }))).toBe(false);
    expect(hasNoNutrition(recipe("a", { calories: "250" }))).toBe(false);
    const list = [recipe("a"), recipe("b", { protein: 5 }), recipe("c")];
    expect(selectRecipesWithoutNutrition(list).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("repère les recettes sans vrai ingrédient", () => {
    expect(hasEstimableIngredients(recipe("a"))).toBe(true);
    expect(hasEstimableIngredients(recipe("a", { ingredients: [{ isSection: true, title: "Pâte" }] }))).toBe(false);
    expect(hasEstimableIngredients(recipe("a", { ingredients: [] }))).toBe(false);
  });

  it("prépare la liste en attente", () => {
    expect(initialBatchItems([recipe("a")])).toEqual([{ id: "a", title: "Recette a", status: "pending" }]);
  });
});

describe("runNutritionBatch", () => {
  it("estime une recette à la fois, dans l'ordre, et n'enregistre que les macros", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const estimate = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return EST;
    });
    const save = vi.fn();
    const items: Array<[number, NutritionBatchItem]> = [];
    const list = [recipe("a"), recipe("b", { servings: 0 })];

    const summary = await runNutritionBatch(list, { estimate, save, onItem: (i, it) => items.push([i, it]), sleep: noSleep });

    expect(maxInFlight).toBe(1);
    expect(estimate).toHaveBeenNthCalledWith(1, list[0].ingredients, 2);
    expect(estimate).toHaveBeenNthCalledWith(2, list[1].ingredients, 4); // parts manquantes -> 4, comme le formulaire
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0]).toEqual({ ...list[0], ...EST });
    expect(save.mock.calls[0][0].notes).toBe("garder");
    expect(save.mock.calls[0][0].nutriscoreGrade).toBe("b");
    expect(items.map(([i, it]) => `${i}:${it.status}`)).toEqual(["0:running", "0:done", "1:running", "1:done"]);
    expect(summary).toEqual({ estimated: 2, failed: 0, skipped: 0, stopped: false });
  });

  it("compte les échecs (null, exception, pas d'ingrédient) sans rien enregistrer", async () => {
    const estimate = vi.fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("boom"));
    const save = vi.fn();
    const list = [recipe("a"), recipe("b"), recipe("c", { ingredients: [] })];
    const summary = await runNutritionBatch(list, { estimate, save, sleep: noSleep });
    expect(estimate).toHaveBeenCalledTimes(2);
    expect(save).not.toHaveBeenCalled();
    expect(summary).toEqual({ estimated: 0, failed: 3, skipped: 0, stopped: false });
  });

  it("ne touche pas une recette qui a reçu une valeur ou a disparu pendant le lot", async () => {
    const estimate = vi.fn().mockResolvedValue(EST);
    const save = vi.fn();
    const current: Record<string, ReturnType<typeof recipe> | undefined> = { a: recipe("a", { fat: 7 }), b: undefined, c: recipe("c", { title: "Nouveau titre" }) };
    const summary = await runNutritionBatch([recipe("a"), recipe("b"), recipe("c")], {
      estimate, save, getCurrent: (id) => current[id], sleep: noSleep,
    });
    expect(summary).toEqual({ estimated: 1, failed: 0, skipped: 2, stopped: false });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ id: "c", title: "Nouveau titre", calories: 320 });
  });

  it("s'arrête entre deux recettes quand on le demande", async () => {
    let stop = false;
    const estimate = vi.fn(async () => { stop = true; return EST; });
    const save = vi.fn();
    const summary = await runNutritionBatch([recipe("a"), recipe("b"), recipe("c")], {
      estimate, save, shouldStop: () => stop, sleep: noSleep,
    });
    expect(estimate).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ estimated: 1, failed: 0, skipped: 0, stopped: true });
  });

  it("fait une pause entre deux appels, pas après le dernier", async () => {
    const sleep = vi.fn(noSleep);
    await runNutritionBatch([recipe("a"), recipe("b")], { estimate: async () => EST, save: () => {}, sleep, delayMs: 250 });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(250);
  });
});
