import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

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
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const label =
    seconds === 0
      ? "Terminé !"
      : running
      ? `⏸ ${fmt(seconds)}`
      : seconds === fullSeconds
      ? `Lancer (${minutes} min)`
      : `▶ Reprendre (${fmt(seconds)})`;

  return (
    <button
      type="button"
      className={`step-timer-btn ${running ? "running" : ""} ${seconds === 0 ? "done" : ""}`}
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
    >
      <Clock size={13} /> {label}
    </button>
  );
}

