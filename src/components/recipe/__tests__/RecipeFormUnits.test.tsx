import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import RecipeForm from "../RecipeForm";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { UnitsProvider } from "../../../contexts/UnitsContext";
import type { Recipe } from "../../../hooks/useRecipes";
import type { UnitSettings } from "../../../utils/units";

vi.mock("../../../utils/nutriscoreClient", () => ({ fetchNutriscoreGrade: vi.fn(async () => "b") }));
vi.mock("../../../utils/audioUtils", () => ({ playSuccessSound: vi.fn() }));

afterEach(cleanup);

/* Menu « unité » du formulaire = liste du foyer (Réglages > Unités) ; une
   unité absente de cette liste reste proposée pour la ligne qui l'utilise. */
const RECIPE = {
  id: "r1", title: "Brioche", category: "Sucré", time: 30, servings: 6,
  carbs: null, calories: null, protein: null, fat: null, notes: null,
  illustrationKey: null, favorite: false, imageUrl: null, imageSource: null, nutriscoreGrade: null,
  ingredients: [
    { qty: 1, unit: "sachet", name: "levure" },
    { qty: 20, unit: "cl", name: "lait" },
    { qty: 2, unit: "gousses", name: "vanille" },
  ],
  steps: ["Pétrir"],
} as unknown as Recipe;

function renderForm(settings: UnitSettings | null, initialRecipe?: Recipe) {
  const onSave = vi.fn();
  const utils = render(
    <LanguageProvider language="fr">
      <UnitsProvider unitSettings={settings} setUnitSettings={() => {}}>
        <RecipeForm onSave={onSave} onClose={vi.fn()} onDelete={vi.fn()} initialRecipe={initialRecipe} />
      </UnitsProvider>
    </LanguageProvider>
  );
  return { ...utils, onSave };
}

const optionValues = (select: Element) => [...select.querySelectorAll("option")].map((o) => o.getAttribute("value"));

describe("RecipeForm — unités du foyer", () => {
  it("nouvelle recette : unités de base visibles, puis ajoutées, « Sans unité » en dernier", () => {
    const { container } = renderForm({ custom: ["sachet"], hidden: ["cl"] });
    const select = container.querySelector(".ing-unit")!;
    expect(optionValues(select)).toEqual(["g", "kg", "ml", "l", "pièce", "pincée", "c. à soupe", "c. à café", "sachet", ""]);
    expect(select.querySelector('option[value="sachet"]')!.textContent).toBe("sachet");
  });

  it("garde l'unité d'une ligne même masquée, supprimée ou importée, et l'enregistre telle quelle", async () => {
    const { container, onSave } = renderForm({ custom: [], hidden: ["cl"] }, RECIPE);
    const selects = [...container.querySelectorAll(".ing-unit")] as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(["sachet", "cl", "gousses"]);
    expect(optionValues(selects[1])).toContain("cl");
    expect(optionValues(selects[0])).not.toContain("cl");
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect((onSave.mock.calls[0][0] as Recipe).ingredients).toEqual(RECIPE.ingredients);
  });
});
