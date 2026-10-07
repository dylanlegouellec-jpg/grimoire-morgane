import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdateBanner from "../UpdateBanner";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { notifyUpdateAvailable, registerUpdateHandler, resetAppUpdateForTests } from "../../../utils/appUpdate";

function renderBanner(language = "fr") {
  return render(
    <LanguageProvider language={language}>
      <UpdateBanner />
    </LanguageProvider>
  );
}

afterEach(() => {
  cleanup();
  resetAppUpdateForTests();
});

describe("UpdateBanner", () => {
  it("n'affiche rien tant qu'aucune nouvelle version n'attend", () => {
    renderBanner();
    expect(screen.queryByText("Nouvelle version disponible")).not.toBeInTheDocument();
  });

  it("apparaît quand une nouvelle version est prête", () => {
    renderBanner();
    act(() => notifyUpdateAvailable());
    expect(screen.getByText("Nouvelle version disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recharger" })).toBeInTheDocument();
  });

  it("« Recharger » applique la mise à jour (et recharge la page)", async () => {
    const user = userEvent.setup();
    const apply = vi.fn().mockResolvedValue(undefined);
    registerUpdateHandler(apply);
    renderBanner();
    act(() => notifyUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "Recharger" }));
    expect(apply).toHaveBeenCalledWith(true);
  });

  it("ne recharge jamais tout seul", () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    registerUpdateHandler(apply);
    renderBanner();
    act(() => notifyUpdateAvailable());
    expect(apply).not.toHaveBeenCalled();
  });

  it("« Plus tard » masque le bandeau sans appliquer la mise à jour", async () => {
    const user = userEvent.setup();
    const apply = vi.fn().mockResolvedValue(undefined);
    registerUpdateHandler(apply);
    renderBanner();
    act(() => notifyUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(screen.queryByText("Nouvelle version disponible")).not.toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
  });

  it("s'affiche en anglais", () => {
    renderBanner("en");
    act(() => notifyUpdateAvailable());
    expect(screen.getByText("New version available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
