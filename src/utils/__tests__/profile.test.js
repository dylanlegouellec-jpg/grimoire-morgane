import { describe, it, expect, afterEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Voir le commentaire de fichier de supabase.test.js : le SDK réel n'a  */
/*  aucun intérêt ici, seul le mock isole ces tests du reste du monde.    */
/* ------------------------------------------------------------------ */
vi.mock("../supabaseClient", () => ({
  getSupabaseClient: () => null,
}));

import { saveProfile } from "../profile";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : à la demande de l'utilisateur, l'habillage visuel de la   */
/*  fiche recette (HERO_TREATMENTS) suit désormais le compte comme les       */
/*  autres préférences (thème, appui long, taille de texte...) au lieu           */
/*  d'être purement local à l'appareil — verrouille que saveProfile écrit          */
/*  bien la colonne `hero_treatment`, sans conversion (contrairement à              */
/*  press_duration, qui passe par pressDurationToDb).                                 */
/* ------------------------------------------------------------------ */

function jsonResponse({ ok = true, status = 200, body = null } = {}) {
  return { ok, status, text: async () => (body === null ? "" : JSON.stringify(body)) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveProfile — hero_treatment", () => {
  it("écrit hero_treatment tel quel (PATCH) quand un profil existe déjà", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ body: [{ id: "u1" }] })) // getProfile (existant)
      .mockResolvedValueOnce(jsonResponse({ body: [{ id: "u1", hero_treatment: "cadre" }] })); // updateRow
    vi.stubGlobal("fetch", fetchMock);

    await saveProfile("u1", { heroTreatment: "cadre" });

    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[1].method).toBe("PATCH");
    expect(JSON.parse(patchCall[1].body)).toMatchObject({ hero_treatment: "cadre" });
  });

  it("n'écrit rien si heroTreatment n'est pas fourni (patch vide court-circuité)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await saveProfile("u1", {});

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
