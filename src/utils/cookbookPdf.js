import { marginMm } from "../constants/cookbook";

/* ------------------------------------------------------------------ */
/*  LIVRE DE CUISINE — génération d'un vrai fichier .pdf                 */
/*                                                                          */
/*  Le bouton "Télécharger" téléchargeait jusqu'ici une fiche HTML autonome   */
/*  (voir CookbookBuilderModal.jsx, downloadCookbookFile) — un simple repli    */
/*  hérité du choix "impression navigateur" (pas de librairie PDF), mais         */
/*  qui ne correspondait plus à ce que ce bouton précis promettait : signalé      */
/*  par l'utilisateur ("je clique sur télécharger c'est en html"). Plutôt que      */
/*  réécrire tout le document en langage déclaratif PDF (pdfmake), on rasterise    */
/*  ici CHAQUE page déjà mise en page par CookbookDocument.jsx (html2canvas) et      */
/*  on assemble les images obtenues dans un vrai document jsPDF — le rendu           */
/*  téléchargé correspond alors PIXEL POUR PIXEL à l'aperçu en direct, sans avoir       */
/*  à ré-implémenter sa mise en page une seconde fois dans l'API de jsPDF.               */
/*                                                                                          */
/*  Contrepartie assumée : le texte du PDF produit n'est pas sélectionnable (image           */
/*  rasterisée), comme tout export html2canvas+jsPDF — c'est le compromis normal de           */
/*  cette approche, largement préférable ici à une réimplémentation de mise en page              */
/*  bien plus longue et plus fragile entre l'aperçu et l'export.                                  */
/* ------------------------------------------------------------------ */

// Une "page" logique (.cookbook-page, ex. une recette avec beaucoup
// d'ingrédients) peut être plus haute qu'une page PDF physique : on
// découpe alors son image rasterisée en tranches de la hauteur utile
// d'une page, chacune posée sur sa propre page PDF — jamais une seule
// image débordant silencieusement hors de la page (ce que ferait un
// simple addImage() sans découpe).
async function addElementAsPdfPages(pdf, html2canvas, element, { marginMmValue, isFirstPageOfDoc }) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f6ecd2",
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const usableWidthMm = pageWidthMm - marginMmValue * 2;
  const usableHeightMm = pageHeightMm - marginMmValue * 2;
  const pxPerMm = canvas.width / usableWidthMm;
  const sliceHeightPx = Math.max(1, Math.floor(usableHeightMm * pxPerMm));

  let renderedPx = 0;
  let firstSlice = true;
  while (renderedPx < canvas.height) {
    const sliceHeightPxClamped = Math.min(sliceHeightPx, canvas.height - renderedPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPxClamped;
    sliceCanvas
      .getContext("2d")
      .drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPxClamped, 0, 0, canvas.width, sliceHeightPxClamped);

    if (!(isFirstPageOfDoc && firstSlice)) pdf.addPage();
    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      marginMmValue,
      marginMmValue,
      usableWidthMm,
      sliceHeightPxClamped / pxPerMm
    );

    renderedPx += sliceHeightPxClamped;
    firstSlice = false;
  }
}

// `containerEl` : le noeud DOM contenant directement les .cookbook-page
// déjà rendues par CookbookDocument (voir CookbookBuilderModal.jsx,
// docRef) — DOIT être réellement mis en page (pas display:none) au
// moment de l'appel, html2canvas ne peut pas rasteriser un élément que
// le navigateur n'a jamais mis en page.
export async function generateCookbookPdf(containerEl, config) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);

  // Attend que les polices web (Cinzel, EB Garamond...) soient chargées :
  // html2canvas rasterise le texte tel qu'affiché à l'instant T, une police
  // encore en cours de chargement donnerait un rendu figé sur la police de
  // repli système.
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const pdf = new jsPDF({
    unit: "mm",
    format: config.format === "A5" ? "a5" : "a4",
  });
  const marginMmValue = marginMm(config.margin);

  const pages = Array.from(containerEl.querySelectorAll(".cookbook-page"));
  for (let i = 0; i < pages.length; i += 1) {
    // Séquentiel, jamais Promise.all : html2canvas doit rasteriser une page
    // à la fois (partage un même contexte de rendu interne), et jsPDF.addPage()
    // doit respecter l'ordre des pages du document final.
    await addElementAsPdfPages(pdf, html2canvas, pages[i], { marginMmValue, isFirstPageOfDoc: i === 0 });
  }

  return pdf.output("blob");
}
