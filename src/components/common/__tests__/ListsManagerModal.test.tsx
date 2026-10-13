import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ListsManagerModal from "../ListsManagerModal";
import type { ShoppingList } from "../../../hooks/useShoppingLists";

const lists = [{ id: "l1", name: "Courses de la semaine", items: [{}, {}] }] as unknown as ShoppingList[];

function renderModal(onDelete = vi.fn()) {
  render(
    <ListsManagerModal lists={lists} activeListId="l1" onOpen={vi.fn()} onCreate={vi.fn()} onRename={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />
  );
  return onDelete;
}

describe("ListsManagerModal — suppression d'une liste", () => {
  it("ne supprime pas au premier appui : il faut confirmer", () => {
    const onDelete = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer ?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    expect(onDelete).toHaveBeenCalledWith("l1");
  });
});
