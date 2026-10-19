import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../utils/nutriscoreClient", () => ({ fetchNutriscoreGrade: vi.fn(async () => "b") }));
vi.mock("../../../utils/audioUtils", () => ({ playSuccessSound: vi.fn() }));
vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("../../../hooks/useWakeLock", () => ({ default: () => {} }));
// Mouvement réduit : nombres affichés directement, pas de cachet animé.
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

import RecipeForm from "../RecipeForm";
import RecipeDetail from "../RecipeDetail";
import RecipeCard from "../RecipeCard";
import CookMode from "../CookMode";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Recipe } from "../../../hooks/useRecipes";

/* Portions « à l'unité » (« pour 20 cookies ») : formulaire, fiche, carte
   et mode cuisine ; une recette sans unité garde l'affichage en personnes. */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal("IntersectionObserver", NoopObserver);
vi.stubGlobal("ResizeObserver", NoopObserver);

const BASE = {
  id: "c1",
  title: "Cookies",
  category: "Sucré",
  time: 25,
  servings: 20,
  carbs: null,
  calories: null,
  protein: null,
  fat: null,
  notes: null,
  illustrationKey: null,
  favorite: false,
  ingredients: [{ qty: 200, unit: "g", name: "farine" }],
  steps: ["Mélanger", "Cuire"],
} as unknown as Recipe;
const COOKIES = { ...BASE, servingsUnit: "cookies" } as Recipe;
const PEOPLE = { ...BASE, id: "p1", title: "Gratin", servings: 4 } as Recipe;

const fr = (ui: React.ReactNode) => render(<LanguageProvider language="fr">{ui}</LanguageProvider>);
const noop = () => {};

afterEach(cleanup);

describe("Portions à l'unité — fiche", () => {
  it("affiche « 20 cookies » et « ajustés pour 21 cookies » après +", () => {
    fr(<RecipeDetail recipe={COOKIES} onClose={noop} shareText={noop} showToast={noop} showNutriscore={false} />);
    expect(document.querySelector(".portions-unit")).toHaveTextContent("cookies");
    fireEvent.click(screen.getByLabelText("Augmenter le nombre de portions"));
    expect(screen.getByText("(ajustés pour 21 cookies)")).toBeInTheDocument();
  });

  it("recette sans unité : personnes, inchangé", () => {
    fr(<RecipeDetail recipe={PEOPLE} onClose={noop} shareText={noop} showToast={noop} showNutriscore={false} />);
    expect(document.querySelector(".portions-unit")).toBeNull();
    fireEvent.click(screen.getByLabelText("Augmenter le nombre de portions"));
    expect(screen.getByText("(ajustés pour 5 pers.)")).toBeInTheDocument();
  });
});

describe("Portions à l'unité — carte", () => {
  const props = { onOpen: noop, onToggleFavorite: noop, onRequestDelete: noop, onUpdateRecipe: noop, householdId: null };
  it("« 20 cookies » en toutes lettres ; en personnes, le seul nombre", () => {
    fr(<RecipeCard recipe={COOKIES} {...props} />);
    expect(screen.getByText("20 cookies")).toBeInTheDocument();
    cleanup();
    fr(<RecipeCard recipe={PEOPLE} {...props} />);
    expect(document.querySelector(".card-servings-unit")).toBeNull();
    expect(document.querySelector(".card-meta")).toHaveTextContent("4");
  });
});

describe("Portions à l'unité — mode cuisine", () => {
  it("la pastille ouverte dit « cookies » au lieu de « parts »", () => {
    fr(<CookMode recipe={COOKIES} onClose={noop} />);
    fireEvent.click(document.querySelector(".portion-badge-value")!);
    expect(document.querySelector(".portion-badge-unit")).toHaveTextContent("cookies");
    // Au-delà des 24 parts habituelles : jusqu'à 99 à l'unité.
    expect(document.querySelectorAll(".portion-badge-step")[1]).not.toBeDisabled();
  });
  it("sans unité : « parts », comme avant", () => {
    fr(<CookMode recipe={PEOPLE} onClose={noop} />);
    fireEvent.click(document.querySelector(".portion-badge-value")!);
    expect(document.querySelector(".portion-badge-unit")).toHaveTextContent("parts");
  });
});

describe("Portions à l'unité — formulaire", () => {
  it("choisir « À l'unité » + « cookies » s'affiche, compte comme modification et s'enregistre", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    fr(<RecipeForm initialRecipe={PEOPLE} onSave={onSave} onClose={onClose} onDelete={noop} />);
    fireEvent.click(screen.getByText("4 pers."));
    fireEvent.click(screen.getByRole("tab", { name: "À l'unité" }));
    fireEvent.click(screen.getByRole("button", { name: "cookies" }));
    expect(screen.getByRole("button", { name: "cookies" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("Enregistrer"));
    expect(screen.getByText("4 cookies")).toBeInTheDocument();
    expect(screen.getByText("Valeurs nutritionnelles (par cookie)")).toBeInTheDocument();

    // Modification non enregistrée : fermer demande confirmation.
    fireEvent.click(screen.getAllByLabelText("Fermer")[0]);
    expect(onClose).not.toHaveBeenCalled();
    cleanup();

    fr(<RecipeForm initialRecipe={PEOPLE} onSave={onSave} onClose={onClose} onDelete={noop} />);
    fireEvent.click(screen.getByText("4 pers."));
    fireEvent.click(screen.getByRole("tab", { name: "À l'unité" }));
    fireEvent.change(screen.getByPlaceholderText("cookies, parts, pots, verrines…"), { target: { value: " verrines " } });
    fireEvent.click(screen.getByText("Enregistrer"));
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ servings: 4, servingsUnit: "verrines" });
  });

  it("revenir à « Personnes » enregistre null", async () => {
    const onSave = vi.fn();
    fr(<RecipeForm initialRecipe={COOKIES} onSave={onSave} onClose={noop} onDelete={noop} />);
    fireEvent.click(screen.getByText("20 cookies"));
    fireEvent.click(screen.getByRole("tab", { name: "Personnes" }));
    fireEvent.click(screen.getByText("Enregistrer"));
    // 20 dépasse la roue des personnes (24 max) : conservé tel quel.
    expect(screen.getByText("20 pers.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Enregistrer les modifications"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ servings: 20, servingsUnit: null });
  });
});
