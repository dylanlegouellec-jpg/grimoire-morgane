import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import RecipeForm from "../RecipeForm";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Recipe } from "../../../hooks/useRecipes";

vi.mock("../../../utils/nutriscoreClient", () => ({ fetchNutriscoreGrade: vi.fn(async () => "b") }));
vi.mock("../../../utils/audioUtils", () => ({ playSuccessSound: vi.fn() }));

afterEach(cleanup);

const RECIPE = {
  id: "r1",
  title: "Crêpes",
  category: "Sucré",
  time: 20,
  servings: 4,
  carbs: 30,
  calories: 250,
  protein: null,
  fat: null,
  notes: "Laisser reposer",
  illustrationKey: "crepes",
  favorite: true,
  ingredients: [{ isSection: true, title: "Pâte" }, { qty: 250, unit: "g", name: "farine" }, { qty: 0.5, unit: "l", name: "lait" }],
  steps: ["Mélanger", { isSection: true, title: "Cuisson" }, "Cuire"],
  imageUrl: "https://exemple/photo.webp",
  imageSource: "upload",
  nutriscoreGrade: "c",
} as unknown as Recipe;

function renderForm(props: Partial<Parameters<typeof RecipeForm>[0]> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <LanguageProvider language="fr">
      <RecipeForm onSave={onSave} onClose={onClose} onDelete={vi.fn()} {...props} />
    </LanguageProvider>
  );
  return { onSave, onClose };
}

describe("RecipeForm", () => {
  it("modifier sans rien changer renvoie la même recette (sections, quantités, nutrition, photo)", async () => {
    const { onSave, onClose } = renderForm({ initialRecipe: RECIPE });
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0][0] as Recipe;
    expect(saved).toMatchObject({
      id: "r1", title: "Crêpes", category: "Sucré", time: 20, servings: 4,
      carbs: 30, calories: 250, protein: null, fat: null, notes: "Laisser reposer",
      illustrationKey: "crepes", favorite: true, imageUrl: "https://exemple/photo.webp", imageSource: "upload", nutriscoreGrade: "b",
    });
    expect(saved.ingredients).toEqual(RECIPE.ingredients);
    expect(saved.steps).toEqual(RECIPE.steps);
    // La feuille se referme après le cachet de cire (≈ 0,8 s, voir
    // form/createAnimations.ts) — l'enregistrement, lui, est immédiat.
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 2500 });
  });

  it("la nutrition accepte la virgule décimale et les ingrédients ajoutés sont enregistrés", async () => {
    const { onSave } = renderForm({ initialRecipe: RECIPE });
    fireEvent.change(screen.getByPlaceholderText("Ex. 12"), { target: { value: "12,5" } });
    fireEvent.click(screen.getByText("+ Ajouter un ingrédient"));
    const names = screen.getAllByPlaceholderText("Nom de l'ingrédient");
    expect(names).toHaveLength(3);
    fireEvent.change(names[2], { target: { value: "oeufs" } });
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0][0] as Recipe;
    expect(saved.protein).toBe(12.5);
    expect(saved.ingredients.at(-1)).toMatchObject({ name: "oeufs", unit: "g" });
  });

  it("fermer un formulaire modifié demande confirmation au lieu de tout perdre", () => {
    const { onClose } = renderForm({ initialRecipe: RECIPE });
    fireEvent.change(screen.getByDisplayValue("Crêpes"), { target: { value: "Crêpes bretonnes" } });
    fireEvent.click(screen.getAllByLabelText("Fermer")[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("une nouvelle recette ne peut pas être scellée sans titre, ingrédient et étape", () => {
    const { onSave } = renderForm();
    expect((screen.getByText("Sceller la recette").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });
});
