import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyUpdate,
  dismissUpdate,
  getUpdateState,
  notifyUpdateAvailable,
  registerUpdateHandler,
  resetAppUpdateForTests,
  startUpdateChecks,
  subscribeUpdate,
} from "../appUpdate";

describe("appUpdate (nouvelle version à appliquer quand l'utilisateur le décide)", () => {
  beforeEach(() => resetAppUpdateForTests());

  it("ne signale rien tant qu'aucune version n'attend", () => {
    expect(getUpdateState()).toEqual({ available: false, dismissed: false });
  });

  it("signale une version prête, une seule fois même si le service worker la répète", () => {
    const listener = vi.fn();
    subscribeUpdate(listener);
    notifyUpdateAvailable();
    notifyUpdateAvailable();
    expect(getUpdateState()).toEqual({ available: true, dismissed: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("applique la mise à jour en rechargeant la page, via la fonction du service worker", () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    registerUpdateHandler(apply);
    applyUpdate();
    expect(apply).toHaveBeenCalledWith(true);
  });

  it("ne plante pas si aucune fonction n'est branchée", () => {
    expect(() => applyUpdate()).not.toThrow();
  });

  it("« Plus tard » masque le bandeau sans oublier que la version attend", () => {
    notifyUpdateAvailable();
    dismissUpdate();
    expect(getUpdateState()).toEqual({ available: true, dismissed: true });
  });

  it("« Plus tard » n'a aucun effet quand il n'y a rien à reporter", () => {
    const listener = vi.fn();
    subscribeUpdate(listener);
    dismissUpdate();
    expect(getUpdateState().dismissed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("startUpdateChecks", () => {
  const update = vi.fn().mockResolvedValue(undefined);
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    update.mockClear();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistration: vi.fn().mockResolvedValue({ update }) },
      configurable: true,
    });
    stop = startUpdateChecks();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    // @ts-expect-error — retire le faux posé par le test (propriété normalement en lecture seule)
    delete navigator.serviceWorker;
  });

  const returnToForeground = () => document.dispatchEvent(new Event("visibilitychange"));

  it("ne revérifie pas au retour au premier plan s'il y a moins de 10 minutes", async () => {
    vi.advanceTimersByTime(5 * 60 * 1000);
    returnToForeground();
    await vi.advanceTimersByTimeAsync(0);
    expect(update).not.toHaveBeenCalled();
  });

  it("revérifie au retour au premier plan après 10 minutes", async () => {
    vi.advanceTimersByTime(11 * 60 * 1000);
    returnToForeground();
    await vi.advanceTimersByTimeAsync(0);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("revérifie chaque heure si l'app reste ouverte", async () => {
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("s'arrête quand on l'arrête", async () => {
    stop();
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(update).not.toHaveBeenCalled();
  });
});
