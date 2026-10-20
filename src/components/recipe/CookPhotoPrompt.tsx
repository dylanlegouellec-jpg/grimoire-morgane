import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence } from "motion/react";
import { Camera, Check, ImagePlus } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { uploadRecipeImage } from "../../utils/imageUpload";
import type { CropRect } from "../../utils/photoCrop";
import usePhotoCropSource from "../../hooks/usePhotoCropSource";
import PhotoCropModal from "../common/PhotoCropModal";
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
/*  menu d'une recette (RecipeOptionsModal) : éditeur de recadrage        */
/*  (PhotoCropModal), puis découpe + compression + envoi via              */
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
  const [cropError, setCropError] = useState<string | null>(null);
  const crop = usePhotoCropSource();

  const uploading = status === "uploading";
  const busy = uploading || crop.preparing;

  const openPicker = (input: HTMLInputElement | null) => {
    if (busy) return;
    setError(null);
    input?.click();
  };

  // Après « Enregistrer la photo » dans l'éditeur. En cas d'échec, l'éditeur
  // reste ouvert avec son message (on peut réessayer ou annuler) et l'état
  // précédent est conservé.
  const upload = async (area: CropRect) => {
    const source = crop.source;
    if (!source) return;
    const fallback: Status = status === "saved" ? "saved" : "idle";
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus(fallback);
      setCropError(t("cookPhoto.offline"));
      return;
    }
    setStatus("uploading");
    setCropError(null);
    setError(null);
    try {
      const imageUrl = await uploadRecipeImage(source.blob, householdId, { crop: area });
      const updated: Recipe = { ...current, imageUrl, imageSource: "photo" };
      await onUpdateRecipe(updated);
      setCurrent(updated);
      setStatus("saved");
      crop.close();
      triggerHaptic(20);
      if (showToast) showToast(t("cookPhoto.savedToast", { title: translateRecipeText(current.title, language) }));
    } catch (err) {
      console.error(err);
      setStatus(fallback);
      setCropError(t("cookPhoto.uploadError"));
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permet de reprendre la même photo une prochaine fois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("cookPhoto.notAnImage"));
      return;
    }
    // Hors-ligne : inutile d'ouvrir l'éditeur, l'envoi échouerait.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(t("cookPhoto.offline"));
      return;
    }
    setError(null);
    setCropError(null);
    const failure = await crop.openFile(file);
    if (failure) setError(t("photoCrop.decodeError"));
  };

  const cancelCrop = () => {
    setCropError(null);
    crop.close();
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
          disabled={busy}
          aria-busy={busy}
        >
          <Camera size={18} aria-hidden="true" />
          <span>{uploading ? t("cookPhoto.uploading") : crop.preparing ? t("photoCrop.preparing") : status === "saved" ? t("cookPhoto.retake") : t("cookPhoto.takePhoto")}</span>
        </button>
        <button
          type="button"
          className="cookmode-photo-btn"
          onClick={() => openPicker(galleryRef.current)}
          disabled={busy}
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

      <AnimatePresence>
        {crop.source && (
          <PhotoCropModal
            key={crop.source.url}
            source={crop.source}
            recipe={current}
            saving={uploading}
            error={cropError}
            onCancel={cancelCrop}
            onSave={upload}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
