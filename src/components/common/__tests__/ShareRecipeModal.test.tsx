import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur — le bouton "Fiche PDF" ne       */
/*  produisait pas un vrai PDF (window.print() en onglet classique, ou un    */
/*  simple partage de TEXTE en PWA installée). Il doit désormais passer         */
/*  par le même pipeline html2canvas + jsPDF que le livre de cuisine             */
/*  (generateCookbookPdf) et produire un fichier .pdf téléchargeable/               */
/*  partageable — jamais du texte brut ni window.print().                              */
/* ------------------------------------------------------------------ */

const generateCookbookPdfMock = vi.fn().mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
vi.mock("../../../utils/cookbookPdf", () => ({
  generateCookbookPdf: (...args: unknown[]) => generateCookbookPdfMock(...args),
}));

import ShareRecipeModal from "../ShareRecipeModal";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Recipe } from "../../../hooks/useRecipes";

// Fiche minimale suffisante pour ce test (Fiche PDF ne lit que ces champs)
// — cast plutôt qu'un objet Recipe complet, sans intérêt ici.
const RECIPE = {
  id: "r1",
  title: "Tarte Tatin",
  category: "Sucré",
  time: 90,
  servings: 6,
  ingredients: [{ qty: 6, unit: "", name: "pommes" }],
  steps: ["Caraméliser", "Cuire au four"],
  imageUrl: "",
} as unknown as Recipe;

function renderModal(showToast = vi.fn()) {
  return render(
    <LanguageProvider language="fr">
      <ShareRecipeModal
        recipe={RECIPE}
        servings={RECIPE.servings}
        ingredients={RECIPE.ingredients}
        onClose={() => {}}
        shareText={vi.fn()}
        showToast={showToast}
      />
    </LanguageProvider>
  );
}

// jsdom n'implémente pas URL.createObjectURL/revokeObjectURL (lève "not
// implemented") — nécessaires au téléchargement direct du blob PDF.
URL.createObjectURL = vi.fn(() => "blob:mock-pdf");
URL.revokeObjectURL = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ShareRecipeModal — Fiche PDF", () => {
  it("appelle generateCookbookPdf (vrai PDF) plutôt que window.print(), jamais du texte brut", async () => {
    const printSpy = vi.spyOn(window, "print");
    const user = userEvent.setup();
    const showToast = vi.fn();
    renderModal(showToast);

    await user.click(screen.getByText("Fiche PDF"));

    await waitFor(() => {
      expect(generateCookbookPdfMock).toHaveBeenCalledTimes(1);
    });
    expect(printSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Fiche téléchargée !");
    });
  });

  it("répercute les options d'export (Nutri-Score, notes) dans la configuration passée au générateur de PDF", async () => {
    const user = userEvent.setup();
    renderModal();

    // Nutri-Score est coché par défaut — le décocher doit se refléter dans
    // la config utilisée pour rasteriser la page recette.
    await user.click(screen.getByLabelText("Inclure le Nutri-Score"));
    await user.click(screen.getByText("Fiche PDF"));

    await waitFor(() => {
      expect(generateCookbookPdfMock).toHaveBeenCalledTimes(1);
    });
    const [, config] = generateCookbookPdfMock.mock.calls[0];
    expect(config.showNutrition).toBe(false);
    expect(config.showIngredients).toBe(true);
    expect(config.showSteps).toBe(true);
  });
});

describe("ShareRecipeModal — texte partagé : ligne des portions", () => {
  const shareTextOf = async (recipe: Recipe, servings: number) => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });
    render(
      <LanguageProvider language="fr">
        <ShareRecipeModal recipe={recipe} servings={servings} ingredients={recipe.ingredients} onClose={() => {}} shareText={vi.fn()} showToast={vi.fn()} />
      </LanguageProvider>
    );
    await userEvent.click(screen.getByText("Texte Épuré"));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const text = (share.mock.calls[0][0] as { text: string }).text;
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true, writable: true });
    return text.split("\n");
  };

  it("recette à l'unité : « Pour 20 cookies » sous le titre", async () => {
    const lines = await shareTextOf({ ...RECIPE, title: "Cookies", servingsUnit: "cookies" } as Recipe, 20);
    expect(lines.slice(0, 2)).toEqual(["Cookies", "Pour 20 cookies"]);
  });

  it("recette en personnes : « Pour 6 personnes » (et « 1 personne »)", async () => {
    expect((await shareTextOf(RECIPE, 6))[1]).toBe("Pour 6 personnes");
    cleanup();
    expect((await shareTextOf(RECIPE, 1))[1]).toBe("Pour 1 personne");
  });
});
