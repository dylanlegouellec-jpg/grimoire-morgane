import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("../../../hooks/useWakeLock", () => ({ default: () => {} }));
// Mouvement réduit : les nombres sautent directement à leur valeur (pas
// d'animation à attendre image par image dans jsdom).
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

import CookMode from "../CookMode";
import { getCookTimersSnapshot, resetCookTimersForTests } from "../../../utils/cookTimers";
import type { Recipe } from "../../../hooks/useRecipes";

/* Mode cuisine : sélecteur de parts au simple appui (quantités recalculées),
   parts reçues de la fiche, minuteurs qui survivent à la fermeture et
   préparation reprise en rouvrant la même recette. */

const RECIPE = {
  id: "r1",
  title: "Crêpes",
  servings: 4,
  ingredients: [
    { qty: 250, unit: "g", name: "farine" },
    { qty: 0.5, unit: "l", name: "lait" },
    { qty: null, unit: "", name: "sel" },
  ],
  steps: ["Mélanger", "Laisser reposer 2 min"],
} as unknown as Recipe;

const OTHER = { ...RECIPE, id: "r2", title: "Gaufres", steps: ["Cuire 3 min"] } as unknown as Recipe;

const qtys = () => Array.from(document.querySelectorAll(".cookmode-qty")).map((el) => el.textContent);
const badge = () => document.querySelector(".portion-badge-value") as HTMLElement;
const card = (text: string) => screen.getByText(text, { selector: ".cookmode-step-text" }).closest(".cookmode-step-card") as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  resetCookTimersForTests();
});
afterEach(() => {
  cleanup();
  resetCookTimersForTests();
  vi.useRealTimers();
});

describe("CookMode — parts", () => {
  it("un appui sur la pastille ouvre le sélecteur, + / − recalculent les quantités", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    expect(badge()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(badge());
    expect(badge()).toHaveAttribute("aria-expanded", "true");
    // Les ingrédients s'affichent pour voir les quantités changer.
    expect(qtys()).toEqual(["250", "0.5"]);
    expect(document.querySelector(".cookmode")).toHaveClass("portions-open");
    expect(document.querySelector(".cookmode-portions-scrim")).toBeInTheDocument();

    const [minus, plus] = document.querySelectorAll(".portion-badge-step");
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(document.querySelector(".portion-badge-number")).toHaveTextContent("6");
    expect(qtys()).toEqual(["375", "0.75"]);
    fireEvent.click(minus);
    expect(qtys()).toEqual(["312.5", "0.63"]);
    // Ingrédient sans quantité : pas de « 0 » affiché.
    expect(screen.getByText(/sel/).textContent).toBe("sel");
  });

  it("ne descend pas sous une part", () => {
    render(<CookMode recipe={{ ...RECIPE, servings: 1 } as Recipe} onClose={() => {}} />);
    fireEvent.click(badge());
    const minus = document.querySelectorAll(".portion-badge-step")[0];
    expect(minus).toBeDisabled();
  });

  it("toucher une quantité ouvre aussi le sélecteur ; un appui à côté le referme", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /ingrédients/i }));
    fireEvent.click(document.querySelector(".cookmode-qty")!);
    expect(badge()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(document.querySelector(".cookmode-portions-scrim")!);
    expect(badge()).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".cookmode")).not.toHaveClass("portions-open");
  });

  it("Échap referme le sélecteur", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(badge());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(badge()).toHaveAttribute("aria-expanded", "false");
  });

  it("démarre avec les parts choisies sur la fiche", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} initialServings={2} />);
    expect(document.querySelector(".portion-badge-number")).toHaveTextContent("2");
    fireEvent.click(badge());
    expect(qtys()).toEqual(["125", "0.25"]);
  });
});

describe("CookMode — minuteurs hors du mode cuisine", () => {
  it("les minuteurs qui tournent survivent à la fermeture et la préparation est reprise", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} initialServings={6} />);
    fireEvent.click(card("Mélanger"));
    fireEvent.click(card("Laisser reposer 2 min").querySelector(".step-timer-btn")!);
    unmount();
    const [timer] = getCookTimersSnapshot().timers;
    expect(timer.recipeId).toBe("r1");
    expect(timer.status).toBe("running");

    act(() => { vi.advanceTimersByTime(30_000); });
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    // Bandeau retrouvé, étape cochée et parts conservées.
    expect(document.querySelector(".cookmode-timer-chip")).toHaveTextContent("1:30");
    expect(card("Mélanger")).toHaveClass("done");
    expect(document.querySelector(".portion-badge-number")).toHaveTextContent("6");
  });

  it("un minuteur déjà terminé est retiré à la fermeture", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(card("Laisser reposer 2 min").querySelector(".step-timer-btn")!);
    act(() => { vi.advanceTimersByTime(2 * 60_000 + 1_000); });
    unmount();
    expect(getCookTimersSnapshot().timers).toHaveLength(0);
    // Plus de minuteur : la préparation suivante repart de zéro.
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    expect(card("Mélanger")).not.toHaveClass("done");
  });

  it("le mode cuisine d'une autre recette garde les minuteurs mais n'affiche que les siens", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(card("Laisser reposer 2 min").querySelector(".step-timer-btn")!);
    unmount();
    render(<CookMode recipe={OTHER} onClose={() => {}} />);
    expect(document.querySelector(".cookmode-timer-chip")).not.toBeInTheDocument();
    fireEvent.click(card("Cuire 3 min").querySelector(".step-timer-btn")!);
    expect(document.querySelectorAll(".cookmode-timer-chip")).toHaveLength(1);
    expect(getCookTimersSnapshot().timers.map((tm) => tm.recipeId)).toEqual(["r1", "r2"]);
  });
});
