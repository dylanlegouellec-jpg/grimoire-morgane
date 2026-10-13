import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ShoppingList } from "../useShoppingLists";

const callRpcMock = vi.fn();
const insertRowMock = vi.fn(() => Promise.resolve(undefined));

vi.mock("../../constants", async (importOriginal) => ({ ...(await importOriginal<object>()), SUPABASE_READY: true }));
vi.mock("../../utils/supabase", () => ({
  insertRow: (...args: unknown[]) => insertRowMock(...(args as [])),
  updateRow: vi.fn(() => Promise.resolve(undefined)),
  deleteRow: vi.fn(() => Promise.resolve(undefined)),
  callRpc: (...args: unknown[]) => callRpcMock(...args),
  mapShoppingListToRow: (l: unknown) => l,
}));

import useShoppingLists from "../useShoppingLists";
import { resetPendingShoppingOpsForTests } from "../../utils/shoppingOps";

const list = (items: ShoppingList["items"]): ShoppingList => ({ id: "l1", name: "Liste 1", items, scope: "household", userId: null });
const item = (id: string, checked = false, qty = 1) => ({ id, name: id, qty, unit: "", checked, aisle: "x" });

function setup(initial: ShoppingList[], activeId: string | null = "l1") {
  return renderHook(() =>
    useShoppingLists({ householdId: "h1", userId: "u1", initialLists: initial, initialActiveListId: activeId, showToast: vi.fn() })
  );
}

beforeEach(() => {
  callRpcMock.mockReset();
  insertRowMock.mockClear();
  resetPendingShoppingOpsForTests();
  localStorage.clear();
});

describe("useShoppingLists — modifications article par article", () => {
  it("cocher envoie seulement l'article modifié, avec sa nouvelle valeur", () => {
    callRpcMock.mockReturnValue(new Promise(() => {}));
    const { result } = setup([list([item("a"), item("b")])]);
    act(() => result.current.toggleShoppingItem("a"));
    expect(callRpcMock).toHaveBeenCalledWith("shopping_list_apply", { p_list_id: "l1", p_ops: [{ op: "patch", id: "a", fields: { checked: true } }] });
    expect(result.current.shoppingLists[0].items[0].checked).toBe(true);
  });

  it("deux coches rapides ne s'annulent pas, et la réponse du serveur garde la seconde encore en route", async () => {
    let resolveFirst: (items: unknown) => void = () => {};
    callRpcMock
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockReturnValueOnce(new Promise(() => {}));
    const { result } = setup([list([item("a"), item("b")])]);
    act(() => {
      result.current.toggleShoppingItem("a");
      result.current.toggleShoppingItem("b");
    });
    // Le serveur confirme la 1re coche (B pas encore traité de son côté).
    await act(async () => { resolveFirst([item("a", true), item("b")]); });
    await waitFor(() => expect(result.current.shoppingLists[0].items.map((i) => i.checked)).toEqual([true, true]));
  });

  it("sans liste active, crée la liste AVEC le premier article (un seul envoi)", () => {
    const { result } = setup([], null);
    act(() => result.current.addManualItem("Lait"));
    expect(callRpcMock).not.toHaveBeenCalled();
    expect(insertRowMock).toHaveBeenCalledTimes(1);
    const inserted = (insertRowMock.mock.calls[0] as unknown[])[1] as ShoppingList;
    expect(inserted.items.map((i) => i.name)).toEqual(["Lait"]);
  });

  it("générer depuis des recettes additionne et décoche un article déjà acheté", () => {
    callRpcMock.mockReturnValue(new Promise(() => {}));
    const { result } = setup([list([{ id: "t", name: "Tomates", qty: 2, unit: "", checked: true, aisle: "x" }])]);
    const recipe = { id: "r1", ingredients: [{ name: "Tomates", qty: 3, unit: "" }, { name: "Basilic", qty: 1, unit: "" }] };
    act(() => result.current.generateShoppingList([recipe] as never, ["r1"]));
    const items = result.current.shoppingLists[0].items;
    expect(items[0]).toMatchObject({ name: "Tomates", qty: 5, checked: false });
    expect(items[1]).toMatchObject({ name: "Basilic", qty: 1 });
  });
});

describe("useShoppingLists — « Annuler » après une suppression", () => {
  it("retirer un article propose « Annuler », qui le remet dans sa liste", () => {
    callRpcMock.mockReturnValue(new Promise(() => {}));
    const showToast = vi.fn();
    const { result } = renderHook(() =>
      useShoppingLists({ householdId: "h1", userId: "u1", initialLists: [list([item("a"), item("b", true)])], initialActiveListId: "l1", showToast })
    );
    act(() => result.current.deleteShoppingItem("b"));
    expect(result.current.shoppingLists[0].items.map((it) => it.id)).toEqual(["a"]);
    const action = showToast.mock.calls.at(-1)?.[1];
    expect(action?.label).toBeTruthy();
    act(() => action.onAction());
    expect(result.current.shoppingLists[0].items).toEqual([item("a"), item("b", true)]);
    expect(callRpcMock).toHaveBeenLastCalledWith("shopping_list_apply", { p_list_id: "l1", p_ops: [{ op: "append", item: item("b", true) }] });
  });

  it("supprimer une liste propose « Annuler », qui la recrée avec le même id", () => {
    const showToast = vi.fn();
    const { result } = renderHook(() =>
      useShoppingLists({ householdId: "h1", userId: "u1", initialLists: [list([item("a")])], initialActiveListId: "l1", showToast })
    );
    act(() => { void result.current.deleteShoppingList("l1"); });
    expect(result.current.shoppingLists).toEqual([]);
    const action = showToast.mock.calls.find((c) => c[1])?.[1];
    act(() => action.onAction());
    expect(result.current.shoppingLists.map((l) => l.id)).toEqual(["l1"]);
    expect(result.current.activeListId).toBe("l1");
    expect(insertRowMock).toHaveBeenCalledWith("shopping_lists", expect.objectContaining({ id: "l1" }), );
  });
});
