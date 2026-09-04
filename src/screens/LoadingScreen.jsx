import { Wand2 } from "lucide-react";
import { CSS } from "../constants/styles.css";

/* ------------------------------------------------------------------ */
/*  ÉCRAN DE CHARGEMENT (générique, plusieurs messages possibles)      */
/* ------------------------------------------------------------------ */
export default function LoadingScreen({ message }) {
  return (
    <div className="loading-screen">
      <style>{CSS}</style>
      <Wand2 className="spin-wand" size={28} />
      <p>{message}</p>
    </div>
  );
}
