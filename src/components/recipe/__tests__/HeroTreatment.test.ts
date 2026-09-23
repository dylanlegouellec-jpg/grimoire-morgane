import { describe, it, expect } from "vitest";
import { heroTreatmentClassName, isLegendTreatment } from "../HeroTreatment";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : "fondu" doit rester le seul habillage plein cadre        */
/*  (bord à bord, comportement d'origine) — les 5 autres réclament tous     */
/*  une marge visible autour de la photo (.detail-hero-inset), sans quoi      */
/*  un bord doré/festonné/corné n'aurait pas de fond de page visible autour.   */
/* ------------------------------------------------------------------ */

describe("heroTreatmentClassName", () => {
  it("ne pose aucune classe de marge pour 'fondu' (plein cadre, comportement d'origine)", () => {
    expect(heroTreatmentClassName("fondu")).toBe("");
    expect(heroTreatmentClassName(undefined)).toBe("");
  });

  it("pose detail-hero-inset pour les 5 autres habillages", () => {
    expect(heroTreatmentClassName("feston")).toContain("detail-hero-inset");
    expect(heroTreatmentClassName("legende")).toContain("detail-hero-inset");
    expect(heroTreatmentClassName("vignette")).toContain("detail-hero-inset");
    expect(heroTreatmentClassName("coin")).toContain("detail-hero-inset");
  });

  it("ajoute la classe de bordure dédiée pour 'cadre', en plus de l'inset", () => {
    expect(heroTreatmentClassName("cadre")).toBe("detail-hero-inset hero-treat-cadre");
  });
});

describe("isLegendTreatment", () => {
  it("n'est vrai que pour 'legende' — seul habillage où le titre vient sur la photo", () => {
    expect(isLegendTreatment("legende")).toBe(true);
    expect(isLegendTreatment("fondu")).toBe(false);
    expect(isLegendTreatment("cadre")).toBe(false);
    expect(isLegendTreatment("vignette")).toBe(false);
  });
});
