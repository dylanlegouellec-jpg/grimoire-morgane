import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, ImagePlus } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { uploadRecipeImage } from "../../utils/imageUpload";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import type { Recipe } from "../../hooks/useRecipes";
import type { ShowToast } from "../../hooks/useToast";

/* ------------------------------------------------------------------ */
/*  PHOTO DU PLAT — fin du mode cuisine                                 */
/*  Affiché sous la dernière liste d'étapes, UNIQUEMENT pour une recette */
/*  sans photo (CookMode décide de l'afficher) : « Prends ton plat en    */
/*  photo » (appareil photo arrière, ou galerie). La photo devient       */
/*  celle de la recette — exactement comme « Ajouter une photo » du      */
/*  menu d'une recette (RecipeOptionsModal) : compression + envoi via     */
/*  uploadRecipeImage, puis imageUrl + imageSource "photo". « Reprendre   */
/*  une photo » remplace directement celle qui vient d'être envoyée. En   */
/*  cas d'échec (réseau, hors-ligne...), la recette n'est pas modifiée.   */
/* ------------------------------------------------------------------ */

interface CookPhotoPromptProps {
  recipe: Recipe;
  onUpdateRecipe: (recipe: Recipe) => Promise<void> | void;
  householdId?: string | null;
  showToast?: ShowToast;
  // Toutes les étapes sont cochées : l'encart est mis en avant.
  allDone?: boolean;
}

type Status = "idle" | "uploading" | "saved";

export default function CookPhotoPrompt({ recipe, onUpdateRecipe, householdId = null, showToast, allDone = false }: CookPhotoPromptProps) {
  const { t, language } = useTranslation();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  // Le mode cuisine garde la recette telle qu'à son ouverture : on suit
  // ici la recette enregistrée entre-temps (« Reprendre une photo »).
  const [current, setCurrent] = useState<Recipe>(recipe);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const uploading = status === "uploading";

  const openPicker = (input: HTMLInputElement | null) => {
    if (uploading) return;
    setError(null);
    input?.click();
  };

  const upload = async (file: File) => {
    // En cas d'échec, on revient à l'état précédent (pour pouvoir réessayer).
    const fallback: Status = status === "saved" ? "saved" : "idle";
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus(fallback);
      setError(t("cookPhoto.offline"));
      return;
    }
    setStatus("uploading");
    setError(null);
    try {
      const imageUrl = await uploadRecipeImage(file, householdId);
      const updated: Recipe = { ...current, imageUrl, imageSource: "photo" };
      await onUpdateRecipe(updated);
      setCurrent(updated);
      setStatus("saved");
      triggerHaptic(20);
      if (showToast) showToast(t("cookPhoto.savedToast", { title: translateRecipeText(current.title, language) }));
    } catch (err) {
      console.error(err);
      setStatus(fallback);
      setError(t("cookPhoto.uploadError"));
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permet de reprendre la même photo une prochaine fois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("cookPhoto.notAnImage"));
      return;
    }
    void upload(file);
  };

  return (
    <section className={`cookmode-photo ${allDone ? "ready" : ""}`} aria-labelledby="cookmode-photo-title">
      <h3 id="cookmode-photo-title" className="cookmode-photo-title">
        {allDone ? t("cookPhoto.allDoneTitle") : t("cookPhoto.title")}
      </h3>

      {status === "saved" ? (
        <p className="cookmode-photo-text cookmode-photo-saved" role="status">
          <Check size={16} aria-hidden="true" /> {t("cookPhoto.saved")}
        </p>
      ) : (
        <p className="cookmode-photo-text">{t("cookPhoto.hint")}</p>
      )}
      <div className="cookmode-photo-actions">
        <button
          type="button"
          className="cookmode-photo-btn primary"
          onClick={() => openPicker(cameraRef.current)}
          disabled={uploading}
          aria-busy={uploading}
        >
          <Camera size={18} aria-hidden="true" />
          <span>{uploading ? t("cookPhoto.uploading") : status === "saved" ? t("cookPhoto.retake") : t("cookPhoto.takePhoto")}</span>
        </button>
        <button
          type="button"
          className="cookmode-photo-btn"
          onClick={() => openPicker(galleryRef.current)}
          disabled={uploading}
        >
          <ImagePlus size={18} aria-hidden="true" />
          <span>{t("cookPhoto.fromGallery")}</span>
        </button>
      </div>

      {error && <p className="cookmode-photo-error" role="alert">{error}</p>}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="cookmode-photo-input"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
        data-testid="cook-photo-camera"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="cookmode-photo-input"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
        data-testid="cook-photo-gallery"
      />
    </section>
  );
}
