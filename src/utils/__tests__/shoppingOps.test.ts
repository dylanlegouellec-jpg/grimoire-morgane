import { describe, it, expect, beforeEach } from "vitest";
import { applyShoppingOps, addPendingShoppingOps, settlePendingShoppingOps, withPendingShoppingOps, resetPendingShoppingOpsForTests } from "../shoppingOps";
import type { ShoppingItem } from "../../hooks/useShoppingLists";

const item = (id: string, extra: Partial<ShoppingItem> = {}): ShoppingItem => ({ id, name: id, qty: 1, unit: "", checked: false, aisle: "x", ...extra });

beforeEach(() => resetPendingShoppingOpsForTests());

describe("applyShoppingOps", () => {
  it("ajoute en tête ou en fin, sans jamais dupliquer un article déjà présent", () => {
    const items = applyShoppingOps([item("a")], [
      { op: "add", item: item("b") },
      { op: "append", item: item("c") },
      { op: "add", item: item("a", { name: "doublon" }) },
    ]);
    expect(items.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(items[1].name).toBe("a");
  });

  it("modifie, retire et vide", () => {
    let items = applyShoppingOps([item("a"), item("b")], [{ op: "patch", id: "a", fields: { checked: true, qty: 3 } }, { op: "remove", id: "b" }]);
    expect(items).toEqual([item("a", { checked: true, qty: 3 })]);
    items = applyShoppingOps(items, [{ op: "clear" }]);
    expect(items).toEqual([]);
  });

  it("donne le même résultat si on rejoue les mêmes modifications (pas de double comptage)", () => {
    const ops = [{ op: "add" as const, item: item("b") }, { op: "patch" as const, id: "a", fields: { checked: true } }];
    const once = applyShoppingOps([item("a")], ops);
    expect(applyShoppingOps(once, ops)).toEqual(once);
  });
});

describe("modifications en attente", () => {
  it("sont réappliquées sur une liste reçue du serveur, puis plus du tout une fois confirmées", () => {
    const token = addPendingShoppingOps("l1", [{ op: "patch", id: "b", fields: { checked: true } }]);
    // Écho Realtime d'une modification précédente : B n'y est pas encore coché.
    const echo = { id: "l1", items: [item("a", { checked: true }), item("b")] };
    expect(withPendingShoppingOps(echo).items.map((i) => i.checked)).toEqual([true, true]);
    settlePendingShoppingOps("l1", token);
    expect(withPendingShoppingOps(echo)).toBe(echo);
  });

  it("ne touche pas les autres listes", () => {
    addPendingShoppingOps("l1", [{ op: "clear" }]);
    const other = { id: "l2", items: [item("a")] };
    expect(withPendingShoppingOps(other)).toBe(other);
  });
});
