import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isChunkLoadError, reloadOnceForChunkError } from "../chunkReload";

describe("isChunkLoadError", () => {
  it("reconnaît les messages d'un morceau d'app introuvable (Chrome, Safari, Firefox, Webpack)", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/A-1.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 12 failed."))).toBe(true);
  });

  it("ignore les autres erreurs", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'steps')"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("reloadOnceForChunkError", () => {
  const reload = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, reload } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("recharge la page la première fois", () => {
    expect(reloadOnceForChunkError(1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ne recharge pas une seconde fois de suite (pas de boucle)", () => {
    reloadOnceForChunkError(1_000_000);
    expect(reloadOnceForChunkError(1_005_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("peut recharger de nouveau bien plus tard", () => {
    reloadOnceForChunkError(1_000_000);
    expect(reloadOnceForChunkError(1_000_000 + 31_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
