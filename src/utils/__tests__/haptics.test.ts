import { describe, it, expect, vi, afterEach } from "vitest";

/* Le « clic » haptique d'iOS 18+ passe par un interrupteur natif cliqué par
   programme (utils/haptics.ts). L'appareil est détecté au chargement du
   module : on simule donc le navigateur AVANT d'importer le module. */
async function loadAs(userAgent: string, opts: { vibrate?: () => boolean; activation?: boolean } = {}) {
  vi.resetModules();
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(window.navigator, "vibrate", { value: opts.vibrate, configurable: true, writable: true });
  Object.defineProperty(window.navigator, "userActivation", {
    value: opts.activation === undefined ? undefined : { isActive: opts.activation },
    configurable: true,
  });
  return import("../haptics");
}

const IPHONE_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_PWA_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPHONE_17 = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function spyLabelClicks() {
  const clicked: HTMLLabelElement[] = [];
  vi.spyOn(HTMLLabelElement.prototype, "click").mockImplementation(function (this: HTMLLabelElement) { clicked.push(this); });
  return clicked;
}

describe("retour haptique", () => {
  it("iPhone iOS 18 (Safari et app installée) : clique un interrupteur natif neuf, aussitôt retiré", async () => {
    for (const ua of [IPHONE_18, IPHONE_PWA_18]) {
      const { triggerHaptic } = await loadAs(ua, { activation: true });
      const clicked = spyLabelClicks();
      expect(triggerHaptic(15)).toBe(true);
      expect(clicked).toHaveLength(1);
      expect(clicked[0].querySelector("input")?.hasAttribute("switch")).toBe(true);
      expect(clicked[0].isConnected).toBe(false);
      vi.restoreAllMocks();
    }
  });

  it("hors d'un geste de l'utilisateur : pas de clic, repli visuel", async () => {
    const { triggerHaptic, triggerHapticFeedback } = await loadAs(IPHONE_18, { activation: false });
    const clicked = spyLabelClicks();
    expect(triggerHaptic(15)).toBe(false);
    expect(clicked).toHaveLength(0);
    const el = document.createElement("div");
    triggerHapticFeedback(el);
    expect(el.classList.contains("haptic-pulse")).toBe(true);
  });

  it("ne vole pas le focus d'un champ en cours de saisie", async () => {
    const { triggerHaptic } = await loadAs(IPHONE_18, { activation: true });
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();
    triggerHaptic(15);
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it("iOS plus ancien : rien (le repli visuel prend le relais)", async () => {
    const { triggerHaptic } = await loadAs(IPHONE_17, { activation: true });
    const clicked = spyLabelClicks();
    expect(triggerHaptic(15)).toBe(false);
    expect(clicked).toHaveLength(0);
  });

  it("Android : vraie vibration, pas d'interrupteur", async () => {
    const vibrate = vi.fn(() => true);
    const { triggerHaptic } = await loadAs(ANDROID, { vibrate });
    const clicked = spyLabelClicks();
    expect(triggerHaptic([20, 30, 20])).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([20, 30, 20]);
    expect(clicked).toHaveLength(0);
  });

  it("réglage « Retour tactile » coupé : rien du tout", async () => {
    localStorage.setItem("haptic_feedback_enabled", "0");
    const { triggerHaptic } = await loadAs(IPHONE_18, { activation: true });
    const clicked = spyLabelClicks();
    expect(triggerHaptic(15)).toBe(false);
    expect(clicked).toHaveLength(0);
  });
});
