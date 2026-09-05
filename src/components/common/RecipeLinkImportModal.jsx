import { useState } from "react";
import { Check, RotateCcw, Wand2, X } from "lucide-react";
import { extractRecipeFromLink } from "../../utils/recipeLinkImportClient";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";
import Seal from "./Seal";

/* ------------------------------------------------------------------ */
/*  IMPORTER UNE RECETTE DEPUIS UN LIEN (Instagram/TikTok)              */
/*  Colle un lien → extraction IA côté serveur (voir                     */
/*  utils/recipeLinkImportClient.js) → aperçu pour validation → au         */
/*  clic sur "Enregistrer", `onImport` réutilise exactement le même         */
/*  chemin que l'import texte existant (voir importRecipe dans               */
/*  hooks/useRecipes.js) : mêmes valeurs par défaut, même normalisation       */
/*  des ingrédients, rien à dupliquer ici.                                     */
/* ------------------------------------------------------------------ */
export default function RecipeLinkImportModal({ onClose, onImport }) {
  useBodyScrollLock(true);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | preview | error
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(null);

  const handleExtract = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setError("");
    try {
      const recipe = await extractRecipeFromLink(trimmed);
      setExtracted(recipe);
      setStatus("preview");
    } catch (err) {
      setError((err && err.message) || "Extraction impossible.");
      setStatus("error");
    }
  };

  const handleConfirm = () => {
    if (!extracted) return;
    onImport(extracted);
    onClose();
  };

  const reset = () => {
    setStatus("idle");
    setExtracted(null);
    setError("");
  };

  const ingredientsList = Array.isArray(extracted && extracted.ingredients) ? extracted.ingredients : [];
  const stepsList = Array.isArray(extracted && extracted.steps) ? extracted.steps : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page form-clean" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Importer depuis un lien</h2>
        <Flourish />

        {status !== "preview" && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              Colle un lien Instagram (Reel/Post) ou TikTok public — l'IA tente d'en extraire la recette à partir
              de sa légende. Fonctionne mieux avec TikTok : Instagram bloque souvent la lecture automatique de ses
              posts, même publics — si l'extraction échoue, utilise plutôt "Importer ma fiche texte" en collant
              la légende toi-même.
            </p>
            <input
              type="url"
              className="household-email-input"
              style={{ width: "100%" }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@... ou https://www.instagram.com/..."
              disabled={status === "loading"}
            />
            {status === "error" && <p className="import-error">{error}</p>}
            <div style={{ marginTop: 14 }}>
              <Seal tone="gold" onClick={handleExtract} disabled={status === "loading" || !url.trim()}>
                <Wand2 size={16} /> {status === "loading" ? "Extraction en cours…" : "Extraire la recette"}
              </Seal>
            </div>
          </>
        )}

        {status === "preview" && extracted && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              Vérifie que tout est correct avant d'enregistrer — tu pourras encore tout modifier ensuite depuis la
              fiche recette.
            </p>
            <div className="ios-group ios-group-padded" style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontFamily: "'Cinzel', serif" }}>{extracted.title || "(titre manquant)"}</p>
              <p className="hint" style={{ fontStyle: "normal", margin: 0 }}>
                {extracted.category || "Salé"} · {extracted.time || "?"} min · {extracted.servings || "?"} parts
              </p>
            </div>
            <h4>Ingrédients</h4>
            <ul className="household-members-list">
              {ingredientsList.map((ing, i) => (
                <li key={i} className="household-member-row" style={{ cursor: "default" }}>
                  <span style={{ flex: 1 }}>
                    {ing && ing.isSection ? ing.title : `${ing.qty || ""} ${ing.unit || ""} ${ing.name || ""}`.trim()}
                  </span>
                </li>
              ))}
            </ul>
            <h4>Préparation</h4>
            <ol style={{ paddingLeft: 20 }}>
              {stepsList.map((s, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{s && s.isSection ? <strong>{s.title}</strong> : s}</li>
              ))}
            </ol>
            <div className="cookmode-nav" style={{ marginTop: 14 }}>
              <Seal tone="gold" onClick={handleConfirm}><Check size={16} /> Enregistrer la recette</Seal>
              <button type="button" className="link-btn" onClick={reset}><RotateCcw size={14} /> Recommencer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
