import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Envoi photo + miniature — la miniature est accessoire : son échec     */
/*  ne doit jamais faire échouer l'envoi de la photo. Et le rattrapage     */
/*  (backfillThumbnail) ne s'exécute qu'une fois, connecté, dans un         */
/*  dossier de foyer. jsdom n'a ni canvas ni createImageBitmap : simulés.   */
/* ------------------------------------------------------------------ */

const upload = vi.fn();
const getSession = vi.fn();
const client = {
  auth: { getSession },
  storage: {
    from: () => ({
      upload,
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/recipe-images/${path}` } }),
    }),
  },
};
let clientAvailable = true;
vi.mock("../supabaseClient", () => ({ getSupabaseClient: () => (clientAvailable ? client : null) }));
vi.mock("../helpers", () => ({ nextId: () => "r1" }));

import { uploadRecipeImage, backfillThumbnail } from "../imageUpload";
import { resetThumbSessionState } from "../thumbnails";

const drawn: Array<[number, number]> = [];

beforeEach(() => {
  clientAvailable = true;
  upload.mockReset();
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { user: { id: "u" } } } });
  drawn.length = 0;
  resetThumbSessionState();
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2400, height: 1800 })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const { width, height } = this;
    return { drawImage: () => drawn.push([width, height]) } as unknown as CanvasRenderingContext2D;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,");
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback, type?: string) {
    cb(new Blob([new Uint8Array(this.width)], { type }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

describe("uploadRecipeImage", () => {
  it("envoie la photo (1200px) puis sa miniature (480px), même format", async () => {
    upload.mockResolvedValue({ error: null });
    const url = await uploadRecipeImage(file, "foyer-1");
    expect(url).toBe("https://abc.supabase.co/storage/v1/object/public/recipe-images/foyer-1/r1.webp");
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0]).toBe("foyer-1/r1.webp");
    expect(upload.mock.calls[1][0]).toBe("foyer-1/r1.thumb.webp");
    expect(upload.mock.calls[1][2]).toMatchObject({ contentType: "image/webp", upsert: false });
    expect(drawn).toEqual([[1200, 900], [480, 360]]);
  });

  it("réussit même si l'envoi de la miniature échoue (journal seulement)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error("quota") });
    await expect(uploadRecipeImage(file, "foyer-1")).resolves.toMatch(/foyer-1\/r1\.webp$/);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("réussit même si l'envoi de la miniature lève", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    upload.mockResolvedValueOnce({ error: null }).mockRejectedValueOnce(new Error("réseau"));
    await expect(uploadRecipeImage(file, "foyer-1")).resolves.toMatch(/r1\.webp$/);
  });

  it("échoue toujours si la photo elle-même ne part pas (sans tenter de miniature)", async () => {
    upload.mockResolvedValueOnce({ error: new Error("refusé") });
    await expect(uploadRecipeImage(file, "foyer-1")).rejects.toThrow("refusé");
    expect(upload).toHaveBeenCalledTimes(1);
  });
});

describe("backfillThumbnail", () => {
  const photo = "https://abc.supabase.co/storage/v1/object/public/recipe-images/foyer-1/old.jpg";
  const img = { naturalWidth: 1200, naturalHeight: 900 } as HTMLImageElement;

  it("fabrique et envoie la miniature une seule fois par session", async () => {
    upload.mockResolvedValue({ error: null });
    await expect(backfillThumbnail(img, photo)).resolves.toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe("foyer-1/old.thumb.jpg");
    expect(upload.mock.calls[0][2]).toMatchObject({ contentType: "image/jpeg" });
    expect(drawn).toEqual([[480, 360]]);
    await expect(backfillThumbnail(img, `${photo}?retry=1`)).resolves.toBe(false);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("ne fait rien hors connexion, hors foyer ou hors bucket", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(backfillThumbnail(img, photo)).resolves.toBe(false);
    clientAvailable = false;
    await expect(backfillThumbnail(img, photo)).resolves.toBe(false);
    clientAvailable = true;
    await expect(backfillThumbnail(img, photo.replace("foyer-1", "sans-foyer"))).resolves.toBe(false);
    await expect(backfillThumbnail(img, "https://image.pollinations.ai/prompt/x")).resolves.toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("avale sans bruit un refus de la règle de stockage", async () => {
    const warn = vi.spyOn(console, "warn");
    upload.mockResolvedValue({ error: { message: "new row violates row-level security policy" } });
    await expect(backfillThumbnail(img, photo)).resolves.toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
