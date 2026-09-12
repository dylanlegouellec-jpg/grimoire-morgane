import { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";

/* ------------------------------------------------------------------ */
/*  CONFIRMATION D'ADHÉSION À UN FOYER — ouverte automatiquement quand      */
/*  l'app détecte ?join_household=<id> dans l'URL (lien ou QR partagé       */
/*  depuis HouseholdManagerModal.jsx). Ne rend QUE dans l'app déjà           */
/*  connectée (voir GrimoireDeMorgane.jsx) : `user` est donc garanti ici,    */
/*  pas besoin de gérer un état "pas encore connecté".                       */
/*                                                                             */
/*  La demande passe en statut "pending" (voir requestJoinHousehold côté      */
/*  useSupabaseAuth) — elle ne donne PAS accès aux données du foyer tant       */
/*  qu'un admin ne l'a pas validée depuis "Demandes en attente"                */
/*  (HouseholdManagerModal.jsx).                                               */
/* ------------------------------------------------------------------ */
export default function JoinHouseholdConfirmModal({ householdId, onRequestJoin, onClose, showToast }) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await onRequestJoin(householdId);
      showToast && showToast(t("household.joinRequestSentToast"));
      onClose();
    } catch (err) {
      setError((err && err.message) || t("household.joinRequestFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">{t("household.joinInviteTitle")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("household.joinInviteHint")}
        </p>
        {error && <p className="import-error">{error}</p>}
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onClose} disabled={sending}>{t("common.cancel")}</Seal>
          <Seal tone="gold" onClick={confirm} disabled={sending}>
            {sending ? t("household.joinRequestSending") : t("household.joinRequestSend")}
          </Seal>
        </div>
      </motion.div>
    </motion.div>
  );
}
