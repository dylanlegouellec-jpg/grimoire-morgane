import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import RecipeForm from "../RecipeForm";
import RecipesView from "../RecipesView";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { markRecipeSealed, useSealedPulse, SEAL_PULSE_MS } from "../form/createAnimations";
import type { Recipe } from "../../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  Tache d'encre (ouverture depuis le « + ») et cachet de cire          */
/*  (enregistrement) : voir components/recipe/form/createAnimations.ts.   */
/* ------------------------------------------------------------------ */

vi.mock("../../../utils/nutriscoreClient", () => ({ fetchNutriscoreGrade: vi.fn(async () => "b") }));
vi.mock("../../../utils/audioUtils", () => ({ playSuccessSound: vi.fn() }));

// « Réduire les animations » simulé : jsdom n'a pas de matchMedia.
let reducedMotion = false;
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return { ...actual, useReducedMotion: () => reducedMotion };
});

beforeEach(() => { reducedMotion = false; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const RECIPE = {
  id: "r1",
  title: "Crêpes",
  category: "Sucré",
  time: 20,
  servings: 4,
  carbs: null, calories: null, protein: null, fat: null,
  notes: null,
  illustrationKey: "crepes",
  favorite: false,
  ingredients: [{ qty: 250, unit: "g", name: "farine" }],
  steps: ["Mélanger"],
  nutriscoreGrade: "c",
} as unknown as Recipe;

const ORIGIN = { x: 340, y: 700, r: 26 };

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

describe("ouverture en tache d'encre", () => {
  it("le « + » transmet le centre du bouton à onAddRequest", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 314, top: 674, width: 52, height: 52, right: 366, bottom: 726, x: 314, y: 674, toJSON: () => ({}),
    } as DOMRect);
    const onAddRequest = vi.fn();
    render(
      <LanguageProvider language="fr">
        <RecipesView
          recipes={[RECIPE]}
          filter="tout"
          search=""
          favoritesOnly={false}
          onToggleFavorite={vi.fn()}
          onAddRequest={onAddRequest}
          onOpen={vi.fn()}
          openRecipeId={null}
          onRequestDelete={vi.fn()}
          onUpdateRecipe={vi.fn()}
          householdId={null}
        />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByLabelText("Ajouter une recette"));
    expect(onAddRequest).toHaveBeenCalledWith({ x: 340, y: 700, r: 26 });
  });

  it("création depuis le « + » : tache d'encre, titre écrit à la plume mais lu en entier", () => {
    renderForm({ inkOrigin: ORIGIN });
    expect(document.querySelector(".ink-blot")).not.toBeNull();
    expect(document.querySelector(".form-ink-cascade")).not.toBeNull();
    const heading = screen.getByRole("heading", { level: 2 });
    // Lettres animées masquées aux lecteurs d'écran, titre complet lisible.
    expect(heading.querySelector(".quill-title")?.getAttribute("aria-hidden")).toBe("true");
    expect(heading.querySelectorAll(".quill-char")).toHaveLength("Invoquer une recette".length);
    expect(heading.querySelector(".quill-sr")?.textContent).toBe("Invoquer une recette");
    // Décor uniquement : jamais exposé.
    expect(document.querySelector(".ink-blot")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("pas de tache d'encre en édition, ni sans origine (tuto, raccourci d'icône)", () => {
    renderForm({ inkOrigin: ORIGIN, initialRecipe: RECIPE });
    expect(document.querySelector(".ink-blot")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Modifier la recette");
    cleanup();
    renderForm();
    expect(document.querySelector(".ink-blot")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Invoquer une recette");
  });

  it("« Réduire les animations » : ni tache d'encre ni titre animé", () => {
    reducedMotion = true;
    renderForm({ inkOrigin: ORIGIN });
    expect(document.querySelector(".ink-blot")).toBeNull();
    expect(document.querySelector(".quill-char")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Invoquer une recette");
  });
});

describe("enregistrement au cachet de cire", () => {
  it("onSave part tout de suite, le sceau tombe, la feuille se ferme ensuite", async () => {
    const { onSave, onClose } = renderForm({ initialRecipe: RECIPE });
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    // Le sceau est posé dès l'appui, avant même la fin de l'enregistrement.
    expect(document.querySelector(".wax-seal-stage")).not.toBeNull();
    expect(document.querySelector(".wax-seal-stage")?.getAttribute("aria-hidden")).toBe("true");
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // Enregistré, mais la feuille attend la fin du sceau pour se refermer.
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 2500 });
  });

  it("« Réduire les animations » : pas de sceau, fermeture immédiate", async () => {
    reducedMotion = true;
    const { onSave, onClose } = renderForm({ initialRecipe: RECIPE });
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    expect(document.querySelector(".wax-seal-stage")).toBeNull();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("la carte enregistrée reçoit le halo doré, puis le perd", () => {
    vi.useFakeTimers();
    try {
      function Probe({ id }: { id: string }) {
        return <span data-testid={id}>{useSealedPulse(id) ? "on" : "off"}</span>;
      }
      render(<><Probe id="a" /><Probe id="b" /></>);
      act(() => markRecipeSealed("a"));
      expect(screen.getByTestId("a").textContent).toBe("on");
      expect(screen.getByTestId("b").textContent).toBe("off");
      act(() => { vi.advanceTimersByTime(SEAL_PULSE_MS + 10); });
      expect(screen.getByTestId("a").textContent).toBe("off");
    } finally {
      vi.useRealTimers();
    }
  });
});
