import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipesView from "../RecipesView";
import { LanguageProvider } from "../../../contexts/LanguageContext";

// L'animation d'entrée des cartes (RecipeCard.jsx) est désormais un
// animate() Framer Motion impératif (useAnimate), pas un changement de
// classe CSS observable dans le DOM — remplacer useAnimate par un espion
// est le seul moyen de vérifier "l'animation a bien été (re)déclenchée" ici,
// puisque jsdom n'expose de toute façon aucun état de lecture fiable pour
// une Web Animation en cours. `() => [{ current: null }, animateSpy]` :
// chaque appel crée un NOUVEAU scope (une carte = un noeud DOM propre),
// mais partage le MÊME espion, pour pouvoir filtrer ses appels par carte
// (son premier argument, le noeud DOM ciblé) après coup.
const animateSpy = vi.fn();
vi.mock("motion/react", async () => {
  const actual = await vi.importActual("motion/react");
  return { ...actual, useAnimate: () => [{ current: null }, animateSpy] };
});

/* ------------------------------------------------------------------ */
/*  Verrouille le contrat pénible à retrouver "à la main" cette session : */
/*  changer de filtre (Tout/Salé/Sucré/Favoris) ne doit JAMAIS démonter    */
/*  une carte déjà rendue (sinon son <img> se recharge/redécode à chaque   */
/*  passage — le bug d'origine), mais DOIT rejouer son animation d'entrée  */
/*  à chaque changement, y compris pour une carte qui était déjà visible   */
/*  avant le changement (le bug "Tout -> Sucré : aucune animation", trouvé */
/*  après coup). Un futur retour en arrière vers un simple .filter() sur   */
/*  le tableau de recettes — la solution la plus "naturelle" à laquelle on */
/*  a explicitement renoncé — ferait échouer le test de non-démontage      */
/*  ci-dessous plutôt que de laisser la régression passer inaperçue.       */
/* ------------------------------------------------------------------ */

function makeRecipe(id, title, category, favorite = false) {
  return {
    id,
    title,
    category,
    time: 30,
    servings: 4,
    carbs: 10,
    favorite,
    ingredients: [{ qty: 1, unit: "", name: "Ingrédient" }],
    steps: ["Étape"],
  };
}

const RECIPES = [
  makeRecipe("r1", "Fondant au chocolat", "Sucré"),
  makeRecipe("r2", "Poulet rôti", "Salé"),
  makeRecipe("r3", "Crêpes bretonnes", "Sucré", true),
  makeRecipe("r4", "Quiche lorraine", "Salé"),
];

const noop = () => {};

// Harnais minimal : reproduit juste ce qu'AppShell.jsx fait réellement
// (filter/search/favoritesOnly pilotés par de l'état React local, changés
// par de vrais clics) pour déclencher de vrais changements de filtre
// entre deux rendus, comme le ferait un utilisateur — pas juste re-render
// RecipesView directement avec de nouvelles props depuis le test.
function Harness({ initialFilter = "tout" }) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  return (
    <LanguageProvider language="fr">
      <button type="button" onClick={() => setFilter("tout")}>go-tout</button>
      <button type="button" onClick={() => setFilter("sale")}>go-sale</button>
      <button type="button" onClick={() => setFilter("sucre")}>go-sucre</button>
      <button type="button" onClick={() => setFavoritesOnly((v) => !v)}>go-favoris</button>
      <button type="button" onClick={() => setSearch("crêpes")}>search-crepes</button>
      <RecipesView
        recipes={RECIPES}
        filter={filter}
        search={search}
        favoritesOnly={favoritesOnly}
        onToggleFavorite={noop}
        onAddRequest={noop}
        onOpen={noop}
        onRequestDelete={noop}
        onUpdateRecipe={noop}
        pressDuration={750}
        showNutriscore={false}
        householdId={null}
        showToast={noop}
      />
    </LanguageProvider>
  );
}

afterEach(() => {
  cleanup();
  animateSpy.mockClear();
});

describe("RecipesView — filtrage sans démontage", () => {
  it("garde toutes les cartes montées dans le DOM, y compris celles hors du filtre actif", () => {
    const { container } = render(<Harness initialFilter="sale" />);
    // 4 recettes au total, seulement 2 "Salé" — les 4 cartes doivent
    // pourtant exister dans le DOM dès ce premier rendu.
    expect(container.querySelectorAll(".recipe-card")).toHaveLength(RECIPES.length);
  });

  it("masque via display:none les cartes hors filtre plutôt que de les retirer du DOM", () => {
    render(<Harness initialFilter="sale" />);
    const sucreCard = screen.getByText("Fondant au chocolat").closest(".recipe-card");
    const saleCard = screen.getByText("Poulet rôti").closest(".recipe-card");
    expect(sucreCard.style.display).toBe("none");
    expect(saleCard.style.display).not.toBe("none");
  });

  it("ne démonte jamais une carte lors d'un changement de filtre (pas de rechargement d'image)", async () => {
    const user = userEvent.setup();
    render(<Harness initialFilter="tout" />);
    const cardBefore = screen.getByText("Fondant au chocolat").closest(".recipe-card");

    await user.click(screen.getByText("go-sale")); // Fondant (Sucré) passe masqué
    const cardWhileHidden = screen.getByText("Fondant au chocolat").closest(".recipe-card");

    await user.click(screen.getByText("go-sucre")); // redevient visible
    const cardVisibleAgain = screen.getByText("Fondant au chocolat").closest(".recipe-card");

    // Même noeud DOM du début à la fin : jamais démontée, donc jamais
    // recréée — c'est ce qui garantit que son <img> ne se recharge pas.
    expect(cardWhileHidden).toBe(cardBefore);
    expect(cardVisibleAgain).toBe(cardBefore);
  });

  it("rejoue l'animation d'entrée même pour une carte déjà visible avant le changement de filtre", async () => {
    // Régression précise signalée par l'utilisateur : passer de "Tout" à
    // "Sucré" ne fait JAMAIS passer une carte sucrée de masquée à visible
    // (elle était déjà visible sous "Tout") — sans le correctif, rien ne
    // rejouait sur ce changement de filtre précis alors que la grille se
    // réorganisait quand même sous les yeux de l'utilisateur.
    const user = userEvent.setup();
    render(<Harness initialFilter="tout" />);
    const cardNode = screen.getByText("Fondant au chocolat").closest(".recipe-card");
    animateSpy.mockClear(); // ignore l'appel du montage initial

    await user.click(screen.getByText("go-sucre"));

    expect(animateSpy.mock.calls.some(([node]) => node === cardNode)).toBe(true);
  });

  it("remet le défilement en haut sur un changement de filtre, mais pas sur une recherche", async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<Harness initialFilter="tout" />);
    expect(scrollSpy).not.toHaveBeenCalled();

    await user.click(screen.getByText("go-sale"));
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);

    scrollSpy.mockClear();
    await user.click(screen.getByText("search-crepes"));
    expect(scrollSpy).not.toHaveBeenCalled();

    scrollSpy.mockRestore();
  });
});
