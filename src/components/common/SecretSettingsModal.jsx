import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Home, LogOut, Palette, Pencil, Save, SlidersHorizontal, UserCircle2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { getCachedProfile, getProfile } from "../../utils/profile";
import { useTranslation } from "../../contexts/LanguageContext";
import useAnimatedClose from "../../hooks/useAnimatedClose";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
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
/*  DEUX modales empilées, jamais une seule coquille dont le CONTENU        */
/*  change : la modale principale (liste "Réglages du grimoire") reste       */
/*  TOUJOURS montée tant que ce composant existe, et une sous-vue             */
/*  (Apparence, Accessibilité, Sauvegarde, Foyer) — quand `activeView` en       */
/*  choisit une — se monte PAR-DESSUS comme sa propre modale indépendante        */
/*  (son propre fond, sa propre coquille, son propre geste de tirage), sans       */
/*  jamais démonter ni ranimer la modale principale en dessous. Même            */
/*  principe déjà en place pour RecipeDetail + RecipeForm dans AppShell.jsx :      */
/*  la modale du dessous reste visible (assombrie par le fond opaque de           */
/*  celle du dessus), donc "déjà ouverte" quand on referme la sous-vue —           */
/*  jamais une réanimation d'ouverture perçue à tort comme "elle se referme         */
/*  puis se rouvre" (signalé quand une version antérieure de ce fichier             */
/*  swappait le CONTENU d'une coquille unique plutôt que d'empiler deux              */
/*  modales distinctes). Les composants AppearanceSettingsModal/                     */
/*  AccessibilitySettingsModal/DataBackupModal/HouseholdManagerModal ne              */
/*  rendent toujours qu'un CONTENU (titre + corps), jamais leur propre                */
/*  fond/bordure/bouton de retour — portés ici par la coquille de la sous-vue.         */
/* ------------------------------------------------------------------ */
export default function SecretSettingsModal({
  onClose,
  connectionStatus,
  onExport,
  onImportFile,
  onImportTextRecipe,
  onImportLink,
  pressDuration,
  onSetPressDuration,
  theme,
  onSetTheme,
  language,
  onSetLanguage,
  showNutriscore,
  onSetShowNutriscore,
  navOpacity,
  onSetNavOpacity,
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

  // "Tirer pour fermer" du panneau principal — celui de la sous-vue vit
  // dans SettingsSubPanel (composant à part, voir plus bas dans ce
  // fichier) : useFocusTrap/useSwipeToDismiss s'initialisent une seule
  // fois, AU MONTAGE du composant qui les appelle (effet à deps `[]`) —
  // les appeler ICI pour la sous-vue n'aurait fonctionné qu'à l'ouverture
  // de la toute première sous-vue jamais visitée : ce composant-ci reste
  // monté en permanence pendant que les Réglages sont ouverts (voir le
  // commentaire de fichier en tête), donc son effet seule-fois se serait
  // déjà consommé avant même qu'une sous-vue n'existe — sans jamais se
  // redéclencher aux ouvertures suivantes (repéré : Échap fermait TOUT le
  // module au lieu de revenir au seul écran principal). Un vrai composant
  // séparé, qui se démonte pour de bon au retour à "main" et se remonte à
  // chaque nouvelle ouverture (comme RecipeForm dans AppShell.jsx), refait
  // tourner ces effets à chaque fois, au bon moment.
  //
  // Ferme tout le module. Désactivé pendant que ProfileEditor (une autre
  // feuille, rendue comme descendant DOM de ce panneau) est ouvert
  // par-dessus, pour ne pas lui voler le geste — et de toute façon hors de
  // portée du doigt dès qu'une sous-vue est empilée dessus (son propre
  // fond opaque intercepte alors le geste en premier).
  // Anime la fermeture (bouton/fond/Échap/retour Android) au lieu de
  // démonter instantanément — voir hooks/useAnimatedClose.js. PAS branché
  // sur mainSwipe juste en dessous : le geste de tirage anime déjà lui-même
  // sa sortie via sa propre position suivie au doigt, le mélanger à
  // l'animation CSS ci-dessous la ferait repartir de zéro plutôt que de la
  // position réelle du doigt au relâché.
  const { closing, requestClose } = useAnimatedClose(onClose);
  const mainPanelRef = useRef(null);
  const mainSwipe = useSwipeToDismiss(onClose, {
    scrollRef: mainPanelRef,
    disabled: showProfileEditor,
  });
  const mainFocusTrapRef = useFocusTrap(requestClose);
  const setMainPanelRef = (node) => {
    mainPanelRef.current = node;
    mainFocusTrapRef.current = node;
  };

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getProfile(user.id).then((p) => {
      if (!cancelled && p) setProfile(p);
    });
    return () => { cancelled = true; };
  }, [user]);

  // Deux instances plutôt qu'une seule partagée entre l'avatar et le nom :
  // useLongPress.js n'attache plus ses écouteurs tactiles que sur UN seul
  // noeud à la fois (ref native, voir hooks/useLongPress.js) — un hook
  // unique posé sur deux boutons distincts perdrait le suivi de l'appui
  // long sur le second. Chacun ne connaît alors que son propre geste, ce
  // qui est de toute façon plus correct : un clic sur un bouton ne peut
  // provenir que d'un appui commencé SUR ce même bouton.
  const avatarLongPress = useLongPress(() => { triggerHaptic(20); setShowProfileEditor(true); }, pressDuration);
  const nameLongPress = useLongPress(() => { triggerHaptic(20); setShowProfileEditor(true); }, pressDuration);
  const openProfileEditor = (longPress) => () => {
    if (!longPress.wasLongPress()) { triggerHaptic(15); setShowProfileEditor(true); }
  };

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
    <>
      <div className={`modal-backdrop ${closing ? "closing" : ""}`} onClick={requestClose}>
        <div
          ref={setMainPanelRef}
          className={`modal grimoire-page ios-settings-modal modal-swipeable ${closing ? "closing" : ""}`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={mainSwipe.style}
          {...mainSwipe.handlers}
        >
          <button className="modal-close" onClick={requestClose} aria-label="Fermer"><X size={20} /></button>

          <h2 className="dropcap-title">{t("settings.title")}</h2>
          <Flourish />

          {user && (
            <div className="profile-card">
              <div className="profile-card-avatar-wrap">
                <button
                  type="button"
                  ref={avatarLongPress.ref}
                  className="profile-card-avatar"
                  onClick={openProfileEditor(avatarLongPress)}
                  title={t("settings.editProfile")}
                  aria-label={t("settings.editProfile")}
                  {...avatarLongPress.handlers}
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
              <button
                type="button"
                ref={nameLongPress.ref}
                className="profile-card-name"
                onClick={openProfileEditor(nameLongPress)}
                {...nameLongPress.handlers}
              >
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

      {activeView !== "main" && (
        <SettingsSubPanel onBack={goToMain}>
          {activeView === "appearance" && (
            <AppearanceSettingsModal
              theme={theme}
              onSetTheme={onSetTheme}
              language={language}
              onSetLanguage={onSetLanguage}
              showNutriscore={showNutriscore}
              onSetShowNutriscore={onSetShowNutriscore}
              navOpacity={navOpacity}
              onSetNavOpacity={onSetNavOpacity}
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
              onImportLink={() => { onImportLink(); closeAll(); }}
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
        </SettingsSubPanel>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SOUS-VUE EMPILÉE — vrai composant à part (comme RecipeForm dans        */
/*  AppShell.jsx), PAS des hooks appelés depuis SecretSettingsModal :       */
/*  useFocusTrap/useSwipeToDismiss ne s'initialisent qu'UNE FOIS, au         */
/*  montage du composant qui les appelle (effet à deps `[]`) — appelés       */
/*  depuis SecretSettingsModal, qui reste monté en permanence tant que les    */
/*  Réglages sont ouverts, cet effet se serait consommé avant même qu'une      */
/*  sous-vue n'existe, sans jamais se redéclencher aux ouvertures suivantes.    */
/*  Se démonter/remonter pour de vrai à chaque aller-retour "main" <-> sous-     */
/*  vue (voir son rendu conditionnel dans SecretSettingsModal) fait tourner       */
/*  ces effets au bon moment, à chaque fois.                                      */
/* ------------------------------------------------------------------ */
function SettingsSubPanel({ onBack, children }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  // Voir le commentaire équivalent sur le panneau principal ci-dessus :
  // animé sur les déclencheurs "tap", pas sur le geste de tirage.
  const { closing, requestClose } = useAnimatedClose(onBack);
  const swipe = useSwipeToDismiss(onBack, { scrollRef: panelRef });
  const focusTrapRef = useFocusTrap(requestClose);
  const setPanelRef = (node) => {
    panelRef.current = node;
    focusTrapRef.current = node;
  };

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} onClick={requestClose}>
      <div
        ref={setPanelRef}
        className={`modal grimoire-page ios-settings-modal modal-swipeable ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={swipe.style}
        {...swipe.handlers}
      >
        <button className="modal-back" onClick={requestClose}><ChevronLeft size={20} /> {t("settings.back")}</button>
        {children}
      </div>
    </div>
  );
}
