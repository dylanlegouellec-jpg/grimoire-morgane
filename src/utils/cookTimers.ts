import { useSyncExternalStore } from "react";
import { showLocalNotification } from "./notifications";
import { translateCurrent } from "./i18n";

/* ------------------------------------------------------------------ */
/*  MINUTEURS DU MODE CUISINE — un petit magasin partagé (même principe   */
/*  que utils/appUpdate.ts / syncStatus.ts) pour que plusieurs minuteurs    */
/*  tournent en même temps et survivent au changement de groupe d'étapes.    */
/*                                                                            */
/*  Avant, chaque StepTimer gardait son décompte dans son propre état :         */
/*  changer de groupe démontait le bouton et perdait le minuteur. Ici, chaque     */
/*  minuteur est rangé sous une clé stable par étape (groupe + étape + minutes)     */
/*  et repose sur une HEURE DE FIN (Date.now()), pas sur un compteur décrémenté :     */
/*  un onglet mis en veille (intervalles ralentis ou gelés) retombe juste au réveil.    */
/*  La notification de fin part d'ici, une seule fois par minuteur, que son bouton        */
/*  soit affiché à l'écran ou non. Le mode cuisine vide le magasin à sa fermeture.          */
/* ------------------------------------------------------------------ */

export type CookTimerStatus = "running" | "paused" | "done";

export interface CookTimer {
  key: string;
  groupIndex: number;
  stepIndex: number;
  /** Début du texte de l'étape (bandeau, notification). */
  label: string;
  minutes: number;
  status: CookTimerStatus;
  /** Heure de fin (ms) quand le minuteur tourne, sinon null. */
  endsAt: number | null;
  /** Temps restant figé (ms) quand il est en pause ; 0 une fois terminé. */
  remainingMs: number;
  /** La notification de fin est déjà partie. */
  notified: boolean;
}

export interface CookTimersSnapshot {
  timers: CookTimer[];
  /** Instant du dernier calcul : sert à afficher le temps restant. */
  now: number;
}

export interface StartTimerInput {
  groupIndex: number;
  stepIndex: number;
  minutes: number;
  label?: string;
}

// Rafraîchissement de l'affichage tant qu'un minuteur tourne. Le temps
// restant est recalculé depuis l'heure de fin, la cadence ne joue donc que
// sur la fluidité, jamais sur la justesse.
const TICK_MS = 500;
const LABEL_MAX = 32;

let snapshot: CookTimersSnapshot = { timers: [], now: Date.now() };
let ticker: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

export function cookTimerKey(groupIndex: number, stepIndex: number, minutes: number): string {
  return `${groupIndex}:${stepIndex}:${minutes}`;
}

/** Début du texte de l'étape, tronqué proprement pour le bandeau. */
export function shortStepLabel(text: string, max: number = LABEL_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function getRemainingMs(timer: CookTimer, now: number = Date.now()): number {
  if (timer.status === "running" && timer.endsAt != null) return Math.max(0, timer.endsAt - now);
  return timer.remainingMs;
}

export function formatRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function emit(timers: CookTimer[], now: number = Date.now()): void {
  snapshot = { timers, now };
  listeners.forEach((fn) => fn());
  syncTicker();
}

function notifyDone(timer: CookTimer): void {
  // Pour prévenir même quand le téléphone est ailleurs/l'écran éteint.
  // Une étiquette par minuteur : deux minuteurs qui finissent ensemble
  // donnent deux notifications au lieu que la seconde remplace la première.
  void showLocalNotification(translateCurrent("recipeUi.timer.notificationTitle"), {
    body: timer.label
      ? translateCurrent("cookExtras.timers.notificationBody", { label: timer.label, minutes: timer.minutes })
      : translateCurrent("recipeUi.timer.notificationBody", { minutes: timer.minutes }),
    icon: "/Icon.jpeg",
    tag: `grimoire-cookmode-timer-${timer.key}`,
  });
}

/** Passe en « terminé » les minuteurs arrivés à échéance (et prévient, une fois). */
export function tickCookTimers(now: number = Date.now()): void {
  const finished: CookTimer[] = [];
  const timers = snapshot.timers.map((timer) => {
    if (timer.status !== "running" || timer.endsAt == null || timer.endsAt > now) return timer;
    const next: CookTimer = { ...timer, status: "done", endsAt: null, remainingMs: 0, notified: true };
    if (!timer.notified) finished.push(next);
    return next;
  });
  emit(timers, now);
  finished.forEach(notifyDone);
}

function syncTicker(): void {
  const anyRunning = snapshot.timers.some((t) => t.status === "running");
  if (anyRunning && !ticker) {
    ticker = setInterval(() => tickCookTimers(), TICK_MS);
  } else if (!anyRunning && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function update(key: string, fn: (timer: CookTimer, now: number) => CookTimer): void {
  const now = Date.now();
  if (!snapshot.timers.some((t) => t.key === key)) return;
  emit(snapshot.timers.map((t) => (t.key === key ? fn(t, now) : t)), now);
}

/** Lance le minuteur d'une étape (sans effet s'il existe déjà). */
export function startCookTimer({ groupIndex, stepIndex, minutes, label = "" }: StartTimerInput): string {
  const key = cookTimerKey(groupIndex, stepIndex, minutes);
  if (snapshot.timers.some((t) => t.key === key)) return key;
  const now = Date.now();
  const timer: CookTimer = {
    key, groupIndex, stepIndex, minutes,
    label: shortStepLabel(label),
    status: "running",
    endsAt: now + minutes * 60_000,
    remainingMs: minutes * 60_000,
    notified: false,
  };
  emit([...snapshot.timers, timer], now);
  return key;
}

export function pauseCookTimer(key: string): void {
  // Une pause demandée après l'échéance (onglet gelé, tic pas encore passé)
  // termine d'abord le minuteur plutôt que de le figer à 0:00.
  tickCookTimers();
  update(key, (t, now) =>
    t.status === "running" ? { ...t, status: "paused", remainingMs: getRemainingMs(t, now), endsAt: null } : t
  );
}

export function resumeCookTimer(key: string): void {
  update(key, (t, now) => (t.status === "paused" ? { ...t, status: "running", endsAt: now + t.remainingMs } : t));
}

/** Pause ↔ reprise (sans effet sur un minuteur terminé). */
export function toggleCookTimer(key: string): void {
  const t = getCookTimer(key);
  if (!t) return;
  if (t.status === "running") pauseCookTimer(key);
  else if (t.status === "paused") resumeCookTimer(key);
}

export function removeCookTimer(key: string): void {
  if (!snapshot.timers.some((t) => t.key === key)) return;
  emit(snapshot.timers.filter((t) => t.key !== key));
}

/** Vide tous les minuteurs (fermeture du mode cuisine). */
export function clearCookTimers(): void {
  if (!snapshot.timers.length) return;
  emit([]);
}

export function getCookTimer(key: string): CookTimer | undefined {
  return snapshot.timers.find((t) => t.key === key);
}

export function getCookTimersSnapshot(): CookTimersSnapshot {
  return snapshot;
}

export function subscribeCookTimers(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lecture réactive du magasin (re-rendu à chaque changement et à chaque tic). */
export function useCookTimers(): CookTimersSnapshot {
  return useSyncExternalStore(subscribeCookTimers, getCookTimersSnapshot, getCookTimersSnapshot);
}

// Pour les tests : repart d'un état vierge (module à état global).
export function resetCookTimersForTests(): void {
  if (ticker) clearInterval(ticker);
  ticker = null;
  snapshot = { timers: [], now: Date.now() };
}
