import { useState } from "react";
import { Wand2, X } from "lucide-react";
import { parseRecipeTemplate, TEMPLATE_PLACEHOLDER } from "../../utils/templateParser";
import Flourish from "./Flourish";
import Seal from "./Seal";

export default function TextTemplateImportModal({ onClose, onImport }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const parsed = parseRecipeTemplate(text);
    if (!parsed) {
      setError("Impossible de lire cette fiche — vérifie qu'elle commence bien par \"Recette de : …\".");
      return;
    }
    onImport(parsed);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page form-clean" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Importer ma fiche texte</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Colle ta fiche telle quelle, avec les intitulés "Recette de", "Nombre de parts", "Temps de préparation",
          "Matériel spécifique", "Ingrédients", "Préparation" et "Remarques". Dans les ingrédients ou la préparation,
          une ligne comme "Biscuit madeleine :" ou "Pour l'insert :" devient automatiquement un titre de sous-section
          plutôt qu'un ingrédient ou une étape.
        </p>
        <textarea
          rows={12}
          className="template-textarea"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          placeholder={TEMPLATE_PLACEHOLDER}
        />
        {error && <p className="import-error">{error}</p>}
        <Seal tone="gold" onClick={submit}><Wand2 size={16} /> Analyser et importer</Seal>
      </div>
    </div>
  );
}

