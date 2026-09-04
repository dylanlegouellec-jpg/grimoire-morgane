import { useRef, useState } from "react";
import { Camera, ImageOff, Sparkles, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { generateAIIllustration } from "../../utils/aiIllustration";
import { uploadRecipeImage } from "../../utils/imageUpload";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UNE RECETTE (déclenché par l'appui long)        */
/* ------------------------------------------------------------------ */
export default function RecipeOptionsModal({ recipe, onClose, onUpdateRecipe, onRequestDelete, householdId, showToast }) {
  const fileInputRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Fige le <body> tant que ce menu est ouvert (même hook que RecipeDetail.jsx).
  useBodyScrollLock(true);

  const handlePhotoClick = () => {
    triggerHaptic(15);
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permet de reprendre la même photo une prochaine fois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    setError(null);
    setUploading(true);
    triggerHaptic(15);
    try {
      // Compression (max 1200px, WebP/JPEG) puis upload vers Supabase
      // Storage — voir utils/imageUpload.js. La ligne `recipes` ne
      // stocke plus qu'une URL, jamais l'image elle-même.
      const imageUrl = await uploadRecipeImage(file, householdId);
      onUpdateRecipe({ ...recipe, imageUrl, imageSource: "photo" });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Envoi de la photo impossible pour le moment (réseau ou stockage indisponible).");
      if (showToast) showToast("Échec de l'envoi de la photo — réessaie plus tard.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAI = async () => {
    setError(null);
    setGenerating(true);
    triggerHaptic(15);
    try {
      const imageUrl = await generateAIIllustration(recipe);
      onUpdateRecipe({ ...recipe, imageUrl, imageSource: "ia" });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Génération IA indisponible pour le moment.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = () => {
    triggerHaptic(30);
    onClose();
    onRequestDelete(recipe);
  };

  const handleRemoveImage = () => {
    triggerHaptic(15);
    onUpdateRecipe({ ...recipe, imageUrl: null, imageSource: null });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page recipe-options-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{recipe.title}</h2>
        <Flourish />

        <div className="recipe-options-list">
          <button type="button" className="recipe-option-row" onClick={handlePhotoClick} disabled={uploading}>
            <Camera size={18} className={uploading ? "spin-wand" : ""} />
            <span>{uploading ? "Envoi de la photo…" : "Ajouter ma propre photo"}</span>
          </button>

          <button type="button" className="recipe-option-row" onClick={handleGenerateAI} disabled={generating}>
            <Sparkles size={18} className={generating ? "spin-wand" : ""} />
            <span>{generating ? "Génération en cours…" : "Générer une illustration par IA"}</span>
          </button>

          {recipe.imageUrl && (
            <button type="button" className="recipe-option-row" onClick={handleRemoveImage}>
              <ImageOff size={18} />
              <span>Supprimer l'image personnalisée</span>
            </button>
          )}

          <button type="button" className="recipe-option-row danger" onClick={handleDelete}>
            <Trash2 size={18} />
            <span>Supprimer la recette</span>
          </button>
        </div>

        {error && <p className="hint recipe-options-error">{error}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
