import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useFilterSwipe from "../useFilterSwipe";

function swipe(node: HTMLElement, dx: number, dy = 0) {
  const start = new Event("touchstart") as unknown as TouchEvent;
  Object.defineProperty(start, "touches", { value: [{ clientX: 200, clientY: 300 }] });
  node.dispatchEvent(start as unknown as Event);
  const end = new Event("touchend") as unknown as TouchEvent;
  Object.defineProperty(end, "changedTouches", { value: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  node.dispatchEvent(end as unknown as Event);
}

describe("useFilterSwipe", () => {
  it("un balayage vers la gauche passe au filtre suivant, vers la droite au précédent", () => {
    const node = document.createElement("main");
    const setFilter = vi.fn();
    renderHook(() => useFilterSwipe({ current: node }, "recettes", 1, setFilter));
    swipe(node, -80);
    swipe(node, 80);
    expect(setFilter.mock.calls.map((c) => c[0])).toEqual(["sucre", "tout"]);
  });

  it("ignore un geste surtout vertical, et tout geste hors de l'onglet Recettes", () => {
    const node = document.createElement("main");
    const setFilter = vi.fn();
    const { rerender } = renderHook(({ tab }) => useFilterSwipe({ current: node }, tab, 0, setFilter), { initialProps: { tab: "recettes" } });
    swipe(node, -60, 120);
    rerender({ tab: "plan" });
    swipe(node, -80);
    expect(setFilter).not.toHaveBeenCalled();
  });
});
