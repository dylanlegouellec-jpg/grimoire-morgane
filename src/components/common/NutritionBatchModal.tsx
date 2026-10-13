import { useEffect, useRef, useState } from "react";
import { Check, Clock, Loader2, MinusCircle, Sparkles, Square, WifiOff, X } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import { estimateNutritionOnline } from "../../utils/nutritionClient";
import {
  initialBatchItems,
  runNutritionBatch,
  selectRecipesWithoutNutrition,
  type NutritionBatchItem,
  type NutritionBatchSummary,
  type SaveRecipeFn,
} from "../../utils/nutritionBatch";
import type { Recipe } from "../../hooks/useRecipes";
import Flourish from "./Flourish";
import Seal from "./Seal";

interface NutritionBatchModalProps {
  recipes: Recipe[];
  onSaveRecipe: SaveRecipeFn<Recipe>;
  connectionStatus: string;
  onClose: () => void;
}

type Phase = "idle" | "running" | "done";

function isOffline(connectionStatus: string): boolean {
  return connectionStatus === "offline" || (typeof navigator !== "undefined" && navigator.onLine === false);
}

/* ------------------------------------------------------------------ */
/*  SOUS-VUE "ESTIMER LA NUTRITION DES RECETTES" — contenu seul, rendu     */
/*  dans la coquille SettingsSubPanel de SecretSettingsModal (comme         */
/*  DataBackupModal). Trois temps : départ (combien de recettes n'ont       */
/*  aucune valeur nutritionnelle), chargement (barre "3 / 12" + état de      */
/*  chaque recette), fin (résumé). Toute la logique de lot (sélection,       */
/*  boucle une-par-une, arrêt) vit dans utils/nutritionBatch.ts, testée à     */
/*  part. Quitter l'écran pendant le traitement l'arrête proprement entre      */
/*  deux recettes (celles déjà estimées restent enregistrées).                  */
/* ------------------------------------------------------------------ */
export default function NutritionBatchModal({ recipes, onSaveRecipe, connectionStatus, onClose }: NutritionBatchModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<NutritionBatchItem[]>([]);
  const [summary, setSummary] = useState<NutritionBatchSummary | null>(null);
  const [stopping, setStopping] = useState(false);
  const stopRef = useRef(false);
  const recipesRef = useRef(recipes);
  const runningRowRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => { recipesRef.current = recipes; }, [recipes]);
  // Sortie de l'écran (retour, tirage) : arrêt entre deux recettes.
  useEffect(() => () => { stopRef.current = true; }, []);

  const candidates = selectRecipesWithoutNutrition(recipes);
  const offline = isOffline(connectionStatus);
  const plural = (n: number) => (n > 1 ? "s" : "");

  const runningIndex = items.findIndex((it) => it.status === "running");
  useEffect(() => {
    if (runningRowRef.current) runningRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [runningIndex]);

  const start = async () => {
    if (offline || candidates.length === 0) return;
    const batch = candidates;
    stopRef.current = false;
    setStopping(false);
    setSummary(null);
    setItems(initialBatchItems(batch));
    setPhase("running");
    const result = await runNutritionBatch(batch, {
      estimate: estimateNutritionOnline,
      save: onSaveRecipe,
      getCurrent: (id) => recipesRef.current.find((r) => r.id === id),
      onItem: (index, item) => setItems((prev) => prev.map((it, i) => (i === index ? item : it))),
      // Coupure réseau en cours de route : inutile d'enchaîner des échecs.
      shouldStop: () => stopRef.current || (typeof navigator !== "undefined" && navigator.onLine === false),
    });
    setSummary(result);
    setPhase("done");
  };

  const stop = () => { stopRef.current = true; setStopping(true); };

  const finished = items.filter((it) => it.status !== "pending" && it.status !== "running").length;
  const total = items.length;
  const percent = total ? Math.round((finished / total) * 100) : 0;

  const statusLabel = (item: NutritionBatchItem) => {
    switch (item.status) {
      case "running": return t("nutritionBatch.statusRunning");
      case "done": return t("nutritionBatch.kcal", { kcal: item.estimate ? Math.round(item.estimate.calories) : 0 });
      case "failed": return t("nutritionBatch.statusFailed");
      case "skipped": return t("nutritionBatch.statusSkipped");
      default: return t("nutritionBatch.statusPending");
    }
  };
  const statusIcon = (item: NutritionBatchItem) => {
    switch (item.status) {
      case "running": return <Loader2 size={16} className="nutri-batch-spin" />;
      case "done": return <Check size={16} />;
      case "failed": return <X size={16} />;
      case "skipped": return <MinusCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <>
      <h2 className="dropcap-title" style={{ marginTop: 34 }}>{t("nutritionBatch.title")}</h2>
      <Flourish />

      {phase === "idle" && (
        <>
          <p className="hint" style={{ fontStyle: "normal" }}>{t("nutritionBatch.intro")}</p>
          {offline && (
            <p className="nutri-batch-offline" role="alert">
              <WifiOff size={16} aria-hidden="true" /> {t("nutritionBatch.offline")}
            </p>
          )}
          {candidates.length === 0 ? (
            <p className="nutri-batch-empty">{t("nutritionBatch.nothingToDo")}</p>
          ) : (
            <>
              <p className="ios-group-title">
                {t("nutritionBatch.countLabel", { count: candidates.length, plural: plural(candidates.length) })}
              </p>
              <ul className="ios-group nutri-batch-list">
                {candidates.map((r) => (
                  <li key={r.id} className="nutri-batch-row">
                    <span className="nutri-batch-title">{r.title}</span>
                  </li>
                ))}
              </ul>
              <div className="nutri-batch-actions">
                <Seal tone="gold" onClick={start} disabled={offline}>
                  <Sparkles size={16} /> {t("nutritionBatch.start", { count: candidates.length, plural: plural(candidates.length) })}
                </Seal>
              </div>
            </>
          )}
        </>
      )}

      {phase !== "idle" && (
        <>
          {phase === "running" ? (
            <div className="nutri-batch-progress">
              <div className="nutri-batch-progress-head">
                <span>{stopping ? t("nutritionBatch.stopping") : t("nutritionBatch.running")}</span>
                <span className="nutri-batch-progress-count">{t("nutritionBatch.progress", { done: finished, total })}</span>
              </div>
              <div
                className="nutri-batch-bar"
                role="progressbar"
                aria-label={t("nutritionBatch.progressLabel")}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={finished}
              >
                <div className="nutri-batch-bar-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : summary && (
            <div className="nutri-batch-summary" role="status">
              <p className="nutri-batch-summary-main">
                {t("nutritionBatch.summary", {
                  estimated: summary.estimated,
                  estimatedPlural: plural(summary.estimated),
                  failed: summary.failed,
                  failedPlural: plural(summary.failed),
                })}
              </p>
              {summary.skipped > 0 && <p className="hint" style={{ fontStyle: "normal" }}>{t("nutritionBatch.summarySkipped", { count: summary.skipped, plural: plural(summary.skipped) })}</p>}
              {summary.stopped && (
                <p className="hint" style={{ fontStyle: "normal" }}>
                  {isOffline(connectionStatus) ? t("nutritionBatch.stoppedOffline") : t("nutritionBatch.stoppedByUser")}
                </p>
              )}
            </div>
          )}

          <ul className="ios-group nutri-batch-list" aria-live="polite">
            {items.map((item, i) => (
              <li
                key={item.id}
                ref={i === runningIndex ? runningRowRef : undefined}
                className={`nutri-batch-row nutri-batch-${item.status}`}
              >
                <span className="nutri-batch-title">{item.title}</span>
                <span className="nutri-batch-status">
                  {statusIcon(item)}
                  <span>{statusLabel(item)}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="nutri-batch-actions">
            {phase === "running" ? (
              <Seal tone="gold" onClick={stop} disabled={stopping}>
                <Square size={14} /> {t("nutritionBatch.stop")}
              </Seal>
            ) : (
              <Seal tone="gold" onClick={onClose}>
                {t("common.close")}
              </Seal>
            )}
          </div>
        </>
      )}
    </>
  );
}
