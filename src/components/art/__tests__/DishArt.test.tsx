import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

/* ------------------------------------------------------------------ */
/*  Miniatures dans la grille — DishArt size="thumb" charge la miniature,  */
/*  retombe sur la pleine taille si elle manque (sans retry ni             */
/*  placeholder), puis en demande le rattrapage une fois la pleine taille   */
/*  chargée. La fiche (défaut "full") et Pollinations restent inchangées.   */
/* ------------------------------------------------------------------ */

const backfillThumbnail = vi.fn(async () => true);
vi.mock("../../../utils/imageUpload", () => ({ backfillThumbnail: (...args: unknown[]) => backfillThumbnail(...(args as [])) }));

import DishArt from "../DishArt";
import { resetThumbSessionState } from "../../../utils/thumbnails";

const BASE = "https://abc.supabase.co/storage/v1/object/public/recipe-images/foyer-1";
const photo = `${BASE}/r1.webp`;
const thumb = `${BASE}/r1.thumb.webp`;

const getImg = (container: HTMLElement) => container.querySelector("img.illus-photo") as HTMLImageElement;

beforeEach(() => {
  resetThumbSessionState();
  backfillThumbnail.mockClear();
});

describe("DishArt — miniatures", () => {
  it("charge la miniature en mode thumb", () => {
    const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
    expect(getImg(container).getAttribute("src")).toBe(thumb);
  });

  it("charge la pleine taille par défaut (fiche recette)", () => {
    const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} />);
    expect(getImg(container).getAttribute("src")).toBe(photo);
  });

  it("laisse les illustrations Pollinations telles quelles", () => {
    const url = "https://image.pollinations.ai/prompt/tarte?width=800";
    const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: url }} size="thumb" />);
    expect(getImg(container).getAttribute("src")).toBe(url);
  });

  it("retombe immédiatement sur la pleine taille si la miniature manque, voile toujours affiché", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
      const img = getImg(container);
      fireEvent.error(img);
      // Même <img>, nouvelle source, sans attendre de délai de retry.
      expect(getImg(container)).toBe(img);
      expect(img.getAttribute("src")).toBe(photo);
      expect(container.querySelector(".illus-shimmer")).not.toBeNull();
      // Aucune boucle : pas de retry programmé vers la miniature.
      act(() => {
        vi.runAllTimers();
      });
      expect(img.getAttribute("src")).toBe(photo);
      expect(backfillThumbnail).not.toHaveBeenCalled();

      fireEvent.load(img);
      expect(container.querySelector(".illus-shimmer")).toBeNull();
      expect(backfillThumbnail).toHaveBeenCalledTimes(1);
      expect(backfillThumbnail).toHaveBeenCalledWith(img, photo);
    } finally {
      vi.useRealTimers();
    }
  });

  it("une miniature déjà manquante n'est plus redemandée pendant la session", () => {
    const first = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
    fireEvent.error(getImg(first.container));
    first.unmount();
    const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
    expect(getImg(container).getAttribute("src")).toBe(photo);
  });

  it("garde la logique de retry sur la pleine taille après le repli", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
      const img = getImg(container);
      fireEvent.error(img); // miniature -> pleine taille
      fireEvent.error(img); // pleine taille -> retry programmé
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(img.getAttribute("src")).toMatch(new RegExp(`^${photo.replace(/[.?]/g, "\\$&")}\\?retry=\\d+$`));
    } finally {
      vi.useRealTimers();
    }
  });

  it("ne déclenche aucun rattrapage quand la miniature se charge", () => {
    const { container } = render(<DishArt recipe={{ title: "Tarte", imageUrl: photo }} size="thumb" />);
    fireEvent.load(getImg(container));
    expect(backfillThumbnail).not.toHaveBeenCalled();
  });
});
