import { Wand2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  ÉCRAN DE CHARGEMENT (générique, plusieurs messages possibles)      */
/* ------------------------------------------------------------------ */

interface LoadingScreenProps {
  message: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <Wand2 className="spin-wand" size={28} />
      <p>{message}</p>
    </div>
  );
}
