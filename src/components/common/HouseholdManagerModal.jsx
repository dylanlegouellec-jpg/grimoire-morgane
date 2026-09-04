import { useEffect, useState } from "react";
import { Check, Copy, Home, Plus, Share2, UserPlus, Users, X } from "lucide-react";
import { getHouseholdMembers, addUserToHousehold } from "../../utils/auth";
import { getCachedMembers, setCachedMembers } from "../../utils/householdCache";
import { triggerHaptic, buildHouseholdInviteLink, extractHouseholdIdFromInput, buildQrCodeUrl, copyText } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useLongPress from "../../hooks/useLongPress";
import Flourish from "./Flourish";
import Seal from "./Seal";
import HouseholdOptionsModal from "./HouseholdOptionsModal";
import HouseholdMemberOptionsModal from "./HouseholdMemberOptionsModal";

// Appui court = bascule vers ce foyer. Appui long = ouvre les options
// (renommer / supprimer) — voir hooks/useLongPress.js.
function HouseholdRow({ household, active, pressDuration, onSelect, onOpenOptions }) {
  const { handlers, wasLongPress, pressState } = useLongPress(() => onOpenOptions(household), pressDuration);
  return (
    <button
      type="button"
      className={`theme-pill press-anim press-${pressState} ${active ? "active" : ""}`}
      onClick={() => {
        if (wasLongPress()) return;
        triggerHaptic(15);
        onSelect(household.id);
      }}
      {...handlers}
    >
      <Home size={16} />
      <span className="theme-pill-label">{household.name}</span>
    </button>
  );
}

// Appui long = ouvre les options de ce membre (changer son rôle / le
// retirer) — réservé aux admins (voir `canManage`, passé par le parent en
// fonction de son propre rôle). Extrait en composant séparé plutôt
// qu'inline dans un .map() : useLongPress est un hook, il ne peut pas
// être appelé un nombre de fois variable dans une boucle.
function MemberRow({ member, canManage, pressDuration, onOpenOptions, t }) {
  const { handlers, wasLongPress, pressState } = useLongPress(
    () => canManage && onOpenOptions(member),
    pressDuration
  );
  return (
    <li
      className={`household-member-row press-anim press-${pressState}`}
      {...(canManage ? handlers : {})}
      onClick={() => { if (canManage && wasLongPress()) return; }}
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt="" className="avatar-img avatar-img-small" loading="lazy" decoding="async" />
      ) : (
        <Users size={14} />
      )}
      <span style={{ flex: 1 }}>{member.display_name || member.email}</span>
      <span className={member.role === "admin" ? "household-admin-badge" : "household-member-badge"}>
        {member.role === "admin" ? t("household.adminBadge") : t("household.memberBadge")}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  GESTION DES FOYERS — écran dédié (ouvert depuis les Réglages)       */
/*                                                                        */
/*  Multi-foyers avec demandes d'adhésion : rejoindre un foyer existant   */
/*  passe désormais par un lien/QR d'invitation (pas de recherche         */
/*  publique par nom — un foyer reste privé tant qu'on n'a pas reçu son    */
/*  lien) et nécessite la validation d'un admin avant de donner accès       */
/*  aux données (voir la refonte SQL : household_members.role/status,      */
/*  fonctions RPC request_join_household / get_pending_requests /          */
/*  approve_household_member / reject_household_member).                   */
/* ------------------------------------------------------------------ */
export default function HouseholdManagerModal({
  user,
  householdId,
  households,
  pressDuration,
  onSwitchHousehold,
  onCreateHousehold,
  onRenameHousehold,
  onDeleteHousehold,
  onRequestJoinHousehold,
  onGetPendingHouseholdRequests,
  onApproveHouseholdMember,
  onRejectHouseholdMember,
  showToast,
  onClose,
}) {
  useBodyScrollLock(true);
  const { t } = useTranslation();

  const [optionsTarget, setOptionsTarget] = useState(null);

  /* --- Création d'un nouveau foyer -------------------------------------- */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateHousehold = async () => {
    const trimmed = newHouseholdName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await onCreateHousehold(trimmed);
      showToast && showToast(t("household.createdToast", { name: trimmed }));
      setNewHouseholdName("");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      showToast && showToast(t("household.createFailedToast"));
    } finally {
      setCreating(false);
    }
  };

  /* --- Rejoindre un foyer (lien/code d'invitation) ----------------------- */
  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    const id = extractHouseholdIdFromInput(joinInput);
    if (!id || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      await onRequestJoinHousehold(id);
      showToast && showToast(t("household.joinRequestedToast"));
      setJoinInput("");
    } catch (err) {
      console.error(err);
      setJoinError((err && err.message) || t("household.joinRequestFailedToast"));
    } finally {
      setJoining(false);
    }
  };

  /* --- Partager l'invitation (lien + QR) du foyer actif ------------------ */
  const [showInvite, setShowInvite] = useState(false);
  const inviteLink = householdId ? buildHouseholdInviteLink(householdId) : "";

  const copyInviteLink = async () => {
    const ok = await copyText(inviteLink);
    showToast && showToast(ok ? t("household.linkCopiedToast") : inviteLink);
  };

  /* --- Membres du foyer actif ------------------------------------------ */
  // Cache-first : on affiche immédiatement la dernière liste connue pour
  // ce foyer (utile hors-ligne), puis on la rafraîchit en tâche de fond
  // si le réseau répond — voir utils/householdCache.js.
  const [members, setMembers] = useState(() => getCachedMembers(householdId));
  const [membersLoading, setMembersLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [addStatus, setAddStatus] = useState(null);
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    setMembers(getCachedMembers(householdId));
    if (!householdId) return undefined;
    let cancelled = false;
    setMembersLoading(true);
    getHouseholdMembers(householdId).then((list) => {
      if (cancelled) return;
      setMembersLoading(false);
      if (list.length) {
        setMembers(list);
        setCachedMembers(householdId, list);
      }
      // Liste vide renvoyée (hors-ligne, erreur réseau) : on garde le
      // cache déjà affiché plutôt que de vider l'écran.
    });
    return () => { cancelled = true; };
  }, [householdId]);

  const isAdmin = Boolean(user && members.some((m) => m.user_id === user.id && m.role === "admin"));

  const refreshMembers = () => {
    getHouseholdMembers(householdId).then((list) => {
      if (list.length) { setMembers(list); setCachedMembers(householdId, list); }
    });
  };

  // Options d'un membre (changer son rôle / le retirer) — ouvert par appui
  // long, admins uniquement (voir MemberRow ci-dessus).
  const [memberOptionsTarget, setMemberOptionsTarget] = useState(null);

  /* --- Demandes d'adhésion en attente (admin du foyer actif seulement) --- */
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingBusyId, setPendingBusyId] = useState(null);

  useEffect(() => {
    if (!householdId || !isAdmin) { setPendingRequests([]); return undefined; }
    let cancelled = false;
    setPendingLoading(true);
    onGetPendingHouseholdRequests(householdId).then((list) => {
      if (!cancelled) { setPendingRequests(list); setPendingLoading(false); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, isAdmin]);

  const handleApprove = async (userId) => {
    if (pendingBusyId) return;
    setPendingBusyId(userId);
    try {
      await onApproveHouseholdMember(householdId, userId);
      setPendingRequests((prev) => prev.filter((r) => r.user_id !== userId));
      showToast && showToast(t("household.approvedToast"));
      // Le nouveau membre approuvé doit apparaître dans la liste — un
      // rafraîchissement complet est plus sûr qu'un patch local (on ne
      // connaît pas son display_name/avatar sans rappeler l'API).
      refreshMembers();
    } catch (err) {
      console.error(err);
      showToast && showToast(t("household.requestActionFailedToast"));
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleReject = async (userId) => {
    if (pendingBusyId) return;
    setPendingBusyId(userId);
    try {
      await onRejectHouseholdMember(householdId, userId);
      setPendingRequests((prev) => prev.filter((r) => r.user_id !== userId));
      showToast && showToast(t("household.rejectedToast"));
    } catch (err) {
      console.error(err);
      showToast && showToast(t("household.requestActionFailedToast"));
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleAddMember = async () => {
    const trimmed = email.trim();
    if (!trimmed || addBusy || !householdId) return;
    setAddBusy(true);
    setAddStatus(null);
    try {
      await addUserToHousehold(trimmed, householdId);
      setAddStatus({ type: "ok", message: t("household.addedToast", { email: trimmed }) });
      setEmail("");
      const fresh = await getHouseholdMembers(householdId);
      if (fresh.length) {
        setMembers(fresh);
        setCachedMembers(householdId, fresh);
      }
    } catch (err) {
      setAddStatus({ type: "error", message: (err && err.message) || t("household.addFailedToast") });
    } finally {
      setAddBusy(false);
    }
  };

  const activeHousehold = (households || []).find((h) => h.id === householdId) || null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page household-manager-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{t("household.title")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("household.hint")}
        </p>

        <div className="theme-options" style={{ marginTop: 12 }}>
          {(households || []).map((h) => (
            <HouseholdRow
              key={h.id}
              household={h}
              active={h.id === householdId}
              pressDuration={pressDuration}
              onSelect={onSwitchHousehold}
              onOpenOptions={setOptionsTarget}
            />
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          {showCreateForm ? (
            <div className="household-add-row">
              <input
                type="text"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateHousehold()}
                placeholder={t("household.newHouseholdPlaceholder")}
                className="household-email-input"
                autoFocus
              />
              <button type="button" className="seal seal-gold" onClick={handleCreateHousehold} disabled={creating || !newHouseholdName.trim()}>
                <Plus size={16} /> {creating ? t("household.creating") : t("household.create")}
              </button>
            </div>
          ) : (
            <Seal tone="gold" onClick={() => { triggerHaptic(15); setShowCreateForm(true); }}>
              <Plus size={16} /> {t("household.createHousehold")}
            </Seal>
          )}
        </div>

        {/* --- Rejoindre un foyer via lien/code d'invitation --- */}
        <h4 style={{ marginTop: 22 }}>{t("household.joinSectionTitle")}</h4>
        <p className="hint" style={{ fontStyle: "normal", marginBottom: 8 }}>
          {t("household.joinSectionHint")}
        </p>
        <div className="household-add-row">
          <input
            type="text"
            value={joinInput}
            onChange={(e) => { setJoinInput(e.target.value); setJoinError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder={t("household.joinLinkPlaceholder")}
            className="household-email-input"
          />
          <button type="button" className="seal seal-gold" onClick={handleJoin} disabled={joining || !joinInput.trim()}>
            <Users size={16} /> {joining ? t("household.joinSending") : t("household.joinButton")}
          </button>
        </div>
        {joinError && <p className="recipe-options-error">{joinError}</p>}

        {/* --- Partager l'invitation du foyer actif --- */}
        {householdId && (
          <div style={{ marginTop: 14 }}>
            <Seal tone="gold" onClick={() => { triggerHaptic(15); setShowInvite((v) => !v); }}>
              <Share2 size={16} /> {t("household.shareInviteButton")}
            </Seal>
            {showInvite && (
              <div className="household-invite-panel">
                <p className="hint" style={{ fontStyle: "normal" }}>{t("household.shareInviteHint")}</p>
                <img
                  src={buildQrCodeUrl(inviteLink)}
                  alt=""
                  className="household-invite-qr"
                  loading="lazy"
                  width={180}
                  height={180}
                />
                <div className="household-add-row">
                  <input type="text" value={inviteLink} readOnly className="household-email-input" onClick={(e) => e.target.select()} />
                  <button type="button" className="seal seal-gold" onClick={copyInviteLink}>
                    <Copy size={16} /> {t("household.copyLink")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Demandes d'adhésion en attente (admin uniquement) --- */}
        {isAdmin && (
          <>
            <h4 style={{ marginTop: 22 }}>{t("household.pendingRequestsTitle")}</h4>
            {pendingLoading && pendingRequests.length === 0 ? (
              <p className="hint" style={{ fontStyle: "normal" }}>{t("household.loadingMembers")}</p>
            ) : pendingRequests.length === 0 ? (
              <p className="hint" style={{ fontStyle: "normal" }}>{t("household.noPendingRequests")}</p>
            ) : (
              <ul className="household-members-list">
                {pendingRequests.map((r) => (
                  <li key={r.user_id} className="household-member-row household-pending-row">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="avatar-img avatar-img-small" loading="lazy" decoding="async" />
                    ) : (
                      <Users size={14} />
                    )}
                    <span style={{ flex: 1 }}>{r.display_name || r.email}</span>
                    <button
                      type="button"
                      className="household-pending-action approve"
                      onClick={() => handleApprove(r.user_id)}
                      disabled={pendingBusyId === r.user_id}
                      aria-label={t("household.approve")}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="household-pending-action reject"
                      onClick={() => handleReject(r.user_id)}
                      disabled={pendingBusyId === r.user_id}
                      aria-label={t("household.reject")}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <h4 style={{ marginTop: 24 }}>
          {activeHousehold ? t("household.membersOf", { name: activeHousehold.name }) : t("household.membersGeneric")}
        </h4>
        <p className="hint" style={{ fontStyle: "normal", marginBottom: 10 }}>
          {isAdmin ? t("household.addMemberHint") + " " + t("household.memberLongPressHint") : t("household.addMemberHint")}
        </p>
        {membersLoading && members.length === 0 ? (
          <p className="hint" style={{ fontStyle: "normal" }}>{t("household.loadingMembers")}</p>
        ) : members.length > 0 ? (
          <ul className="household-members-list">
            {members.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                canManage={isAdmin}
                pressDuration={pressDuration}
                onOpenOptions={setMemberOptionsTarget}
                t={t}
              />
            ))}
          </ul>
        ) : (
          <p className="hint" style={{ fontStyle: "normal" }}>{t("household.noMembers")}</p>
        )}
        <div className="household-add-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            placeholder={t("household.emailPlaceholder")}
            className="household-email-input"
          />
          <button type="button" className="seal seal-gold" onClick={handleAddMember} disabled={addBusy || !email.trim()}>
            <UserPlus size={16} /> {addBusy ? t("household.adding") : t("household.add")}
          </button>
        </div>
        {addStatus && (
          <p className={addStatus.type === "error" ? "recipe-options-error" : "hint"} style={{ fontStyle: "normal" }}>
            {addStatus.message}
          </p>
        )}

        {optionsTarget && (
          <HouseholdOptionsModal
            household={optionsTarget}
            isOnlyHousehold={(households || []).length <= 1}
            onRename={onRenameHousehold}
            onDelete={onDeleteHousehold}
            onClose={() => setOptionsTarget(null)}
          />
        )}

        {memberOptionsTarget && (
          <HouseholdMemberOptionsModal
            member={memberOptionsTarget}
            householdId={householdId}
            onChanged={refreshMembers}
            onClose={() => setMemberOptionsTarget(null)}
          />
        )}
      </div>
    </div>
  );
}
