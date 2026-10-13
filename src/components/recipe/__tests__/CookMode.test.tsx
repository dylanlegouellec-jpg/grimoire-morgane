import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("../../../hooks/useWakeLock", () => ({ default: () => {} }));

import CookMode from "../CookMode";
import { showLocalNotification } from "../../../utils/notifications";
import { getCookTimersSnapshot, resetCookTimersForTests } from "../../../utils/cookTimers";
import type { Recipe } from "../../../hooks/useRecipes";

/* Mode cuisine : minuteurs conservés d'un groupe à l'autre, bandeau des
   minuteurs (retour au groupe, pause, « Terminé », retrait), lecture à voix
   haute (une seule à la fois, sans cocher l'étape). */

const RECIPE = {
  title: "Pot-au-feu",
  servings: 4,
  ingredients: [{ qty: 1, unit: "", name: "bœuf" }],
  steps: [
    { isSection: true, title: "Bouillon" },
    "Faire bouillir l'eau 2 min",
    "Saler",
    { isSection: true, title: "Légumes" },
    "Cuire les carottes 3 min",
  ],
} as unknown as Recipe;

const STEP1 = "Faire bouillir l'eau 2 min";
const card = (text: string) => screen.getByText(text, { selector: ".cookmode-step-text" }).closest(".cookmode-step-card") as HTMLElement;
const timerBtn = (text: string) => card(text).querySelector(".step-timer-btn") as HTMLElement;
const nextGroup = () => fireEvent.click(document.querySelectorAll(".group-nav-btn")[1]);

beforeEach(() => {
  vi.useFakeTimers();
  resetCookTimersForTests();
  vi.mocked(showLocalNotification).mockClear();
});
afterEach(() => {
  cleanup();
  resetCookTimersForTests();
  vi.useRealTimers();
});

describe("CookMode — minuteurs", () => {
  it("garde le minuteur d'un groupe quand on change de groupe et l'affiche dans le bandeau", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(timerBtn(STEP1));
    // Le bouton de minuteur ne coche pas l'étape.
    expect(card(STEP1)).not.toHaveClass("done");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(timerBtn(STEP1)).toHaveTextContent("1:30");

    nextGroup();
    expect(screen.queryByText(STEP1, { selector: ".cookmode-step-text" })).not.toBeInTheDocument();
    const chip = document.querySelector(".cookmode-timer-chip") as HTMLElement;
    expect(chip).toHaveTextContent("1:30");
    expect(chip).toHaveTextContent("Faire bouillir");

    act(() => { vi.advanceTimersByTime(30_000); });
    // Toucher le minuteur du bandeau ramène au groupe de son étape.
    fireEvent.click(chip.querySelector(".cookmode-timer-main")!);
    expect(timerBtn(STEP1)).toHaveTextContent("1:00");
  });

  it("met en pause depuis le bandeau, puis signale la fin une seule fois même hors écran", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(timerBtn(STEP1));
    nextGroup();
    const action = () => document.querySelector(".cookmode-timer-action") as HTMLElement;

    fireEvent.click(action());
    expect(getCookTimersSnapshot().timers[0].status).toBe("paused");
    act(() => { vi.advanceTimersByTime(5 * 60_000); });
    expect(showLocalNotification).not.toHaveBeenCalled();

    fireEvent.click(action());
    act(() => { vi.advanceTimersByTime(3 * 60_000); });
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
    const chip = document.querySelector(".cookmode-timer-chip") as HTMLElement;
    expect(chip).toHaveClass("done");

    // Le bouton « retirer » enlève le minuteur terminé du bandeau.
    fireEvent.click(action());
    expect(document.querySelector(".cookmode-timer-chip")).not.toBeInTheDocument();
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
  });

  it("vide les minuteurs à la fermeture du mode cuisine", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(timerBtn(STEP1));
    expect(getCookTimersSnapshot().timers).toHaveLength(1);
    unmount();
    expect(getCookTimersSnapshot().timers).toHaveLength(0);
  });
});

describe("CookMode — lecture à voix haute", () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  class FakeUtterance {
    text: string;
    lang = "";
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }

  beforeEach(() => {
    speak.mockClear();
    cancel.mockClear();
    Object.defineProperty(window, "speechSynthesis", { value: { speak, cancel }, configurable: true });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  });
  afterEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    vi.unstubAllGlobals();
  });

  const speakBtn = (text: string) => card(text).querySelector(".step-speak-btn") as HTMLElement;

  it("lit l'étape affichée en français sans la cocher, et un second appui l'arrête", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(speakBtn(STEP1));
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe(STEP1);
    expect(utterance.lang).toBe("fr-FR");
    expect(card(STEP1)).not.toHaveClass("done");
    expect(speakBtn(STEP1)).toHaveAttribute("aria-pressed", "true");

    cancel.mockClear();
    fireEvent.click(speakBtn(STEP1));
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speakBtn(STEP1)).toHaveAttribute("aria-pressed", "false");
  });

  it("une seule lecture à la fois, coupée au changement de groupe et à la fermeture", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    fireEvent.click(speakBtn(STEP1));
    cancel.mockClear();
    fireEvent.click(speakBtn("Saler"));
    expect(cancel).toHaveBeenCalled();
    expect(speakBtn(STEP1)).toHaveAttribute("aria-pressed", "false");
    expect(speakBtn("Saler")).toHaveAttribute("aria-pressed", "true");
    // La fin (via cancel) de l'ancienne lecture ne réinitialise pas la nouvelle.
    act(() => { (speak.mock.calls[0][0] as FakeUtterance).onend?.(); });
    expect(speakBtn("Saler")).toHaveAttribute("aria-pressed", "true");

    cancel.mockClear();
    nextGroup();
    expect(cancel).toHaveBeenCalled();
    cancel.mockClear();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("n'affiche pas le bouton sans synthèse vocale", () => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    expect(document.querySelector(".step-speak-btn")).not.toBeInTheDocument();
  });
});
