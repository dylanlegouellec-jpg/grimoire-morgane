import { useState } from "react";
import { AlignLeft, Copy, Download, FileText, Image as ImageIcon, X } from "lucide-react";
import {
  encodeRecipeCode,
  buildImportLink,
  slugify,
  categoryLabel,
  groupIngredients,
  groupSteps,
  buildPrintHTML,
  triggerHaptic,
} from "../../utils/helpers";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "../../utils/nutriscore";
import { generateRecipeCardPng, shareOrDownloadPng } from "../../utils/recipeCardCanvas";
import { useTranslation } from "../../contexts/LanguageContext";
import Flourish from "./Flourish";
import Seal from "./Seal";
import Switch from "./Switch";

// Construit un texte brut (pour navigator.share, qui n'accepte pas de HTML
// mis en forme) reprenant la structure de la fiche : titre, ingrédients
// groupés par section, étapes numérotées, remarques. `t` est passé en
// paramètre plutôt qu'obtenu via useTranslation() : cette fonction n'est
// pas un composant, elle ne peut pas appeler de hook elle-même.
function buildShareText(t, recipe, servings, ingredients, includeNotes) {
  const lines = [recipe.title, "", t("share.shareTextIngredients")];
  groupIngredients(ingredients).forEach((g) => {
    if (g.title) lines.push(`— ${g.title} —`);
    g.items.forEach((it) => lines.push(`• ${[it.qty, it.unit].filter(Boolean).join(" ")} ${it.name}`.trim()));
  });
  lines.push("", t("share.shareTextPreparation"));
  groupSteps(recipe.steps).forEach((g) => {
    if (g.title) lines.push(`— ${g.title} —`);
    g.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  });
  if (includeNotes && recipe.notes) lines.push("", t("share.shareTextNotes"), recipe.notes);
  lines.push("", t("share.shareTextSignature"));
  return lines.join("\n");
}

// L'app tourne-t-elle en PWA installée (icône sur l'écran d'accueil) ?
// `navigator.standalone` est la propriété historique iOS Safari,
// `display-mode: standalone` est le standard suivi par les autres moteurs.
// C'est important car iOS bloque silencieusement `window.print()` dans ce
// mode — le clic sur "Fiche PDF / Parchemin" ne faisait alors plus rien.
function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  const iosStandalone = window.navigator && window.navigator.standalone;
  const mediaStandalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || mediaStandalone);
}

function currentTheme() {
  if (typeof document === "undefined" || !document.documentElement) return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function ShareRecipeModal({ recipe, servings, ingredients, onClose, shareText, showToast }) {
  const hasPhoto = Boolean(recipe.imageUrl);
  const hasNotes = Boolean(recipe.notes);
  const [includePhoto, setIncludePhoto] = useState(hasPhoto);
  const [includeNutriscore, setIncludeNutriscore] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(hasNotes);
  const [busy, setBusy] = useState(null); // null | "png" | "pdf" | "text"

  const nutriGrade = recipe.nutriscoreGrade || estimateNutriscoreLocal(ingredients, recipe.category);
  const nutriColor = NUTRI_COLORS[nutriGrade] || "#b3872a";
  const { t, dict } = useTranslation();
  const categoryText = dict.labels[categoryLabel(recipe)] || categoryLabel(recipe);

  const doCopyCode = () => {
    const code = encodeRecipeCode(recipe);
    if (!code) { showToast(t("share.codeErrorToast")); return; }
    shareText(buildImportLink(code), t("share.recipeLink"));
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

  // Fiche PDF / Parchemin — le comportement diffère selon le contexte :
  //
  // • Safari classique (onglet navigateur) : window.print() fonctionne
  //   normalement et ouvre l'aperçu d'impression natif (d'où l'utilisateur
  //   peut enregistrer en PDF via l'icône de partage de l'aperçu).
  //
  // • PWA installée (mode Standalone, lancée depuis l'écran d'accueil) :
  //   iOS bloque silencieusement window.print() dans ce contexte — aucune
  //   erreur, mais rien ne se passe, ce qui correspond exactement au bug
  //   observé. On privilégie donc le partage natif (navigator.share),
  //   qui ouvre le menu de partage iOS et permet d'enregistrer dans
  //   Fichiers/Notes ou d'envoyer par Mail/Messages. Si l'API est absente,
  //   ou échoue pour une raison autre qu'une annulation, on retombe sur le
  //   téléchargement direct de la fiche HTML (downloadPrintableFile), qui
  //   fonctionne toujours, quel que soit le contexte.
  const doExportPDF = async () => {
    triggerHaptic(15);
    if (isStandalonePWA()) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: recipe.title,
            text: buildShareText(t, recipe, servings, ingredients, includeNotes),
          });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return; // partage annulé par l'utilisateur : rien à faire
          // toute autre erreur : on bascule sur le téléchargement ci-dessous
        }
      }
      downloadPrintableFile();
      return;
    }

    // Safari classique.
    try {
      window.print();
    } catch {
      // Filet de sécurité au cas où l'impression échouerait pour une
      // raison inattendue : la fiche reste récupérable quand même.
      downloadPrintableFile();
    }
  };

  const doExportPng = async () => {
    if (busy) return;
    triggerHaptic(15);
    setBusy("png");
    try {
      const { blob, photoIncluded } = await generateRecipeCardPng(recipe, servings, ingredients, {
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
      const result = await shareOrDownloadPng(blob, `${slugify(recipe.title)}.png`, recipe.title);
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
      const text = buildShareText(t, recipe, servings, ingredients, includeNotes);
      if (navigator.share) {
        try {
          await navigator.share({ title: recipe.title, text });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
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
      <div
        className="modal-backdrop"
        onClick={(e) => {
          // Empêche le clic de remonter jusqu'au modal-backdrop de RecipeDetail
          // (cette modale est imbriquée dedans) : sans ça, un clic sur ce fond
          // fermait la fiche recette entière au lieu de fermer juste ce menu.
          e.stopPropagation();
          onClose();
        }}
      >
        <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
          <h2 className="dropcap-title">{t("share.title", { title: recipe.title })}</h2>
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

          <h4 style={{ marginTop: 22 }}>{t("share.cookbook")}</h4>
          <div className="cookbook-export-grid">
            <button type="button" className="cookbook-export-tile" onClick={doExportPng} disabled={busy !== null}>
              <ImageIcon size={22} />
              <span>{busy === "png" ? t("share.generating") : t("share.imageCard")}</span>
            </button>
            <button type="button" className="cookbook-export-tile" onClick={doExportPDF} disabled={busy !== null}>
              <FileText size={22} />
              <span>{t("share.pdfSheet")}</span>
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
        </div>
      </div>

      {/* Fiche imprimable — invisible à l'écran (.print-sheet { display: none })
          n'apparaît que dans le rendu d'impression déclenché par window.print(). */}
      <div className="print-sheet" aria-hidden="true">
        <div className="print-page">
          {includePhoto && hasPhoto && (
            <div className="print-photo-wrap">
              <img className="print-photo" src={recipe.imageUrl} alt="" crossOrigin="anonymous" />
            </div>
          )}
          <div className="print-badges">
            <span className={`print-chip ${categoryLabel(recipe) === "Sucré" ? "chip-sucre" : "chip-sale"}`}>
              {categoryText}
            </span>
            {includeNutriscore && (
              <span className="print-nutri-circle" style={{ background: nutriColor }}>{nutriGrade}</span>
            )}
          </div>
          <h1>{recipe.title}</h1>
          <p className="print-type">{t("share.printSignature")}</p>
          <div className="print-meta">
            <span>⏱ {recipe.time} {t("share.minutesShort")}</span>
            <span>👥 {servings} {t("share.servingsShort")}</span>
            {recipe.carbs ? <span>{Math.round(recipe.carbs * servings)} {t("share.carbsTotalSuffix")}</span> : null}
          </div>
          <div className="print-flourish">❦</div>

          <div className="print-columns">
            <div>
              <h2>{t("share.printIngredients")}</h2>
              {groupIngredients(ingredients).map((g, i) => (
                <div key={i}>
                  {g.title && <h3 className="print-sub">{g.title}</h3>}
                  <ul>
                    {g.items.map((it, j) => (
                      <li key={j}>{[it.qty, it.unit].filter(Boolean).join(" ")} — {it.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <h2>{t("share.printPreparation")}</h2>
              {groupSteps(recipe.steps).map((g, i) => (
                <div key={i}>
                  {g.title && <h3 className="print-sub">{g.title}</h3>}
                  <ol>
                    {g.steps.map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {includeNotes && recipe.notes && (
            <>
              <h2>{t("share.printNotesTitle")}</h2>
              <p className="print-notes">{recipe.notes}</p>
            </>
          )}
          <div className="print-footer">{t("share.printFooter")}</div>
        </div>
      </div>
    </>
  );
}
