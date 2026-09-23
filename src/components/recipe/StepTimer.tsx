import { useState, useEffect, useRef, type MouseEvent } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { requestNotificationPermission, showLocalNotification } from "../../utils/notifications";

interface StepTimerProps {
  minutes: number;
}

export default function StepTimer({ minutes }: StepTimerProps) {
  const fullSeconds = minutes * 60;
  const [seconds, setSeconds] = useState(fullSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            // Pour prévenir même quand le téléphone est ailleurs/l'écran
            // éteint — l'ancien état "Terminé !" sur l'écran ne sert à rien
            // si personne ne regarde le mode cuisine à cet instant précis.
            showLocalNotification("Minuteur terminé", {
              body: `${minutes} min écoulées`,
              icon: "/Icon.jpeg",
              tag: "grimoire-cookmode-timer",
            });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // `seconds` lu seulement pour la condition de démarrage (`seconds > 0`)
    // au moment où l'effet tourne — le décompte lui-même passe par la forme
    // updater de setSeconds ci-dessus, qui lit toujours la valeur à jour
    // sans avoir besoin de relancer l'effet à chaque tick. L'ajouter aux
    // dépendances détruirait et recréerait l'intervalle chaque seconde.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, minutes]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const Icon = seconds === 0 ? Clock : running ? Pause : seconds === fullSeconds ? Clock : Play;
  const label =
    seconds === 0
      ? "Terminé !"
      : running
      ? fmt(seconds)
      : seconds === fullSeconds
      ? `Lancer (${minutes} min)`
      : `Reprendre (${fmt(seconds)})`;

  return (
    <button
      type="button"
      className={`step-timer-btn ${running ? "running" : ""} ${seconds === 0 ? "done" : ""}`}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setRunning((r) => {
          const next = !r;
          // Doit rester synchrone avec CE clic (geste utilisateur direct) :
          // iOS refuse silencieusement une demande de permission de
          // notification si elle n'est pas déclenchée ainsi.
          if (next) requestNotificationPermission();
          return next;
        });
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
