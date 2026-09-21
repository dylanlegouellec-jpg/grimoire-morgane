import { marginMm, pageDimensionsMm } from "../constants/cookbook";

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

// Densité de rasterisation (voir html2canvas ci-dessous) — CSS px * SCALE =
// canvas px. Utilisée aussi pour convertir les points de coupure calculés en
// CSS px (mesure DOM, avant rasterisation) vers des coordonnées canvas.
const SCALE = 2;

// Même teinte que le fond crème/doré de CookbookDocument.jsx (couverture,
// pages de recette) — appliquée aussi au fond PLEINE PAGE du PDF
// (voir PAGE_BACKGROUND_RGB ci-dessous), pas seulement à la zone rasterisée
// par html2canvas : une page jsPDF est blanche par défaut, et l'image posée
// dans la zone utile (à `marginMmValue` du bord) ne recouvre jamais cette
// marge elle-même — signalé par l'utilisateur ("il y a toujours du blanc
// sur le côté"). Remplir toute la page de cette même teinte AVANT d'y poser
// l'image fait disparaître cette bordure blanche, sans coudre de bord
// visible entre marge et contenu (même couleur des deux côtés).
const PAGE_BACKGROUND_HEX = "#f6ecd2";
const PAGE_BACKGROUND_RGB = [0xf6, 0xec, 0xd2];

// Jamais du contenu réel — quelques px d'arrondi (html2canvas capture la
// taille réellement mise en page par le navigateur, arrondie au pixel
// entier) : sans cette tolérance, une page dont le canvas fait ne serait-ce
// que 1-2px de plus que la hauteur d'une page PDF déclenchait une page
// supplémentaire pour ce reliquat quasi invisible — une page sur deux du
// PDF téléchargé apparaissait alors entièrement blanche.
const ROUNDING_TOLERANCE_PX = 4;

// Éléments qu'une coupure de page ne doit jamais traverser en leur milieu :
// une ligne d'ingrédient/étape, un sous-titre de groupe, le titre de
// section ("Ingrédients"/"Préparation"), l'en-tête d'une recette (photo +
// badges) — signalé par l'utilisateur : une recette dont la section
// "Préparation" ne tenait pas entièrement sur une page se voyait coupée net
// au milieu d'une étape plutôt que de basculer proprement sur la suivante.
const ATOMIC_SELECTOR = "li, h3.cookbook-section-title, h2.cookbook-page-title, .cookbook-recipe-badges";

function pageHeightPxFor(elementWidthPx, config) {
  const pageMm = pageDimensionsMm(config);
  const m = marginMm(config.margin);
  const usableWidthMm = pageMm.width - m * 2;
  const usableHeightMm = pageMm.height - m * 2;
  const pxPerMm = elementWidthPx / usableWidthMm;
  return usableHeightMm * pxPerMm;
}

// Calcule les points de coupure (en CSS px, relatifs au sommet de
// `element`) d'une page logique trop haute pour une seule page physique —
// en reculant chaque coupure candidate jusqu'au sommet du premier élément
// "atomique" qu'elle traverserait, plutôt que de couper à une hauteur fixe
// sans égard au contenu. Pure géométrie DOM (getBoundingClientRect),
// AUCUNE rasterisation nécessaire : utilisée aussi bien pour compter les
// pages à l'avance (computeRecipeStartPages, table des matières) que pour
// découper l'image capturée ensuite (addElementAsPdfPages).
export function computeBreakpoints(element, pageHeightPx) {
  const rect = element.getBoundingClientRect();
  const totalHeight = rect.height;

  const atoms = Array.from(element.querySelectorAll(ATOMIC_SELECTOR))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - rect.top, bottom: r.bottom - rect.top };
    })
    // Un élément plus haut qu'une page entière ne peut de toute façon pas
    // être protégé — l'ignorer évite de reculer indéfiniment sur lui.
    .filter((a) => a.bottom - a.top < pageHeightPx)
    .sort((a, b) => a.top - b.top);

  const breakpoints = [0];
  let cursor = 0;
  while (totalHeight - cursor > ROUNDING_TOLERANCE_PX) {
    let candidate = cursor + pageHeightPx;
    if (candidate >= totalHeight - ROUNDING_TOLERANCE_PX) {
      breakpoints.push(totalHeight);
      break;
    }
    const crossed = atoms.find(
      (a) => a.top < candidate && a.bottom > candidate && a.top > cursor + ROUNDING_TOLERANCE_PX
    );
    if (crossed) candidate = crossed.top;
    // Filet de sécurité anti-boucle infinie (ne devrait arriver que si un
    // atome commence pile à `cursor`, cas déjà exclu ci-dessus par marge).
    if (candidate <= cursor) candidate = cursor + pageHeightPx;
    breakpoints.push(candidate);
    cursor = candidate;
  }
  return breakpoints;
}

// Nombre de pages PDF que prendrait cet élément, SANS le rasteriser — sert
// à calculer à l'avance les numéros de page de la table des matières (voir
// computeRecipeStartPages ci-dessous), bien avant que la génération réelle
// ne rastérise quoi que ce soit.
function countPagesFor(element, config) {
  const widthPx = element.getBoundingClientRect().width;
  const pageHeightPx = pageHeightPxFor(widthPx, config);
  return Math.max(1, computeBreakpoints(element, pageHeightPx).length - 1);
}

// Calcule la page de départ de chaque recette dans le document final —
// AVANT toute rasterisation, à partir du DOM déjà mis en page (couverture +
// éventuelle table des matières + une page par recette, dans cet ordre,
// exactement ce que rend CookbookDocument.jsx). `containerEl` doit déjà
// contenir ce DOM réel (peu importe que la table des matières affiche
// encore ou non des numéros : leur ajout ne change pas sa hauteur).
export function computeRecipeStartPages(containerEl, config, recipeCount) {
  const pages = Array.from(containerEl.querySelectorAll(".cookbook-page"));
  const recipePages = recipeCount > 0 ? pages.slice(pages.length - recipeCount) : [];
  const headPages = recipeCount > 0 ? pages.slice(0, pages.length - recipeCount) : pages;

  let page = 1;
  headPages.forEach((p) => { page += countPagesFor(p, config); });

  const starts = [];
  recipePages.forEach((p) => {
    starts.push(page);
    page += countPagesFor(p, config);
  });
  return starts;
}

// Une "page" logique (.cookbook-page, ex. une recette avec beaucoup
// d'ingrédients) peut être plus haute qu'une page PDF physique : on la
// découpe alors selon les points de coupure calculés ci-dessus (jamais au
// milieu d'un <li>/titre), chaque tranche posée sur sa propre page PDF.
async function addElementAsPdfPages(pdf, html2canvas, element, config, { marginMmValue, isFirstPageOfDoc }) {
  const widthPxCss = element.getBoundingClientRect().width;
  const pageHeightPxCss = pageHeightPxFor(widthPxCss, config);
  const breakpointsCss = computeBreakpoints(element, pageHeightPxCss);

  const canvas = await html2canvas(element, {
    scale: SCALE,
    useCORS: true,
    backgroundColor: PAGE_BACKGROUND_HEX,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const usableWidthMm = pageWidthMm - marginMmValue * 2;
  const pxPerMm = canvas.width / usableWidthMm; // inclut déjà SCALE

  let firstSlice = true;
  for (let i = 0; i < breakpointsCss.length - 1; i += 1) {
    const sliceTopPx = Math.round(breakpointsCss[i] * SCALE);
    const sliceBottomPx = Math.min(Math.round(breakpointsCss[i + 1] * SCALE), canvas.height);
    const sliceHeightPx = sliceBottomPx - sliceTopPx;
    if (sliceHeightPx <= 0) continue;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    sliceCanvas
      .getContext("2d")
      .drawImage(canvas, 0, sliceTopPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    if (!(isFirstPageOfDoc && firstSlice)) pdf.addPage();
    pdf.setFillColor(...PAGE_BACKGROUND_RGB);
    pdf.rect(0, 0, pageWidthMm, pageHeightMm, "F");
    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      marginMmValue,
      marginMmValue,
      usableWidthMm,
      sliceHeightPx / pxPerMm
    );

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
    orientation: config.orientation === "paysage" ? "landscape" : "portrait",
  });
  const marginMmValue = marginMm(config.margin);

  const pages = Array.from(containerEl.querySelectorAll(".cookbook-page"));
  for (let i = 0; i < pages.length; i += 1) {
    // Séquentiel, jamais Promise.all : html2canvas doit rasteriser une page
    // à la fois (partage un même contexte de rendu interne), et jsPDF.addPage()
    // doit respecter l'ordre des pages du document final.
    await addElementAsPdfPages(pdf, html2canvas, pages[i], config, { marginMmValue, isFirstPageOfDoc: i === 0 });
  }

  return pdf.output("blob");
}
