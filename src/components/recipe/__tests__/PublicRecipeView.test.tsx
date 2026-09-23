import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PublicRecipeView from "../PublicRecipeView";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : demandé explicitement par l'utilisateur — un lien de       */
/*  partage doit afficher UNIQUEMENT la recette, sans la moindre trace       */
/*  du reste du Grimoire (nav, réglages, bouton de connexion...), et un       */
/*  code corrompu/invalide doit afficher un message clair plutôt que de         */
/*  planter ou de rester silencieusement vide.                                     */
/* ------------------------------------------------------------------ */

afterEach(cleanup);

const RECIPE = {
  title: "Tarte aux pommes",
  category: "Sucré",
  time: 1440,
  servings: 6,
  ingredients: [{ qty: 3, unit: "", name: "pommes" }],
  steps: ["Éplucher les pommes", "Cuire au four"],
};

describe("PublicRecipeView", () => {
  it("affiche la recette (titre, temps formaté, portions, ingrédients, étapes)", () => {
    render(<PublicRecipeView recipe={RECIPE} />);
    expect(screen.getByText("Tarte aux pommes")).toBeInTheDocument();
    expect(screen.getByText(/1 j/)).toBeInTheDocument();
    expect(screen.getByText(/6/)).toBeInTheDocument();
    expect(screen.getByText("3 pommes")).toBeInTheDocument();
    expect(screen.getByText("Éplucher les pommes")).toBeInTheDocument();
    expect(screen.getByText("Cuire au four")).toBeInTheDocument();
  });

  it("ne montre aucun élément de navigation/chrome de l'app (nav, réglages, connexion)", () => {
    render(<PublicRecipeView recipe={RECIPE} />);
    expect(document.querySelector(".bottom-nav")).not.toBeInTheDocument();
    expect(document.querySelector(".app-header")).not.toBeInTheDocument();
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Réglages/i)).not.toBeInTheDocument();
  });

  it("affiche un message clair plutôt que de planter quand la recette est invalide/absente", () => {
    render(<PublicRecipeView recipe={null} />);
    expect(screen.getByText("Ce lien de recette n'est plus valide.")).toBeInTheDocument();
  });
});
