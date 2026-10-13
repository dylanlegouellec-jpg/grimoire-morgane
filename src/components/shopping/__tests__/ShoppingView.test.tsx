import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ShoppingView from "../ShoppingView";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { ShoppingList } from "../../../hooks/useShoppingLists";

const list = (checkedMilk: boolean): ShoppingList => ({
  id: "l1",
  name: "Liste 1",
  scope: "household",
  userId: null,
  items: [
    { id: "a", name: "Lait", qty: 1, unit: "", checked: checkedMilk, aisle: "cremerie" },
    { id: "b", name: "Pain", qty: 1, unit: "", checked: false, aisle: "boulangerie" },
  ],
});

function view(activeList: ShoppingList) {
  return (
    <LanguageProvider language="fr">
      <ShoppingView
        recipes={[]}
        activeList={activeList}
        scope="household"
        onChangeScope={vi.fn()}
        onAddManualItem={vi.fn()}
        onToggleItem={vi.fn()}
        onAdjustQty={vi.fn()}
        onSetItemQty={vi.fn()}
        onDeleteItem={vi.fn()}
        onGenerateFromRecipes={vi.fn()}
        onResetActiveList={vi.fn()}
        onOpenManager={vi.fn()}
        showToast={vi.fn()}
      />
    </LanguageProvider>
  );
}

describe("ShoppingView", () => {
  it("ne plante pas quand on coche le dernier article d'un rayon (le rayon disparaît)", () => {
    const { rerender } = render(view(list(false)));
    expect(() => rerender(view(list(true)))).not.toThrow();
    expect(screen.getByText(/Pain/)).toBeTruthy();
  });
});
