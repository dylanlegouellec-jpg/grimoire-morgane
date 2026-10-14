import { describe, it, expect, vi, afterEach } from "vitest";

/* Le « clic » haptique d'iOS 18+ passe par un interrupteur natif invisible
   (utils/haptics.ts). L'appareil est détecté au chargement du module : on
   simule donc le navigateur AVANT d'importer le module, à chaque test. */
async function loadAs(userAgent: string, vibrate?: () => boolean) {
  vi.resetModules();
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(window.navigator, "vibrate", { value: vibrate, configurable: true, writable: true });
  return import("../haptics");
}

const IPHONE_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_17 = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

afterEach(() => {
  document.querySelectorAll(".haptic-switch").forEach((el) => el.remove());
  localStorage.clear();
});

describe("retour haptique", () => {
  it("iPhone iOS 18 : bascule l'interrupteur natif invisible", async () => {
    const { triggerHaptic } = await loadAs(IPHONE_18);
    expect(triggerHaptic(15)).toBe(true);
    const input = document.querySelector<HTMLInputElement>(".haptic-switch input");
    expect(input?.hasAttribute("switch")).toBe(true);
    expect(input?.checked).toBe(true);
    triggerHaptic(15);
    expect(input?.checked).toBe(false);
  });

  it("ne vole pas le focus d'un champ en cours de saisie", async () => {
    const { triggerHaptic } = await loadAs(IPHONE_18);
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();
    triggerHaptic(15);
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it("iOS plus ancien : rien (le repli visuel prend le relais)", async () => {
    const { triggerHaptic, triggerHapticFeedback } = await loadAs(IPHONE_17);
    expect(triggerHaptic(15)).toBe(false);
    expect(document.querySelector(".haptic-switch")).toBeNull();
    const el = document.createElement("div");
    triggerHapticFeedback(el);
    expect(el.classList.contains("haptic-pulse")).toBe(true);
  });

  it("Android : vraie vibration, pas d'interrupteur", async () => {
    const vibrate = vi.fn(() => true);
    const { triggerHaptic } = await loadAs(ANDROID, vibrate);
    expect(triggerHaptic([20, 30, 20])).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([20, 30, 20]);
    expect(document.querySelector(".haptic-switch")).toBeNull();
  });

  it("réglage « Retour tactile » coupé : rien du tout", async () => {
    localStorage.setItem("haptic_feedback_enabled", "0");
    const { triggerHaptic } = await loadAs(IPHONE_18);
    expect(triggerHaptic(15)).toBe(false);
    expect(document.querySelector(".haptic-switch")).toBeNull();
  });
});
