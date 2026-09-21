import { useState, useEffect, useRef } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { requestNotificationPermission, showLocalNotification } from "../../utils/notifications";

export default function StepTimer({ minutes }) {
  const fullSeconds = minutes * 60;
  const [seconds, setSeconds] = useState(fullSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
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
    return () => clearInterval(intervalRef.current);
  }, [running, minutes]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
      onClick={(e) => {
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

