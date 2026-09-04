import { useEffect, useRef, useState } from "react";
import { SUPABASE_READY } from "../constants";
import { pingSupabase } from "../utils/supabase";

/* ------------------------------------------------------------------ */
/*  STATUT DE CONNEXION RÉEL — "online" | "offline" | "checking"        */
/*                                                                        */
/*  Ne se fie jamais à navigator.onLine seul (faux positifs connus,       */
/*  particulièrement sur Android : certaines combinaisons OS/opérateur/    */
/*  économie de données le rapportent à `false` alors que le réseau        */
/*  fonctionne très bien) : un vrai ping Supabase (lecture d'une seule      */
/*  ligne) fait foi. Pingué au montage, à intervalle régulier, à chaque      */
/*  retour de l'onglet au premier plan, et à chaque événement                */
/*  "online"/"offline" du navigateur (eux-mêmes de simples déclencheurs      */
/*  pour revérifier, jamais une vérité en soi — voir handleOffline           */
/*  plus bas, qui ne bascule plus directement au rouge).                     */
/*                                                                          */
/*  Un SEUL ping raté ne suffit plus à afficher "hors ligne" : sur un        */
/*  réseau mobile réel, un timeout isolé est courant sans que la             */
/*  connexion soit réellement coupée. Un premier échec programme un          */
/*  second essai de confirmation (RETRY_DELAY_MS) avant de conclure —         */
/*  seuls deux échecs consécutifs font passer la pastille au rouge.           */
/*                                                                          */
/*  "checking" (orange) est réservé aux moments réellement transitoires —  */
/*  tout premier ping, ou tentative de reconnexion après une coupure —     */
/*  jamais affiché pour un simple ping de routine pendant qu'on est déjà   */
/*  "online" : sinon le badge clignoterait en orange toutes les 30s pour   */
/*  rien.                                                                  */
/* ------------------------------------------------------------------ */
const PING_INTERVAL_MS = 30000;
const RETRY_DELAY_MS = 4000;

function initialStatus() {
  // Toujours vérifié par un vrai ping avant de conclure quoi que ce soit —
  // même le tout premier rendu ne se fie plus à navigator.onLine (faux
  // positifs Android, voir le commentaire de fichier ci-dessus) : "checking"
  // se résorbera en un aller-retour, quasi instantané si le réseau va bien.
  return SUPABASE_READY ? "checking" : "online";
}

export default function useConnectionStatus() {
  const [status, setStatus] = useState(initialStatus);
  const inFlightRef = useRef(false);
  const failureStreakRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const checkRef = useRef(() => {});

  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    let cancelled = false;

    const check = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setStatus((prev) => (prev === "online" ? prev : "checking"));
      const ok = await pingSupabase();
      inFlightRef.current = false;
      if (cancelled) return;

      if (ok) {
        failureStreakRef.current = 0;
        setStatus("online");
        return;
      }

      failureStreakRef.current += 1;
      if (failureStreakRef.current === 1) {
        // Premier échec : peut n'être qu'un aléa réseau isolé (fréquent en
        // 4G/5G) — on retente une fois avant d'afficher le bandeau, plutôt
        // que de le déclencher pour un unique timeout.
        retryTimeoutRef.current = setTimeout(() => { if (!cancelled) check(); }, RETRY_DELAY_MS);
        return;
      }
      setStatus("offline");
    };
    checkRef.current = check;

    check();
    const interval = setInterval(check, PING_INTERVAL_MS);
    // "online" : juste un déclencheur pour revérifier (voir le commentaire
    // en tête de fichier) — l'interface réseau est revenue, mais rien ne
    // garantit encore que Supabase soit réellement joignable, donc on
    // relance un vrai ping plutôt que de repasser au vert directement.
    const handleOnline = () => check();
    // "offline" ne bascule plus directement au rouge : navigator.onLine
    // n'est pas fiable (voir le commentaire de fichier) — même cet
    // événement n'est qu'un déclencheur pour revérifier par un vrai ping.
    // Une vraie coupure réseau fait de toute façon échouer ce ping quasi
    // instantanément (pas de round-trip à attendre), donc la détection
    // reste tout aussi rapide pour une coupure réelle.
    const handleOffline = () => check();
    const handleVisibility = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      checkRef.current = () => {};
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Revérification manuelle immédiate (voir le bouton "Réessayer" du
  // bandeau hors-ligne dans AppShell.jsx) — repart d'un compteur d'échecs
  // à zéro plutôt que d'attendre un éventuel second essai déjà programmé.
  const recheck = () => {
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
    failureStreakRef.current = 0;
    checkRef.current();
  };

  return { status, recheck };
}
