import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../utils/supabaseClient", () => ({
  getSupabaseClient: () => null,
}));

import DiagnosticsPanelModal from "../DiagnosticsPanelModal";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { isForceOfflineForDebug, setForceOfflineForDebug } from "../../../utils/supabase";
import { installDevLog } from "../../../utils/devLog";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : le panneau ne doit jamais tenter de vraie requête        */
/*  réseau pendant les tests (ping Supabase, volumétrie des tables) —      */
/*  fetch est donc systématiquement mocké pour échouer instantanément       */
/*  plutôt que de laisser le vrai timeout (8s) ralentir la suite.             */
/* ------------------------------------------------------------------ */

function renderModal(showToast = vi.fn()) {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  return render(
    <LanguageProvider language="fr">
      <DiagnosticsPanelModal onClose={() => {}} showToast={showToast} onResetOnboarding={() => {}} />
    </LanguageProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setForceOfflineForDebug(false);
});

describe("DiagnosticsPanelModal", () => {
  it("affiche les quatre sections attendues", () => {
    renderModal();
    expect(screen.getByText("Panneau de diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Performance & fluidité en direct")).toBeInTheDocument();
    expect(screen.getByText("Stockage appareil")).toBeInTheDocument();
    expect(screen.getByText("Monitoring & base de données Supabase")).toBeInTheDocument();
    expect(screen.getByText("Outils de debug & logs")).toBeInTheDocument();
  });

  it("affiche 'Non disponible' pour la mémoire quand performance.memory n'existe pas (jsdom)", () => {
    renderModal();
    // jsdom n'implémente pas performance.memory (API Chrome uniquement) —
    // le repli explicite doit s'afficher plutôt qu'une valeur erronée.
    expect(screen.getAllByText("Non disponible").length).toBeGreaterThan(0);
  });

  it("la bascule 'Simuler le mode hors-ligne' met à jour le drapeau de debug global", async () => {
    // La transition visuelle "En ligne" → "Hors ligne" dépend de
    // useConnectionStatus, qui exige volontairement DEUX échecs de ping
    // consécutifs avant de conclure (voir son commentaire de fichier) —
    // hors sujet ici : seul l'effet de la bascule elle-même (le drapeau
    // global lu par isOffline()/pingSupabase, voir supabase.js) est vérifié.
    const user = userEvent.setup();
    renderModal();
    expect(isForceOfflineForDebug()).toBe(false);

    await user.click(screen.getByRole("switch", { name: "Simuler le mode hors-ligne" }));

    expect(isForceOfflineForDebug()).toBe(true);
  });

  it("une action destructive demande une double confirmation avant de s'exécuter", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    renderModal(showToast);

    const button = screen.getByText("Vider le cache image");
    await user.click(button);
    expect(screen.getByText("Confirmer ?")).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();

    await user.click(screen.getByText("Confirmer ?"));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Cache image vidé.");
    });
  });

  it("affiche les nouvelles entrées du journal de debug en direct", async () => {
    renderModal();
    expect(screen.getByText("Aucun événement pour l'instant.")).toBeInTheDocument();

    installDevLog();
    act(() => { console.error("Erreur de test diagnostics"); });

    await waitFor(() => {
      expect(screen.getByText(/Erreur de test diagnostics/)).toBeInTheDocument();
    });
  });
});
