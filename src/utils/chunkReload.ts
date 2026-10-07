/* ------------------------------------------------------------------ */
/*  Reprise après un morceau d'app introuvable.                         */
/*                                                                      */
/*  Les écrans rarement ouverts (Réglages, tuto, onglets...) sont des   */
/*  morceaux de code chargés à la demande, avec un nom qui change à      */
/*  chaque version. Une app restée ouverte (très fréquent sur téléphone,  */
/*  où le système la garde en veille des jours) peut donc réclamer un     */
/*  morceau qui n'existe plus sur le serveur après une mise à jour : le    */
/*  chargement échoue et l'écran d'erreur apparaît, alors qu'un simple     */
/*  rechargement suffit. On recharge donc automatiquement, une seule fois  */
/*  (une garde empêche toute boucle si le problème est ailleurs).         */
/* ------------------------------------------------------------------ */

const RELOAD_KEY = "grimoire_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_ERROR_PATTERN =
  /dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk|loading css chunk|unable to preload css/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return CHUNK_ERROR_PATTERN.test(message);
}

/** Recharge la page une fois (pas deux fois de suite à moins de 30 s). Renvoie `true` si le rechargement est lancé. */
export function reloadOnceForChunkError(now: number = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (last && now - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // sessionStorage inaccessible : on ne peut pas garantir l'absence de boucle
    return false;
  }
  window.location.reload();
  return true;
}
