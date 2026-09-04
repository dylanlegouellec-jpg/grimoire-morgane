import { useRef, useState } from "react";
import { ChevronLeft, Download, FileText, Upload, Wand2 } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
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
  const fileRef = useRef(null);
  const [showImportChoice, setShowImportChoice] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="modal grimoire-page ios-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-back" onClick={onBack}><ChevronLeft size={20} /> Réglages</button>
        <h2 className="dropcap-title" style={{ marginTop: 34 }}>Sauvegarde &amp; Importation</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>Sauvegarde ou fusionne l'intégralité de ton grimoire.</p>

        <div className="cookmode-nav" style={{ marginTop: 12 }}>
          <Seal tone="gold" onClick={onExport}>
            <Download size={16} /> Exporter mon grimoire
          </Seal>
          <Seal tone="gold" onClick={() => setShowImportChoice((v) => !v)}>
            <Upload size={16} /> Importer un grimoire
          </Seal>
        </div>
        {showImportChoice && (
          <div className="add-choice-list" style={{ marginTop: 14 }}>
            <Seal tone="gold" onClick={() => fileRef.current && fileRef.current.click()}>
              <FileText size={16} /> Fichier JSON complet
            </Seal>
            <Seal tone="gold" onClick={onImportTextRecipe}>
              <Wand2 size={16} /> Fiche texte individuelle
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
