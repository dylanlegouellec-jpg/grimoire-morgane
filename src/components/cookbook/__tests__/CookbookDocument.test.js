import { describe, it, expect } from "vitest";
import { formatIngredientLine } from "../CookbookDocument";

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
