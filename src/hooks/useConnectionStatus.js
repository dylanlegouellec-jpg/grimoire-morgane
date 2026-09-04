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

export default function useConnectionStatus() {
  const [status, setStatus] = useState(() => (SUPABASE_READY ? "checking" : "online"));
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    let cancelled = false;

    const check = async () => {
      if (inFlightRef.current) return;
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
