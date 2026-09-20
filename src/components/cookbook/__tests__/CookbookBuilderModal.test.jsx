import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CookbookBuilderModal from "../CookbookBuilderModal";
import { LanguageProvider } from "../../../contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : les trois modes de sélection ("Toutes" / "Par catégorie" /  */
/*  "Sélection") doivent réellement filtrer les recettes incluses dans le      */
/*  livre — c'est le seul calcul non trivial de cet éditeur (le reste n'est      */
/*  que de la configuration passée telle quelle à CookbookDocument), et donc      */
/*  le plus exposé à une régression silencieuse si sa logique de filtrage         */
/*  changeait sans que personne ne le remarque à l'écran (le nombre de pages         */
/*  générées n'est visible qu'en aperçu/impression, jamais dans l'éditeur           */
/*  lui-même en dehors du compteur "sélectionnée(s)").                                */
/* ------------------------------------------------------------------ */

function makeRecipe(id, title, category) {
  return {
    id,
    title,
    category,
    time: 20,
    servings: 2,
    ingredients: [{ qty: 1, unit: "", name: "Ingrédient" }],
    steps: ["Étape"],
  };
}

const RECIPES = [
  makeRecipe("r1", "Poulet rôti", "Salé"),
  makeRecipe("r2", "Fondant au chocolat", "Sucré"),
];

function renderModal(showToast = vi.fn()) {
  return render(
    <LanguageProvider>
      <CookbookBuilderModal recipes={RECIPES} onClose={() => {}} showToast={showToast} />
    </LanguageProvider>
  );
}

afterEach(cleanup);

describe("CookbookBuilderModal — sélection des recettes", () => {
  it("inclut toutes les recettes par défaut (mode 'Toutes')", () => {
    renderModal();
    expect(screen.getByText("2 recettes sélectionnées")).toBeInTheDocument();
  });

  it("filtre sur une seule catégorie en mode 'Par catégorie'", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("tab", { name: "Par catégorie" }));
    // Salé est la sous-catégorie par défaut (DEFAULT_COOKBOOK_CONFIG).
    expect(screen.getByText("1 recette sélectionnée")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Sucré" }));
    expect(screen.getByText("1 recette sélectionnée")).toBeInTheDocument();
  });

  it("ne compte que les recettes cochées en mode 'Sélection'", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("tab", { name: "Sélection" }));
    expect(screen.getByText("0 recette sélectionnée")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Poulet rôti" }));
    expect(screen.getByText("1 recette sélectionnée")).toBeInTheDocument();
  });

  it("bloque l'export et prévient l'utilisateur quand aucune recette n'est sélectionnée", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    renderModal(showToast);
    await user.click(screen.getByRole("tab", { name: "Sélection" }));
    await user.click(screen.getByRole("button", { name: "Aperçu en direct" }));
    expect(showToast).toHaveBeenCalledWith("Sélectionne au moins une recette.");
    // L'aperçu ne s'est pas ouvert : seul le bouton de fermeture de la
    // modale principale existe encore (pas celui, dédié, du panneau d'aperçu).
    expect(screen.getAllByLabelText("Fermer")).toHaveLength(1);
  });

  it("ouvre l'aperçu en direct une fois une recette sélectionnée", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Aperçu en direct" }));
    // Le bouton de fermeture de la modale principale ET celui, dédié, du
    // panneau d'aperçu portent tous deux aria-label="Fermer" : en voir deux
    // prouve que le panneau d'aperçu s'est bien monté par-dessus.
    expect(screen.getAllByLabelText("Fermer")).toHaveLength(2);
  });
});
