import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Home, LogOut, Palette, Pencil, Save, SlidersHorizontal, UserCircle2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { getCachedProfile, getProfile } from "../../utils/profile";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useLongPress from "../../hooks/useLongPress";
import useSwipeToDismiss from "../../hooks/useSwipeToDismiss";
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
/*  UNE SEULE coquille modale (.modal-backdrop + .modal) pour tout le      */
/*  module : la navigation entre l'écran principal et chaque sous-vue       */
/*  (Apparence, Accessibilité, Sauvegarde, Foyer) se fait via l'état         */
/*  interne `activeView` — jamais en montant un second composant qui         */
/*  rendrait SA PROPRE .modal-backdrop par-dessus celle-ci. Avant ce          */
/*  correctif, chaque sous-panneau était un composant "modale" à part          */
/*  entière (son propre fond, sa propre bordure, sa propre animation            */
/*  slideUp) : même rendu un seul à la fois (jamais empilés), le DÉMONTAGE       */
/*  de l'écran principal puis le MONTAGE du sous-panneau créait un vrai          */
/*  changement de conteneur DOM — visible comme un "saut"/une discontinuité       */
/*  à l'écran, perçu à tort comme une double modale. Les composants              */
/*  AppearanceSettingsModal/AccessibilitySettingsModal/DataBackupModal/           */
/*  HouseholdManagerModal ne rendent donc plus qu'un CONTENU (titre + corps),      */
/*  jamais leur propre fond/bordure/bouton de retour — ceux-ci sont gérés          */
/*  ICI, une seule fois, quel que soit l'écran affiché.                            */
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
  onRefreshHouseholds,
  showToast,
  onSignOut,
}) {
  const { t } = useTranslation();
  // 'main' | 'appearance' | 'accessibility' | 'backup' | 'household'
  const [activeView, setActiveView] = useState("main");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  // Cache-first (voir utils/profile.js) : la carte de profil s'affiche
  // instantanément avec la dernière valeur connue, même hors ligne, puis
  // se rafraîchit dès que le réseau répond.
  const [profile, setProfile] = useState(() => getCachedProfile());

  // Fige le <body> tant que ce menu est ouvert — UNE SEULE fois ici,
  // quelle que soit la vue active (les sous-vues ne l'appellent plus
  // elles-mêmes, voir le commentaire de fichier ci-dessus).
  useBodyScrollLock(true);

  // Retour à l'écran principal des Réglages depuis une sous-vue — définie
  // ici (avant le hook de swipe juste en dessous) pour que le geste de
  // tirage puisse s'en servir lui aussi.
  const goToMain = () => { triggerHaptic(10); setActiveView("main"); };

  // "Tirer pour fermer" : le panneau lui-même EST le conteneur défilant
  // (.modal a overflow-y: auto, voir styles.css.js) — c'est donc lui à la
  // fois la référence de scroll et la cible du translateY. La cible du
  // geste dépend de l'écran affiché, comme le bouton d'en-tête juste à
  // côté : depuis une sous-vue, on ne fait que revenir à la liste
  // principale des Réglages (pas de saut direct vers la grille de
  // recettes) ; depuis l'écran principal, il ferme vraiment. Désactivé
  // pendant que ProfileEditor (une autre feuille) est ouvert par-dessus :
  // il est rendu comme descendant DOM de ce panneau (voir plus bas), un
  // tirage à l'intérieur de ProfileEditor remonterait sinon jusqu'ici.
  const modalPanelRef = useRef(null);
  const swipe = useSwipeToDismiss(activeView === "main" ? onClose : goToMain, {
    scrollRef: modalPanelRef,
    disabled: showProfileEditor,
  });

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

  // Referme tout l'empilement des Réglages — réservé aux actions
  // "terminales" (import réussi, déconnexion) plutôt qu'au simple retour
  // à l'écran principal.
  const closeAll = () => { setActiveView("main"); onClose(); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalPanelRef}
        className="modal grimoire-page ios-settings-modal"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        {activeView === "main" ? (
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        ) : (
          <button className="modal-back" onClick={goToMain}><ChevronLeft size={20} /> {t("settings.back")}</button>
        )}

        {activeView === "main" && (
          <>
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
              <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActiveView("appearance"); }}>
                <span className="ios-row-icon" style={{ background: "var(--plum)" }}><Palette size={16} /></span>
                <span className="ios-row-title">{t("settings.appearanceLanguage")}</span>
                <ChevronRight size={18} className="ios-chevron" />
              </button>
              <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActiveView("accessibility"); }}>
                <span className="ios-row-icon" style={{ background: "var(--wine)" }}><SlidersHorizontal size={16} /></span>
                <span className="ios-row-title">{t("settings.accessibility")}</span>
                <ChevronRight size={18} className="ios-chevron" />
              </button>
            </div>

            <p className="ios-group-title">{t("settings.dataHousehold")}</p>
            <div className="ios-group">
              <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActiveView("backup"); }}>
                <span className="ios-row-icon" style={{ background: "var(--forest)" }}><Save size={16} /></span>
                <span className="ios-row-title">{t("settings.backup")}</span>
                <ChevronRight size={18} className="ios-chevron" />
              </button>
              {user && (
                <button type="button" className="ios-row" onClick={() => { triggerHaptic(15); setActiveView("household"); }}>
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
          </>
        )}

        {activeView === "appearance" && (
          <AppearanceSettingsModal
            theme={theme}
            onSetTheme={onSetTheme}
            language={language}
            onSetLanguage={onSetLanguage}
            showNutriscore={showNutriscore}
            onSetShowNutriscore={onSetShowNutriscore}
          />
        )}
        {activeView === "accessibility" && (
          <AccessibilitySettingsModal
            pressDuration={pressDuration}
            onSetPressDuration={onSetPressDuration}
            textSize={textSize}
            onSetTextSize={onSetTextSize}
          />
        )}
        {activeView === "backup" && (
          <DataBackupModal
            onExport={onExport}
            onImportFile={(e) => { onImportFile(e); closeAll(); }}
            onImportTextRecipe={() => { onImportTextRecipe(); closeAll(); }}
          />
        )}
        {activeView === "household" && (
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
            onRefreshHouseholds={onRefreshHouseholds}
            showToast={showToast}
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
      </div>
    </div>
  );
}
