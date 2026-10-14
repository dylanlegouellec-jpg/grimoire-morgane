import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));

import { showLocalNotification } from "../notifications";
import {
  clearCookTimers,
  cookTimerKey,
  formatRemaining,
  getCookTimer,
  getCookTimersSnapshot,
  getCookSession,
  getRemainingMs,
  pauseCookTimer,
  releaseCookTimers,
  saveCookSession,
  summarizeCookTimers,
  removeCookTimer,
  resetCookTimersForTests,
  resumeCookTimer,
  shortStepLabel,
  startCookTimer,
  subscribeCookTimers,
  toggleCookTimer,
} from "../cookTimers";

/* Magasin des minuteurs du mode cuisine : heure de fin, pause/reprise,
   fin unique (une seule notification), vidage à la fermeture. */

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  resetCookTimersForTests();
  vi.mocked(showLocalNotification).mockClear();
});
afterEach(() => {
  resetCookTimersForTests();
  vi.useRealTimers();
});

const remaining = (key: string) => getRemainingMs(getCookTimer(key)!, Date.now());

describe("cookTimers", () => {
  it("démarre un minuteur basé sur une heure de fin", () => {
    const key = startCookTimer({ groupIndex: 1, stepIndex: 2, minutes: 5, label: "Cuire les pâtes" });
    expect(key).toBe(cookTimerKey(1, 2, 5));
    expect(getCookTimer(key)?.status).toBe("running");
    vi.advanceTimersByTime(60_000);
    expect(remaining(key)).toBe(4 * 60_000);
    // Relancer la même étape ne remet pas le minuteur à zéro.
    startCookTimer({ groupIndex: 1, stepIndex: 2, minutes: 5 });
    expect(getCookTimersSnapshot().timers).toHaveLength(1);
    expect(remaining(key)).toBe(4 * 60_000);
  });

  it("reste juste même si les tics sont gelés (onglet en veille)", () => {
    const key = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 3 });
    // L'horloge avance sans qu'aucun intervalle ne tourne.
    vi.setSystemTime(Date.now() + 2 * 60_000);
    expect(remaining(key)).toBe(60_000);
  });

  it("met en pause puis reprend sans perdre le temps écoulé", () => {
    const key = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 2 });
    vi.advanceTimersByTime(30_000);
    pauseCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("paused");
    vi.advanceTimersByTime(10 * 60_000);
    expect(remaining(key)).toBe(90_000);
    resumeCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("running");
    vi.advanceTimersByTime(30_000);
    expect(remaining(key)).toBe(60_000);
    toggleCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("paused");
    toggleCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("running");
  });

  it("passe en « terminé » à l'échéance et ne notifie qu'une seule fois", () => {
    const key = startCookTimer({ groupIndex: 0, stepIndex: 1, minutes: 1, label: "Laisser reposer" });
    vi.advanceTimersByTime(59_000);
    expect(getCookTimer(key)?.status).toBe("running");
    vi.advanceTimersByTime(2_000);
    expect(getCookTimer(key)?.status).toBe("done");
    expect(remaining(key)).toBe(0);
    vi.advanceTimersByTime(5 * 60_000);
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showLocalNotification).mock.calls[0][1]?.tag).toBe(`grimoire-cookmode-timer-${key}`);
    // Un minuteur terminé ne se remet pas en route.
    toggleCookTimer(key);
    resumeCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("done");
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
  });

  it("notifie chaque minuteur une fois, même plusieurs à la fois", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1 });
    startCookTimer({ groupIndex: 1, stepIndex: 0, minutes: 2 });
    vi.advanceTimersByTime(3 * 60_000);
    expect(showLocalNotification).toHaveBeenCalledTimes(2);
  });

  it("une pause après l'échéance termine le minuteur au lieu de le figer", () => {
    const key = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1 });
    vi.setSystemTime(Date.now() + 2 * 60_000);
    pauseCookTimer(key);
    expect(getCookTimer(key)?.status).toBe("done");
    expect(showLocalNotification).toHaveBeenCalledTimes(1);
  });

  it("retire un minuteur, vide tout, et cesse alors de tourner", () => {
    const a = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1 });
    startCookTimer({ groupIndex: 0, stepIndex: 1, minutes: 1 });
    removeCookTimer(a);
    expect(getCookTimersSnapshot().timers).toHaveLength(1);
    clearCookTimers();
    expect(getCookTimersSnapshot().timers).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5 * 60_000);
    expect(showLocalNotification).not.toHaveBeenCalled();
  });

  it("prévient les abonnés", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCookTimers(listener);
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1 });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    clearCookTimers();
    expect(listener).not.toHaveBeenCalled();
  });

  it("formate le temps restant et tronque le nom de l'étape", () => {
    expect(formatRemaining(90_000)).toBe("1:30");
    expect(formatRemaining(59_001)).toBe("1:00");
    expect(shortStepLabel("Court")).toBe("Court");
    const long = shortStepLabel("Faire revenir les oignons émincés dans le beurre pendant 10 min");
    expect(long.length).toBeLessThanOrEqual(32);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("cookTimers — minuteurs rattachés à une recette (hors mode cuisine)", () => {
  it("la même étape de deux recettes donne deux minuteurs distincts", () => {
    const a = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 5, recipeId: "r1" });
    const b = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 5, recipeId: "r2" });
    expect(a).not.toBe(b);
    expect(a).toBe(cookTimerKey(0, 0, 5, "r1"));
    expect(getCookTimer(a)?.recipeId).toBe("r1");
    expect(getCookTimersSnapshot().timers).toHaveLength(2);
  });

  it("fermer le mode cuisine garde les minuteurs actifs et retire les terminés", () => {
    const running = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    const paused = startCookTimer({ groupIndex: 0, stepIndex: 1, minutes: 10, recipeId: "r1" });
    const finished = startCookTimer({ groupIndex: 0, stepIndex: 2, minutes: 1, recipeId: "r1" });
    const other = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 1, recipeId: "r2" });
    pauseCookTimer(paused);
    vi.advanceTimersByTime(61_000);
    releaseCookTimers("r1");
    const keys = getCookTimersSnapshot().timers.map((t) => t.key);
    expect(keys).toEqual([running, paused, other]);
    // Le minuteur qui tourne continue (et finit) hors du mode cuisine.
    vi.advanceTimersByTime(10 * 60_000);
    expect(getCookTimer(running)?.status).toBe("done");
    expect(getCookTimer(finished)).toBeUndefined();
  });

  it("sans recette connue, la fermeture retire tout, comme avant", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10 });
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    releaseCookTimers(null);
    expect(getCookTimersSnapshot().timers.map((t) => t.recipeId)).toEqual(["r1"]);
  });

  it("vide seulement les recettes demandées", () => {
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r2" });
    clearCookTimers(["r2"]);
    expect(getCookTimersSnapshot().timers.map((t) => t.recipeId)).toEqual(["r1"]);
  });

  it("résume pour la pastille : le plus proche, « +N », terminé en priorité, recette ouverte exclue", () => {
    expect(summarizeCookTimers([], Date.now())).toBeNull();
    const long = startCookTimer({ groupIndex: 0, stepIndex: 0, minutes: 10, recipeId: "r1" });
    const short = startCookTimer({ groupIndex: 0, stepIndex: 1, minutes: 3, recipeId: "r2" });
    const pausedShort = startCookTimer({ groupIndex: 0, stepIndex: 2, minutes: 1, recipeId: "r2" });
    pauseCookTimer(pausedShort);
    // Un minuteur sans recette n'est jamais résumé (impossible à rouvrir).
    startCookTimer({ groupIndex: 0, stepIndex: 3, minutes: 1 });
    let summary = summarizeCookTimers(getCookTimersSnapshot().timers, Date.now())!;
    expect(summary.lead.key).toBe(short); // ceux qui tournent avant ceux en pause
    expect(summary.others).toBe(2);
    expect(summary.done).toBe(false);

    summary = summarizeCookTimers(getCookTimersSnapshot().timers, Date.now(), "r2")!;
    expect(summary.lead.key).toBe(long);
    expect(summary.others).toBe(0);
    expect(summarizeCookTimers(getCookTimersSnapshot().timers, Date.now(), "r1")!.timers).toHaveLength(2);

    vi.advanceTimersByTime(3 * 60_000 + 1_000);
    summary = summarizeCookTimers(getCookTimersSnapshot().timers, Date.now())!;
    expect(summary.done).toBe(true);
    expect(summary.lead.key).toBe(short);
  });

  it("garde puis oublie la préparation d'une recette", () => {
    saveCookSession("r1", { servings: 6, groupIndex: 1, done: [[true], [false]] });
    expect(getCookSession("r1")?.servings).toBe(6);
    saveCookSession("r1", null);
    expect(getCookSession("r1")).toBeUndefined();
  });
});
