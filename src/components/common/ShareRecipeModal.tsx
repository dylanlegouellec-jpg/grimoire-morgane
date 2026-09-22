import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AlignLeft, Copy, Download, FileText, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import {
  encodeRecipeCode,
  buildImportLink,
  buildRecipeShareLink,
  slugify,
  groupIngredients,
  groupSteps,
  buildPrintHTML,
  triggerHaptic,
  shareOrDownloadBlob,
} from "../../utils/helpers";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { generateRecipeCardPng } from "../../utils/recipeCardCanvas";
import { generateCookbookPdf } from "../../utils/cookbookPdf";
import { RecipePage } from "../cookbook/CookbookDocument";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import useFocusTrap from "../../hooks/useFocusTrap";
import Flourish from "./Flourish";
import Seal from "./Seal";
import Switch from "./Switch";
import type { Recipe } from "../../hooks/useRecipes";
import type { NormalizedIngredient } from "../../utils/ingredients";
import type { NutriscoreGrade } from "../../utils/nutriscoreClient";

interface ShareRecipeModalProps {
  recipe: Recipe;
  servings: number;
  ingredients: NormalizedIngredient[];
  onClose: () => void;
  shareText: (text: string, label: string) => void;
  showToast: (msg: string) => void;
}

type BusyState = "png" | "pdf" | "text" | null;

// Construit un texte brut (pour navigator.share, qui n'accepte pas de HTML
// mis en forme) reprenant la structure de la fiche : titre, ingrédients
// groupés par section, étapes numérotées, remarques. `t` et `language` sont
// passés en paramètres plutôt qu'obtenus via useTranslation() : cette
// fonction n'est pas un composant, elle ne peut pas appeler de hook
// elle-même. Le contenu de la recette passe par translateRecipeText comme
// partout ailleurs (RecipeDetail.jsx, CookMode.jsx...) — resté oublié ici
// jusqu'ici, un partage en anglais renvoyait donc le texte tel quel en
// français.
function buildShareText(
  t: (key: string, vars?: Record<string, unknown>) => string,
  language: string,
  recipe: Recipe,
  servings: number,
  ingredients: NormalizedIngredient[],
  includeNotes: boolean
): string {
  const lines = [translateRecipeText(recipe.title, language), "", t("share.shareTextIngredients")];
  groupIngredients(ingredients).forEach((g) => {
    if (g.title) lines.push(`— ${translateRecipeText(g.title, language)} —`);
    g.items.forEach((it) => lines.push(`• ${[it.qty, it.unit ? translateRecipeText(it.unit, language) : ""].filter(Boolean).join(" ")} ${translateRecipeText(it.name, language)}`.trim()));
  });
  lines.push("", t("share.shareTextPreparation"));
  groupSteps(recipe.steps).forEach((g) => {
    if (g.title) lines.push(`— ${translateRecipeText(g.title, language)} —`);
    g.steps.forEach((s, i) => lines.push(`${i + 1}. ${translateRecipeText(s, language)}`));
  });
  if (includeNotes && recipe.notes) lines.push("", t("share.shareTextNotes"), translateRecipeText(recipe.notes, language));
  lines.push("", t("share.shareTextSignature"));
  return lines.join("\n");
}

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined" || !document.documentElement) return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// Volontairement SANS le geste "tirer pour fermer" (voir modal-swipeable
// sur les autres modales) : cette modale est imbriquée DANS RecipeDetail
// (voir son propre geste de tirage bespoke, handleTouchStart/Move/End),
// qui ne sait pas ignorer un tirage qui commence ici plutôt que sur la
// fiche recette elle-même — l'ajouter ici risquerait de faire réagir les
// DEUX gestes à la fois sur le même mouvement de doigt. Fermeture via le
// bouton "X" ou un tap sur le fond, comme avant.
export default function ShareRecipeModal({ recipe, servings, ingredients, onClose, shareText, showToast }: ShareRecipeModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const pdfSheetRef = useRef<HTMLDivElement>(null);
  const hasPhoto = Boolean(recipe.imageUrl);
  const hasNotes = Boolean(recipe.notes);
  const [includePhoto, setIncludePhoto] = useState(hasPhoto);
  const [includeNutriscore, setIncludeNutriscore] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(hasNotes);
  const [busy, setBusy] = useState<BusyState>(null);

  const nutriGrade = recipe.nutriscoreGrade || estimateNutriscoreLocal(ingredients, recipe.category ?? undefined);
  const nutriColor = NUTRI_COLORS[nutriGrade as NutriscoreGrade] || "#b3872a";
  const { t, language } = useTranslation();
  // Portions/ingrédients tels qu'affichés à l'instant (déjà ajustés par le
  // curseur de portions de RecipeDetail) — même recette que celle utilisée
  // par doExportPng/doCopyPublicLink, pour un rendu cohérent entre tous
  // les boutons de cette modale.
  const pdfRecipe = { ...recipe, servings, ingredients };

  const doCopyCode = () => {
    const code = encodeRecipeCode(recipe);
    if (!code) { showToast(t("share.codeErrorToast")); return; }
    shareText(buildImportLink(code), t("share.recipeLink"));
  };

  // Lien PUBLIC (voir PublicRecipeView.jsx) — à ne pas confondre avec
  // doCopyCode ci-dessus : celui-là ouvre l'app normale et propose
  // d'AJOUTER la recette au grimoire de qui clique (transfert entre
  // comptes) ; celui-ci reste ouvrable par n'importe qui, sans compte ni
  // accès au reste du Grimoire — juste la recette, telle qu'affichée à
  // l'instant (portions ajustées, options d'export cochées ci-dessus).
  const doCopyPublicLink = () => {
    const shareRecipe = {
      title: recipe.title,
      category: recipe.category,
      time: recipe.time,
      servings,
      ingredients,
      steps: recipe.steps,
      imageUrl: includePhoto && hasPhoto ? recipe.imageUrl : undefined,
      notes: includeNotes && hasNotes ? recipe.notes : undefined,
      nutriscoreGrade: includeNutriscore ? nutriGrade : undefined,
    };
    const link = buildRecipeShareLink(shareRecipe);
    if (!link) { showToast(t("share.codeErrorToast")); return; }
    shareText(link, t("share.publicLinkLabel"));
  };

  const doDownloadFile = () => {
    try {
      const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(recipe.title)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(t("share.recipeDownloadedToast"));
    } catch {
      showToast(t("share.downloadImpossibleToast"));
    }
  };

  // Repli commun (PWA sans navigator.share, ou navigator.share indisponible/
  // en échec) : on télécharge une fiche HTML autonome — même mise en page
  // "parchemin" que l'impression, mais utilisable même là où window.print()
  // et navigator.share sont tous les deux hors-jeu.
  const downloadPrintableFile = () => {
    try {
      const html = buildPrintHTML(recipe, servings, ingredients, { includePhoto, includeNutriscore, includeNotes, nutriGrade, nutriColor });
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(recipe.title)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(t("share.sheetDownloadedToast"));
    } catch {
      showToast(t("share.downloadImpossibleToast"));
    }
  };

  // Fiche PDF — signalé par l'utilisateur : ce bouton ne produisait pas un
  // vrai PDF (window.print() dans un onglet Safari classique, ou un simple
  // PARTAGE DE TEXTE en PWA installée, iOS y bloquant silencieusement
  // window.print()). Repose maintenant sur le même pipeline html2canvas +
  // jsPDF que le livre de cuisine (utils/cookbookPdf.js) : `generateCookbookPdf`
  // n'a besoin que d'un conteneur avec un ou plusieurs `.cookbook-page` —
  // ici un seul, la même page recette déjà utilisée dans le livre (voir
  // RecipePage, réexportée par CookbookDocument.jsx) — et produit un
  // véritable blob PDF, identique quel que soit le contexte (plus aucun
  // besoin de distinguer Safari/PWA standalone).
  const doExportPDF = async () => {
    if (busy) return;
    triggerHaptic(15);
    setBusy("pdf");
    try {
      const pdfConfig = {
        format: "A4" as const,
        margin: "normal" as const,
        orientation: "portrait" as const,
        showTime: true,
        showIngredients: true,
        showSteps: true,
        showNutrition: includeNutriscore,
        showNotes: includeNotes,
        photoSize: includePhoto && hasPhoto ? "grande" : "aucune",
      };
      if (!pdfSheetRef.current) return;
      const blob = await generateCookbookPdf(pdfSheetRef.current, pdfConfig);
      const result = await shareOrDownloadBlob(blob, `${slugify(recipe.title)}.pdf`, translateRecipeText(recipe.title, language), "application/pdf");
      if (result === "downloaded") showToast(t("share.sheetDownloadedToast"));
      else if (!result) downloadPrintableFile();
    } catch (err) {
      console.error(err);
      // Filet de sécurité : la fiche reste récupérable même si la
      // génération du vrai PDF échoue pour une raison inattendue (image
      // protégée, police non chargée...).
      downloadPrintableFile();
    } finally {
      setBusy(null);
    }
  };

  const doExportPng = async () => {
    if (busy) return;
    triggerHaptic(15);
    setBusy("png");
    try {
      const { blob, photoIncluded } = await generateRecipeCardPng({ ...recipe, nutriscoreGrade: recipe.nutriscoreGrade as NutriscoreGrade | null | undefined }, servings, ingredients, {
        includePhoto,
        includeNutriscore,
        includeNotes,
        theme: currentTheme(),
      });
      if (!blob) {
        showToast(t("share.imageErrorToast"));
        return;
      }
      if (includePhoto && hasPhoto && !photoIncluded) {
        showToast(t("share.photoExcludedToast"));
      }
      const result = await shareOrDownloadBlob(blob, `${slugify(recipe.title)}.png`, translateRecipeText(recipe.title, language), "image/png");
      if (result === "downloaded") showToast(t("share.cardDownloadedToast"));
      else if (!result) showToast(t("share.imageErrorToast"));
    } catch {
      showToast(t("share.imageErrorToast"));
    } finally {
      setBusy(null);
    }
  };

  const doExportText = async () => {
    triggerHaptic(15);
    setBusy("text");
    try {
      const text = buildShareText(t, language, recipe, servings, ingredients, includeNotes);
      if (navigator.share) {
        try {
          await navigator.share({ title: translateRecipeText(recipe.title, language), text });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          // toute autre erreur : on bascule sur la copie presse-papiers ci-dessous
        }
      }
      shareText(text, t("share.plainTextLabel"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <motion.div
        className="modal-backdrop"
        onClick={(e) => {
          // Empêche le clic de remonter jusqu'au modal-backdrop de RecipeDetail
          // (cette modale est imbriquée dedans) : sans ça, un clic sur ce fond
          // fermait la fiche recette entière au lieu de fermer juste ce menu.
          e.stopPropagation();
          onClose();
        }}
        {...MODAL_BACKDROP_MOTION}
      >
        <motion.div
          className="modal grimoire-page"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          {...MODAL_SHEET_MOTION}
        >
          <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          <h2 className="dropcap-title">{t("share.title", { title: translateRecipeText(recipe.title, language) })}</h2>
          <Flourish />

          <h4>{t("share.exportOptions")}</h4>
          <div className="ios-group">
            {hasPhoto && (
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">{t("share.recipePhoto")}</span>
                </div>
                <Switch checked={includePhoto} onChange={setIncludePhoto} label={t("share.includePhoto")} />
              </div>
            )}
            <div className="settings-row">
              <div className="settings-row-label">
                <span className="settings-row-title">{t("share.nutriscore")}</span>
              </div>
              <Switch checked={includeNutriscore} onChange={setIncludeNutriscore} label={t("share.includeNutriscore")} />
            </div>
            {hasNotes && (
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">{t("share.notesTips")}</span>
                </div>
                <Switch checked={includeNotes} onChange={setIncludeNotes} label={t("share.includeNotes")} />
              </div>
            )}
          </div>

          <h4 style={{ marginTop: 22 }}>{t("share.publicLinkTitle")}</h4>
          <p className="hint" style={{ fontStyle: "normal" }}>{t("share.publicLinkHint")}</p>
          <div className="share-option-row">
            <Seal tone="gold" onClick={doCopyPublicLink}><LinkIcon size={16} /> {t("share.copyPublicLink")}</Seal>
          </div>

          <h4 style={{ marginTop: 22 }}>{t("share.cookbook")}</h4>
          <div className="cookbook-export-grid">
            <button type="button" className="cookbook-export-tile" onClick={doExportPng} disabled={busy !== null}>
              <ImageIcon size={22} />
              <span>{busy === "png" ? t("share.generating") : t("share.imageCard")}</span>
            </button>
            <button type="button" className="cookbook-export-tile" onClick={doExportPDF} disabled={busy !== null}>
              <FileText size={22} />
              <span>{busy === "pdf" ? t("share.generating") : t("share.pdfSheet")}</span>
            </button>
            <button type="button" className="cookbook-export-tile" onClick={doExportText} disabled={busy !== null}>
              <AlignLeft size={22} />
              <span>{t("share.plainText")}</span>
            </button>
          </div>

          <h4 style={{ marginTop: 22 }}>{t("share.transferGrimoire")}</h4>
          <div className="share-option-row">
            <Seal tone="gold" onClick={doCopyCode}><Copy size={16} /> {t("share.copyCode")}</Seal>
            <Seal tone="gold" onClick={doDownloadFile}><Download size={16} /> {t("share.downloadFile")}</Seal>
          </div>
        </motion.div>
      </motion.div>

      {/* Rendu hors-écran de la page recette, pour la rasterisation html2canvas
          de "Fiche PDF" (voir doExportPDF) — jamais visible : positionné hors
          du viewport plutôt qu'en display:none (html2canvas ne peut rasteriser
          qu'un élément réellement mis en page par le navigateur), même
          technique que CookbookBuilderModal.jsx (--rendering). 800px de large
          pour rester dans le mode 2 colonnes de .cookbook-recipe-columns (voir
          la @container query, cookbook.css.js) quelle que soit la largeur
          réelle de l'écran visiteur. */}
      <div style={{ position: "fixed", left: -9999, top: 0, width: 800 }} aria-hidden="true">
        <div ref={pdfSheetRef}>
          <RecipePage
            recipe={pdfRecipe}
            config={{
              showTime: true,
              showIngredients: true,
              showSteps: true,
              showNutrition: includeNutriscore,
              showNotes: includeNotes,
              photoSize: includePhoto && hasPhoto ? "grande" : "aucune",
            }}
            t={t}
            language={language}
            pageNumber={null}
            isLast
            runningTitle="Le Grimoire de Morgane"
          />
        </div>
      </div>
    </>
  );
}
