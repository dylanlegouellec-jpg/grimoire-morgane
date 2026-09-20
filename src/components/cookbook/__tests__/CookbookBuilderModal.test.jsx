import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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
    // L'ouverture attend d'abord une mesure de pagination (requestAnimationFrame,
    // voir refreshPageStarts dans CookbookBuilderModal.jsx) avant de basculer
    // en mode aperçu — waitFor plutôt qu'une assertion immédiate.
    await waitFor(() => {
      // Le bouton de fermeture de la modale principale ET celui, dédié, du
      // panneau d'aperçu portent tous deux aria-label="Fermer" : en voir deux
      // prouve que le panneau d'aperçu s'est bien monté par-dessus.
      expect(screen.getAllByLabelText("Fermer")).toHaveLength(2);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : demandé par l'utilisateur ("un aperçu en direct quand on    */
/*  modifie des choses direct sur le module") — un mini-aperçu de la           */
/*  couverture (CookbookCoverPreview) reste affiché en permanence dans la       */
/*  section "Page de couverture", sans avoir besoin d'ouvrir le panneau           */
/*  "Aperçu en direct" plein écran (qui, lui, attend une mesure de pagination        */
/*  asynchrone — voir le test précédent). Ce mini-aperçu doit se mettre à             */
/*  jour de façon purement synchrone (simple état React), à chaque frappe.             */
/* ------------------------------------------------------------------ */
describe("CookbookBuilderModal — mini-aperçu de la couverture", () => {
  // Le document complet (CookbookDocument) reste monté en permanence, caché
  // (voir .cookbook-print-sheet), avec le même titre — sélecteur scopé au
  // mini-aperçu pour ne matcher que lui, pas ce doublon caché.
  const MINI_TITLE = { selector: ".cookbook-cover-mini-title" };

  it("affiche le titre par défaut dans le mini-aperçu, sans action de l'utilisateur", () => {
    renderModal();
    expect(screen.getByText("Le Grimoire de Morgane", MINI_TITLE)).toBeInTheDocument();
  });

  it("se met à jour instantanément à la frappe, sans bouton ni attente", async () => {
    const user = userEvent.setup();
    renderModal();
    const titleInput = screen.getByLabelText("Titre");
    await user.clear(titleInput);
    await user.type(titleInput, "Recettes de Mamie");
    expect(screen.getByText("Recettes de Mamie", MINI_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("Le Grimoire de Morgane", MINI_TITLE)).not.toBeInTheDocument();
  });
});
