import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, RefreshCw } from "lucide-react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { SUPABASE_READY } from "../../constants";
import { triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import useConnectionStatus from "../../hooks/useConnectionStatus";
import Flourish from "../common/Flourish";
import Switch from "../common/Switch";
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
import { getDevLogEntries, clearDevLog, subscribeDevLog } from "../../utils/devLog";

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

function formatBytes(bytes) {
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

function localStorageByteSize() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
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
function useFpsCounter(active) {
  const [fps, setFps] = useState(null);
  useEffect(() => {
    if (!active || typeof requestAnimationFrame !== "function") return undefined;
    let frameCount = 0;
    let lastSample = performance.now();
    let raf;
    const tick = (now) => {
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

function fpsTone(fps) {
  if (fps == null) return "";
  if (fps >= 50) return "diagnostics-tone-good";
  if (fps >= 30) return "diagnostics-tone-warn";
  return "diagnostics-tone-bad";
}

// Bouton d'action destructive à double confirmation : un premier clic
// arme le bouton (libellé "Confirmer ?" pendant ARM_TIMEOUT_MS), un second
// clic pendant cette fenêtre exécute réellement l'action — évite une
// modale de confirmation empilée par-dessus ce panneau déjà lui-même une
// modale, pour un geste qui doit rester rapide sur un panneau de debug.
const ARM_TIMEOUT_MS = 4000;
function ConfirmButton({ label, armedLabel, onConfirm, danger }) {
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

export default function DiagnosticsPanelModal({ onClose, showToast, onResetOnboarding }) {
  const { t } = useTranslation();
  const focusTrapRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: focusTrapRef });
  const setPanelRef = (node) => { focusTrapRef.current = node; };

  const fps = useFpsCounter(true);
  const memory = typeof performance !== "undefined" ? performance.memory : null;

  const [storageEstimate, setStorageEstimate] = useState(null);
  const [localBytes, setLocalBytes] = useState(null);
  const [imageCacheCounts, setImageCacheCounts] = useState(null);
  const refreshStorage = () => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(setStorageEstimate).catch(() => setStorageEstimate(null));
    }
    setLocalBytes(localStorageByteSize());
    getImageCacheEntryCounts().then(setImageCacheCounts);
  };
  useEffect(refreshStorage, []);

  const connection = useConnectionStatus();
  const [latencyMs, setLatencyMs] = useState(null);
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
  const [tableCounts, setTableCounts] = useState({ recipes: undefined, shopping_lists: undefined });
  useEffect(() => {
    if (!SUPABASE_READY) return;
    countTableRows("recipes").then((n) => setTableCounts((prev) => ({ ...prev, recipes: n })));
    countTableRows("shopping_lists").then((n) => setTableCounts((prev) => ({ ...prev, shopping_lists: n })));
  }, []);

  const [forceOffline, setForceOffline] = useState(() => isForceOfflineForDebug());
  const toggleForceOffline = (next) => {
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
  useEffect(() => subscribeDevLog(setLogEntries), []);
  const recentLogEntries = useMemo(() => logEntries.slice(-50).reverse(), [logEntries]);

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
                    ? Object.values(imageCacheCounts).reduce((sum, n) => sum + (n || 0), 0)
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
                    <span className="diagnostics-metric-label">{t("diagnostics.connectionStatusLabel")}</span>
                    <span className={`diagnostics-status-dot diagnostics-status-dot--${connection.status}`}>
                      {t(`diagnostics.connectionStatus.${connection.status}`)}
                    </span>
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

            <div className="diagnostics-log-header">
              <p className="ios-group-title" style={{ margin: 0 }}>{t("diagnostics.logConsole")}</p>
              <button type="button" className="diagnostics-log-clear" onClick={() => clearDevLog()}>
                {t("diagnostics.clearLogs")}
              </button>
            </div>
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
