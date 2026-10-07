import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useWakeLock from "../useWakeLock";

function mockWakeLock() {
  const sentinel = { released: false, release: vi.fn(async () => { sentinel.released = true; }) };
  const request = vi.fn(async () => sentinel);
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
  return { sentinel, request };
}

describe("useWakeLock", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "wakeLock");
  });

  it("demande le verrou d'écran au montage et le relâche au démontage", async () => {
    const { sentinel, request } = mockWakeLock();
    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    unmount();
    await waitFor(() => expect(sentinel.release).toHaveBeenCalled());
  });

  it("le redemande au retour sur l'app quand le navigateur l'a relâché", async () => {
    const { sentinel, request } = mockWakeLock();
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    sentinel.released = true; // relâché par le navigateur en arrière-plan
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it("ne fait rien (sans erreur) quand l'API n'existe pas", () => {
    expect(() => renderHook(() => useWakeLock())).not.toThrow();
  });

  it("ne fait rien quand il est désactivé", () => {
    const { request } = mockWakeLock();
    renderHook(() => useWakeLock(false));
    expect(request).not.toHaveBeenCalled();
  });
});
