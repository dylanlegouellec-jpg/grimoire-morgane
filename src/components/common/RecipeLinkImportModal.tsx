import { useState } from "react";
import { Check, Copy, PenLine, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { fetchCaptionFromLink } from "../../utils/recipeLinkImportClient";
import { copyText } from "../../utils/helpers";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "./Flourish";
import Seal from "./Seal";

interface RecipeLinkImportModalProps {
  onClose: () => void;
  onCreateRecipe: () => void;
}

type Status = "idle" | "loading" | "done" | "error";

/* ------------------------------------------------------------------ */
/*  IMPORTER UNE RECETTE DEPUIS UN LIEN (Instagram/TikTok)              */
/*  Aucune IA ici (pas de clé OpenAI à payer, sur demande explicite) :    */
/*  on récupère juste la légende publique du post (voir                    */
/*  utils/recipeLinkImportClient.js) et on l'affiche telle quelle — à        */
/*  l'utilisateur de la recopier lui-même dans les bons champs. Le bouton      */
/*  "Créer une nouvelle recette" copie le texte dans le presse-papiers puis     */
/*  ouvre directement le formulaire de création (voir onCreateRecipe, câblé      */
/*  par AppShell sur le même mécanisme que le "+" habituel) pour coller.          */
/* ------------------------------------------------------------------ */
export default function RecipeLinkImportModal({ onClose, onCreateRecipe }: RecipeLinkImportModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setError("");
    setCopied(false);
    try {
      const data = await fetchCaptionFromLink(trimmed);
      setCaption(data.caption);
      setStatus("done");
    } catch (err) {
      setError((err instanceof Error && err.message) || t("modals.linkImport.fetchFailed"));
      setStatus("error");
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(caption);
    setCopied(ok);
  };

  const handleCreateRecipe = async () => {
    await copyText(caption);
    onCreateRecipe();
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
        <h2 className="dropcap-title">{t("modals.linkImport.title")}</h2>
        <Flourish />

        {status !== "done" && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              {t("modals.linkImport.hint")}
            </p>
            <input
              type="url"
              className="household-email-input"
              style={{ width: "100%" }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("modals.linkImport.placeholder")}
              disabled={status === "loading"}
            />
            {status === "error" && <p className="import-error">{error}</p>}
            <div style={{ marginTop: 14 }}>
              <Seal tone="gold" onClick={handleFetch} disabled={status === "loading" || !url.trim()}>
                <Search size={16} /> {status === "loading" ? t("modals.linkImport.fetching") : t("modals.linkImport.fetch")}
              </Seal>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              {t("modals.linkImport.doneHint")}
            </p>
            <textarea
              readOnly
              rows={10}
              className="template-textarea"
              value={caption}
              onClick={(e) => e.currentTarget.select()}
            />
            <div className="cookmode-nav" style={{ marginTop: 14 }}>
              <Seal tone="gold" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t("modals.linkImport.copied") : t("modals.linkImport.copyText")}
              </Seal>
              <Seal tone="gold" onClick={handleCreateRecipe}>
                <PenLine size={16} /> {t("modals.linkImport.createRecipe")}
              </Seal>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
