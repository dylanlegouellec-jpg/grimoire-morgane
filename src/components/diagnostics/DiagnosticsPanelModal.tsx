import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, RefreshCw } from "lucide-react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { SUPABASE_READY } from "../../constants";
import { copyText, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import useConnectionStatus from "../../hooks/useConnectionStatus";
import Flourish from "../common/Flourish";
import Switch from "../common/Switch";
import SegmentedControl from "../common/SegmentedControl";
import CodeExplorer from "./CodeExplorer";
import AppDiagnostics from "./AppDiagnostics";
import { buildAppSections } from "./appSections";
import useAppDiagnostics from "../../hooks/useAppDiagnostics";
import { buildDiagnosticsReport, checkForUpdates, forceUpdate, formatBytes, timeAgo, type ReportSection } from "../../utils/diagnostics";
import useLastSync from "../../hooks/useLastSync";
import {
  pingSupabase,
  flushOfflineQueue,
  countTableRows,
  setForceOfflineForDebug,
  isForceOfflineForDebug,
} from "../../utils/supabase";
import { getOfflineQueueSize } from "../../utils/offlineQueue";
import { clearImageCaches, getImageCacheEntryCounts } from "../../utils/imageCache";
import { storeOnboardingCompleted } from "../../utils/localSettings";
import { getDevLogEntries, clearDevLog, subscribeDevLog, getPreviousSessionErrors, clearPreviousSessionErrors, type DevLogLevel } from "../../utils/devLog";

/* ------------------------------------------------------------------ */
/*  PANNEAU DE DIAGNOSTICS & MODE DÉVELOPPEUR                          */
/*                                                                       */
/*  Demandé pour pouvoir diagnostiquer un souci de performance, de        */
/*  stockage ou de synchronisation DIRECTEMENT sur un téléphone, sans       */
/*  accès aux DevTools d'un ordinateur — chaque métrique ci-dessous          */
/*  s'appuie donc uniquement sur des API navigateur/PWA déjà disponibles,     */
/*  sans dépendance externe : `performance.memory` (FPS/heap),                */
/*  `navigator.storage.estimate()` (stockage), Cache Storage (images),          */
/*  et le journal `devLog.js` (patch console/fetch, actif dès main.jsx).         */
/*                                                                                 */
/*  La volumétrie Supabase (lignes de table via `countTableRows`, un HEAD          */
/*  `Prefer: count=exact`) reste une ESTIMATION best-effort : la taille               */
/*  réelle d'un bucket Storage ou d'une base Postgres n'est pas exposée via              */
/*  la clé anonyme REST — seule l'API de gestion Supabase (jeton admin)                   */
/*  le permettrait, hors de portée d'une clé publiée côté client.                            */
/* ------------------------------------------------------------------ */

function localStorageByteSize(): number | null {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) as string;
      const value = localStorage.getItem(key) || "";
      total += (key.length + value.length) * 2; // UTF-16 : 2 octets/caractère
    }
    return total;
  } catch {
    return null;
  }
}

// requestAnimationFrame existe en jsdom (voir les tests), mais un compteur
// de FPS n'a de sens que dans un vrai navigateur qui peint réellement des
// frames — désactivé pendant les tests via le paramètre `active`.
function useFpsCounter(active: boolean): number | null {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!active || typeof requestAnimationFrame !== "function") return undefined;
    let frameCount = 0;
    let lastSample = performance.now();
    let raf: number;
    const tick = (now: number) => {
      frameCount += 1;
      const elapsed = now - lastSample;
      if (elapsed >= 500) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastSample = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return fps;
}

function fpsTone(fps: number | null): string {
  if (fps == null) return "";
  if (fps >= 50) return "diagnostics-tone-good";
  if (fps >= 30) return "diagnostics-tone-warn";
  return "diagnostics-tone-bad";
}

interface ConfirmButtonProps {
  label: string;
  armedLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}

// Bouton d'action destructive à double confirmation : un premier clic
// arme le bouton (libellé "Confirmer ?" pendant ARM_TIMEOUT_MS), un second
// clic pendant cette fenêtre exécute réellement l'action — évite une
// modale de confirmation empilée par-dessus ce panneau déjà lui-même une
// modale, pour un geste qui doit rester rapide sur un panneau de debug.
const ARM_TIMEOUT_MS = 4000;
function ConfirmButton({ label, armedLabel, onConfirm, danger }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className={`ios-row ${danger ? "ios-row-danger" : ""}`}
      onClick={() => {
        triggerHaptic(15);
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      <span className="ios-row-title">{armed ? armedLabel : label}</span>
    </button>
  );
}

interface DiagnosticsPanelModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
  onResetOnboarding?: () => void;
  /** Compte connecté et foyer actif, pour la section Supabase et le rapport. */
  accountEmail?: string | null;
  householdName?: string | null;
}

interface TableCounts {
  recipes: number | null | undefined;
  shopping_lists: number | null | undefined;
}

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
};

export default function DiagnosticsPanelModal({ onClose, showToast, onResetOnboarding, accountEmail = null, householdName = null }: DiagnosticsPanelModalProps) {
  const { t, language } = useTranslation();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: focusTrapRef });
  const setPanelRef = (node: HTMLDivElement | null) => { focusTrapRef.current = node; };

  const app = useAppDiagnostics();

  // Dernière synchro réussie avec Supabase (utils/syncStatus.ts). Le « il y a … »
  // se rafraîchit toutes les 30 s tant que le panneau est ouvert.
  const lastSyncAt = useLastSync();
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const lastSyncLabel = (() => {
    if (lastSyncAt == null) return t("diagnostics.lastSyncNever");
    const ago = timeAgo(lastSyncAt, nowTick);
    const when = ago.unit === "now" ? t("diagnostics.agoNow") : t(`diagnostics.ago.${ago.unit}`, { count: ago.count });
    return `${new Date(lastSyncAt).toLocaleString("fr-FR")} · ${when}`;
  })();
  const appSections = useMemo(() => buildAppSections(app, t), [app, t]);

  const fps = useFpsCounter(true);
  const memory = typeof performance !== "undefined" ? (performance as PerformanceWithMemory).memory : undefined;

  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [localBytes, setLocalBytes] = useState<number | null>(null);
  const [imageCacheCounts, setImageCacheCounts] = useState<Record<string, number | null> | null>(null);
  const refreshStorage = () => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(setStorageEstimate).catch(() => setStorageEstimate(null));
    }
    setLocalBytes(localStorageByteSize());
    getImageCacheEntryCounts().then(setImageCacheCounts);
  };
  useEffect(refreshStorage, []);

  const connection = useConnectionStatus();
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [testingLatency, setTestingLatency] = useState(false);
  const testLatency = async () => {
    setTestingLatency(true);
    const start = performance.now();
    const ok = await pingSupabase();
    setLatencyMs(ok ? Math.round(performance.now() - start) : null);
    setTestingLatency(false);
    connection.recheck();
  };

  const [queueSize, setQueueSize] = useState(() => getOfflineQueueSize());
  const [tableCounts, setTableCounts] = useState<TableCounts>({ recipes: undefined, shopping_lists: undefined });
  useEffect(() => {
    if (!SUPABASE_READY) return;
    countTableRows("recipes").then((n) => setTableCounts((prev) => ({ ...prev, recipes: n })));
    countTableRows("shopping_lists").then((n) => setTableCounts((prev) => ({ ...prev, shopping_lists: n })));
  }, []);

  const [forceOffline, setForceOffline] = useState(() => isForceOfflineForDebug());
  const toggleForceOffline = (next: boolean) => {
    setForceOfflineForDebug(next);
    setForceOffline(next);
    connection.recheck();
  };

  const [flushing, setFlushing] = useState(false);
  const forceResync = async () => {
    setFlushing(true);
    const result = await flushOfflineQueue();
    setQueueSize(getOfflineQueueSize());
    setFlushing(false);
    showToast(t("diagnostics.resyncResult", { flushed: result.flushed, dropped: result.dropped }));
  };

  const [logEntries, setLogEntries] = useState(() => getDevLogEntries());
  const [previousErrors, setPreviousErrors] = useState(() => getPreviousSessionErrors());
  useEffect(
    () =>
      subscribeDevLog((entries) => {
        setLogEntries(entries);
        setPreviousErrors(getPreviousSessionErrors());
      }),
    []
  );
  const [logFilter, setLogFilter] = useState<"all" | DevLogLevel>("all");
  // Le filtre s'applique AVANT de ne garder que les 50 derniers : sinon un filtre
  // sur "error" ne montrerait que les erreurs perdues dans les 50 derniers événements.
  const recentLogEntries = useMemo(
    () => logEntries.filter((entry) => logFilter === "all" || entry.level === logFilter).slice(-50).reverse(),
    [logEntries, logFilter]
  );

  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const runUpdateCheck = async () => {
    setCheckingUpdates(true);
    const result = await checkForUpdates();
    await app.refreshServiceWorker();
    setCheckingUpdates(false);
    showToast(
      result === "up-to-date" ? t("diagnostics.updateUpToDate") : result === "update-found" ? t("diagnostics.updateFound") : t("diagnostics.updateUnsupported")
    );
  };

  // Le rapport reprend les lignes affichées à l'écran (mêmes sections que
  // AppDiagnostics) puis les mesures en direct, la connexion, et les derniers
  // événements du journal — sans filtre, quel que soit celui choisi à l'écran.
  const copyReport = async () => {
    const liveRows: ReportSection = {
      title: t("diagnostics.performanceTitle"),
      rows: [
        [t("diagnostics.fps"), fps == null ? "…" : `${fps} fps`],
        [t("diagnostics.memory"), memory ? `${formatBytes(memory.usedJSHeapSize)} / ${formatBytes(memory.jsHeapSizeLimit)}` : t("diagnostics.unavailable")],
        [t("diagnostics.locCount"), __GRIMOIRE_LOC__.toLocaleString()],
        [t("diagnostics.storageUsed"), storageEstimate ? `${formatBytes(storageEstimate.usage)} / ${formatBytes(storageEstimate.quota)}` : t("diagnostics.unavailable")],
        [t("diagnostics.localStorageSize"), formatBytes(localBytes)],
        [t("diagnostics.imageCacheEntries"), imageCacheCounts ? String(Object.values(imageCacheCounts).reduce((sum: number, n) => sum + (n || 0), 0)) : "…"],
      ],
    };
    const supabaseRows: ReportSection = {
      title: t("diagnostics.supabaseTitle"),
      rows: [
        [t("diagnostics.account"), accountEmail ?? "—"],
        [t("diagnostics.household"), householdName ?? "—"],
        [t("diagnostics.connectionStatusLabel"), t(`diagnostics.connectionStatus.${connection.status}`)],
        [t("diagnostics.latency"), latencyMs == null ? "—" : `${latencyMs} ms`],
        [t("diagnostics.lastSync"), lastSyncLabel],
        [t("diagnostics.pendingSync"), String(queueSize)],
        [t("diagnostics.recipeRows"), tableCounts.recipes === undefined ? "…" : String(tableCounts.recipes ?? t("diagnostics.unavailable"))],
        [t("diagnostics.simulateOffline"), forceOffline ? "oui" : "non"],
      ],
    };
    const report = buildDiagnosticsReport({
      generatedAt: new Date(),
      sections: [...appSections, liveRows, supabaseRows],
      logs: logEntries.slice(-50),
      previousErrors,
    });
    showToast((await copyText(report)) ? t("diagnostics.reportCopied") : t("diagnostics.reportCopyFailed"));
  };

  return (
    <>
      <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
        <motion.div
          ref={setPanelRef}
          className="modal grimoire-page ios-settings-modal modal-swipeable"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          {...MODAL_SHEET_MOTION}
          {...sheet.panHandlers}
        >
          <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
          <motion.div style={sheet.contentStyle}>
            <h2 className="dropcap-title">{t("diagnostics.title")}</h2>
            <Flourish />

            {/* --- Performance & fluidité en direct --- */}
            <p className="ios-group-title">{t("diagnostics.performanceTitle")}</p>
            <div className="ios-group ios-group-padded diagnostics-metrics">
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.fps")}</span>
                <span className={`diagnostics-metric-value ${fpsTone(fps)}`}>{fps == null ? "…" : `${fps} fps`}</span>
              </div>
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.memory")}</span>
                <span className="diagnostics-metric-value">
                  {memory
                    ? `${formatBytes(memory.usedJSHeapSize)} / ${formatBytes(memory.jsHeapSizeLimit)}`
                    : t("diagnostics.unavailable")}
                </span>
              </div>
              {/* Pour le kiff — calculé une seule fois au build, jamais
                  dans le navigateur (voir scripts/countLoc.js), donc
                  toujours la même valeur tant que l'app n'est pas
                  redéployée : c'est voulu, pas une métrique "en direct". */}
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.locCount")}</span>
                <span className="diagnostics-metric-value">{__GRIMOIRE_LOC__.toLocaleString()}</span>
              </div>
            </div>

            {/* --- Application (version, mode, service worker) puis Appareil & performance --- */}
            <AppDiagnostics sections={appSections} />
            <div className="ios-group">
              <button type="button" className="ios-row" onClick={runUpdateCheck} disabled={checkingUpdates}>
                <span className="ios-row-icon"><RefreshCw size={16} /></span>
                <span className="ios-row-title">{t("diagnostics.checkUpdates")}</span>
              </button>
              <ConfirmButton
                label={t("diagnostics.forceUpdate")}
                armedLabel={t("diagnostics.confirmAction")}
                onConfirm={() => { void forceUpdate(); }}
              />
              <button type="button" className="ios-row" onClick={copyReport}>
                <span className="ios-row-title">{t("diagnostics.copyReport")}</span>
              </button>
            </div>
            <p className="hint code-intro">{t("diagnostics.forceUpdateHint")}</p>

            {/* --- Code de l'app : menus déroulants par dossier puis par fichier --- */}
            <p className="ios-group-title">{t("diagnostics.codeTitle")}</p>
            <CodeExplorer />

            {/* --- Stockage appareil --- */}
            <p className="ios-group-title">{t("diagnostics.storageTitle")}</p>
            <div className="ios-group ios-group-padded diagnostics-metrics">
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.storageUsed")}</span>
                <span className="diagnostics-metric-value">
                  {storageEstimate ? `${formatBytes(storageEstimate.usage)} / ${formatBytes(storageEstimate.quota)}` : t("diagnostics.unavailable")}
                </span>
              </div>
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.localStorageSize")}</span>
                <span className="diagnostics-metric-value">{formatBytes(localBytes)}</span>
              </div>
              <div className="diagnostics-metric">
                <span className="diagnostics-metric-label">{t("diagnostics.imageCacheEntries")}</span>
                <span className="diagnostics-metric-value">
                  {imageCacheCounts
                    ? Object.values(imageCacheCounts).reduce((sum: number, n) => sum + (n || 0), 0)
                    : "…"}
                </span>
              </div>
            </div>
            <div className="ios-group">
              <ConfirmButton
                label={t("diagnostics.clearImageCache")}
                armedLabel={t("diagnostics.confirmAction")}
                danger
                onConfirm={async () => {
                  await clearImageCaches();
                  refreshStorage();
                  showToast(t("diagnostics.clearImageCacheDone"));
                }}
              />
              <ConfirmButton
                label={t("diagnostics.purgeLocalStorage")}
                armedLabel={t("diagnostics.confirmAction")}
                danger
                onConfirm={() => {
                  try { localStorage.clear(); } catch { /* stockage indisponible */ }
                  window.location.reload();
                }}
              />
              <ConfirmButton
                label={t("diagnostics.resetOnboarding")}
                armedLabel={t("diagnostics.confirmAction")}
                onConfirm={() => {
                  storeOnboardingCompleted(false);
                  if (onResetOnboarding) onResetOnboarding();
                  showToast(t("diagnostics.resetOnboardingDone"));
                }}
              />
            </div>

            {/* --- Monitoring & base de données Supabase --- */}
            <p className="ios-group-title">{t("diagnostics.supabaseTitle")}</p>
            {SUPABASE_READY ? (
              <>
                <div className="ios-group ios-group-padded diagnostics-metrics">
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.account")}</span>
                    <span className="diagnostics-metric-value diagnostics-metric-value--text">{accountEmail ?? "—"}</span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.household")}</span>
                    <span className="diagnostics-metric-value diagnostics-metric-value--text">{householdName ?? "—"}</span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.connectionStatusLabel")}</span>
                    <span className={`diagnostics-status-dot diagnostics-status-dot--${connection.status}`}>
                      {t(`diagnostics.connectionStatus.${connection.status}`)}
                    </span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.lastSync")}</span>
                    <span className="diagnostics-metric-value diagnostics-metric-value--text">{lastSyncLabel}</span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.latency")}</span>
                    <span className="diagnostics-metric-value">
                      {testingLatency ? "…" : latencyMs == null ? "—" : `${latencyMs} ms`}
                    </span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.pendingSync")}</span>
                    <span className="diagnostics-metric-value">{queueSize}</span>
                  </div>
                  <div className="diagnostics-metric">
                    <span className="diagnostics-metric-label">{t("diagnostics.recipeRows")}</span>
                    <span className="diagnostics-metric-value">
                      {tableCounts.recipes === undefined ? "…" : tableCounts.recipes ?? t("diagnostics.unavailable")}
                    </span>
                  </div>
                </div>
                <div className="ios-group">
                  <button type="button" className="ios-row" onClick={testLatency} disabled={testingLatency}>
                    <span className="ios-row-icon"><RefreshCw size={16} /></span>
                    <span className="ios-row-title">{t("diagnostics.testLatency")}</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="hint">{t("diagnostics.supabaseUnavailable")}</p>
            )}

            {/* --- Outils de debug & logs --- */}
            <p className="ios-group-title">{t("diagnostics.debugTitle")}</p>
            <div className="ios-group ios-group-padded">
              <div className="settings-row">
                <span className="settings-row-title">{t("diagnostics.simulateOffline")}</span>
                <Switch checked={forceOffline} onChange={toggleForceOffline} label={t("diagnostics.simulateOffline")} />
              </div>
            </div>
            <div className="ios-group">
              <button type="button" className="ios-row" onClick={forceResync} disabled={flushing}>
                <span className="ios-row-title">{t("diagnostics.forceResync")}</span>
              </button>
              <button type="button" className="ios-row" onClick={() => window.location.reload()}>
                <span className="ios-row-title">{t("diagnostics.reloadApp")}</span>
              </button>
            </div>

            {previousErrors.length > 0 && (
              <>
                <div className="diagnostics-log-header">
                  <p className="ios-group-title" style={{ margin: 0 }}>{t("diagnostics.previousErrors", { count: previousErrors.length })}</p>
                  <button type="button" className="diagnostics-log-clear" onClick={() => clearPreviousSessionErrors()}>
                    {t("diagnostics.clearLogs")}
                  </button>
                </div>
                <div className="diagnostics-log">
                  {previousErrors.slice(-10).reverse().map((entry) => (
                    <div key={`${entry.ts}-${entry.message.slice(0, 20)}`} className="diagnostics-log-entry diagnostics-log-entry--error">
                      <span className="diagnostics-log-level">{new Date(entry.ts).toLocaleString(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="diagnostics-log-message">{entry.message}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="diagnostics-log-header">
              <p className="ios-group-title" style={{ margin: 0 }}>{t("diagnostics.logConsole")}</p>
              <button type="button" className="diagnostics-log-clear" onClick={() => clearDevLog()}>
                {t("diagnostics.clearLogs")}
              </button>
            </div>
            <SegmentedControl
              ariaLabel={t("diagnostics.logConsole")}
              compact
              value={logFilter}
              onChange={(value) => setLogFilter(value as "all" | DevLogLevel)}
              options={[
                { value: "all", label: t("diagnostics.logFilterAll") },
                { value: "error", label: "error" },
                { value: "warn", label: "warn" },
                { value: "network", label: "network" },
                { value: "log", label: "log" },
              ]}
            />
            <div className="diagnostics-log">
              {recentLogEntries.length === 0 && <p className="hint diagnostics-log-empty">{t("diagnostics.noLogs")}</p>}
              {recentLogEntries.map((entry) => (
                <div key={entry.id} className={`diagnostics-log-entry diagnostics-log-entry--${entry.level}`}>
                  <span className="diagnostics-log-level">{entry.level}</span>
                  <span className="diagnostics-log-message">{entry.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
