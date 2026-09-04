import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  QUITTER UN FOYER — ouvert par appui long sur SA PROPRE ligne dans la   */
/*  liste des membres (voir HouseholdManagerModal.jsx), accessible à        */
/*  n'importe quel membre, pas seulement aux admins. Le garde-fou "dernier  */
/*  admin ne peut pas partir tant que d'autres membres restent" est          */
/*  appliqué côté serveur (voir la fonction SQL leave_household) — l'erreur  */
/*  renvoyée s'affiche ici telle quelle, jamais devinée côté client.         */
/* ------------------------------------------------------------------ */
export default function LeaveHouseholdConfirmModal({ householdName, onConfirm, onClose }) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err && err.message) || t("household.requestActionFailedToast"));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{t("household.leaveTitle")}</h2>
        <Flourish />
        <p className="hint recipe-options-error" style={{ display: "flex", alignItems: "center", gap: 8, fontStyle: "normal" }}>
          <AlertTriangle size={16} /> {t("household.leaveConfirm", { name: householdName })}
        </p>
        {error && <p className="recipe-options-error">{error}</p>}
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onClose} disabled={busy}>{t("common.cancel")}</Seal>
          <Seal tone="gold" onClick={handleConfirm} disabled={busy} haptic={30}>
            {busy ? t("household.leaving") : t("household.confirmLeave")}
          </Seal>
        </div>
      </div>
    </div>
  );
}
