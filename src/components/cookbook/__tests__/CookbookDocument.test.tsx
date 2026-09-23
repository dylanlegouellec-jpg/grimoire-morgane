import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CookbookDocument, { formatIngredientLine } from "../CookbookDocument";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { DEFAULT_COOKBOOK_CONFIG } from "../../../constants/cookbook";
import type { TocMode } from "../../../constants/cookbook";
import type { Recipe } from "../../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur avec des exemples concrets       */
/*  ("10 —", "2 —", "càc de curry") — le tiret séparateur ne doit jamais     */
/*  apparaître quand il n'y a rien à séparer (pas d'unité), et un préfixe     */
/*  càc/càs resté collé dans le nom (recette tapée en texte libre plutôt       */
/*  que via les champs qté/unité/nom séparés) doit être reconnu comme une       */
/*  unité normale plutôt que de rester dans le libellé.                          */
/* ------------------------------------------------------------------ */

describe("formatIngredientLine", () => {
  it("n'affiche aucun tiret quand l'ingrédient n'a pas d'unité", () => {
    expect(formatIngredientLine({ qty: 10, unit: "", name: "feuilles de brick" }, "fr")).toBe("10 feuilles de brick");
    expect(formatIngredientLine({ qty: 2, unit: "", name: "carottes" }, "fr")).toBe("2 carottes");
    expect(formatIngredientLine({ qty: 1, unit: "", name: "oignon" }, "fr")).toBe("1 oignon");
  });

  it("garde le tiret quand une unité existe réellement", () => {
    expect(formatIngredientLine({ qty: 7, unit: "c. à café", name: "sauce soja sucrée" }, "fr"))
      .toBe("7 c. à café — sauce soja sucrée");
  });

  it("ne touche pas aux descriptions légitimes sans unité (\"pincée de sel\")", () => {
    expect(formatIngredientLine({ qty: 1, unit: "", name: "pincée de sel" }, "fr")).toBe("1 pincée de sel");
    expect(formatIngredientLine({ qty: 1, unit: "", name: "gousse de vanille" }, "fr")).toBe("1 gousse de vanille");
  });

  it("extrait un préfixe càc/càs resté collé dans le nom, faute d'unité renseignée", () => {
    expect(formatIngredientLine({ qty: 3, unit: "", name: "càc de curry" }, "fr")).toBe("3 c. à café — curry");
    expect(formatIngredientLine({ qty: 2, unit: "", name: "càs de miel" }, "fr")).toBe("2 c. à soupe — miel");
  });
});

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : la table des matières regroupe désormais les recettes       */
/*  par chapitre (Salé/Sucré) plutôt qu'une liste à plat, avec un mode         */
/*  "chapitres seuls" qui masque le détail recette par recette.                 */
/* ------------------------------------------------------------------ */

// Fiches minimales (seuls ces champs comptent ici) — cast plutôt que des
// Recipe complètes, sans intérêt pour ces tests.
function makeRecipe(id: string, title: string, category: string) {
  return { id, title, category, time: 10, servings: 2, ingredients: [], steps: ["Étape"] } as unknown as Recipe;
}
const RECIPES = [
  makeRecipe("r1", "Poulet rôti", "Salé"),
  makeRecipe("r2", "Fondant au chocolat", "Sucré"),
];

function renderDocument(tocMode: TocMode) {
  return render(
    <LanguageProvider language="fr">
      <CookbookDocument recipes={RECIPES} config={{ ...DEFAULT_COOKBOOK_CONFIG, tocMode }} />
    </LanguageProvider>
  );
}

describe("CookbookDocument — table des matières par chapitres", () => {
  it("groupe les recettes sous leur chapitre (Salé/Sucré) en mode 'chapitresEtRecettes'", () => {
    renderDocument("chapitresEtRecettes");
    expect(screen.getByText("Salé", { selector: ".cookbook-toc-chapter-title" })).toBeInTheDocument();
    expect(screen.getByText("Sucré", { selector: ".cookbook-toc-chapter-title" })).toBeInTheDocument();
    expect(screen.getByText("Poulet rôti", { selector: ".cookbook-toc-name" })).toBeInTheDocument();
    expect(screen.getByText("Fondant au chocolat", { selector: ".cookbook-toc-name" })).toBeInTheDocument();
  });

  it("n'affiche que les chapitres, pas le détail des recettes, en mode 'chapitresSeuls'", () => {
    renderDocument("chapitresSeuls");
    expect(screen.getByText("Salé", { selector: ".cookbook-toc-chapter-title" })).toBeInTheDocument();
    expect(screen.getByText("Sucré", { selector: ".cookbook-toc-chapter-title" })).toBeInTheDocument();
    expect(document.querySelector(".cookbook-toc-list")).not.toBeInTheDocument();
  });

  it("n'affiche aucune table des matières en mode 'aucune'", () => {
    renderDocument("aucune");
    expect(document.querySelector(".cookbook-toc")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur — la ligne temps/portions de     */
/*  la page recette utilisait des icônes ⏱/👥 jugées trop basiques, et un     */
/*  temps de repos long (1440 min) s'affichait tel quel plutôt qu'en jours.   */
/* ------------------------------------------------------------------ */
describe("CookbookDocument — ligne temps/portions de la page recette", () => {
  it("n'affiche plus les anciennes icônes ⏱/👥 et sépare temps/portions par un point typographique", () => {
    render(
      <LanguageProvider language="fr">
        <CookbookDocument
          recipes={[{ id: "r1", title: "Tiramisu", category: "Sucré", time: 1440, servings: 6, ingredients: [], steps: ["Étape"] } as unknown as Recipe]}
          config={{ ...DEFAULT_COOKBOOK_CONFIG, tocMode: "aucune", showTime: true }}
        />
      </LanguageProvider>
    );
    const meta = document.querySelector(".cookbook-recipe-meta")!;
    expect(meta).toBeInTheDocument();
    expect(meta.textContent).not.toContain("⏱");
    expect(meta.textContent).not.toContain("👥");
    expect(meta.querySelector(".cookbook-recipe-meta-dot")).toBeInTheDocument();
  });

  it("affiche un temps de repos long (1440 min) en jours plutôt qu'en minutes brutes", () => {
    render(
      <LanguageProvider language="fr">
        <CookbookDocument
          recipes={[{ id: "r1", title: "Tiramisu", category: "Sucré", time: 1440, servings: 6, ingredients: [], steps: ["Étape"] } as unknown as Recipe]}
          config={{ ...DEFAULT_COOKBOOK_CONFIG, tocMode: "aucune", showTime: true }}
        />
      </LanguageProvider>
    );
    const meta = document.querySelector(".cookbook-recipe-meta")!;
    expect(meta.textContent).toContain("1 j");
    expect(meta.textContent).not.toContain("1440");
  });
});

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur avec un exemple concret         */
/*  ("Montage") — un sous-titre de groupe d'étapes/ingrédients pouvait        */
/*  se retrouver seul en bas d'une page du PDF, sa liste basculant sur la      */
/*  suivante. ATOMIC_SELECTOR (utils/cookbookPdf.js) protège désormais le       */
/*  wrapper ".cookbook-recipe-group" comme un bloc indivisible — encore         */
/*  faut-il que CookbookDocument.jsx pose bien cette classe sur chaque            */
/*  groupe d'ingrédients ET d'étapes (avec ou sans sous-titre).                     */
/* ------------------------------------------------------------------ */
describe("CookbookDocument — regroupement sous-titre + liste (pagination PDF)", () => {
  it("pose .cookbook-recipe-group sur chaque groupe d'étapes ET d'ingrédients, sous-titré ou non", () => {
    render(
      <LanguageProvider language="fr">
        <CookbookDocument
          recipes={[{
            id: "r1",
            title: "Bûche pâtissière",
            category: "Sucré",
            time: 30,
            servings: 4,
            ingredients: [{ isSection: true, title: "Biscuit" }, { qty: 4, unit: "", name: "oeufs" }],
            steps: [{ isSection: true, title: "Montage" }, "Etaler la chantilly.", "Rouler la bûche."],
          } as unknown as Recipe]}
          config={{ ...DEFAULT_COOKBOOK_CONFIG, tocMode: "aucune" }}
        />
      </LanguageProvider>
    );
    const groups = document.querySelectorAll(".cookbook-recipe-group");
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const montageGroup = Array.from(groups).find((g) => g.textContent?.includes("Montage"))!;
    expect(montageGroup).toBeTruthy();
    expect(montageGroup.textContent).toContain("Rouler la bûche");
  });
});
