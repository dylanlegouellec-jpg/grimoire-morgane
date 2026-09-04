import { useEffect, useState } from "react";
import { ChevronRight, Home, LogOut, Palette, Pencil, Save, SlidersHorizontal, UserCircle2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { getCachedProfile, getProfile } from "../../utils/profile";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useLongPress from "../../hooks/useLongPress";
import Flourish from "./Flourish";
import Seal from "./Seal";
import ProfileEditor from "./ProfileEditor";
import AppearanceSettingsModal from "./AppearanceSettingsModal";
import AccessibilitySettingsModal from "./AccessibilitySettingsModal";
import DataBackupModal from "./DataBackupModal";
import HouseholdManagerModal from "./HouseholdManagerModal";

/* ------------------------------------------------------------------ */
/*  RÉGLAGES SECRETS DU GRIMOIRE — liste groupée façon iOS (HIG)         */
/*                                                                        */
/*  Écran principal : carte de profil, puis des rangées de navigation     */
/*  groupées en cartes arrondies (voir styles.css.js, section "RÉGLAGES") */
/*  — chacune ouvre un sous-panneau en couche au-dessus (même principe    */
/*  d'empilement que HouseholdManagerModal, déjà présent dans l'app), un   */
/*  bouton "< Réglages" en haut à gauche ramenant à cet écran plutôt       */
/*  qu'un simple X de fermeture — pour donner la sensation d'une            */
/*  navigation par couches (push/pop) propre aux réglages iOS.            */
/* ------------------------------------------------------------------ */
export default function SecretSettingsModal({
  onClose,
  connectionStatus,
  onExport,
  onImportFile,
  onImportTextRecipe,
  pressDuration,
  onSetPressDuration,
  theme,
  onSetTheme,
  language,
  onSetLanguage,
  showNutriscore,
  onSetShowNutriscore,
  textSize,
  onSetTextSize,
  user,
  householdId,
  households,
  onSwitchHousehold,
  onCreateHousehold,
  onRenameHousehold,
  onDeleteHousehold,
  onRequestJoinHousehold,
  onGetPendingHouseholdRequests,
  onApproveHouseholdMember,
  onRejectHouseholdMember,
  showToast,
  onSignOut,
}) {
  const { t } = useTranslation();
  // null | "appearance" | "accessibility" | "data" | "household"
  const [activePanel, setActivePanel] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  // Cache-first (voir utils/profile.js) : la carte de profil s'affiche
  // instantanément avec la dernière valeur connue, même hors ligne, puis
  // se rafraîchit dès que le réseau répond.
  const [profile, setProfile] = useState(() => getCachedProfile());

  // Fige le <body> tant que ce menu est ouvert (même hook que RecipeDetail.jsx).
  useBodyScrollLock(true);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getProfile(user.id).then((p) => {
      if (!cancelled && p) setProfile(p);
    });
    return () => { cancelled = true; };
  }, [user]);

  const profileLongPress = useLongPress(() => { triggerHaptic(20); setShowProfileEditor(true); }, pressDuration);
  const openProfileEditor = () => { if (!profileLongPress.wasLongPress()) { triggerHaptic(15); setShowProfileEditor(true); } };

  const avatarUrl = profile && profile.avatar_url;
  const displayName = (profile && (profile.username || profile.display_name))
    || [profile && profile.first_name, profile && profile.last_name].filter(Boolean).join(" ").trim()
    || (user && user.email)
    || "";

  // Referme tout l'empilement des Réglages — utilisé après une action
  // "terminale" (import réussi, déconnexion) plutôt que le simple retour
  // au sous-panneau précédent.
  const closeAll = () => { setActivePanel(null); onClose(); };

  // Un seul arrière-plan modal visible à la fois : l'écran principal des
  // Réglages se MASQUE (plutôt que de rester dessous) dès qu'un
  // sous-panneau est actif — sans quoi ce dernier s'ouvrait en s'empilant
  // par-dessus l'écran principal, formant deux cartes modales visibles à
  // la fois plutôt qu'une vraie navigation par couches (push/pop).
  return (
    <>
    {!activePanel && (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{t("settings.title")}</h2>
        <Flourish />

        {user && (
          <div className="profile-card">
            <div className="profile-card-avatar-wrap">
              <button
                type="button"
                className="profile-card-avatar"
                onClick={openProfileEditor}
                title={t("settings.editProfile")}
                {...profileLongPress.handlers}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" decoding="async" /> : <UserCircle2 size={44} />}
              </button>
              <span
                className={`connection-status-dot connection-status-${connectionStatus || "checking"}`}
                title={
                  connectionStatus === "offline"
                    ? t("settings.statusOffline")
                    : connectionStatus === "checking"
                      ? t("settings.statusChecking")
                      : t("settings.statusOnline")
                }
                aria-hidden="true"
              />
            </div>
            <button type="button" className="profile-card-name" onClick={openProfileEditor} {...profileLongPress.handlers}>
              {displayName}
            </button>
            {user.email && <p className="profile-card-email">{user.email}</p>}
            <div className="profile-card-edit-btn">
              <Seal tone="gold" onClick={() => setShowProfileEditor(true)}>
                <Pencil size={15} /> {t("settings.editProfile")}
              </Seal>
            </div>
          </div>
        )}

        <p className="ios-group-title">{t("settings.settingsSection")}</p>
        <div className="ios-group">
          <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActivePanel("appearance"); }}>
            <span className="ios-row-icon" style={{ background: "var(--plum)" }}><Palette size={16} /></span>
            <span className="ios-row-title">{t("settings.appearanceLanguage")}</span>
            <ChevronRight size={18} className="ios-chevron" />
          </button>
          <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActivePanel("accessibility"); }}>
            <span className="ios-row-icon" style={{ background: "var(--wine)" }}><SlidersHorizontal size={16} /></span>
            <span className="ios-row-title">{t("settings.accessibility")}</span>
            <ChevronRight size={18} className="ios-chevron" />
          </button>
        </div>

        <p className="ios-group-title">{t("settings.dataHousehold")}</p>
        <div className="ios-group">
          <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActivePanel("data"); }}>
            <span className="ios-row-icon" style={{ background: "var(--forest)" }}><Save size={16} /></span>
            <span className="ios-row-title">{t("settings.backup")}</span>
            <ChevronRight size={18} className="ios-chevron" />
          </button>
          {user && (
            <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActivePanel("household"); }}>
              <span className="ios-row-icon" style={{ background: "var(--gold)" }}><Home size={16} /></span>
              <span className="ios-row-title">{t("settings.household")}</span>
              <ChevronRight size={18} className="ios-chevron" />
            </button>
          )}
        </div>

        {user && (
          <>
            <p className="ios-group-title">{t("settings.account")}</p>
            <p className="hint" style={{ fontStyle: "normal", margin: "0 6px 8px" }}>
              {t("settings.connectedAs", { email: user.email })}
            </p>
            <div className="ios-group">
              <button
                type="button"
                className="ios-row ios-row-danger"
                onClick={() => { triggerHaptic(15); onSignOut(); onClose(); }}
              >
                <LogOut size={16} /> {t("settings.signOut")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    )}

        {activePanel === "appearance" && (
          <AppearanceSettingsModal
            theme={theme}
            onSetTheme={onSetTheme}
            language={language}
            onSetLanguage={onSetLanguage}
            showNutriscore={showNutriscore}
            onSetShowNutriscore={onSetShowNutriscore}
            onBack={() => setActivePanel(null)}
          />
        )}
        {activePanel === "accessibility" && (
          <AccessibilitySettingsModal
            pressDuration={pressDuration}
            onSetPressDuration={onSetPressDuration}
            textSize={textSize}
            onSetTextSize={onSetTextSize}
            onBack={() => setActivePanel(null)}
          />
        )}
        {activePanel === "data" && (
          <DataBackupModal
            onExport={onExport}
            onImportFile={(e) => { onImportFile(e); closeAll(); }}
            onImportTextRecipe={() => { onImportTextRecipe(); closeAll(); }}
            onBack={() => setActivePanel(null)}
          />
        )}
        {activePanel === "household" && (
          <HouseholdManagerModal
            user={user}
            householdId={householdId}
            households={households}
            pressDuration={pressDuration}
            onSwitchHousehold={onSwitchHousehold}
            onCreateHousehold={onCreateHousehold}
            onRenameHousehold={onRenameHousehold}
            onDeleteHousehold={onDeleteHousehold}
            onRequestJoinHousehold={onRequestJoinHousehold}
            onGetPendingHouseholdRequests={onGetPendingHouseholdRequests}
            onApproveHouseholdMember={onApproveHouseholdMember}
            onRejectHouseholdMember={onRejectHouseholdMember}
            showToast={showToast}
            onClose={() => setActivePanel(null)}
          />
        )}

        {showProfileEditor && user && (
          <ProfileEditor
            user={user}
            profile={profile}
            onClose={() => setShowProfileEditor(false)}
            onSaved={(patch) => setProfile((prev) => ({ ...(prev || {}), ...patch }))}
            showToast={showToast}
          />
        )}
    </>
  );
}
