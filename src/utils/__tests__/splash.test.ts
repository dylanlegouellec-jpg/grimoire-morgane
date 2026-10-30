import { describe, it, expect, vi, afterEach } from "vitest";
import { dismissSplash } from "../splash";

describe("dismissSplash", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("ne fait rien (sans erreur) quand #splash n'existe pas", () => {
    expect(() => dismissSplash()).not.toThrow();
  });

  it("lance le fondu tout de suite, puis retire l'élément du DOM", () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="splash"></div>';
    dismissSplash();
    const el = document.getElementById("splash");
    expect(el?.classList.contains("splash-leaving")).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("splash")).toBeNull();
  });

  it("attend la fin de l'animation du cookie (data-min-ms) avant le fondu", () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(500);
    document.body.innerHTML = '<div id="splash" data-min-ms="1750"></div>';
    dismissSplash();
    const el = document.getElementById("splash");
    expect(el?.classList.contains("splash-leaving")).toBe(false);
    vi.advanceTimersByTime(1250);
    expect(el?.classList.contains("splash-leaving")).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("splash")).toBeNull();
    vi.restoreAllMocks();
  });

  it("n'attend pas quand l'animation a déjà eu son temps", () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(3000);
    document.body.innerHTML = '<div id="splash" data-min-ms="1750"></div>';
    dismissSplash();
    expect(document.getElementById("splash")?.classList.contains("splash-leaving")).toBe(true);
    vi.restoreAllMocks();
  });

  it("est idempotent : un second appel pendant le fondu ne relance rien", () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="splash"></div>';
    const timeoutSpy = vi.spyOn(window, "setTimeout");
    dismissSplash();
    dismissSplash();
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    timeoutSpy.mockRestore();
  });
});
