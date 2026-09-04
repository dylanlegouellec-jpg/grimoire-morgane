import { CSS } from "../constants/styles.css";
import { triggerHaptic } from "../utils/helpers";
import { Seal } from "../components/common";

/* ------------------------------------------------------------------ */
/*  ÉCRAN DE CONNEXION (Google via Supabase Auth)                      */
/* ------------------------------------------------------------------ */
export default function LoginScreen({ signInWithGoogle, showToast, toast }) {
  return (
    <div className="loading-screen login-screen">
      <style>{CSS}</style>
      <h1 className="login-title">Le Grimoire de Morgane</h1>
      <p className="hint" style={{ fontStyle: "normal", textAlign: "center" }}>
        Connecte-toi pour retrouver ton grimoire.
      </p>
      <Seal
        tone="gold"
        onClick={() => {
          triggerHaptic(15);
          signInWithGoogle().catch((err) => {
            console.error(err);
            showToast((err && err.message) || "Connexion impossible.");
          });
        }}
      >
        Se connecter avec Google
      </Seal>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
