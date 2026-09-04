import { useEffect, useState } from "react";
import { Home, Plus, UserPlus, Users, X } from "lucide-react";
import { getHouseholdMembers, addUserToHousehold } from "../../utils/auth";
import { getCachedMembers, setCachedMembers } from "../../utils/householdCache";
import { triggerHaptic } from "../../utils/helpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useLongPress from "../../hooks/useLongPress";
import Flourish from "./Flourish";
import Seal from "./Seal";
import HouseholdOptionsModal from "./HouseholdOptionsModal";

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

/* ------------------------------------------------------------------ */
/*  GESTION DES FOYERS — écran dédié (ouvert depuis les Réglages)       */
/* ------------------------------------------------------------------ */
export default function HouseholdManagerModal({
  householdId,
  households,
  pressDuration,
  onSwitchHousehold,
  onCreateHousehold,
  onRenameHousehold,
  onDeleteHousehold,
  showToast,
  onClose,
}) {
  useBodyScrollLock(true);

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
      showToast && showToast(`Foyer "${trimmed}" créé !`);
      setNewHouseholdName("");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      showToast && showToast("Échec de la création du foyer.");
    } finally {
      setCreating(false);
    }
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

  const handleAddMember = async () => {
    const trimmed = email.trim();
    if (!trimmed || addBusy || !householdId) return;
    setAddBusy(true);
    setAddStatus(null);
    try {
      await addUserToHousehold(trimmed, householdId);
      setAddStatus({ type: "ok", message: `${trimmed} a été ajouté(e) au foyer !` });
      setEmail("");
      const fresh = await getHouseholdMembers(householdId);
      if (fresh.length) {
        setMembers(fresh);
        setCachedMembers(householdId, fresh);
      }
    } catch (err) {
      setAddStatus({ type: "error", message: (err && err.message) || "Échec de l'ajout." });
    } finally {
      setAddBusy(false);
    }
  };

  const activeHousehold = (households || []).find((h) => h.id === householdId) || null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Gestion des foyers</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Appuie sur un foyer pour y basculer. Maintiens l'appui pour le renommer ou le supprimer.
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
                placeholder="Nom du nouveau foyer"
                className="household-email-input"
                autoFocus
              />
              <button type="button" className="seal seal-gold" onClick={handleCreateHousehold} disabled={creating || !newHouseholdName.trim()}>
                <Plus size={16} /> {creating ? "…" : "Créer"}
              </button>
            </div>
          ) : (
            <Seal tone="gold" onClick={() => { triggerHaptic(15); setShowCreateForm(true); }}>
              <Plus size={16} /> Créer un foyer
            </Seal>
          )}
        </div>

        <h4 style={{ marginTop: 24 }}>
          Membres {activeHousehold ? `de « ${activeHousehold.name} »` : "du foyer"}
        </h4>
        <p className="hint" style={{ fontStyle: "normal", marginBottom: 10 }}>
          Ajoute quelqu'un par son e-mail Google — il doit s'être déjà connecté une fois à l'application.
        </p>
        {membersLoading && members.length === 0 ? (
          <p className="hint" style={{ fontStyle: "normal" }}>Chargement des membres…</p>
        ) : members.length > 0 ? (
          <ul className="household-members-list">
            {members.map((m) => (
              <li key={m.user_id} className="household-member-row">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="avatar-img avatar-img-small" loading="lazy" decoding="async" />
                ) : (
                  <Users size={14} />
                )}
                <span>{m.display_name || m.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint" style={{ fontStyle: "normal" }}>Aucun membre trouvé.</p>
        )}
        <div className="household-add-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            placeholder="email@gmail.com"
            className="household-email-input"
          />
          <button type="button" className="seal seal-gold" onClick={handleAddMember} disabled={addBusy || !email.trim()}>
            <UserPlus size={16} /> {addBusy ? "…" : "Ajouter"}
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
      </div>
    </div>
  );
}
