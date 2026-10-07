import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLastSyncAt, markSyncSuccess, resetSyncStatusForTests, subscribeLastSync } from "../syncStatus";

describe("syncStatus (dernière synchro réussie)", () => {
  beforeEach(() => resetSyncStatusForTests());

  it("n'a aucune synchro tant que rien n'a réussi", () => {
    expect(getLastSyncAt()).toBeNull();
  });

  it("garde l'instant de la dernière synchro réussie, et le conserve dans le stockage local", () => {
    markSyncSuccess(1_700_000_000_000);
    expect(getLastSyncAt()).toBe(1_700_000_000_000);
    expect(localStorage.getItem("grimoire_last_sync_at")).toBe("1700000000000");
  });

  it("prévient les abonnés à chaque nouvelle synchro, plus après désabonnement", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLastSync(listener);
    markSyncSuccess(1_000_000);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    markSyncSuccess(9_000_000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("regroupe les réussites rapprochées : au plus une prise en compte par seconde", () => {
    const listener = vi.fn();
    subscribeLastSync(listener);
    markSyncSuccess(5_000_000);
    markSyncSuccess(5_000_400); // 400 ms plus tard : ignorée
    expect(getLastSyncAt()).toBe(5_000_000);
    markSyncSuccess(5_001_000); // 1 s plus tard : prise en compte
    expect(getLastSyncAt()).toBe(5_001_000);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
