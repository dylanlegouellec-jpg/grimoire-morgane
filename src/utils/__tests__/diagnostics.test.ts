import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildDiagnosticsReport,
  checkForUpdates,
  forceUpdate,
  formatBytes,
  getBuildInfo,
  getDeviceInfo,
  getDisplayMode,
  getPageLoadInfo,
  getServiceWorkerInfo,
  timeAgo,
} from "../diagnostics";

/* ------------------------------------------------------------------ */
/*  Les outils de diagnostic de l'app (utils/diagnostics.ts). jsdom n'a    */
/*  ni service worker ni Cache Storage : on les remplace par de petits      */
/*  faux, comme le ferait un navigateur réel.                                 */
/* ------------------------------------------------------------------ */

function stubServiceWorker(container: Partial<ServiceWorkerContainer> | undefined) {
  Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });
}

afterEach(() => {
  // @ts-expect-error — retire le faux posé par un test
  delete navigator.serviceWorker;
  document.documentElement.removeAttribute("data-standalone");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("formatBytes", () => {
  it("formate les octets, Ko, Mo et Go, et les valeurs absentes", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2.0 Ko");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 Mo");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 Go");
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(NaN)).toBe("—");
  });
});

describe("getBuildInfo", () => {
  it("lit la version injectée au build (vitest.config.ts)", () => {
    const info = getBuildInfo();
    expect(info.commit).toMatch(/^([0-9a-f]{7}|dev)$/);
    expect(new Date(info.builtAt).getTime()).not.toBeNaN();
  });
});

describe("getDisplayMode", () => {
  it("dit « browser » par défaut et « standalone » quand main.tsx a posé le repère", () => {
    expect(getDisplayMode()).toBe("browser");
    document.documentElement.setAttribute("data-standalone", "true");
    expect(getDisplayMode()).toBe("standalone");
  });
});

describe("getDeviceInfo", () => {
  it("décrit la fenêtre et déduit l'orientation de ses dimensions", () => {
    Object.defineProperty(window, "innerWidth", { value: 402, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 812, configurable: true });
    const portrait = getDeviceInfo();
    expect(portrait.viewport).toBe("402×812");
    expect(portrait.orientation).toBe("portrait");

    Object.defineProperty(window, "innerWidth", { value: 812, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 402, configurable: true });
    expect(getDeviceInfo().orientation).toBe("landscape");
  });

  it("n'annonce un type de connexion que si le navigateur l'expose", () => {
    expect(getDeviceInfo().connection).toBeNull();
    Object.defineProperty(navigator, "connection", { value: { effectiveType: "4g" }, configurable: true });
    expect(getDeviceInfo().connection).toBe("4g");
    // @ts-expect-error — retire le faux
    delete navigator.connection;
  });
});

describe("getServiceWorkerInfo", () => {
  it("signale l'absence de prise en charge", async () => {
    expect(await getServiceWorkerInfo()).toEqual({ state: "unsupported", controlling: false });
  });

  it("distingue absent, actif qui contrôle la page, et mise à jour en attente", async () => {
    stubServiceWorker({ controller: null, getRegistration: vi.fn().mockResolvedValue(undefined) });
    expect(await getServiceWorkerInfo()).toEqual({ state: "none", controlling: false });

    stubServiceWorker({ controller: {} as ServiceWorker, getRegistration: vi.fn().mockResolvedValue({ active: {} }) });
    expect(await getServiceWorkerInfo()).toEqual({ state: "active", controlling: true });

    stubServiceWorker({ controller: {} as ServiceWorker, getRegistration: vi.fn().mockResolvedValue({ active: {}, waiting: {} }) });
    expect((await getServiceWorkerInfo()).state).toBe("waiting");
  });
});

describe("checkForUpdates", () => {
  it("renvoie « unsupported » sans service worker", async () => {
    expect(await checkForUpdates()).toBe("unsupported");
  });

  it("renvoie « up-to-date » quand rien de nouveau n'est trouvé, « update-found » sinon", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    stubServiceWorker({ getRegistration: vi.fn().mockResolvedValue({ update }) });
    expect(await checkForUpdates()).toBe("up-to-date");
    expect(update).toHaveBeenCalledTimes(1);

    stubServiceWorker({ getRegistration: vi.fn().mockResolvedValue({ update, installing: {} }) });
    expect(await checkForUpdates()).toBe("update-found");
  });
});

describe("forceUpdate", () => {
  it("désinscrit les service workers, vide les caches, puis recharge", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    stubServiceWorker({ getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]) });
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue(["precache", "images"]), delete: deleteCache });
    const reload = vi.fn();

    await forceUpdate(reload);

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith("precache");
    expect(deleteCache).toHaveBeenCalledWith("images");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("recharge quand même sans service worker ni cache", async () => {
    const reload = vi.fn();
    await forceUpdate(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("getPageLoadInfo", () => {
  it("résume la navigation et les ressources chargées", () => {
    vi.stubGlobal("performance", {
      getEntriesByType: (type: string) =>
        type === "navigation"
          ? [{ domContentLoadedEventEnd: 59.4, loadEventEnd: 67.2 }]
          : [{ transferSize: 1024 }, { transferSize: 2048 }, { transferSize: 0 }],
    });
    expect(getPageLoadInfo()).toEqual({ domContentLoadedMs: 59, loadMs: 67, resourceCount: 3, resourceBytes: 3072 });
  });

  it("renvoie des valeurs vides quand l'API n'existe pas", () => {
    vi.stubGlobal("performance", {});
    expect(getPageLoadInfo()).toEqual({ domContentLoadedMs: null, loadMs: null, resourceCount: 0, resourceBytes: null });
  });
});

describe("buildDiagnosticsReport", () => {
  const generatedAt = new Date("2026-10-07T20:24:25");

  it("réunit le titre, les sections et les derniers événements du journal", () => {
    const report = buildDiagnosticsReport({
      generatedAt,
      sections: [
        { title: "Application", rows: [["Version", "f986dbc"], ["Mode", "Navigateur"]] },
        { title: "Réseau", rows: [["État", "en ligne"]] },
      ],
      logs: [{ id: "1", level: "error", message: "Boum", ts: generatedAt.getTime() }],
    });
    expect(report).toContain("Rapport de diagnostic — Le Grimoire de Morgane");
    expect(report).toContain("[Application]\nVersion : f986dbc\nMode : Navigateur");
    expect(report).toContain("[Réseau]\nÉtat : en ligne");
    expect(report).toContain("[Journal — 1 dernier événement]");
    expect(report).toMatch(/\[error\] Boum/);
  });

  it("accorde le pluriel et indique un journal vide", () => {
    const empty = buildDiagnosticsReport({ generatedAt, sections: [], logs: [] });
    expect(empty).toContain("[Journal — 0 dernier événement]");
    expect(empty).toContain("(vide)");
    const two = buildDiagnosticsReport({
      generatedAt,
      sections: [],
      logs: [
        { id: "1", level: "log", message: "a", ts: 0 },
        { id: "2", level: "warn", message: "b", ts: 0 },
      ],
    });
    expect(two).toContain("[Journal — 2 derniers événements]");
  });
});

describe("timeAgo", () => {
  const now = 1_700_000_000_000;
  const MINUTE = 60_000;

  it("distingue « à l'instant », minutes, heures et jours", () => {
    expect(timeAgo(now - 20_000, now)).toEqual({ unit: "now", count: 0 });
    expect(timeAgo(now - 5 * MINUTE, now)).toEqual({ unit: "minutes", count: 5 });
    expect(timeAgo(now - 59 * MINUTE, now)).toEqual({ unit: "minutes", count: 59 });
    expect(timeAgo(now - 60 * MINUTE, now)).toEqual({ unit: "hours", count: 1 });
    expect(timeAgo(now - 3 * 60 * MINUTE, now)).toEqual({ unit: "hours", count: 3 });
    expect(timeAgo(now - 24 * 60 * MINUTE, now)).toEqual({ unit: "days", count: 1 });
    expect(timeAgo(now - 49 * 60 * MINUTE, now)).toEqual({ unit: "days", count: 2 });
  });

  it("ne renvoie jamais un temps négatif (horloge en avance)", () => {
    expect(timeAgo(now + 10 * MINUTE, now)).toEqual({ unit: "now", count: 0 });
  });
});

