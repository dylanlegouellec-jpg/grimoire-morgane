import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Download, Eye, Printer, X } from "lucide-react";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { triggerHaptic, categoryLabel, slugify, escapeHtml } from "../../utils/helpers";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { useTranslation } from "../../contexts/LanguageContext";
import { COOKBOOK_CSS } from "../../constants/styles/cookbook.css";
import { generateCookbookPdf } from "../../utils/cookbookPdf";
import {
  DEFAULT_COOKBOOK_CONFIG,
  COVER_COLORS,
  COVER_LAYOUTS,
  PAGE_FORMATS,
  PAGE_MARGINS,
  PHOTO_SIZES,
} from "../../constants/cookbook";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import Flourish from "../common/Flourish";
import Switch from "../common/Switch";
import SegmentedControl from "../common/SegmentedControl";
import CookbookDocument from "./CookbookDocument";

// Même détection que ShareRecipeModal.jsx (doExportPDF) — dupliquée plutôt
// qu'extraite en commun : ce petit test tient en une ligne et ShareRecipeModal
// ne l'exporte pas, un partage forcé pour si peu aurait été plus de bruit
// que la duplication elle-même.
function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  const iosStandalone = window.navigator && window.navigator.standalone;
  const mediaStandalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || mediaStandalone);
}

/* ------------------------------------------------------------------ */
/*  LIVRE DE CUISINE PDF — éditeur                                       */
/*                                                                          */
/*  "Imprimer" repose sur la stratégie "impression navigateur" choisie          */
/*  explicitement par l'utilisateur : window.print() + CSS @media print          */
/*  (voir constants/styles/cookbook.css.js), avec le même repli conscient          */
/*  du mode PWA installée que ShareRecipeModal.jsx (doExportPDF) — iOS bloque       */
/*  silencieusement window.print() dans ce contexte.                                 */
/*                                                                                        */
/*  "Télécharger" génère lui un VRAI fichier .pdf (jsPDF + html2canvas, voir              */
/*  utils/cookbookPdf.js) — signalé par l'utilisateur après coup : le bouton               */
/*  téléchargeait initialement une fiche HTML autonome, un simple repli hérité              */
/*  de la même stratégie "sans librairie PDF", qui ne correspondait plus à ce que             */
/*  ce bouton précis promettait. Ce repli HTML reste utilisé en dernier recours                */
/*  si la génération du vrai PDF échoue (voir downloadCookbookFile ci-dessous).                 */
/*                                                                                                  */
/*  Portée volontairement limitée aux champs qui existent déjà sur une                  */
/*  recette (catégorie, temps, ingrédients, étapes, notes, nutri-score) —                */
/*  ni "collections" ni "évaluation" (étoiles), qui n'existent pas dans le                */
/*  modèle de données actuel (choix explicite de l'utilisateur).                          */
/* ------------------------------------------------------------------ */
export default function CookbookBuilderModal({ recipes, onClose, showToast }) {
  const { t, language } = useTranslation();
  const [config, setConfig] = useState(DEFAULT_COOKBOOK_CONFIG);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const docRef = useRef(null);
  const sheetRef = useRef(null);

  useBodyScrollLock(true);

  const panelRef = useRef(null);
  const sheet = useDismissibleSheet(onClose, { scrollRef: panelRef, disabled: showPreview });
  const focusTrapRef = useFocusTrap(onClose);
  const setPanelRef = (node) => {
    panelRef.current = node;
    focusTrapRef.current = node;
  };

  const patch = (fields) => setConfig((c) => ({ ...c, ...fields }));

  const selectedRecipes = useMemo(() => {
    const list = Array.isArray(recipes) ? recipes : [];
    if (config.selectionMode === "category") {
      const wantSucre = config.selectionCategory === "sucre";
      return list.filter((r) => (categoryLabel(r) === "Sucré") === wantSucre);
    }
    if (config.selectionMode === "manual") {
      const idSet = new Set(config.selectedIds);
      return list.filter((r) => idSet.has(r.id));
    }
    return list;
  }, [recipes, config.selectionMode, config.selectionCategory, config.selectedIds]);

  const toggleManualId = (id) => {
    triggerHaptic(10);
    setConfig((c) => ({
      ...c,
      selectedIds: c.selectedIds.includes(id) ? c.selectedIds.filter((x) => x !== id) : [...c.selectedIds, id],
    }));
  };

  const requireSelection = () => {
    if (selectedRecipes.length === 0) {
      showToast(t("cookbook.noRecipesToast"));
      return false;
    }
    return true;
  };

  // Repli commun (PWA sans navigator.share, ou window.print() indisponible) :
  // télécharge un fichier HTML autonome reprenant EXACTEMENT le même
  // balisage que l'aperçu/l'impression (docRef pointe sur le même arbre
  // rendu par CookbookDocument) — pas de gabarit dupliqué à la main comme
  // buildPrintHTML (utils/helpers.js) pour une seule recette.
  const downloadCookbookFile = () => {
    try {
      const inner = docRef.current ? docRef.current.innerHTML : "";
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(config.coverTitle || "Le Grimoire de Morgane")}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cinzel+Decorative:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
  body { margin: 0; padding: 24px 12px 60px; background: #2a2013; }
  ${COOKBOOK_CSS}
</style></head><body>${inner}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(config.coverTitle || "livre-de-cuisine")}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(t("cookbook.downloadedToast"));
    } catch {
      showToast(t("cookbook.downloadErrorToast"));
    }
  };

  const doOpenPreview = () => {
    if (!requireSelection()) return;
    triggerHaptic(15);
    setShowPreview(true);
  };

  const doPrint = async () => {
    if (!requireSelection()) return;
    triggerHaptic(15);
    if (isStandalonePWA()) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: config.coverTitle || "Le Grimoire de Morgane",
            text: t("cookbook.shareText", { count: selectedRecipes.length }),
          });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      downloadCookbookFile();
      return;
    }
    try {
      window.print();
    } catch {
      downloadCookbookFile();
    }
  };

  // Vrai fichier .pdf (jsPDF + html2canvas, voir utils/cookbookPdf.js) : le
  // document déjà mis en page par CookbookDocument (docRef) doit d'abord
  // être réellement affiché hors champ visuel (classe --rendering, voir
  // constants/styles/cookbook.css.js) — html2canvas ne peut rasteriser
  // qu'un élément que le navigateur a vraiment mis en page.
  const doDownload = async () => {
    if (!requireSelection() || generatingPdf) return;
    triggerHaptic(15);
    setGeneratingPdf(true);
    try {
      if (sheetRef.current) sheetRef.current.classList.add("cookbook-print-sheet--rendering");
      const blob = await generateCookbookPdf(docRef.current, config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(config.coverTitle || "livre-de-cuisine")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(t("cookbook.downloadedToast"));
    } catch {
      // Repli : la génération du vrai PDF a échoué (navigateur trop ancien,
      // photo bloquée par CORS...) — la fiche HTML autonome reste toujours
      // téléchargeable, quoi qu'il arrive.
      downloadCookbookFile();
    } finally {
      if (sheetRef.current) sheetRef.current.classList.remove("cookbook-print-sheet--rendering");
      setGeneratingPdf(false);
    }
  };

  return (
    <>
      <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
        <motion.div
          ref={setPanelRef}
          className="modal grimoire-page ios-settings-modal modal-swipeable"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          {...MODAL_SHEET_MOTION}
          {...sheet.panHandlers}
        >
          <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
          <motion.div style={sheet.contentStyle}>
            <h2 className="dropcap-title">{t("cookbook.title")}</h2>
            <Flourish />

            {/* --- Sélection des recettes --- */}
            <p className="ios-group-title">{t("cookbook.selectionTitle")}</p>
            <div className="ios-group ios-group-padded">
              <SegmentedControl
                options={[
                  { value: "all", label: t("cookbook.selectAll") },
                  { value: "category", label: t("cookbook.selectCategory") },
                  { value: "manual", label: t("cookbook.selectManual") },
                ]}
                value={config.selectionMode}
                onChange={(v) => patch({ selectionMode: v })}
                ariaLabel={t("cookbook.selectionTitle")}
              />
            </div>
            {config.selectionMode === "category" && (
              <div className="ios-group ios-group-padded" style={{ marginTop: 8 }}>
                <SegmentedControl
                  options={[
                    { value: "sale", label: t("filters.sale") },
                    { value: "sucre", label: t("filters.sucre") },
                  ]}
                  value={config.selectionCategory}
                  onChange={(v) => patch({ selectionCategory: v })}
                  ariaLabel={t("cookbook.selectCategory")}
                />
              </div>
            )}
            {config.selectionMode === "manual" && (
              <div className="ios-group cookbook-recipe-list" style={{ marginTop: 8 }}>
                {recipes.map((r) => {
                  const checked = config.selectedIds.includes(r.id);
                  return (
                    <button key={r.id} type="button" className="ios-row" onClick={() => toggleManualId(r.id)}>
                      <span className="ios-row-title">{translateRecipeText(r.title, language)}</span>
                      {checked && <Check size={18} className="ios-row-check" />}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="cookbook-selection-count">
              {t("cookbook.selectedCount", { count: selectedRecipes.length, plural: selectedRecipes.length > 1 ? "s" : "" })}
            </p>

            {/* --- Couverture --- */}
            <p className="ios-group-title" style={{ marginTop: 22 }}>{t("cookbook.coverTitle")}</p>
            <div className="ios-group" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="field">
                <span>{t("cookbook.coverTitleLabel")}</span>
                <input
                  type="text"
                  value={config.coverTitle}
                  onChange={(e) => patch({ coverTitle: e.target.value })}
                  placeholder="Le Grimoire de Morgane"
                />
              </label>
              <label className="field">
                <span>{t("cookbook.coverSubtitleLabel")}</span>
                <input
                  type="text"
                  value={config.coverSubtitle}
                  onChange={(e) => patch({ coverSubtitle: e.target.value })}
                  placeholder={t("cookbook.coverSubtitlePlaceholder")}
                />
              </label>
              <div>
                <span className="settings-row-title">{t("cookbook.coverColorLabel")}</span>
                <div className="cookbook-color-row">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cookbook-color-swatch ${config.coverColor === c.id ? "active" : ""}`}
                      style={{ background: c.value }}
                      aria-label={c.id}
                      onClick={() => { triggerHaptic(10); patch({ coverColor: c.id }); }}
                    />
                  ))}
                </div>
              </div>
              <SegmentedControl
                options={COVER_LAYOUTS.map((l) => ({ value: l, label: t(`cookbook.coverLayout.${l}`) }))}
                value={config.coverLayout}
                onChange={(v) => patch({ coverLayout: v })}
                ariaLabel={t("cookbook.coverLayoutLabel")}
              />
            </div>

            {/* --- Mise en page des recettes --- */}
            <p className="ios-group-title" style={{ marginTop: 22 }}>{t("cookbook.layoutTitle")}</p>
            <div className="ios-group ios-group-padded">
              <SegmentedControl
                options={PHOTO_SIZES.map((s) => ({ value: s, label: t(`cookbook.photoSize.${s}`) }))}
                value={config.photoSize}
                onChange={(v) => patch({ photoSize: v })}
                ariaLabel={t("cookbook.photoSizeLabel")}
              />
            </div>
            <div className="ios-group" style={{ marginTop: 8 }}>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.showIngredients")}</span>
                <Switch checked={config.showIngredients} onChange={(v) => patch({ showIngredients: v })} label={t("cookbook.showIngredients")} />
              </div>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.showSteps")}</span>
                <Switch checked={config.showSteps} onChange={(v) => patch({ showSteps: v })} label={t("cookbook.showSteps")} />
              </div>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.showNutrition")}</span>
                <Switch checked={config.showNutrition} onChange={(v) => patch({ showNutrition: v })} label={t("cookbook.showNutrition")} />
              </div>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.showNotes")}</span>
                <Switch checked={config.showNotes} onChange={(v) => patch({ showNotes: v })} label={t("cookbook.showNotes")} />
              </div>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.showTime")}</span>
                <Switch checked={config.showTime} onChange={(v) => patch({ showTime: v })} label={t("cookbook.showTime")} />
              </div>
            </div>

            {/* --- Structure --- */}
            <p className="ios-group-title" style={{ marginTop: 22 }}>{t("cookbook.structureTitle")}</p>
            <div className="ios-group">
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.toc")}</span>
                <Switch checked={config.toc} onChange={(v) => patch({ toc: v })} label={t("cookbook.toc")} />
              </div>
              <div className="settings-row">
                <span className="settings-row-title">{t("cookbook.pageNumbers")}</span>
                <Switch checked={config.pageNumbers} onChange={(v) => patch({ pageNumbers: v })} label={t("cookbook.pageNumbers")} />
              </div>
            </div>
            <div className="ios-group ios-group-padded" style={{ marginTop: 8 }}>
              <SegmentedControl
                options={PAGE_FORMATS.map((f) => ({ value: f, label: f }))}
                value={config.format}
                onChange={(v) => patch({ format: v })}
                ariaLabel={t("cookbook.formatLabel")}
              />
            </div>
            <div className="ios-group ios-group-padded" style={{ marginTop: 8 }}>
              <SegmentedControl
                options={PAGE_MARGINS.map((m) => ({ value: m.id, label: t(`cookbook.margin.${m.id}`) }))}
                value={config.margin}
                onChange={(v) => patch({ margin: v })}
                ariaLabel={t("cookbook.marginLabel")}
              />
            </div>

            {/* --- Export --- */}
            <p className="ios-group-title" style={{ marginTop: 22 }}>{t("cookbook.exportTitle")}</p>
            <div className="cookbook-export-grid">
              <button type="button" className="cookbook-export-tile" onClick={doOpenPreview} disabled={generatingPdf}>
                <Eye size={22} />
                <span>{t("cookbook.livePreview")}</span>
              </button>
              <button type="button" className="cookbook-export-tile" onClick={doPrint} disabled={generatingPdf}>
                <Printer size={22} />
                <span>{t("cookbook.print")}</span>
              </button>
              <button type="button" className="cookbook-export-tile" onClick={doDownload} disabled={generatingPdf}>
                <Download size={22} />
                <span>{generatingPdf ? t("share.generating") : t("cookbook.download")}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Toujours monté (comme .print-sheet dans ShareRecipeModal.jsx) :
          caché à l'écran par défaut, ne devient visible que dans le rendu
          d'impression (@media print) OU en mode aperçu (classe modificateur
          ci-dessous), sans jamais dupliquer le balisage entre les deux. */}
      <div ref={sheetRef} className={`cookbook-print-sheet ${showPreview ? "cookbook-print-sheet--preview" : ""}`} aria-hidden={!showPreview}>
        {showPreview && (
          <button type="button" className="cookbook-preview-close" onClick={() => setShowPreview(false)} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        )}
        <div ref={docRef}>
          <CookbookDocument recipes={selectedRecipes} config={config} />
        </div>
      </div>
    </>
  );
}
