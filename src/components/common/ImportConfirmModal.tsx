import { X } from "lucide-react";
import { motion } from "motion/react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";

interface ImportConfirmModalProps {
  recipe: { title: string };
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImportConfirmModal({ recipe, onConfirm, onCancel }: ImportConfirmModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap<HTMLDivElement>(onCancel);
  const sheet = useDismissibleSheet(onCancel, { scrollRef: modalRef });
  return (
    <motion.div className="modal-backdrop" onClick={onCancel} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onCancel} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title">{t("modals.importConfirm.title")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("modals.importConfirm.bodyBefore")}<strong>{recipe.title}</strong>{t("modals.importConfirm.bodyAfter")}
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>{t("common.cancel")}</Seal>
          <Seal tone="gold" onClick={onConfirm}>{t("common.add")}</Seal>
        </div>
      </motion.div>
    </motion.div>
  );
}
