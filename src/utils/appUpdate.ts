/* ------------------------------------------------------------------ */
/*  MISE À JOUR DE L'APP — « une nouvelle version est prête », à appliquer  */
/*  quand l'utilisateur le décide (bandeau « Recharger », voir               */
/*  components/common/UpdateBanner.tsx).                                      */
/*                                                                              */
/*  Avant, le service worker s'activait tout seul et main.tsx rechargeait         */
/*  l'onglet aussitôt : une recette en cours de saisie pouvait disparaître           */
/*  d'un coup. Maintenant (vite.config.ts, registerType: "prompt") la nouvelle         */
/*  version s'installe puis ATTEND : l'ancienne continue de servir ses propres           */
/*  fichiers — donc aucun 404 sur un morceau de code supprimé — jusqu'à ce que              */
/*  l'utilisateur tape sur « Recharger ». Ce module est le pont entre le service              */
/*  worker (main.tsx) et l'interface : un petit état partagé, sans dépendance.                  */
/* ------------------------------------------------------------------ */

type ApplyUpdate = (reloadPage?: boolean) => Promise<void>;

interface UpdateState {
  /** Une nouvelle version est installée et attend. */
  available: boolean;
  /** L'utilisateur a choisi « Plus tard » : le bandeau se tait jusqu'au prochain lancement. */
  dismissed: boolean;
}

let state: UpdateState = { available: false, dismissed: false };
let applyFn: ApplyUpdate | null = null;
const listeners = new Set<() => void>();

function setState(next: UpdateState): void {
  state = next;
  listeners.forEach((fn) => fn());
}

/** Branche la fonction qui active la version en attente (celle de registerSW). */
export function registerUpdateHandler(apply: ApplyUpdate): void {
  applyFn = apply;
}

/** Appelé par le service worker quand une version est prête (onNeedRefresh). */
export function notifyUpdateAvailable(): void {
  if (state.available) return;
  setState({ available: true, dismissed: false });
}

export function getUpdateState(): UpdateState {
  return state;
}

export function subscribeUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Active la nouvelle version et recharge la page. */
export function applyUpdate(): void {
  void applyFn?.(true);
}

/** « Plus tard » : masque le bandeau jusqu'au prochain lancement de l'app. */
export function dismissUpdate(): void {
  if (!state.available || state.dismissed) return;
  setState({ ...state, dismissed: true });
}

/* --- Vérifications automatiques -------------------------------------- */

// Une appli installée reste souvent suspendue en arrière-plan des jours entiers :
// le navigateur ne revérifie alors pas tout seul. On le fait au retour au premier
// plan (au plus toutes les 10 minutes) et une fois par heure si l'app reste ouverte.
const RESUME_CHECK_MIN_INTERVAL_MS = 10 * 60 * 1000;
const HOURLY_CHECK_MS = 60 * 60 * 1000;

export function startUpdateChecks(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  let lastCheck = Date.now();
  const check = () => {
    lastCheck = Date.now();
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {
        /* hors ligne ou service worker absent : on réessaiera plus tard */
      });
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible" && Date.now() - lastCheck >= RESUME_CHECK_MIN_INTERVAL_MS) check();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const timer = setInterval(check, HOURLY_CHECK_MS);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    clearInterval(timer);
  };
}

// Pour les tests : repart d'un état vierge (module à état global).
export function resetAppUpdateForTests(): void {
  state = { available: false, dismissed: false };
  applyFn = null;
}
