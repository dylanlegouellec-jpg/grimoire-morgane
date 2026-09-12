import { useState } from "react";
import { AlertTriangle, Check, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { triggerHaptic } from "../../utils/helpers";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
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
  const modalRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });

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
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page recipe-options-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
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
      </motion.div>
    </motion.div>
  );
}
