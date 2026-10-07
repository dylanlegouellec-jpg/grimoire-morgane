import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useExitThenSwitch from "../useExitThenSwitch";

describe("useExitThenSwitch", () => {
  afterEach(() => vi.useRealTimers());

  it("affiche d'abord la valeur de départ, sans sortie", () => {
    const { result } = renderHook(() => useExitThenSwitch("a", 170));
    expect(result.current).toEqual({ shown: "a", exiting: false });
  });

  it("joue la sortie, puis bascule sur la nouvelle valeur après le délai", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useExitThenSwitch(v, 170), { initialProps: { v: "a" } });
    rerender({ v: "b" });
    // Pendant la sortie : l'ancienne valeur reste affichée.
    expect(result.current).toEqual({ shown: "a", exiting: true });
    act(() => { vi.advanceTimersByTime(169); });
    expect(result.current).toEqual({ shown: "a", exiting: true });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toEqual({ shown: "b", exiting: false });
  });

  it("repart vers la dernière valeur demandée si on change pendant la sortie", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useExitThenSwitch(v, 170), { initialProps: { v: "a" } });
    rerender({ v: "b" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ v: "c" });
    act(() => { vi.advanceTimersByTime(100); });
    // 200 ms depuis le premier changement, mais seulement 100 depuis le second.
    expect(result.current).toEqual({ shown: "a", exiting: true });
    act(() => { vi.advanceTimersByTime(70); });
    expect(result.current).toEqual({ shown: "c", exiting: false });
  });

  it("annule la sortie si on revient sur la valeur déjà affichée", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useExitThenSwitch(v, 170), { initialProps: { v: "a" } });
    rerender({ v: "b" });
    expect(result.current.exiting).toBe(true);
    rerender({ v: "a" });
    expect(result.current).toEqual({ shown: "a", exiting: false });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toEqual({ shown: "a", exiting: false });
  });

  it("bascule immédiatement avec skipExit (Réduire les animations)", () => {
    const { result, rerender } = renderHook(({ v }) => useExitThenSwitch(v, 170, true), { initialProps: { v: "a" } });
    rerender({ v: "b" });
    expect(result.current).toEqual({ shown: "b", exiting: false });
  });
});
