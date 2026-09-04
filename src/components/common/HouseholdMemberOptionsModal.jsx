import { useState } from "react";
import { AlertTriangle, Shield, User, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { changeHouseholdMemberRole, removeHouseholdMember } from "../../utils/auth";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  OPTIONS D'UN MEMBRE DU FOYER (déclenché par appui long, admins        */
/*  seulement — voir HouseholdManagerModal.jsx) — changer son rôle ou le   */
/*  retirer du foyer. Même esprit que HouseholdOptionsModal.jsx pour les   */
/*  foyers eux-mêmes. Les deux garde-fous ("dernier admin ne peut ni se     */
/*  rétrograder ni se retirer") sont appliqués côté serveur (voir la        */
/*  refonte SQL, change_household_member_role / remove_household_member) : */
/*  l'erreur renvoyée s'affiche simplement ici, jamais devinée côté client. */
/* ------------------------------------------------------------------ */
export default function HouseholdMemberOptionsModal({ member, householdId, onClose, onChanged }) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = member.role === "admin";
  const name = member.display_name || member.email;

  const handleChangeRole = async () => {
    if (busy) return;
    triggerHaptic(15);
    setBusy(true);
    setError("");
    try {
      await changeHouseholdMemberRole(householdId, member.user_id, isAdmin ? "member" : "admin");
      onChanged();
      onClose();
    } catch (err) {
      setError((err && err.message) || t("household.requestActionFailedToast"));
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await removeHouseholdMember(householdId, member.user_id);
      onChanged();
      onClose();
    } catch (err) {
      setError((err && err.message) || t("household.requestActionFailedToast"));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page recipe-options-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{name}</h2>
        <Flourish />

        <div className="recipe-options-list">
          {!confirmingRemove ? (
            <>
              <button type="button" className="recipe-option-row" onClick={handleChangeRole} disabled={busy}>
                {isAdmin ? <User size={18} /> : <Shield size={18} />}
                <span>{isAdmin ? t("household.demoteToMember") : t("household.promoteToAdmin")}</span>
              </button>
              <button
                type="button"
                className="recipe-option-row danger"
                onClick={() => { triggerHaptic(15); setConfirmingRemove(true); }}
                disabled={busy}
              >
                <X size={18} />
                <span>{t("household.removeMember")}</span>
              </button>
            </>
          ) : (
            <>
              <p className="hint recipe-options-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} /> {t("household.removeMemberConfirm", { name })}
              </p>
              <div className="cookmode-nav">
                <Seal tone="gold" onClick={() => setConfirmingRemove(false)}>{t("common.cancel")}</Seal>
                <Seal tone="gold" onClick={handleRemove} haptic={30}>
                  {busy ? t("household.removing") : t("household.confirmRemove")}
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
