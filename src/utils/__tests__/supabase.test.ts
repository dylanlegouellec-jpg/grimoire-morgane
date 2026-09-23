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

function jsonResponse({ ok = true, status = 200, body = null }: { ok?: boolean; status?: number; body?: unknown } = {}) {
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

    expect(result).toEqual({ flushed: 1, dropped: 0, conflicts: [] });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("abandonne une action après 5 échecs consécutifs plutôt que de bloquer indéfiniment la file", async () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Tarte" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    let lastResult;
    for (let i = 0; i < 5; i += 1) {
      lastResult = await flushOfflineQueue();
    }

    expect(lastResult).toEqual({ flushed: 0, dropped: 1, conflicts: [] });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("ignore un second appel déclenché pendant qu'un premier flush est encore en cours", async () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Tarte" } });
    let resolveFetch: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }))
    );

    // Reproduit l'événement "online" qui se déclenche deux fois de suite
    // (réseau instable) : le second flush démarre avant que le premier
    // n'ait eu la moindre réponse réseau.
    const firstCall = flushOfflineQueue();
    const secondCall = flushOfflineQueue();

    // `flushOfflineQueue` passe par au moins un `await` (getAuthToken, voir
    // supabase.js) avant d'appeler `fetch` — `resolveFetch` n'est donc pas
    // encore assigné juste après avoir déclenché les deux appels ci-dessus,
    // seulement une fois ce tour de micro-tâches écoulé. `vi.waitFor`
    // repasse jusqu'à ce que ce soit le cas plutôt que de supposer un
    // nombre précis de tours (fragile si l'implémentation gagne/perd un
    // `await` plus tard).
    await vi.waitFor(() => {
      if (typeof resolveFetch !== "function") throw new Error("fetch pas encore appelé");
    });
    resolveFetch!(jsonResponse({ status: 201, body: [{ id: "r1" }] }));
    const [first, second] = await Promise.all([firstCall, secondCall]);

    expect(second).toEqual({ flushed: 0, dropped: 0, conflicts: [] });
    expect(first).toEqual({ flushed: 1, dropped: 0, conflicts: [] });
  });
});

/* ------------------------------------------------------------------ */
/*  CONFLITS app_state — pantry/basics/meal_plan sont un JSON complet     */
/*  remplacé en bloc à chaque PATCH, jamais fusionné : rejouer une action  */
/*  hors-ligne sans vérifier que le champ visé n'a pas changé côté serveur */
/*  pendant la coupure écraserait silencieusement la modification faite    */
/*  ailleurs entre-temps (audit "Offline-First & Synchronisation", point   */
/*  1). `baseline` (voir hooks/useOfflineSync.js) porte la valeur que ce   */
/*  client croyait être sur le serveur juste avant sa propre modification. */
/* ------------------------------------------------------------------ */
describe("flushOfflineQueue — conflits app_state", () => {
  it("rejoue normalement quand la baseline correspond encore à la valeur serveur (pas de conflit)", async () => {
    enqueueOfflineAction({
      table: "app_state",
      type: "app_state",
      recordId: "h1",
      payload: { meal_plan: [{ id: "m2" }] },
      baseline: { meal_plan: [{ id: "m1" }] },
    });
    const fetchMock = vi
      .fn()
      // 1) vérification du conflit (loadAppState) : le serveur porte encore
      //    exactement la baseline connue de ce client.
      .mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1", meal_plan: [{ id: "m1" }] }] }))
      // 2) le PATCH réel, une fois l'absence de conflit confirmée.
      .mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushOfflineQueue();

    expect(result).toEqual({ flushed: 1, dropped: 0, conflicts: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("abandonne l'action et le signale si un autre appareil a modifié le même champ pendant la coupure", async () => {
    enqueueOfflineAction({
      table: "app_state",
      type: "app_state",
      recordId: "h1",
      payload: { meal_plan: [{ id: "m2" }] },
      baseline: { meal_plan: [{ id: "m1" }] },
    });
    // Le serveur porte déjà une AUTRE valeur que la baseline connue de ce
    // client — quelqu'un (ou un autre appareil) a modifié meal_plan
    // pendant que celui-ci était hors-ligne.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1", meal_plan: [{ id: "m3-autre-appareil" }] }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushOfflineQueue();

    expect(result).toEqual({ flushed: 0, dropped: 0, conflicts: [{ table: "app_state", keys: ["meal_plan"] }] });
    // Un seul appel réseau : la vérification de conflit — jamais le PATCH
    // qui aurait écrasé la modification de l'autre appareil.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("rejoue sans vérification une action déjà en file avant ce correctif (aucune baseline)", async () => {
    enqueueOfflineAction({ table: "app_state", type: "app_state", recordId: "h1", payload: { basics: ["sel"] } });
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ body: [{ household_id: "h1" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushOfflineQueue();

    expect(result).toEqual({ flushed: 1, dropped: 0, conflicts: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
