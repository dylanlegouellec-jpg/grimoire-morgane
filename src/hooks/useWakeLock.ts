import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Garde l'écran allumé tant que le composant est affiché (mode       */
/*  cuisine : les mains sont occupées, on ne veut pas que l'écran      */
/*  s'éteigne en plein milieu d'une étape).                            */
/*                                                                      */
/*  Le navigateur relâche tout seul le verrou quand la page passe en    */
/*  arrière-plan : on le redemande donc au retour sur l'app. Si l'API   */
/*  n'existe pas ou refuse (batterie faible, onglet masqué), on ne      */
/*  fait rien — l'écran suit alors son comportement habituel.           */
/* ------------------------------------------------------------------ */
export default function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) return undefined;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // refusé par le navigateur : on continue sans
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
