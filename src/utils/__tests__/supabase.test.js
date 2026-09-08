import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Le SDK Supabase réel (getSupabaseClient) ouvrirait une vraie          */
/*  connexion Realtime/lirait le stockage d'auth du SDK — hors-sujet ici,  */
/*  et une source d'instabilité entre environnements de test. saveAppState/ */
/*  flushOfflineQueue n'ont besoin que d'un jeton (getAuthToken retombe     */
/*  sur la clé anonyme quand getSupabaseClient() renvoie null), jamais du   */
/*  client lui-même : le mocker entièrement isole ces tests du SDK.         */
/* ------------------------------------------------------------------ */
vi.mock("../supabaseClient", () => ({
  getSupabaseClient: () => null,
}));

import { saveAppState, flushOfflineQueue } from "../supabase";
import { enqueueOfflineAction, getOfflineQueue, clearOfflineQueue } from "../offlineQueue";

/* ------------------------------------------------------------------ */
/*  Verrouille les deux bugs corrigés cette session :                      */
/*   - saveAppState avalait toute panne réseau en silence (aucune trace,    */
/*     aucune reprise) : frigo/basiques/plan de repas modifiés hors-ligne    */
/*     pouvaient être perdus pour de bon (voir hooks/useOfflineSync.js).     */
/*   - flushOfflineQueue n'avait aucun garde-fou contre un appel concurrent  */
/*     (l'événement "online" du navigateur peut se déclencher deux fois de   */
/*     suite), risquant de rejouer deux fois la même action en attente.      */
/* ------------------------------------------------------------------ */

function jsonResponse({ ok = true, status = 200, body = null } = {}) {
  return { ok, status, text: async () => (body === null ? "" : JSON.stringify(body)) };
}

beforeEach(() => {
  clearOfflineQueue();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveAppState", () => {
  it("enregistre directement par PATCH quand une ligne app_state existe déjà pour ce foyer", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1", pantry: [] }] }));
    vi.stubGlobal("fetch", fetchMock);

    await saveAppState("h1", { pantry: ["œufs"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("bascule sur un POST quand le PATCH ne trouve encore aucune ligne (tout premier enregistrement du foyer)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ body: [] })) // PATCH : rien à mettre à jour
      .mockResolvedValueOnce(jsonResponse({ status: 204 })); // POST : ligne créée
    vi.stubGlobal("fetch", fetchMock);

    await saveAppState("h1", { pantry: ["œufs"] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("met la modification en file hors-ligne plutôt que de la perdre en cas de coupure réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    // Avant le correctif : cette même panne était avalée en silence, sans
    // rien lever ET sans rien mettre en attente — voir hooks/useOfflineSync.js.
    await expect(saveAppState("h1", { pantry: ["œufs"] })).resolves.toBeUndefined();

    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      table: "app_state",
      type: "app_state",
      recordId: "h1",
      payload: { pantry: ["œufs"] },
    });
  });

  it("remonte une vraie erreur applicative (ex. accès refusé) au lieu de l'avaler en silence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: false, status: 403 })));

    await expect(saveAppState("h1", { pantry: ["œufs"] })).rejects.toThrow();
    // Ce n'est pas une panne réseau : ça ne doit pas non plus finir mis en
    // attente pour un rejeu qui échouerait de toute façon à l'identique.
    expect(getOfflineQueue()).toHaveLength(0);
  });
});

describe("flushOfflineQueue", () => {
  it("rejoue une action app_state en attente comme n'importe quelle autre écriture", async () => {
    enqueueOfflineAction({ table: "app_state", type: "app_state", recordId: "h1", payload: { basics: ["sel"] } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1" }] })));

    const result = await flushOfflineQueue();

    expect(result).toEqual({ flushed: 1, dropped: 0 });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("abandonne une action après 5 échecs consécutifs plutôt que de bloquer indéfiniment la file", async () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Tarte" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    let lastResult;
    for (let i = 0; i < 5; i += 1) {
      lastResult = await flushOfflineQueue();
    }

    expect(lastResult).toEqual({ flushed: 0, dropped: 1 });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("ignore un second appel déclenché pendant qu'un premier flush est encore en cours", async () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Tarte" } });
    let resolveFetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }))
    );

    // Reproduit l'événement "online" qui se déclenche deux fois de suite
    // (réseau instable) : le second flush démarre avant que le premier
    // n'ait eu la moindre réponse réseau.
    const firstCall = flushOfflineQueue();
    const secondCall = flushOfflineQueue();

    resolveFetch(jsonResponse({ status: 201, body: [{ id: "r1" }] }));
    const [first, second] = await Promise.all([firstCall, secondCall]);

    expect(second).toEqual({ flushed: 0, dropped: 0 });
    expect(first).toEqual({ flushed: 1, dropped: 0 });
  });
});
