import { describe, it, expect, afterEach, vi } from "vitest";
import { clearImageCaches, getImageCacheEntryCounts } from "../imageCache";

/* ------------------------------------------------------------------ */
/*  Actions de nettoyage du Panneau de Diagnostics — verrouille que        */
/*  clearImageCaches() cible bien les DEUX noms de cache CacheFirst         */
/*  définis par le service worker (voir vite.config.js), et que ni l'une      */
/*  ni l'autre fonction ne lève quand Cache Storage est indisponible          */
/*  (navigation privée stricte, environnement de test sans `caches`...).       */
/* ------------------------------------------------------------------ */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clearImageCaches", () => {
  it("supprime les deux caches d'images connus et rapporte ceux réellement supprimés", async () => {
    const deleted = [];
    vi.stubGlobal("caches", {
      delete: vi.fn(async (name) => {
        deleted.push(name);
        return true;
      }),
    });

    const result = await clearImageCaches();

    expect(deleted.sort()).toEqual(["pollinations-images-v2", "supabase-storage-images-v2"]);
    expect(result.cleared.sort()).toEqual(["pollinations-images-v2", "supabase-storage-images-v2"]);
  });

  it("ne lève jamais quand Cache Storage est indisponible", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(clearImageCaches()).resolves.toEqual({ cleared: [] });
  });
});

describe("getImageCacheEntryCounts", () => {
  it("compte les entrées de chaque cache nommé", async () => {
    vi.stubGlobal("caches", {
      open: vi.fn(async (name) => ({
        keys: async () => (name === "supabase-storage-images-v2" ? [1, 2, 3] : [1]),
      })),
    });

    const counts = await getImageCacheEntryCounts();
    expect(counts).toEqual({ "supabase-storage-images-v2": 3, "pollinations-images-v2": 1 });
  });

  it("renvoie null (pas d'exception) quand Cache Storage est indisponible", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(getImageCacheEntryCounts()).resolves.toBeNull();
  });
});
