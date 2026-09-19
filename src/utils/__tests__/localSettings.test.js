import { describe, it, expect, beforeEach } from "vitest";
import { getStoredHeroTreatment, storeHeroTreatment } from "../localSettings";

describe("getStoredHeroTreatment / storeHeroTreatment", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retombe sur 'fondu' tant que rien n'a été mémorisé", () => {
    expect(getStoredHeroTreatment()).toBe("fondu");
  });

  it("mémorise et relit un choix valide", () => {
    storeHeroTreatment("coin");
    expect(getStoredHeroTreatment()).toBe("coin");
  });

  it("ignore une valeur inconnue en stockage (donnée corrompue/ancienne) et retombe sur 'fondu'", () => {
    localStorage.setItem("grimoire_hero_treatment", "un-habillage-qui-n-existe-plus");
    expect(getStoredHeroTreatment()).toBe("fondu");
  });
});
