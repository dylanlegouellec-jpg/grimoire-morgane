import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { triggerHaptic } from "../utils/helpers";
import { getCachedProfile, getProfile } from "../utils/profile";
import { useTranslation } from "../contexts/LanguageContext";
import UpdateBanner from "../components/common/UpdateBanner";
import type { HouseholdApiUser } from "./appShellTypes";

/* ------------------------------------------------------------------ */
/*  En-tête de l'écran principal : bouton des Réglages (photo de profil  */
/*  et pastille de connexion), titre, bandeaux « hors ligne », mise à     */
/*  jour disponible et modifications en attente. Sorti d'AppShell.tsx.    */
/* ------------------------------------------------------------------ */

interface AppHeaderProps {
  user: HouseholdApiUser | null;
  connectionStatus?: string;
  onRetryConnection?: () => void;
  offlineQueueSize: number;
  onOpenSettings: () => void;
}

export default function AppHeader({ user, connectionStatus, onRetryConnection, offlineQueueSize, onOpenSettings }: AppHeaderProps) {
  const { t } = useTranslation();
  // Photo de profil affichée dans le bouton de réglages de l'en-tête —
  // cache-first (voir utils/profile.js) : s'affiche instantanément avec la
  // dernière valeur connue, même hors ligne, puis se rafraîchit dès que le
  // réseau répond. Remplace l'ancien déclencheur "triple-clic sur le
  // titre" : le titre n'ouvre plus rien, ce bouton est l'unique porte
  // d'entrée vers les réglages.
  const [headerProfile, setHeaderProfile] = useState(() => getCachedProfile());
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getProfile(user.id).then((p) => { if (!cancelled && p) setHeaderProfile(p); });
    return () => { cancelled = true; };
  }, [user]);
  const headerAvatarUrl = (headerProfile && (headerProfile.avatar_url as string | undefined)) || null;

  return (
  <header className="app-header">
    <button
      type="button"
      className={`app-header-settings-btn ${headerAvatarUrl ? "has-avatar" : ""}`}
      onClick={() => { triggerHaptic(15); onOpenSettings(); }}
      aria-label={t("settings.title")}
    >
      {headerAvatarUrl ? (
        <span className="app-header-avatar-wrap">
          <img
            src={headerAvatarUrl}
            alt=""
            className="app-header-avatar"
            loading="lazy"
            decoding="async"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
          <span
            className={`connection-status-dot app-header-status-dot connection-status-${connectionStatus || "checking"}`}
            aria-hidden="true"
          />
        </span>
      ) : (
        <Settings size={20} />
      )}
    </button>
    <h1>Le Grimoire de Morgane</h1>
    <p className="subtitle">{t("app.subtitle")}</p>
    {connectionStatus === "offline" && (
      <p className="offline-banner">
        {t("app.offline")}
        {onRetryConnection && (
          <button type="button" className="offline-banner-retry" onClick={() => { triggerHaptic(10); onRetryConnection(); }}>
            {t("app.offlineRetry")}
          </button>
        )}
      </p>
    )}
    <UpdateBanner />
    {offlineQueueSize > 0 && (
      <p className="offline-queue-badge">
        {t("app.syncPending", { count: offlineQueueSize, plural: offlineQueueSize > 1 ? "s" : "" })}
      </p>
    )}
  </header>
  );
}
