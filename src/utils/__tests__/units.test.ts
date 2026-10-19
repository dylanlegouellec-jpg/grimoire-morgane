import { describe, it, expect, afterEach } from "vitest";
import {
  addCustomUnit,
  availableSuggestions,
  buildUnitOptions,
  cleanUnitInput,
  normalizeUnitSettings,
  preferredDefaultUnit,
  removeCustomUnit,
  setActiveUnitSettings,
  setDefaultUnitHidden,
  shoppingUnitOptions,
  unitKey,
  MAX_UNIT_LENGTH,
} from "../units";
import type { UnitSettings } from "../units";
import { newIngredientRow } from "../../components/recipe/form/recipeFormRows";

const values = (s: UnitSettings | null, keep?: string) => buildUnitOptions(s, keep).map((o) => o.value);

describe("unités du foyer — ajout", () => {
  it("ajoute « sachet » (espaces nettoyés) après les unités de base, « Sans unité » en dernier", () => {
    const r = addCustomUnit(null, "  sachet  ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings).toEqual({ custom: ["sachet"], hidden: [] });
    expect(values(r.settings)).toEqual(["g", "kg", "ml", "cl", "l", "pièce", "pincée", "c. à soupe", "c. à café", "sachet", ""]);
    expect(cleanUnitInput("  petite   boîte ")).toBe("petite boîte");
  });

  it("refuse les doublons sans tenir compte des accents, majuscules ni du pluriel", () => {
    const s = { custom: ["boîte"], hidden: [] };
    expect(addCustomUnit(s, "BOITE")).toEqual({ ok: false, error: "duplicate" });
    expect(addCustomUnit(s, "boîtes")).toEqual({ ok: false, error: "duplicate" });
    expect(addCustomUnit(null, "Pièce")).toEqual({ ok: false, error: "duplicate" });
    expect(addCustomUnit(null, "pincées")).toEqual({ ok: false, error: "duplicate" });
    expect(addCustomUnit(null, "KG")).toEqual({ ok: false, error: "duplicate" });
    expect(addCustomUnit(null, "sans unité")).toEqual({ ok: false, error: "duplicate" });
    expect(unitKey("Sachets")).toBe(unitKey("sachet"));
  });

  it("refuse une saisie vide ou trop longue", () => {
    expect(addCustomUnit(null, "   ")).toEqual({ ok: false, error: "empty" });
    expect(addCustomUnit(null, "x".repeat(MAX_UNIT_LENGTH + 1))).toEqual({ ok: false, error: "tooLong" });
  });

  it("retaper une unité de base masquée la réaffiche au lieu de créer un doublon", () => {
    const r = addCustomUnit({ custom: [], hidden: ["cl"] }, "CL");
    expect(r).toEqual({ ok: true, settings: null, value: "cl", unhidden: true });
  });
});

describe("unités du foyer — suppression et masquage", () => {
  it("supprime une unité ajoutée (retour à null = liste par défaut)", () => {
    expect(removeCustomUnit({ custom: ["sachet"], hidden: [] }, "sachet")).toEqual({ ok: true, settings: null });
  });

  it("masque « cl » sans jamais pouvoir masquer « Sans unité »", () => {
    const r = setDefaultUnitHidden(null, "cl", true);
    expect(r).toEqual({ ok: true, settings: { custom: [], hidden: ["cl"] } });
    if (!r.ok) return;
    expect(values(r.settings)).not.toContain("cl");
    expect(setDefaultUnitHidden(null, "", true)).toEqual({ ok: true, settings: null });
    expect(values(r.settings).at(-1)).toBe("");
    // Réafficher
    expect(setDefaultUnitHidden(r.settings, "cl", false)).toEqual({ ok: true, settings: null });
  });

  it("garde au moins une vraie unité proposée", () => {
    const allButG = { custom: [], hidden: ["kg", "ml", "cl", "l", "pièce", "pincée", "c. à soupe", "c. à café"] };
    expect(setDefaultUnitHidden(allButG, "g", true)).toEqual({ ok: false, error: "lastUnit" });
    const onlyCustom = { custom: ["sachet"], hidden: [...allButG.hidden, "g"] };
    expect(removeCustomUnit(onlyCustom, "sachet")).toEqual({ ok: false, error: "lastUnit" });
  });

  it("les suggestions déjà présentes ne sont plus proposées", () => {
    expect(availableSuggestions({ custom: ["Sachet"], hidden: [] })).not.toContain("sachet");
    expect(availableSuggestions(null)).toContain("gousse");
  });
});

describe("menu du formulaire — unité absente conservée", () => {
  it("propose toujours l'unité actuelle de la ligne, même masquée, supprimée ou importée", () => {
    const s = { custom: ["sachet"], hidden: ["cl"] };
    expect(values(s, "cl")).toContain("cl");
    expect(values(s, "gousses")).toContain("gousses");
    expect(values(null, "sachet")).toContain("sachet");
    // jamais en double, « Sans unité » toujours dernière
    expect(values(s, "sachet").filter((v) => v === "sachet")).toHaveLength(1);
    expect(values(s, "gousses").at(-1)).toBe("");
  });
});

describe("données abîmées et unité par défaut", () => {
  afterEach(() => setActiveUnitSettings(null));

  it("nettoie une valeur lue en base (doublons, unités inconnues masquées, types)", () => {
    expect(normalizeUnitSettings(null)).toBeNull();
    expect(normalizeUnitSettings({ custom: [], hidden: [] })).toBeNull();
    expect(normalizeUnitSettings({ custom: ["sachet", "Sachets", 3, "g", " boîte "], hidden: ["cl", "", "zzz", "cl"] }))
      .toEqual({ custom: ["sachet", "boîte"], hidden: ["cl"] });
  });

  it("une nouvelle ligne d'ingrédient ne pré-remplit pas une unité masquée", () => {
    expect(newIngredientRow("a").unit).toBe("g");
    setActiveUnitSettings({ custom: [], hidden: ["g"] });
    expect(newIngredientRow("b").unit).toBe("kg");
    expect(preferredDefaultUnit({ custom: ["sachet"], hidden: ["g", "kg", "ml", "cl", "l", "pièce", "pincée", "c. à soupe", "c. à café"] })).toBe("sachet");
  });
});

describe("saisie de quantité des courses", () => {
  const BASE = ["g", "kg", "ml", "cl", "L", "sachet", "unité"];
  it("retire les unités masquées (l masque aussi L), ajoute celles du foyer sans doublon, garde l'unité de l'article", () => {
    const s = { custom: ["Sachet", "gousse"], hidden: ["l", "cl"] };
    expect(shoppingUnitOptions(s, BASE, "cl", ["unité"])).toEqual(["g", "kg", "ml", "sachet", "unité", "gousse", "cl"]);
    expect(shoppingUnitOptions(null, BASE, "unité", ["unité"])).toEqual(BASE);
  });
});
