import { triggerHaptic } from "../utils/helpers";
import Seal from "../components/common/Seal";
import Toast from "../components/common/Toast";
import type { ToastState } from "../hooks/useToast";
import { translateCurrent } from "../utils/i18n";

/* ------------------------------------------------------------------ */
/*  ÉCRAN DE CONNEXION (Google via Supabase Auth)                      */
/* ------------------------------------------------------------------ */

interface LoginScreenProps {
  signInWithGoogle: () => Promise<void>;
  showToast: (msg: string) => void;
  toast?: ToastState | null;
}

export default function LoginScreen({ signInWithGoogle, showToast, toast }: LoginScreenProps) {
  return (
    <div className="loading-screen login-screen">
      <h1 className="login-title">Le Grimoire de Morgane</h1>
      <p className="hint" style={{ fontStyle: "normal", textAlign: "center" }}>
        {translateCurrent("ui.login.prompt")}
      </p>
      <Seal
        tone="gold"
        onClick={() => {
          triggerHaptic(15);
          signInWithGoogle().catch((err: unknown) => {
            console.error(err);
            showToast((err instanceof Error && err.message) || translateCurrent("ui.login.failed"));
          });
        }}
      >
        {translateCurrent("ui.login.signInWithGoogle")}
      </Seal>
      {/* Zone annoncée par les lecteurs d'écran (toujours présente, le
          message y apparaît) : sans elle, les confirmations restaient muettes. */}
      <Toast toast={toast} />
    </div>
  );
}
