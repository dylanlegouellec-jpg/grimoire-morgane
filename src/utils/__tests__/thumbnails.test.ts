import { describe, it, expect, beforeEach } from "vitest";
import {
  thumbUrlFor,
  thumbPathFor,
  storagePathFromPublicUrl,
  claimThumbBackfill,
  isThumbKnownMissing,
  markThumbMissing,
  resetThumbSessionState,
} from "../thumbnails";

/* ------------------------------------------------------------------ */
/*  Dérivation des miniatures — seules les photos du bucket              */
/*  `recipe-images` en ont une ; tout le reste (Pollinations, base64,     */
/*  autre bucket, miniature elle-même) doit renvoyer null.                */
/* ------------------------------------------------------------------ */

const BASE = "https://abc.supabase.co/storage/v1/object/public/recipe-images";

describe("thumbUrlFor", () => {
  it("dérive la miniature d'une photo WebP ou JPEG", () => {
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.webp`)).toBe(`${BASE}/foyer-1/r123.thumb.webp`);
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.jpg`)).toBe(`${BASE}/foyer-1/r123.thumb.jpg`);
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.JPEG`)).toBe(`${BASE}/foyer-1/r123.thumb.JPEG`);
  });

  it("retire le paramètre de requête (ex. ?retry=)", () => {
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.webp?retry=42`)).toBe(`${BASE}/foyer-1/r123.thumb.webp`);
  });

  it("garde l'id contenant des points intact", () => {
    expect(thumbUrlFor(`${BASE}/f/1700000000.123.webp`)).toBe(`${BASE}/f/1700000000.123.thumb.webp`);
  });

  it("renvoie null hors du bucket recipe-images", () => {
    expect(thumbUrlFor(null)).toBeNull();
    expect(thumbUrlFor(undefined)).toBeNull();
    expect(thumbUrlFor("")).toBeNull();
    expect(thumbUrlFor("https://image.pollinations.ai/prompt/tarte?width=800")).toBeNull();
    expect(thumbUrlFor("data:image/jpeg;base64,AAAA")).toBeNull();
    expect(thumbUrlFor("https://abc.supabase.co/storage/v1/object/public/avatars/u/a.webp")).toBeNull();
    expect(thumbUrlFor("https://abc.supabase.co/storage/v1/object/sign/recipe-images/f/a.webp")).toBeNull();
    expect(thumbUrlFor("pas une url")).toBeNull();
  });

  it("renvoie null pour une miniature ou un format non produit par l'app", () => {
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.thumb.webp`)).toBeNull();
    expect(thumbUrlFor(`${BASE}/foyer-1/r123.png`)).toBeNull();
    expect(thumbUrlFor(`${BASE}/foyer-1/r123`)).toBeNull();
  });
});

describe("thumbPathFor / storagePathFromPublicUrl", () => {
  it("dérive le chemin de la miniature", () => {
    expect(thumbPathFor("foyer/abc.webp")).toBe("foyer/abc.thumb.webp");
    expect(thumbPathFor("foyer/abc.thumb.jpg")).toBeNull();
  });

  it("extrait le chemin dans le bucket", () => {
    expect(storagePathFromPublicUrl(`${BASE}/foyer-1/r1.jpg?x=1`)).toBe("foyer-1/r1.jpg");
    expect(storagePathFromPublicUrl("https://image.pollinations.ai/prompt/x")).toBeNull();
  });
});

describe("mémoire de session", () => {
  beforeEach(() => resetThumbSessionState());

  it("ne réclame le rattrapage qu'une fois par photo", () => {
    expect(claimThumbBackfill("a")).toBe(true);
    expect(claimThumbBackfill("a")).toBe(false);
    expect(claimThumbBackfill("b")).toBe(true);
  });

  it("retient les miniatures manquantes", () => {
    expect(isThumbKnownMissing("a")).toBe(false);
    markThumbMissing("a");
    expect(isThumbKnownMissing("a")).toBe(true);
  });
});
