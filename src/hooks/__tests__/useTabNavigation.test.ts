import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTabNavigation from "../useTabNavigation";
import { TAB_EXIT_MS } from "../../constants/motion";

describe("useTabNavigation", () => {
  afterEach(() => vi.useRealTimers());

  it("change d'onglet en deux temps : demandé tout de suite, affiché après la sortie", () => {
    vi.useFakeTimers();
    const ref = { current: null };
    const { result } = renderHook(() => useTabNavigation(ref));
    expect(result.current.tab).toBe("recettes");
    act(() => result.current.changeTab("courses"));
    expect(result.current.tab).toBe("courses");
    expect(result.current.shownTab).toBe("recettes");
    expect(result.current.tabExiting).toBe(true);
    act(() => { vi.advanceTimersByTime(TAB_EXIT_MS + 5); });
    expect(result.current.shownTab).toBe("courses");
  });

  it("glisse depuis la droite vers un onglet plus à droite, depuis la gauche sinon", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useTabNavigation(ref));
    act(() => result.current.changeTab("courses"));
    expect(result.current.tabSlideStyle).toEqual({ "--tab-slide": "18px" });
    act(() => result.current.changeTab("plan"));
    expect(result.current.tabSlideStyle).toEqual({ "--tab-slide": "-18px" });
  });
});
