import { useState } from "react";
import { Check, Copy, PenLine, Search, X } from "lucide-react";
import { fetchCaptionFromLink } from "../../utils/recipeLinkImportClient";
import { copyText } from "../../utils/helpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import Flourish from "./Flourish";
import Seal from "./Seal";

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
export default function RecipeLinkImportModal({ onClose, onCreateRecipe }) {
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(onClose);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
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
      setError((err && err.message) || "Récupération impossible.");
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page form-clean" ref={modalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">Importer depuis un lien</h2>
        <Flourish />

        {status !== "done" && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              Colle un lien Instagram (Reel/Post) ou TikTok public — on récupère sa légende pour toi, à recopier
              ensuite dans les champs de la recette (pas d'extraction automatique en ingrédients/étapes ici).
              Fonctionne mieux avec TikTok : Instagram bloque souvent la lecture automatique de ses posts, même
              publics — si ça échoue, ouvre le post toi-même et copie sa légende à la main.
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
              <Seal tone="gold" onClick={handleFetch} disabled={status === "loading" || !url.trim()}>
                <Search size={16} /> {status === "loading" ? "Récupération en cours…" : "Récupérer la légende"}
              </Seal>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <p className="hint" style={{ fontStyle: "normal" }}>
              Voici la légende du post. Copie-la et colle les bons morceaux dans le titre, les ingrédients et les
              étapes de ta nouvelle recette.
            </p>
            <textarea
              readOnly
              rows={10}
              className="template-textarea"
              value={caption}
              onClick={(e) => e.target.select()}
            />
            <div className="cookmode-nav" style={{ marginTop: 14 }}>
              <Seal tone="gold" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copié !" : "Copier le texte"}
              </Seal>
              <Seal tone="gold" onClick={handleCreateRecipe}>
                <PenLine size={16} /> Créer une nouvelle recette
              </Seal>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
