import { useState } from "react";
import { AlertTriangle, Check, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  OPTIONS D'UN FOYER (déclenché par appui long sur son nom)           */
/*  Renommer (champ + validation) et Supprimer (avec confirmation) —    */
/*  même esprit que RecipeOptionsModal pour les recettes.               */
/* ------------------------------------------------------------------ */
export default function HouseholdOptionsModal({ household, onClose, onRename, onDelete, isOnlyHousehold }) {
  const [name, setName] = useState(household.name);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useBodyScrollLock(true);

  const handleRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onRename(household.id, trimmed);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Échec du renommage.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(household.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError((err && err.message) || "Échec de la suppression.");
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page recipe-options-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{household.name}</h2>
        <Flourish />

        <div className="household-add-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="household-email-input"
            autoFocus
          />
          <button type="button" className="seal seal-gold" onClick={handleRename} disabled={saving || !name.trim()}>
            <Check size={16} /> {saving ? "…" : "Renommer"}
          </button>
        </div>

        <div className="recipe-options-list" style={{ marginTop: 16 }}>
          {!confirmingDelete ? (
            <button
              type="button"
              className="recipe-option-row danger"
              onClick={() => { triggerHaptic(15); setConfirmingDelete(true); }}
              disabled={isOnlyHousehold}
            >
              <Trash2 size={18} />
              <span>{isOnlyHousehold ? "Impossible de supprimer ton unique foyer" : "Supprimer ce foyer"}</span>
            </button>
          ) : (
            <>
              <p className="hint recipe-options-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} /> Toutes les recettes, listes et données de ce foyer seront supprimées définitivement.
              </p>
              <div className="cookmode-nav">
                <Seal tone="gold" onClick={() => setConfirmingDelete(false)}>Annuler</Seal>
                <Seal tone="gold" onClick={handleDelete} haptic={30}>
                  {deleting ? "Suppression…" : "Confirmer la suppression"}
                </Seal>
              </div>
            </>
          )}
        </div>

        {error && <p className="hint recipe-options-error">{error}</p>}
      </div>
    </div>
  );
}
