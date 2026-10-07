/* ------------------------------------------------------------------ */
/*  DERNIÈRE SYNCHRO RÉUSSIE — l'instant du dernier échange réussi avec   */
/*  Supabase (lecture ou écriture de données, rejeu de la file hors ligne,    */
/*  événement reçu en direct). Affichée dans le Panneau de Diagnostics         */
/*  (section Supabase) et dans le rapport copié, pour répondre à « est-ce que    */
/*  mes modifications sont bien parties ? » sans ouvrir de console.                */
/*                                                                                   */
/*  Gardée dans le stockage local : elle survit à un rechargement et reste              */
/*  affichable hors ligne (« dernière synchro il y a 2 h »). Le ping de connexion         */
/*  (pingSupabase) n'en fait PAS partie : il dit si le réseau répond, pas si les            */
/*  données se sont synchronisées.                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "grimoire_last_sync_at";
// Plusieurs requêtes réussissent à la file au démarrage : on n'écrit dans le
// stockage et on ne prévient les abonnés qu'au plus une fois par seconde.
const MIN_INTERVAL_MS = 1000;

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

let lastSyncAt: number | null = readStored();
const listeners = new Set<() => void>();

export function markSyncSuccess(now: number = Date.now()): void {
  if (lastSyncAt != null && now - lastSyncAt < MIN_INTERVAL_MS) return;
  lastSyncAt = now;
  try {
    localStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    /* stockage indisponible : l'instant reste en mémoire pour cette session */
  }
  listeners.forEach((fn) => fn());
}

export function getLastSyncAt(): number | null {
  return lastSyncAt;
}

export function subscribeLastSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Pour les tests : repart d'un état vierge (module à état global).
export function resetSyncStatusForTests(): void {
  lastSyncAt = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* rien à retirer */
  }
}
