import type { DevLogEntry } from "./devLog";

/* ------------------------------------------------------------------ */
/*  DIAGNOSTICS DE L'APP — version, mode d'affichage, service worker,    */
/*  appareil, chargement de la page, mises à jour, rapport à copier.       */
/*  Tout ce que le Panneau de Diagnostics (components/diagnostics/) affiche  */
/*  en plus des métriques en direct, pour pouvoir comprendre un souci          */
/*  DIRECTEMENT sur un téléphone, sans DevTools : aucune dépendance, juste        */
/*  des API navigateur — chacune protégée, car beaucoup n'existent pas partout    */
/*  (performance.memory, navigator.connection : Chrome seulement ; le service       */
/*  worker : absent en navigation privée selon les navigateurs).                      */
/* ------------------------------------------------------------------ */

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/* --- Version -------------------------------------------------------- */

export interface BuildInfo {
  commit: string;
  builtAt: string;
}

// Injectée au build (scripts/buildInfo.ts) ; tolérante si la constante n'existe
// pas (un outil qui importerait ce fichier sans passer par Vite).
export function getBuildInfo(): BuildInfo {
  return typeof __GRIMOIRE_BUILD__ !== "undefined" ? __GRIMOIRE_BUILD__ : { commit: "dev", builtAt: "" };
}

/* --- Mode d'affichage ----------------------------------------------- */

export type DisplayMode = "standalone" | "browser";

// `data-standalone` est posé sur <html> par main.tsx (navigator.standalone sur
// iOS, display-mode: standalone ailleurs) : on lit ce même repère plutôt que de
// refaire la détection, pour que le panneau dise toujours ce que le CSS croit.
export function getDisplayMode(): DisplayMode {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-standalone") === "true"
    ? "standalone"
    : "browser";
}

/* --- Service worker ------------------------------------------------- */

export type ServiceWorkerState = "unsupported" | "none" | "installing" | "waiting" | "active";

export interface ServiceWorkerInfo {
  state: ServiceWorkerState;
  /** Vrai quand un service worker contrôle la page ouverte (sinon : après un premier chargement). */
  controlling: boolean;
}

function serviceWorkerContainer(): ServiceWorkerContainer | null {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator ? navigator.serviceWorker : null;
}

export async function getServiceWorkerInfo(): Promise<ServiceWorkerInfo> {
  const container = serviceWorkerContainer();
  if (!container) return { state: "unsupported", controlling: false };
  try {
    const registration = await container.getRegistration();
    if (!registration) return { state: "none", controlling: Boolean(container.controller) };
    const state: ServiceWorkerState = registration.waiting
      ? "waiting"
      : registration.installing
        ? "installing"
        : registration.active
          ? "active"
          : "none";
    return { state, controlling: Boolean(container.controller) };
  } catch {
    return { state: "none", controlling: false };
  }
}

export type UpdateCheckResult = "unsupported" | "up-to-date" | "update-found";

// Demande au navigateur de revérifier le service worker sur le serveur. Une mise
// à jour trouvée s'installe et s'active toute seule (registerType: "autoUpdate",
// vite.config.ts), puis main.tsx recharge l'onglet : ici on dit seulement s'il y
// en avait une.
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const container = serviceWorkerContainer();
  if (!container) return "unsupported";
  try {
    const registration = await container.getRegistration();
    if (!registration) return "unsupported";
    await registration.update();
    return registration.waiting || registration.installing ? "update-found" : "up-to-date";
  } catch {
    return "unsupported";
  }
}

// Désinscrit les service workers, vide les caches de l'app (fichiers
// précachés, images) puis recharge : la page repart d'une copie neuve du serveur.
// Les DONNÉES (recettes, réglages — stockage local, Supabase) ne sont pas touchées.
export async function forceUpdate(reload: () => void = () => window.location.reload()): Promise<void> {
  const container = serviceWorkerContainer();
  if (container) {
    try {
      const registrations = await container.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {
      /* rien à désinscrire */
    }
  }
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      /* cache indisponible */
    }
  }
  reload();
}

/* --- Appareil -------------------------------------------------------- */

export interface DeviceInfo {
  screen: string;
  viewport: string;
  orientation: "portrait" | "landscape";
  language: string;
  timezone: string;
  online: boolean;
  /** Type de connexion ("4g"…), seulement là où le navigateur l'expose (Chrome). */
  connection: string | null;
  userAgent: string;
}

export function getDeviceInfo(): DeviceInfo {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const connection = (nav as (Navigator & { connection?: { effectiveType?: string } }) | undefined)?.connection;
  let timezone = "—";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";
  } catch {
    /* Intl indisponible */
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    screen: `${window.screen?.width ?? "?"}×${window.screen?.height ?? "?"} · ${window.devicePixelRatio || 1}x`,
    viewport: `${width}×${height}`,
    orientation: width > height ? "landscape" : "portrait",
    language: nav?.language ?? "—",
    timezone,
    online: nav?.onLine ?? true,
    connection: connection?.effectiveType ?? null,
    userAgent: nav?.userAgent ?? "—",
  };
}

/* --- Chargement de la page -------------------------------------------- */

export interface PageLoadInfo {
  /** Fin du chargement du HTML/DOM, en ms depuis le début de la navigation. */
  domContentLoadedMs: number | null;
  /** Fin du chargement complet (images comprises). */
  loadMs: number | null;
  resourceCount: number;
  /** Octets réellement transférés par le réseau (0 pour ce qui vient du cache). */
  resourceBytes: number | null;
}

export function getPageLoadInfo(): PageLoadInfo {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return { domContentLoadedMs: null, loadMs: null, resourceCount: 0, resourceBytes: null };
  }
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const round = (value: number | undefined) => (value && value > 0 ? Math.round(value) : null);
  return {
    domContentLoadedMs: round(navigation?.domContentLoadedEventEnd),
    loadMs: round(navigation?.loadEventEnd),
    resourceCount: resources.length,
    resourceBytes: resources.length ? resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) : null,
  };
}

/* --- Temps écoulé -------------------------------------------------- */

export type TimeAgo = { unit: "now" | "minutes" | "hours" | "days"; count: number };

// « à l'instant », « il y a 5 minutes », « il y a 3 heures », « il y a 2 jours » —
// renvoyé sous forme de valeurs, c'est l'appelant qui traduit (le panneau a deux langues).
export function timeAgo(timestamp: number, now: number = Date.now()): TimeAgo {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return { unit: "now", count: 0 };
  if (minutes < 60) return { unit: "minutes", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: "hours", count: hours };
  return { unit: "days", count: Math.floor(hours / 24) };
}

/* --- Rapport à copier --------------------------------------------------- */

export interface ReportSection {
  title: string;
  rows: [label: string, value: string][];
}

// Texte brut, lisible dans un message : les sections puis les derniers événements
// du journal. Volontairement en français, quelle que soit la langue de l'app :
// c'est un document pour quelqu'un qui diagnostique, pas un écran.
export function buildDiagnosticsReport({
  generatedAt,
  sections,
  logs,
  previousErrors = [],
}: {
  generatedAt: Date;
  sections: ReportSection[];
  logs: DevLogEntry[];
  previousErrors?: Pick<DevLogEntry, "ts" | "message">[];
}): string {
  const lines: string[] = [
    "Rapport de diagnostic — Le Grimoire de Morgane",
    `Généré le ${generatedAt.toLocaleString("fr-FR")}`,
  ];
  for (const section of sections) {
    lines.push("", `[${section.title}]`);
    for (const [label, value] of section.rows) lines.push(`${label} : ${value}`);
  }
  lines.push("", `[Journal — ${logs.length} dernier${logs.length > 1 ? "s" : ""} événement${logs.length > 1 ? "s" : ""}]`);
  if (logs.length === 0) lines.push("(vide)");
  for (const entry of logs) {
    lines.push(`${new Date(entry.ts).toLocaleTimeString("fr-FR")} [${entry.level}] ${entry.message}`);
  }
  if (previousErrors.length > 0) {
    lines.push("", `[Erreurs des sessions précédentes — ${previousErrors.length}]`);
    for (const entry of previousErrors) {
      lines.push(`${new Date(entry.ts).toLocaleString("fr-FR")} ${entry.message}`);
    }
  }
  return lines.join("\n");
}
