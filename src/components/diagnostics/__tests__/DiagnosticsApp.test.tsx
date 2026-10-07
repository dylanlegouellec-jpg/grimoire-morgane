import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../utils/supabaseClient", () => ({
  getSupabaseClient: () => null,
}));

import DiagnosticsPanelModal from "../DiagnosticsPanelModal";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { installDevLog, clearDevLog } from "../../../utils/devLog";
import { markSyncSuccess, resetSyncStatusForTests } from "../../../utils/syncStatus";

/* ------------------------------------------------------------------ */
/*  Les sections ajoutées au Panneau de Diagnostics : Application,         */
/*  Appareil & performance, boutons (mises à jour, rapport), filtre de la     */
/*  console.                                                                    */
/* ------------------------------------------------------------------ */

function renderModal(props: { showToast?: (m: string) => void; accountEmail?: string | null; householdName?: string | null } = {}) {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  return render(
    <LanguageProvider language="fr">
      <DiagnosticsPanelModal
        onClose={() => {}}
        showToast={props.showToast ?? vi.fn()}
        onResetOnboarding={() => {}}
        accountEmail={props.accountEmail ?? null}
        householdName={props.householdName ?? null}
      />
    </LanguageProvider>
  );
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // @ts-expect-error — retire les faux posés par un test (propriété normalement en lecture seule)
  delete navigator.serviceWorker;
  // @ts-expect-error — idem pour le presse-papiers
  delete navigator.clipboard;
  act(() => clearDevLog());
  resetSyncStatusForTests();
});

describe("Application et appareil", () => {
  it("affiche la version, le mode et l'état du service worker", async () => {
    renderModal();
    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("Mode")).toBeInTheDocument();
    // jsdom : navigateur ordinaire, sans service worker.
    expect(screen.getByText("Navigateur", { selector: ".diagnostics-metric-value" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("non pris en charge")).toBeInTheDocument());
  });

  it("affiche l'appareil : écran, fenêtre, langue, réseau, navigateur, chargement", async () => {
    renderModal();
    expect(screen.getByText("Appareil & performance")).toBeInTheDocument();
    for (const label of ["Écran", "Fenêtre", "Langue / fuseau", "Réseau", "Chargement de la page", "Ressources chargées"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Attend la lecture asynchrone du service worker : sans ça, le test se
    // termine avant, et la mise à jour d'affichage arrive hors de act().
    await waitFor(() => expect(screen.getByText("non pris en charge")).toBeInTheDocument());
  });
});

describe("Mises à jour", () => {
  it("« Vérifier les mises à jour » prévient quand il n'y a pas de service worker", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    renderModal({ showToast });
    await user.click(screen.getByText("Vérifier les mises à jour"));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Vérification impossible (pas de service worker)."));
  });

  it("dit que l'app est à jour quand le service worker ne trouve rien de nouveau", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { controller: {}, getRegistration: vi.fn().mockResolvedValue({ active: {}, update: vi.fn().mockResolvedValue(undefined) }) },
      configurable: true,
    });
    renderModal({ showToast });
    await user.click(screen.getByText("Vérifier les mises à jour"));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("L'app est à jour."));
  });

  it("« Forcer la mise à jour » demande une confirmation avant de tout vider", async () => {
    const user = userEvent.setup();
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistration: vi.fn().mockResolvedValue(undefined), getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
      configurable: true,
    });
    renderModal();
    await user.click(screen.getByText("Forcer la mise à jour"));
    expect(unregister).not.toHaveBeenCalled();
    expect(screen.getByText("Confirmer ?")).toBeInTheDocument();
  });
});

describe("Rapport", () => {
  it("« Copier le rapport » copie un texte complet et prévient", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    const writeText = stubClipboard();
    renderModal({ showToast, accountEmail: "morgane@example.com", householdName: "Chez nous" });

    await user.click(screen.getByText("Copier le rapport"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Rapport copié."));
    const report = writeText.mock.calls[0][0] as string;
    expect(report).toContain("Rapport de diagnostic — Le Grimoire de Morgane");
    expect(report).toContain("[Application]");
    expect(report).toContain("[Appareil & performance]");
    expect(report).toContain("[Monitoring & base de données Supabase]");
    expect(report).toContain("Compte : morgane@example.com");
    expect(report).toContain("Foyer : Chez nous");
    expect(report).toContain("[Journal");
  });

  it("prévient quand la copie échoue", async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("refusé")) }, configurable: true });
    renderModal({ showToast });
    await user.click(screen.getByText("Copier le rapport"));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Copie impossible."));
  });
});

describe("Dernière synchro", () => {
  it("dit qu'aucune synchro n'a eu lieu sur cet appareil", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderModal();
    await user.click(screen.getByText("Copier le rapport"));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain("Dernière synchro : aucune sur cet appareil");
  });

  it("donne l'heure de la dernière synchro réussie et le temps écoulé", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    markSyncSuccess(Date.now());
    renderModal();
    await user.click(screen.getByText("Copier le rapport"));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toMatch(/Dernière synchro : .+ · à l'instant/);
  });
});

describe("Console : filtre par niveau", () => {
  it("n'affiche que le niveau choisi, et tout avec « Tout »", async () => {
    const user = userEvent.setup();
    renderModal();
    installDevLog();
    act(() => {
      console.error("msg-erreur");
      console.warn("msg-avertissement");
    });
    await waitFor(() => expect(screen.getByText(/msg-erreur/)).toBeInTheDocument());
    expect(screen.getByText(/msg-avertissement/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "error" }));
    expect(screen.getByText(/msg-erreur/)).toBeInTheDocument();
    expect(screen.queryByText(/msg-avertissement/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Tout" }));
    expect(screen.getByText(/msg-avertissement/)).toBeInTheDocument();
  });
});
