import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary (filet global)", () => {
  const reload = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, reload } });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("affiche l'écran d'erreur avec le détail du message, sans recharger pour une erreur ordinaire", () => {
    render(<ErrorBoundary><Boom message="Cannot read properties of undefined" /></ErrorBoundary>);
    expect(screen.getByText(/Une erreur inattendue est survenue/)).toBeTruthy();
    expect(screen.getByText("Cannot read properties of undefined")).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it("recharge automatiquement une fois quand un morceau d'app est introuvable", () => {
    render(<ErrorBoundary><Boom message="Failed to fetch dynamically imported module: https://x/assets/Settings-1.js" /></ErrorBoundary>);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ne reboucle pas : un second échec juste après affiche l'écran d'erreur sans recharger", () => {
    const message = "Failed to fetch dynamically imported module: https://x/assets/Settings-1.js";
    render(<ErrorBoundary><Boom message={message} /></ErrorBoundary>);
    render(<ErrorBoundary><Boom message={message} /></ErrorBoundary>);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
