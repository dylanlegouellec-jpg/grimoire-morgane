import { describe, it, expect } from "vitest";
import { buildShoppingShareText, formatShareItem } from "../shoppingShare";

const item = (name: string, qty: number, unit = "", checked = false) => ({ id: name, name, qty, unit, checked, aisle: "" });
const same = (n: string) => n;

describe("partage d'une liste de courses", () => {
  it("formate les quantités lisiblement", () => {
    expect(formatShareItem(item("persil", 1), "fr", same)).toBe("persil");
    expect(formatShareItem(item("œufs", 3), "fr", same)).toBe("3 œufs");
    expect(formatShareItem(item("farine", 1.5, "kg"), "fr", same)).toBe("1,5 kg farine");
    expect(formatShareItem(item("flour", 1.5, "kg"), "en", same)).toBe("1.5 kg flour");
  });

  it("un bloc par rayon avec son emoji, des cases, et les articles déjà pris à la fin", () => {
    const text = buildShoppingShareText({
      listName: "Courses de la semaine",
      aisles: [
        { key: "Fruits & Légumes", label: "Fruits & Légumes", items: [item("carottes", 3), item("persil", 1)] },
        { key: "Autre", label: "Autre", items: [item("sopalin", 1)] },
        { key: "Vide", label: "Vide", items: [] },
      ],
      bought: [item("lait", 1, "", true), item("beurre", 1, "", true)],
      language: "fr",
      boughtLabel: "Déjà achetés :",
      footer: "envoyé depuis Le Grimoire de Morgane",
      itemName: same,
    });
    expect(text).toBe([
      "🛒 *Courses de la semaine*",
      "",
      "🥦 Fruits & Légumes",
      "☐ 3 carottes",
      "☐ persil",
      "",
      "🧺 Autre",
      "☐ sopalin",
      "",
      "✅ Déjà achetés : lait, beurre",
      "",
      "— envoyé depuis Le Grimoire de Morgane",
    ].join("\n"));
  });
});
