import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CROP_ASPECT,
  HERO_ASPECT,
  HERO_OVERSCAN,
  MAX_ZOOM,
  baseCropSize,
  cardWindow,
  centeredView,
  clampView,
  cropRectFor,
  editorTransform,
  heroWindow,
  panView,
  previewPlacement,
  roundCrop,
  zoomViewAt,
  type CropRect,
  type Size,
} from "../photoCrop";

/* Recadrage : la zone gardée ne sort jamais de la photo (aucun bord vide
   dans le cadre), quelle que soit la suite de gestes ; conversion cadre ->
   pixels source ; aperçus fidèles aux proportions réelles du CSS. */

const WIDE: Size = { width: 1600, height: 900 };
const TALL: Size = { width: 900, height: 1600 };

function inside(rect: CropRect, src: Size) {
  const eps = 1e-6;
  expect(rect.x).toBeGreaterThanOrEqual(-eps);
  expect(rect.y).toBeGreaterThanOrEqual(-eps);
  expect(rect.x + rect.w).toBeLessThanOrEqual(src.width + eps);
  expect(rect.y + rect.h).toBeLessThanOrEqual(src.height + eps);
  expect(rect.w / rect.h).toBeCloseTo(CROP_ASPECT, 6);
}

describe("proportions alignées sur le CSS", () => {
  const css = readFileSync(resolve(__dirname, "../../styles/recipeCards.css"), "utf8");
  it("carte 4/3, héros 16/10, parallaxe ±12 %", () => {
    expect(css).toMatch(/\.illus \{[^}]*aspect-ratio: 4\/3/);
    expect(css).toMatch(/\.detail-hero \{[^}]*aspect-ratio: 16\/10/);
    expect(css).toMatch(/\.detail-hero-parallax \{[^}]*inset: -12% 0/);
    expect(CROP_ASPECT).toBe(4 / 3);
    expect(HERO_ASPECT).toBe(16 / 10);
    expect(HERO_OVERSCAN).toBeCloseTo(1.24);
  });
});

describe("bornes", () => {
  it("zoom 1 = la plus grande zone 4:3 possible", () => {
    expect(baseCropSize(WIDE)).toEqual({ w: 1200, h: 900 });
    expect(baseCropSize(TALL)).toEqual({ w: 900, h: 675 });
    expect(cropRectFor(centeredView(WIDE), WIDE)).toEqual({ x: 200, y: 0, w: 1200, h: 900 });
  });

  it("jamais de bord vide, même tirée très loin ou zoomée hors limites", () => {
    for (const src of [WIDE, TALL, { width: 1200, height: 900 }]) {
      for (const view of [
        { zoom: 1, cx: -5000, cy: -5000 },
        { zoom: 1, cx: 99999, cy: 99999 },
        { zoom: 0.2, cx: 0, cy: 0 },
        { zoom: 12, cx: src.width, cy: 0 },
        { zoom: Number.NaN, cx: Number.NaN, cy: 3 },
      ]) {
        const v = clampView(view, src);
        expect(v.zoom).toBeGreaterThanOrEqual(1);
        expect(v.zoom).toBeLessThanOrEqual(MAX_ZOOM);
        inside(cropRectFor(v, src), src);
      }
    }
  });

  it("une suite de gestes aléatoires reste dans la photo", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let v = centeredView(WIDE);
    for (let i = 0; i < 500; i++) {
      v = rnd() < 0.5
        ? panView(v, (rnd() - 0.5) * 800, (rnd() - 0.5) * 800, 350, WIDE)
        : zoomViewAt(v, v.zoom * (0.4 + rnd() * 1.4), rnd() * 350, rnd() * 262, 350, WIDE);
      inside(cropRectFor(v, WIDE), WIDE);
      const tf = editorTransform(v, WIDE, 350);
      // L'image couvre tout le cadre de 350 × 262,5 px.
      expect(tf.tx).toBeLessThanOrEqual(1e-6);
      expect(tf.ty).toBeLessThanOrEqual(1e-6);
      expect(tf.tx + WIDE.width * tf.scale).toBeGreaterThanOrEqual(350 - 1e-6);
      expect(tf.ty + WIDE.height * tf.scale).toBeGreaterThanOrEqual(262.5 - 1e-6);
    }
  });
});

describe("gestes -> pixels source", () => {
  it("glisser vers la droite montre la partie gauche de la photo", () => {
    // Cadre de 300 px pour 1200 px source : 1 px écran = 4 px source.
    const v = panView(centeredView(WIDE), 25, 0, 300, WIDE);
    expect(cropRectFor(v, WIDE).x).toBeCloseTo(100);
    // Au bord : bloqué à 0.
    expect(cropRectFor(panView(v, 500, 0, 300, WIDE), WIDE).x).toBe(0);
  });

  it("le zoom garde le point sous les doigts immobile", () => {
    const start = centeredView(WIDE);
    const r0 = cropRectFor(start, WIDE);
    const ax = 120;
    const ay = 90;
    const p0 = { x: r0.x + ax * (r0.w / 300), y: r0.y + ay * (r0.w / 300) };
    const v = zoomViewAt(start, 2, ax, ay, 300, WIDE);
    const r1 = cropRectFor(v, WIDE);
    expect(r1.w).toBeCloseTo(600);
    expect(r1.x + ax * (r1.w / 300)).toBeCloseTo(p0.x);
    expect(r1.y + ay * (r1.w / 300)).toBeCloseTo(p0.y);
  });

  it("transformation de l'éditeur cohérente avec la zone gardée", () => {
    const v = zoomViewAt(centeredView(WIDE), 1.5, 0, 0, 300, WIDE);
    const r = cropRectFor(v, WIDE);
    const tf = editorTransform(v, WIDE, 300);
    expect(tf.scale).toBeCloseTo(300 / r.w);
    expect(-tf.tx / tf.scale).toBeCloseTo(r.x);
    expect(-tf.ty / tf.scale).toBeCloseTo(r.y);
  });

  it("arrondi en pixels entiers, toujours dans la photo", () => {
    expect(roundCrop({ x: 399.6, y: -0.4, w: 800.4, h: 600.3 }, WIDE)).toEqual({ x: 400, y: 0, w: 800, h: 600 });
    expect(roundCrop({ x: 1500, y: 800, w: 400, h: 300 }, WIDE)).toEqual({ x: 1200, y: 600, w: 400, h: 300 });
  });
});

describe("recentrage", () => {
  it("revient au zoom 1, centré, après déplacement et zoom", () => {
    let v = zoomViewAt(centeredView(WIDE), 3, 10, 10, 300, WIDE);
    v = panView(v, -200, 40, 300, WIDE);
    expect(cropRectFor(v, WIDE)).not.toEqual(cropRectFor(centeredView(WIDE), WIDE));
    expect(cropRectFor(centeredView(WIDE), WIDE)).toEqual({ x: 200, y: 0, w: 1200, h: 900 });
  });
});

describe("aperçus", () => {
  it("la carte montre toute la photo recadrée", () => {
    expect(cardWindow()).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const crop = { x: 200, y: 0, w: 1200, h: 900 };
    const p = previewPlacement(crop, WIDE, cardWindow());
    expect(p.left).toBeCloseTo((-200 / 1200) * 100);
    expect(p.top).toBeCloseTo(0);
    expect(p.width).toBeCloseTo((1600 / 1200) * 100);
    expect(p.height).toBeCloseTo(100);
  });

  it("le héros garde une bande centrale de proportion 16/10", () => {
    const win = heroWindow();
    // Bande centrée.
    expect(win.x + win.w / 2).toBeCloseTo(0.5);
    expect(win.y + win.h / 2).toBeCloseTo(0.5);
    // Proportion de la bande visible = celle du cadre du héros.
    expect((win.w * CROP_ASPECT) / win.h).toBeCloseTo(HERO_ASPECT);
    // La photo 4:3 couvre la boîte 16/10 × 1,24 par la hauteur : bande ≈ 80,6 % de haut.
    expect(win.h).toBeCloseTo(1 / HERO_OVERSCAN, 3);
  });
});
