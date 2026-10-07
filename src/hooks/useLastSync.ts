import { useSyncExternalStore } from "react";
import { getLastSyncAt, subscribeLastSync } from "../utils/syncStatus";

// L'instant de la dernière synchro réussie (voir utils/syncStatus.ts), qui se met
// à jour tout seul à chaque nouvel échange réussi avec Supabase. `null` : aucun
// pour l'instant sur cet appareil.
export default function useLastSync(): number | null {
  return useSyncExternalStore(subscribeLastSync, getLastSyncAt, getLastSyncAt);
}
