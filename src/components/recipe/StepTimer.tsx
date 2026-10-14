import type { MouseEvent } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { requestNotificationPermission } from "../../utils/notifications";
import { useTranslation } from "../../contexts/LanguageContext";
import {
  cookTimerKey,
  formatRemaining,
  getRemainingMs,
  startCookTimer,
  toggleCookTimer,
  useCookTimers,
} from "../../utils/cookTimers";

interface StepTimerProps {
  minutes: number;
  /** Position de l'étape : sert de clé stable au minuteur (utils/cookTimers.ts). */
  groupIndex?: number;
  stepIndex?: number;
  /** Texte de l'étape tel qu'affiché (bandeau des minuteurs, notification). */
  label?: string;
  /** Recette d'origine : le minuteur lui reste rattaché hors du mode cuisine. */
  recipeId?: string | null;
}

// L'état du minuteur vit dans le magasin partagé (utils/cookTimers.ts), plus
// dans ce composant : changer de groupe d'étapes puis revenir retrouve le
// minuteur où on l'avait laissé, et la notification de fin part même quand
// ce bouton n'est plus à l'écran.
export default function StepTimer({ minutes, groupIndex = 0, stepIndex = 0, label = "", recipeId = null }: StepTimerProps) {
  const { t } = useTranslation();
  const { timers, now } = useCookTimers();
  const key = cookTimerKey(groupIndex, stepIndex, minutes, recipeId);
  const timer = timers.find((tm) => tm.key === key);
  const status = timer?.status ?? "idle";
  const remaining = timer ? getRemainingMs(timer, now) : minutes * 60_000;

  const Icon = status === "running" ? Pause : status === "paused" ? Play : Clock;
  const text =
    status === "done"
      ? t("recipeUi.timer.done")
      : status === "running"
      ? formatRemaining(remaining)
      : status === "paused"
      ? t("recipeUi.timer.resume", { time: formatRemaining(remaining) })
      : t("recipeUi.timer.start", { minutes });

  return (
    <button
      type="button"
      className={`step-timer-btn ${status === "running" ? "running" : ""} ${status === "done" ? "done" : ""}`}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (status === "done") return;
        // Doit rester synchrone avec CE clic (geste utilisateur direct) :
        // iOS refuse silencieusement une demande de permission de
        // notification si elle n'est pas déclenchée ainsi.
        if (status !== "running") requestNotificationPermission();
        if (status === "idle") startCookTimer({ groupIndex, stepIndex, minutes, label, recipeId });
        else toggleCookTimer(key);
      }}
    >
      <Icon size={13} /> {text}
    </button>
  );
}
