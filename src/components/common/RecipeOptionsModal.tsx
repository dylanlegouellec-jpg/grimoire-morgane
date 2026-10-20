import { useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Crop, ImageOff, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { triggerHaptic } from "../../utils/helpers";
import { generateAIIllustration } from "../../utils/aiIllustration";
import { uploadRecipeImage } from "../../utils/imageUpload";
import { storagePathFromPublicUrl } from "../../utils/thumbnails";
import type { CropRect } from "../../utils/photoCrop";
import type { PhotoSourceErrorKind } from "../../utils/photoCropSource";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import usePhotoCropSource from "../../hooks/usePhotoCropSource";
import Flourish from "./Flourish";
import PhotoCropModal from "./PhotoCropModal";
import type { Recipe } from "../../hooks/useRecipes";

interface RecipeOptionsModalProps {
  recipe: Recipe;
  onClose: () => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onRequestDelete: (recipe: Recipe) => void;
  // Ouvre le formulaire de modification (AppShell) — absent : pas de ligne « Modifier ».
  onEdit?: (recipe: Recipe) => void;
  householdId: string | null;
  showToast?: (msg: string) => void;
}

/* ------------------------------------------------------------------ */
/*  MENU D'ACTIONS SUR UNE RECETTE (déclenché par l'appui long)        */
/*  Rendu à l'intérieur d'un <AnimatePresence> côté appelant            */
/*  (RecipeCard.jsx) — nécessaire pour que son animation de SORTIE      */
/*  (voir MODAL_SHEET_MOTION.exit) ait le temps de jouer avant le vrai   */
/*  démontage.                                                          */
/*                                                                      */
/*  Photo personnelle : le fichier choisi ouvre d'abord l'éditeur de     */
/*  recadrage (PhotoCropModal) ; l'envoi ne part qu'à « Enregistrer ».   */
/*  « Recadrer la photo » rouvre ce même éditeur sur la photo en place    */
/*  et envoie une NOUVELLE image recadrée.                               */
/* ------------------------------------------------------------------ */

// Photo personnelle déjà en place (et donc recadrable) : envoyée par
// l'utilisateur, ou rangée dans le bucket recipe-images.
function hasOwnPhoto(recipe: Pick<Recipe, "imageUrl" | "imageSource">): boolean {
  if (!recipe.imageUrl) return false;
  return recipe.imageSource === "photo" || storagePathFromPublicUrl(recipe.imageUrl) !== null;
}
export default function RecipeOptionsModal({ recipe, onClose, onUpdateRecipe, onRequestDelete, onEdit, householdId, showToast }: RecipeOptionsModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const crop = usePhotoCropSource();
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });

  // Fige le <body> tant que ce menu est ouvert (même hook que RecipeDetail.jsx).
  useBodyScrollLock(true);

  const handlePhotoClick = () => {
    triggerHaptic(15);
    setError(null);
    fileInputRef.current?.click();
  };

  const showSourceError = (kind: PhotoSourceErrorKind | null) => {
    if (kind) setError(t(kind === "remote" ? "photoCrop.remoteError" : "photoCrop.decodeError"));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permet de reprendre la même photo une prochaine fois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("modals.recipeOptions.notAnImage"));
      return;
    }
    setError(null);
    setCropError(null);
    // Photo décodée AVANT d'ouvrir l'éditeur : un fichier illisible (HEIC
    // sur Android...) affiche un message ici, jamais un éditeur vide.
    showSourceError(await crop.openFile(file));
  };

  const handleRecropClick = async () => {
    if (!recipe.imageUrl) return;
    triggerHaptic(15);
    setError(null);
    setCropError(null);
    showSourceError(await crop.openUrl(recipe.imageUrl));
  };

  const handleCropSave = async (area: CropRect) => {
    if (!crop.source) return;
    setCropError(null);
    setUploading(true);
    try {
      // Découpe de la zone choisie, compression (max 1200px, WebP/JPEG)
      // puis upload vers Supabase Storage — voir utils/imageUpload.ts. La
      // ligne `recipes` ne stocke qu'une URL, jamais l'image elle-même.
      const imageUrl = await uploadRecipeImage(crop.source.blob, householdId, { crop: area });
      onUpdateRecipe({ ...recipe, imageUrl, imageSource: "photo" });
      crop.close();
      onClose();
    } catch (err) {
      console.error(err);
      setCropError(t("modals.recipeOptions.uploadError"));
      if (showToast) showToast(t("modals.recipeOptions.uploadFailedToast"));
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
      setError(t("modals.recipeOptions.aiError"));
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

  // Portail vers <body> : sans ça, cette modale reste imbriquée dans
  // .app-content — le conteneur qui assure RÉELLEMENT le défilement de la
  // page (voir shell.css, .app-content, forcé en overflow-y: auto par
  // sa propre règle overflow-x: hidden). Un élément "position: fixed"
  // imbriqué dans un ancêtre scrollable AUTRE que <body> est un cas connu
  // de bug WebKit sur Safari iOS : il ne reste pas toujours calé sur le
  // vrai viewport de l'écran, laissant un bandeau (souvent blanc) en bas —
  // signalé sur cette modale précisément. Le portail sort la modale de cet
  // ancêtre scrollable une bonne fois pour toutes, quel que soit le moteur.
  const busy = uploading || crop.preparing;

  return createPortal(
    <>
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page recipe-options-modal modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title">{recipe.title}</h2>
        <Flourish />

        <div className="recipe-options-list">
          {onEdit && (
            <button type="button" className="recipe-option-row" onClick={() => { triggerHaptic(15); onClose(); onEdit(recipe); }}>
              <Pencil size={18} />
              <span>{t("modals.recipeOptions.edit")}</span>
            </button>
          )}

          <button type="button" className="recipe-option-row" onClick={handlePhotoClick} disabled={busy}>
            <Camera size={18} className={busy ? "spin-wand" : ""} />
            <span>{uploading ? t("modals.recipeOptions.uploadingPhoto") : crop.preparing ? t("photoCrop.preparing") : t("modals.recipeOptions.addPhoto")}</span>
          </button>

          {hasOwnPhoto(recipe) && (
            <button type="button" className="recipe-option-row recipe-option-recrop" onClick={handleRecropClick} disabled={busy}>
              <Crop size={18} />
              <span>{t("photoCrop.recrop")}</span>
            </button>
          )}

          <button type="button" className="recipe-option-row" onClick={handleGenerateAI} disabled={generating}>
            <Sparkles size={18} className={generating ? "spin-wand" : ""} />
            <span>{generating ? t("modals.recipeOptions.generating") : t("modals.recipeOptions.generateAI")}</span>
          </button>

          {recipe.imageUrl && (
            <button type="button" className="recipe-option-row" onClick={handleRemoveImage}>
              <ImageOff size={18} />
              <span>{t("modals.recipeOptions.removeImage")}</span>
            </button>
          )}

          <button type="button" className="recipe-option-row danger" onClick={handleDelete}>
            <Trash2 size={18} />
            <span>{t("modals.recipeOptions.delete")}</span>
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
      </motion.div>
    </motion.div>
    {/* Frère (pas enfant) de la feuille : ses gestes ne remontent jamais
        jusqu'au « tirer pour fermer » de cette feuille. */}
    <AnimatePresence>
      {crop.source && (
        <PhotoCropModal
          key={crop.source.url}
          source={crop.source}
          recipe={recipe}
          saving={uploading}
          error={cropError}
          onCancel={() => { setCropError(null); crop.close(); }}
          onSave={handleCropSave}
        />
      )}
    </AnimatePresence>
    </>,
    document.body
  );
}
