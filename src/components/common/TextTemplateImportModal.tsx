import { useState } from "react";
import { Wand2, X } from "lucide-react";
import { motion } from "motion/react";
import { parseRecipeTemplate, TEMPLATE_PLACEHOLDER } from "../../utils/templateParser";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "./Flourish";
import Seal from "./Seal";

interface TextTemplateImportModalProps {
  onClose: () => void;
  onImport: (parsed: ReturnType<typeof parseRecipeTemplate>) => void;
}

export default function TextTemplateImportModal({ onClose, onImport }: TextTemplateImportModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const parsed = parseRecipeTemplate(text);
    if (!parsed) {
      setError(t("modals.textTemplate.parseError"));
      return;
    }
    onImport(parsed);
    onClose();
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page form-clean modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title">{t("modals.textTemplate.title")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          {t("modals.textTemplate.hint")} {t("servingsUnit.templateHint")}
        </p>
        <textarea
          rows={12}
          className="template-textarea"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          placeholder={TEMPLATE_PLACEHOLDER}
        />
        {error && <p className="import-error">{error}</p>}
        <Seal tone="gold" onClick={submit}><Wand2 size={16} /> {t("modals.textTemplate.submit")}</Seal>
      </motion.div>
    </motion.div>
  );
}
