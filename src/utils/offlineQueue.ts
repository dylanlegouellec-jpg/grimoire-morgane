/* ------------------------------------------------------------------ */
/*  FILE D'ATTENTE HORS-LIGNE                                          */
/*  Empile les écritures Supabase (insert/update/delete) tentées         */
/*  pendant une coupure réseau, dans localStorage, pour les rejouer      */
/*  automatiquement au retour de la connexion (voir flushOfflineQueue    */
/*  dans utils/supabase.js et l'écouteur "online" dans                  */
/*  GrimoireDeMorgane.jsx).                                            */
/* ------------------------------------------------------------------ */

const QUEUE_KEY = "grimoire_offline_queue";

export type OfflineActionType = "insert" | "update" | "delete" | "app_state";

// "app_state" : recordId = householdId, payload = le patch partiel à
// appliquer, baseline = la valeur que ce client croyait être sur le
// serveur juste avant sa modification (voir findAppStateConflicts,
// utils/supabase.js — sert à détecter qu'un autre appareil a modifié le
// même champ pendant la coupure, plutôt que de l'écraser en silence).
// `id`/`ts`/`failCount` sont ajoutés par enqueueOfflineAction ci-dessous,
// jamais fournis par l'appelant — d'où `NewOfflineAction`, le sous-type
// que ses appelants construisent réellement.
export interface OfflineAction {
  id: string;
  table: string;
  type: OfflineActionType;
  payload?: Record<string, unknown>;
  recordId?: string;
  baseline?: Record<string, unknown>;
  ts: number;
  failCount: number;
}

export type NewOfflineAction = Omit<OfflineAction, "id" | "ts" | "failCount">;

// Repli mémoire RÉEL pour cette session si localStorage est indisponible ou
// refuse l'écriture (quota dépassé, navigation privée stricte) — `null` tant
// qu'aucun échec n'a eu lieu (cas normal : lit/écrit toujours localStorage).
// Bascule une fois pour toutes au premier échec, puis fait foi pour toute
// lecture/écriture ultérieure de cette même page. Avant ce correctif, le
// commentaire promettait ce repli mais readQueue() relisait toujours
// localStorage à froid, qui ne contenait jamais l'action perdue : une mise
// en file au moment précis d'un échec d'écriture disparaissait en silence.
let memoryFallback: OfflineAction[] | null = null;

function readQueue(): OfflineAction[] {
  if (memoryFallback !== null) return memoryFallback;
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineAction[]): void {
  if (memoryFallback !== null) {
    memoryFallback = queue;
    return;
  }
  try {
    if (typeof localStorage === "undefined") {
      memoryFallback = queue;
      return;
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("[offlineQueue] Écriture localStorage impossible, repli en mémoire pour cette session (perdu à la fermeture/actualisation) :", err);
    memoryFallback = queue;
  }
}

export function enqueueOfflineAction(action: NewOfflineAction): OfflineAction[] {
  const queue = readQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    failCount: 0,
  });
  writeQueue(queue);
  return queue;
}

export function getOfflineQueue(): OfflineAction[] {
  return readQueue();
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

export function removeFromOfflineQueue(actionId: string): void {
  writeQueue(readQueue().filter((a) => a.id !== actionId));
}

// Incrémente le compteur d'échecs d'UNE action précise et renvoie sa
// nouvelle valeur — voir flushOfflineQueue (utils/supabase.js) : une
// action qui échoue sans cesse (conflit définitif, pas juste un réseau
// capricieux — ex. le foyer visé a été supprimé entre-temps) bloquait
// autrement toute la file derrière elle indéfiniment, sans qu'aucun
// signal ne prévienne l'utilisateur de quoi que ce soit de particulier.
export function incrementOfflineActionFailCount(actionId: string): number {
  const queue = readQueue();
  let nextCount = 0;
  const updated = queue.map((a) => {
    if (a.id !== actionId) return a;
    nextCount = (a.failCount || 0) + 1;
    return { ...a, failCount: nextCount };
  });
  writeQueue(updated);
  return nextCount;
}

export function clearOfflineQueue(): void {
  writeQueue([]);
}
