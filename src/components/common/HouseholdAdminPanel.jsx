import { useEffect, useState } from "react";
import { Check, Home, Pencil, Plus, UserPlus, Users } from "lucide-react";
import { getHouseholdMembers, addUserToHousehold } from "../../utils/auth";
import { triggerHaptic } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  PANNEAU D'ADMINISTRATION DU FOYER (Réglages secrets)                */
/*  - Nom du foyer actif (édition)                                      */
/*  - Membres du foyer actif (liste + ajout par e-mail)                 */
/*  - Bascule entre les foyers de l'utilisateur                         */
/*  - Création d'un nouveau foyer                                       */
/* ------------------------------------------------------------------ */
export default function HouseholdAdminPanel({ householdId, households, onSwitchHousehold, onCreateHousehold, onRenameHousehold, showToast }) {
  const activeHousehold = (households || []).find((h) => h.id === householdId) || null;

  /* --- Nom du foyer ---------------------------------------------------- */
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeHousehold ? activeHousehold.name : "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!editingName) setNameDraft(activeHousehold ? activeHousehold.name : "");
  }, [activeHousehold, editingName]);

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || !householdId || savingName) return;
    setSavingName(true);
    try {
      await onRenameHousehold(householdId, trimmed);
      showToast && showToast("Foyer renommé !");
      setEditingName(false);
    } catch (err) {
      console.error(err);
      showToast && showToast("Échec du renommage.");
    } finally {
      setSavingName(false);
    }
  };

  /* --- Membres du foyer actif ------------------------------------------ */
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [addStatus, setAddStatus] = useState(null); // { type: "ok" | "error", message }
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    if (!householdId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    getHouseholdMembers(householdId).then((list) => {
      if (!cancelled) {
        setMembers(list);
        setMembersLoading(false);
      }
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
      // Rafraîchit la liste affichée sans attendre une reconnexion.
      getHouseholdMembers(householdId).then(setMembers);
    } catch (err) {
      // Le message vient directement du `raise exception` côté SQL
      // (ex: "Aucun compte trouvé pour cet e-mail...").
      setAddStatus({ type: "error", message: (err && err.message) || "Échec de l'ajout." });
    } finally {
      setAddBusy(false);
    }
  };

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

  if (!householdId) return null;

  return (
    <>
      {/* --- Nom du foyer --- */}
      <h4 style={{ marginTop: 24 }}>Nom du foyer</h4>
      {editingName ? (
        <div className="household-add-row">
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            placeholder="La Tanière"
            className="household-email-input"
            autoFocus
          />
          <button type="button" className="seal seal-gold" onClick={saveName} disabled={savingName || !nameDraft.trim()}>
            <Check size={16} /> {savingName ? "…" : "Valider"}
          </button>
        </div>
      ) : (
        <div className="household-add-row">
          <p className="hint" style={{ fontStyle: "normal", flex: 1 }}>
            {activeHousehold ? activeHousehold.name : "Foyer"}
          </p>
          <button
            type="button"
            className="seal seal-gold"
            onClick={() => { triggerHaptic(15); setEditingName(true); }}
          >
            <Pencil size={16} /> Renommer
          </button>
        </div>
      )}

      {/* --- Bascule entre foyers --- */}
      {households && households.length > 1 && (
        <>
          <h4 style={{ marginTop: 24 }}>Basculer de foyer</h4>
          <div className="theme-options">
            {households.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`theme-pill ${h.id === householdId ? "active" : ""}`}
                onClick={() => { triggerHaptic(15); onSwitchHousehold(h.id); }}
              >
                <Home size={16} />
                <span className="theme-pill-label">{h.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* --- Créer un nouveau foyer --- */}
      <h4 style={{ marginTop: 24 }}>Nouveau foyer</h4>
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
        <button type="button" className="seal seal-gold" onClick={() => { triggerHaptic(15); setShowCreateForm(true); }}>
          <Plus size={16} /> Créer un foyer
        </button>
      )}

      {/* --- Membres du foyer actif --- */}
      <h4 style={{ marginTop: 24 }}>Membres du foyer</h4>
      <p className="hint" style={{ fontStyle: "normal", marginBottom: 10 }}>
        Ajoute quelqu'un par son e-mail Google — il doit s'être déjà connecté une fois à l'application.
      </p>
      {membersLoading ? (
        <p className="hint" style={{ fontStyle: "normal" }}>Chargement des membres…</p>
      ) : members.length > 0 ? (
        <ul className="household-members-list">
          {members.map((m) => (
            <li key={m.user_id} className="household-member-row">
              <Users size={14} /> <span>{m.email}</span>
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
    </>
  );
}
