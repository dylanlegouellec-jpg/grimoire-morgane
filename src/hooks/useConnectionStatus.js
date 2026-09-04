import { useEffect, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { pingSupabase } from "../utils/supabase";

/* ------------------------------------------------------------------ */
/*  STATUT DE CONNEXION RÉEL — "online" | "offline" | "checking"        */
/*                                                                        */
/*  Ne se fie jamais à navigator.onLine seul (faux positifs connus, voir  */
/*  utils/supabase.js) : un vrai ping Supabase (lecture d'une seule ligne) */
/*  fait foi. Pingué au montage, à intervalle régulier, à chaque retour    */
/*  de l'onglet au premier plan, et à chaque événement "online" du         */
/*  navigateur (lui-même juste un déclencheur pour revérifier, jamais une  */
/*  vérité en soi).                                                        */
/*                                                                          */
/*  "checking" (orange) est réservé aux moments réellement transitoires —  */
/*  tout premier ping, ou tentative de reconnexion après une coupure —     */
/*  jamais affiché pour un simple ping de routine pendant qu'on est déjà   */
/*  "online" : sinon le badge clignoterait en orange toutes les 30s pour   */
/*  rien.                                                                  */
/* ------------------------------------------------------------------ */
const PING_INTERVAL_MS = 30000;

// État initial de la pastille, calculé avant même le premier ping : si le
// navigateur rapporte déjà navigator.onLine === false au lancement (mode
// avion, Wi-Fi coupé avant même d'ouvrir l'app), aucune raison d'attendre
// un ping qui échouera de toute façon pour passer au rouge — le badge
// partait sinon sur "checking" (orange) pendant tout le délai du ping,
// donnant l'impression d'une app qui "ne sait pas" qu'elle est hors ligne.
// navigator.onLine ne sert qu'à ce point de départ : une fois monté, le
// vrai ping Supabase reprend la main (voir le commentaire de fichier
// ci-dessus sur les faux positifs de navigator.onLine côté "en ligne").
function initialStatus() {
  if (!SUPABASE_READY) return "online";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  return "checking";
}

export default function useConnectionStatus() {
  const [status, setStatus] = useState(initialStatus);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    let cancelled = false;

    const check = async () => {
      if (inFlightRef.current) return;
      // Pas la peine de tenter un ping (ni de flasher "checking" en
      // attendant) si l'interface réseau elle-même a disparu — voir
      // initialStatus() ci-dessus, même logique appliquée ici pour que le
      // check() lancé au montage n'écrase pas immédiatement l'état initial
      // "offline" par un "checking" transitoire.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return;
      }
      inFlightRef.current = true;
      setStatus((prev) => (prev === "online" ? prev : "checking"));
      const ok = await pingSupabase();
      inFlightRef.current = false;
      if (!cancelled) setStatus(ok ? "online" : "offline");
    };

    check();
    const interval = setInterval(check, PING_INTERVAL_MS);
    // "online" : juste un déclencheur pour revérifier (voir le commentaire
    // en tête de fichier) — l'interface réseau est revenue, mais rien ne
    // garantit encore que Supabase soit réellement joignable, donc on
    // relance un vrai ping plutôt que de repasser au vert directement.
    const handleOnline = () => check();
    // "offline", à l'inverse, EST une vérité en soi : le navigateur ne
    // rapporte cet événement que quand l'interface réseau elle-même a
    // disparu (Wi-Fi coupé, mode avion...) — impossible d'être joignable
    // sans elle. On bascule donc la pastille au rouge INSTANTANÉMENT,
    // sans attendre le prochain ping programmé (jusqu'à PING_INTERVAL_MS
    // de retard sinon, ce qui donnait l'impression d'une pastille "restée
    // verte" pendant la coupure).
    const handleOffline = () => { if (!cancelled) setStatus("offline"); };
    const handleVisibility = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return status;
}
