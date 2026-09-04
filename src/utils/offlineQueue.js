/* ------------------------------------------------------------------ */
/*  FILE D'ATTENTE HORS-LIGNE                                          */
/*  Empile les écritures Supabase (insert/update/delete) tentées         */
/*  pendant une coupure réseau, dans localStorage, pour les rejouer      */
/*  automatiquement au retour de la connexion (voir flushOfflineQueue    */
/*  dans utils/supabase.js et l'écouteur "online" dans                  */
/*  GrimoireDeMorgane.jsx).                                            */
/* ------------------------------------------------------------------ */

const QUEUE_KEY = "grimoire_offline_queue";

function readQueue() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* stockage indisponible (quota, navigation privée...) : la file reste
       en mémoire pour cette session, sans bloquer le reste de l'app */
  }
}

// action = { id, table, type: "insert"|"update"|"delete", payload?, recordId?, ts }
export function enqueueOfflineAction(action) {
  const queue = readQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  });
  writeQueue(queue);
  return queue;
}

export function getOfflineQueue() {
  return readQueue();
}

export function getOfflineQueueSize() {
  return readQueue().length;
}

export function removeFromOfflineQueue(actionId) {
  writeQueue(readQueue().filter((a) => a.id !== actionId));
}

export function clearOfflineQueue() {
  writeQueue([]);
}
