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
