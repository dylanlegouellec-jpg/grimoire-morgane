import { describe, it, expect } from "vitest";
import { angleForDrag, bumpAngle, decideAxis, dirFromDx, shouldCommitTurn } from "../usePageTurn";

describe("tourner la page — reconnaissance du geste", () => {
  it("ne tranche le sens qu'après quelques pixels", () => {
    expect(decideAxis(4, 3)).toBeNull();
  });

  it("un geste surtout vertical reste un défilement", () => {
    expect(decideAxis(3, 40)).toBe("y");
    // Diagonale : pas « clairement horizontal ».
    expect(decideAxis(30, 25)).toBe("y");
  });

  it("un geste clairement horizontal tourne la page", () => {
    expect(decideAxis(-30, 6)).toBe("x");
    expect(dirFromDx(-30)).toBe(1);
    expect(dirFromDx(30)).toBe(-1);
  });

  it("valide au-delà d'un seuil de distance ou d'une vitesse, sinon revient en place", () => {
    expect(shouldCommitTurn(-60, -100, 390)).toBe(false);
    expect(shouldCommitTurn(-130, -100, 390)).toBe(true);
    // Petit coup sec rapide.
    expect(shouldCommitTurn(-40, -900, 390)).toBe(true);
    // Rapide mais dans l'autre sens (demi-tour du doigt) : non.
    expect(shouldCommitTurn(-40, 900, 390)).toBe(false);
    // Trop court, même rapide.
    expect(shouldCommitTurn(-10, -900, 390)).toBe(false);
  });

  it("le bord de la page suit le doigt, la butée reste discrète", () => {
    expect(angleForDrag(0, 390)).toBe(0);
    expect(angleForDrag(-195, 390)).toBeCloseTo(60);
    expect(angleForDrag(-1000, 390)).toBeCloseTo(90);
    expect(bumpAngle(2000)).toBeLessThan(15);
    expect(bumpAngle(50)).toBeLessThan(bumpAngle(150));
  });
});
