import { useRef, useState } from "react";
import { ChevronLeft, Download, FileText, Upload, Wand2 } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  SOUS-PANNEAU "SAUVEGARDE & IMPORTATION" — poussé depuis la liste     */
/*  groupée des Réglages (voir SecretSettingsModal.jsx). Une importation  */
/*  réussie referme tout l'empilement de Réglages (voir onImportFile/     */
/*  onImportTextRecipe déjà enveloppés par l'appelant) — seul le bouton   */
/*  retour referme uniquement ce sous-panneau.                            */
/* ------------------------------------------------------------------ */
export default function DataBackupModal({ onExport, onImportFile, onImportTextRecipe, onBack }) {
  useBodyScrollLock(true);
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [showImportChoice, setShowImportChoice] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> {t("settings.back")}</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>{t("settings.backup")}</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>{t("settings.backupHint")}</p>

        <div className="cookmode-nav" style={{ marginTop: 12 }}>
          <Seal tone="gold" onClick={onExport}>
            <Download size={16} /> {t("settings.exportGrimoire")}
          </Seal>
          <Seal tone="gold" onClick={() => setShowImportChoice((v) => !v)}>
            <Upload size={16} /> {t("settings.importGrimoire")}
          </Seal>
        </div>
        {showImportChoice && (
          <div className="add-choice-list" style={{ marginTop: 14 }}>
            <Seal tone="gold" onClick={() => fileRef.current && fileRef.current.click()}>
              <FileText size={16} /> {t("settings.importJsonFile")}
            </Seal>
            <Seal tone="gold" onClick={onImportTextRecipe}>
              <Wand2 size={16} /> {t("settings.importTextSheet")}
            </Seal>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={onImportFile}
        />
      </div>
    </div>
  );
}
