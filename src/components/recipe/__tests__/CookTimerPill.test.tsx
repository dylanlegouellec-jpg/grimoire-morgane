import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

import { MotionGlobalConfig } from "motion/react";
import CookTimerPill from "../CookTimerPill";
import { showLocalNotification } from "../../../utils/notifications";
import { getCookTimersSnapshot, resetCookTimersForTests, startCookTimer, clearCookTimers } from "../../../utils/cookTimers";
import type { Recipe } from "../../../hooks/useRecipes";

/* Minuteur flottant : visible hors du mode cuisine tant qu'un minuteur
   existe, rouvre la bonne recette, passe en « terminé », s'arrête par sa
   croix et disparaît quand il n'y a plus rien. */

const RECIPES = [
  { id: "r1", title: "Crêpes", servings: 4, ingredients: [], steps: [] },
  { id: "r2", title: "Gaufres", servings: 4, ingredients: [], steps: [] },
] as unknown as Recipe[];

const pill = () => document.querySelector(".cook-timer-pill") as HTMLElement | null;

// Animations instantanées : la sortie d'AnimatePresence se termine aussitôt.
MotionGlobalConfig.skipAnimations = true;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  resetCookTimersForTests();
  vi.mocked(showLocalNotification).mockClear();
});
afterEach(() => {
  cleanup();
  resetCookTimersForTests();
  vi.useRealTimers();
});

// AnimatePresence retire l'élément à la fin de son fondu de sortie, image
// par image : ces tests-là tournent donc sur la vraie horloge.
const waitGone = () => waitFor(() => expect(pill()).not.toBeInTheDocument(), { timeout: 2000 });

describe("CookTimerPill", () => {
  it("n'apparaît pas sans minuteur", () => {
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={() => {}} />);
    expect(pill()).not.toBeInTheDocument();
  });

  it("montre le plus proche avec « +N » et rouvre la bonne recette", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1", label: "Reposer" });
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 3, recipeId: "r2", label: "Cuire" });
    const onOpen = vi.fn();
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={onOpen} />);
    // Rendue dans <body> (BodyPortal), hors de l'arbre du composant.
    expect(pill()?.parentElement).toBe(document.body);
    expect(pill()).toHaveTextContent("3:00");
    expect(pill()!.querySelector(".cook-timer-pill-more")).toBeInTheDocument();
    fireEvent.click(pill()!.querySelector(".cook-timer-pill-main")!);
    expect(onOpen).toHaveBeenCalledWith(RECIPES[1]);
  });

  it("mode cuisine ouvert : ne montre que les autres recettes, au-dessus du mode cuisine", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    const { rerender } = render(<CookTimerPill recipes={RECIPES} cookingRecipeId="r1" onOpenRecipe={() => {}} />);
    expect(pill()).not.toBeInTheDocument();
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 5, recipeId: "r2" });
    rerender(<CookTimerPill recipes={RECIPES} cookingRecipeId="r1" onOpenRecipe={() => {}} />);
    expect(pill()).toHaveClass("over-cookmode");
    expect(pill()).toHaveTextContent("5:00");
  });

  it("passe en « terminé » à la fin (notification partie) et l'appui rouvre la recette", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1, recipeId: "r1" });
    const onOpen = vi.fn();
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={onOpen} />);
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(pill()).toHaveClass("done");
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
    fireEvent.click(pill()!.querySelector(".cook-timer-pill-main")!);
    expect(onOpen).toHaveBeenCalledWith(RECIPES[0]);
  });

  it("la croix arrête tout et la pastille disparaît", async () => {
    vi.useRealTimers();
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 5, recipeId: "r2" });
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={() => {}} />);
    fireEvent.click(pill()!.querySelector(".cook-timer-pill-stop")!);
    expect(getCookTimersSnapshot().timers).toHaveLength(0);
    await waitGone();
  });

  it("disparaît quand le dernier minuteur est retiré ailleurs", async () => {
    vi.useRealTimers();
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={() => {}} />);
    expect(pill()).toBeInTheDocument();
    act(() => { clearCookTimers(); });
    await waitGone();
  });

  it("recette supprimée entre-temps : l'appui acquitte ses minuteurs", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "gone" });
    const onOpen = vi.fn();
    render(<CookTimerPill recipes={RECIPES} cookingRecipeId={null} onOpenRecipe={onOpen} />);
    fireEvent.click(pill()!.querySelector(".cook-timer-pill-main")!);
    expect(onOpen).not.toHaveBeenCalled();
    expect(getCookTimersSnapshot().timers).toHaveLength(0);
  });
});
