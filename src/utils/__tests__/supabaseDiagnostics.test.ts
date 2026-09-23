import { describe, it, expect, afterEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Voir le commentaire de fichier de supabase.test.js : le SDK réel n'a  */
/*  aucun intérêt ici, seul le mock isole ces tests du reste du monde.    */
/* ------------------------------------------------------------------ */
vi.mock("../supabaseClient", () => ({
  getSupabaseClient: () => null,
}));

import { pingSupabase, fetchTable, countTableRows, setForceOfflineForDebug, isForceOfflineForDebug } from "../supabase";

/* ------------------------------------------------------------------ */
/*  Panneau de Diagnostics — "simuler le mode hors-ligne" (bascule de     */
/*  debug, voir DiagnosticsPanelModal.jsx) et volumétrie des tables         */
/*  (countTableRows, lecture de l'en-tête Content-Range d'une requête        */
/*  HEAD). Isolé de supabase.test.js : `pingSupabase` y modifie l'état        */
/*  module-privé `lastKnownReachable`, qui fuirait sinon d'un test à           */
/*  l'autre — chaque test ici commence par "amorcer" cet état explicitement      */
/*  (fetch mocké online) plutôt que de supposer un ordre d'exécution.             */
/* ------------------------------------------------------------------ */

async function primeOnline() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" }));
  await pingSupabase();
}

afterEach(() => {
  vi.unstubAllGlobals();
  setForceOfflineForDebug(false);
});

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : le marqueur "ne jamais servir depuis le cache du         */
/*  service worker" (voir vite.config.js) était `?_conncheck=1`, un        */
/*  vrai paramètre de requête — transmis tel quel jusqu'à PostgREST, qui     */
/*  l'interprète comme un filtre sur une colonne inexistante et renvoyait     */
/*  un 400 Bad Request à chaque ping (visible dans les logs du Panneau de      */
/*  Diagnostics). Déplacé dans le FRAGMENT de l'URL (`#_conncheck=1`),          */
/*  jamais transmis par le navigateur dans la requête HTTP réelle, tout en       */
/*  restant visible par le service worker (voir son commentaire de fichier).      */
/* ------------------------------------------------------------------ */
describe("pingSupabase — marqueur anti-cache", () => {
  it("place le marqueur dans le fragment de l'URL, jamais comme paramètre de requête", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await pingSupabase();

    const requestedUrl = fetchMock.mock.calls[0][0];
    expect(new URL(requestedUrl).searchParams.has("_conncheck")).toBe(false);
    expect(requestedUrl).toContain("#_conncheck=1");
  });
});

describe("setForceOfflineForDebug", () => {
  it("fait échouer pingSupabase() sans jamais appeler fetch", async () => {
    await primeOnline();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    setForceOfflineForDebug(true);
    expect(isForceOfflineForDebug()).toBe(true);

    await expect(pingSupabase()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fait échouer une lecture Supabase normale avec une erreur marquée `offline`", async () => {
    await primeOnline();
    setForceOfflineForDebug(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTable("recipes")).rejects.toMatchObject({ offline: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("countTableRows", () => {
  it("lit le total exact depuis l'en-tête Content-Range d'une requête HEAD", async () => {
    await primeOnline();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: (name: string) => (name === "content-range" ? "0-0/42" : null) },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(countTableRows("recipes")).resolves.toBe(42);
    expect(fetchMock.mock.calls[0][1].method).toBe("HEAD");
  });

  it("renvoie null plutôt que de lever quand la requête échoue", async () => {
    await primeOnline();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(countTableRows("recipes")).resolves.toBeNull();
  });

  it("renvoie null pendant la simulation hors-ligne, sans appeler fetch", async () => {
    await primeOnline();
    setForceOfflineForDebug(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(countTableRows("recipes")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
