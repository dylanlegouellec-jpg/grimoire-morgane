import { describe, it, expect, vi, afterEach } from "vitest";
import { dismissSplash } from "../splash";

// Fausse animation contrôlable : finish() résout sa promesse `finished`.
function fakeAnimation(endTime: number) {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const anim = {
    playState: "running",
    finished,
    effect: { getComputedTiming: () => ({ endTime }) },
  } as unknown as Animation;
  return { anim, finish };
}

function mountSplash(animations: Animation[] = []): HTMLElement {
  document.body.innerHTML = '<div id="splash"></div>';
  const el = document.getElementById("splash")!;
  el.getAnimations = vi.fn(() => animations);
  return el;
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("dismissSplash", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("ne fait rien (sans erreur) quand #splash n'existe pas", () => {
    expect(() => dismissSplash()).not.toThrow();
  });

  it("lance le fondu tout de suite sans animation en cours, puis retire l'élément", () => {
    vi.useFakeTimers();
    const el = mountSplash();
    dismissSplash();
    expect(el.classList.contains("splash-leaving")).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("splash")).toBeNull();
  });

  it("attend la fin des animations finies (le cookie croqué) avant le fondu", async () => {
    vi.useFakeTimers();
    const bite = fakeAnimation(1440);
    const crumb = fakeAnimation(2020);
    const el = mountSplash([bite.anim, crumb.anim]);
    dismissSplash();
    await flush();
    expect(el.classList.contains("splash-leaving")).toBe(false);
    bite.finish();
    await flush();
    expect(el.classList.contains("splash-leaving")).toBe(false);
    crumb.finish();
    await flush();
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("ignore les animations infinies (la respiration du cookie)", async () => {
    vi.useFakeTimers();
    const breathe = fakeAnimation(Infinity);
    const el = mountSplash([breathe.anim]);
    dismissSplash();
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("n'attend jamais plus que le filet de sécurité", async () => {
    vi.useFakeTimers();
    const stuck = fakeAnimation(1000);
    const el = mountSplash([stuck.anim]);
    dismissSplash();
    await vi.advanceTimersByTimeAsync(2999);
    expect(el.classList.contains("splash-leaving")).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("n'attend pas quand l'utilisateur a demandé moins d'animations", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    const el = mountSplash([fakeAnimation(1440).anim]);
    dismissSplash();
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("part tout de suite avec { immediate: true } (lien de partage)", () => {
    vi.useFakeTimers();
    const el = mountSplash([fakeAnimation(1440).anim]);
    dismissSplash({ immediate: true });
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("{ immediate: true } coupe court à une attente déjà en cours", async () => {
    vi.useFakeTimers();
    const el = mountSplash([fakeAnimation(1440).anim]);
    dismissSplash();
    await flush();
    expect(el.classList.contains("splash-leaving")).toBe(false);
    dismissSplash({ immediate: true });
    expect(el.classList.contains("splash-leaving")).toBe(true);
  });

  it("est idempotent : un second appel pendant le fondu ne relance rien", () => {
    vi.useFakeTimers();
    mountSplash();
    const timeoutSpy = vi.spyOn(window, "setTimeout");
    dismissSplash();
    dismissSplash();
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
  });

  it("est idempotent pendant l'attente (StrictMode, filet de 8 s)", async () => {
    vi.useFakeTimers();
    const bite = fakeAnimation(1440);
    const el = mountSplash([bite.anim]);
    const addSpy = vi.spyOn(el.classList, "add");
    dismissSplash();
    dismissSplash();
    expect(el.getAnimations).toHaveBeenCalledTimes(1);
    bite.finish();
    await flush();
    dismissSplash();
    expect(addSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById("splash")).toBeNull();
  });
});
