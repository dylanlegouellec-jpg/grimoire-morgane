import { useRef, useState } from "react";
import { Download, FileText, Upload, Wand2 } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  SOUS-VUE "SAUVEGARDE & IMPORTATION" — contenu seul, voir la note dans   */
/*  AccessibilitySettingsModal.jsx : rendu à l'intérieur de la coquille       */
/*  unique de SecretSettingsModal.jsx. Une importation réussie referme        */
/*  tout l'empilement des Réglages (voir onImportFile/onImportTextRecipe       */
/*  déjà enveloppés par l'appelant) — c'est le parent qui gère cette             */
/*  fermeture globale, cette vue se contente d'appeler les callbacks reçus.      */
/* ------------------------------------------------------------------ */
export default function DataBackupModal({ onExport, onImportFile, onImportTextRecipe }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [showImportChoice, setShowImportChoice] = useState(false);

  return (
    <>
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
    </>
  );
}
