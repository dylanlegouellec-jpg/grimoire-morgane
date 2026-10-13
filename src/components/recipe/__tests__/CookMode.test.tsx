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
   haute par appui long sur une étape (une seule à la fois, sans cocher
   l'étape ; appui court = cocher), disposition en deux colonnes. */

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

  const PRESS = 400;
  // Appui long au doigt : touchstart, attente, touchend, puis le clic que
  // le navigateur émet encore au relâchement.
  const longPress = (el: HTMLElement) => {
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => { vi.advanceTimersByTime(PRESS + 50); });
    fireEvent.touchEnd(el);
    // Événements souris « de compatibilité » émis par Chrome/Safari au
    // relâchement — y compris après un appui plus long que 1 s.
    fireEvent.mouseDown(el);
    fireEvent.mouseUp(el);
    fireEvent.click(el);
  };

  it("un appui long lit l'étape en français sans la cocher, un second l'arrête", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    expect(document.querySelector(".step-speak-btn")).not.toBeInTheDocument();
    longPress(card(STEP1));
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe(STEP1);
    expect(utterance.lang).toBe("fr-FR");
    expect(card(STEP1)).not.toHaveClass("done");
    expect(card(STEP1)).toHaveClass("speaking");

    cancel.mockClear();
    longPress(card(STEP1));
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(card(STEP1)).not.toHaveClass("speaking");
    expect(card(STEP1)).not.toHaveClass("done");
  });

  it("un appui court coche l'étape sans lire, et le clic suivant un appui long ne coche pas", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    fireEvent.touchStart(card(STEP1), { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.touchEnd(card(STEP1));
    fireEvent.click(card(STEP1));
    expect(card(STEP1)).toHaveClass("done");
    expect(card(STEP1)).toHaveAttribute("aria-checked", "true");
    act(() => { vi.advanceTimersByTime(PRESS * 2); });
    expect(speak).not.toHaveBeenCalled();

    // Appui long sur une étape cochée : lecture, l'étape reste cochée.
    longPress(card(STEP1));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(card(STEP1)).toHaveClass("done");
  });

  it("appui long à la souris (ordinateur) : lit sans cocher", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    fireEvent.mouseDown(card("Saler"));
    act(() => { vi.advanceTimersByTime(PRESS + 50); });
    fireEvent.mouseUp(card("Saler"));
    fireEvent.click(card("Saler"));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(card("Saler")).not.toHaveClass("done");
  });

  it("appui très long (plus d'une seconde) : toujours pas de coche au relâchement", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    fireEvent.touchStart(card(STEP1), { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => { vi.advanceTimersByTime(1500); });
    fireEvent.touchEnd(card(STEP1));
    fireEvent.mouseDown(card(STEP1));
    fireEvent.mouseUp(card(STEP1));
    fireEvent.click(card(STEP1));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(card(STEP1)).not.toHaveClass("done");
  });

  it("le doigt qui défile annule l'appui long (pas de lecture)", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    fireEvent.touchStart(card(STEP1), { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(card(STEP1), { touches: [{ clientX: 10, clientY: 40 }] });
    act(() => { vi.advanceTimersByTime(PRESS + 50); });
    fireEvent.touchEnd(card(STEP1));
    expect(speak).not.toHaveBeenCalled();
  });

  it("clavier : Entrée / Espace cochent, l'astuce d'appui long est annoncée", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    const c = card(STEP1);
    expect(c).toHaveAttribute("role", "checkbox");
    expect(c).toHaveAttribute("tabindex", "0");
    expect(c).toHaveAttribute("aria-description");
    fireEvent.keyDown(c, { key: "Enter" });
    expect(card(STEP1)).toHaveClass("done");
    fireEvent.keyDown(card(STEP1), { key: " " });
    expect(card(STEP1)).not.toHaveClass("done");
    expect(speak).not.toHaveBeenCalled();
  });

  it("une seule lecture à la fois, coupée au changement de groupe et à la fermeture", () => {
    const { unmount } = render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    longPress(card(STEP1));
    cancel.mockClear();
    longPress(card("Saler"));
    expect(cancel).toHaveBeenCalled();
    expect(card(STEP1)).not.toHaveClass("speaking");
    expect(card("Saler")).toHaveClass("speaking");
    // La fin (via cancel) de l'ancienne lecture ne réinitialise pas la nouvelle.
    act(() => { (speak.mock.calls[0][0] as FakeUtterance).onend?.(); });
    expect(card("Saler")).toHaveClass("speaking");
    // Fin naturelle de la lecture en cours : l'indice visuel disparaît.
    act(() => { (speak.mock.calls[1][0] as FakeUtterance).onend?.(); });
    expect(card("Saler")).not.toHaveClass("speaking");

    cancel.mockClear();
    nextGroup();
    expect(cancel).toHaveBeenCalled();
    cancel.mockClear();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("sans synthèse vocale : l'appui long ne lit rien et l'étape reste cochable", () => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    render(<CookMode recipe={RECIPE} onClose={() => {}} pressDuration={PRESS} />);
    expect(card(STEP1)).not.toHaveAttribute("aria-description");
    longPress(card(STEP1));
    expect(speak).not.toHaveBeenCalled();
    // Pas d'appui long possible : le relâchement compte comme un appui court.
    expect(card(STEP1)).toHaveClass("done");
  });
});

describe("CookMode — disposition", () => {
  it("colonne latérale (titre, ingrédients) et colonne principale (étapes)", () => {
    render(<CookMode recipe={RECIPE} onClose={() => {}} />);
    const side = document.querySelector(".cookmode-side") as HTMLElement;
    const main = document.querySelector(".cookmode-main") as HTMLElement;
    expect(side.querySelector(".dropcap-title")).toBeInTheDocument();
    expect(side.querySelector(".cookmode-ingredients-header")).toBeInTheDocument();
    expect(main.querySelector(".cookmode-steps")).toBeInTheDocument();
    // Le bouton fermer reste hors des colonnes défilantes.
    expect(document.querySelector(".cookmode > .modal-close")).toBeInTheDocument();
  });
});
