/* ------------------------------------------------------------------ */
/*  LIVRE DE CUISINE PDF — constantes de configuration                  */
/*                                                                        */
/*  Volontairement limité aux champs qui existent déjà réellement sur      */
/*  une recette (catégorie Salé/Sucré, temps, ingrédients, étapes,           */
/*  notes, nutri-score) : ni "collections" ni "évaluation" (étoiles) ne       */
/*  font partie du modèle de données actuel, et l'utilisateur a choisi         */
/*  explicitement de laisser ces deux notions de côté pour cette              */
/*  fonctionnalité plutôt que de les ajouter aux recettes.                     */
/* ------------------------------------------------------------------ */

// Mêmes teintes que les chips catégorie / l'habillage "Cadre doré" —
// gardent la couverture cohérente avec le reste de l'identité visuelle
// de l'app plutôt que d'introduire une palette propre au livre.
export const COVER_COLORS = [
  { id: "gold", value: "#b3872a" },
  { id: "bordeaux", value: "#7c3232" },
  { id: "plum", value: "#5a3a63" },
  { id: "forest", value: "#3c5a3a" },
  { id: "ink", value: "#2a2013" },
];
export const DEFAULT_COVER_COLOR = "gold";

export const PAGE_FORMATS = ["A4", "A5"];
export const DEFAULT_PAGE_FORMAT = "A4";

// A4 et A5 partagent le même ratio ISO 216 (1:√2), mais on garde les deux
// jeux de dimensions explicites plutôt que de s'appuyer sur cette égalité :
// plus lisible, et robuste si un format non-ISO (Letter...) s'ajoute un jour.
export const PAGE_DIMENSIONS_MM = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

// mm de marge réelle @page — un intitulé "fin/normal/large" est plus
// lisible dans un contrôle segmenté qu'un champ numérique libre sur
// mobile.
export const PAGE_MARGINS = [
  { id: "fin", mm: 10 },
  { id: "normal", mm: 16 },
  { id: "large", mm: 22 },
];
export const DEFAULT_PAGE_MARGIN = "normal";

// Partagé entre CookbookDocument.jsx (règle CSS @page) et
// utils/cookbookPdf.js (marges réelles du document jsPDF généré) — un
// seul endroit qui sait résoudre un identifiant "fin/normal/large" en mm.
export function marginMm(id) {
  return (PAGE_MARGINS.find((m) => m.id === id) || PAGE_MARGINS[1]).mm;
}

export const PHOTO_SIZES = ["aucune", "moyenne", "grande"];
export const DEFAULT_PHOTO_SIZE = "moyenne";

export const COVER_LAYOUTS = ["classique", "epure"];
export const DEFAULT_COVER_LAYOUT = "classique";

export const DEFAULT_COOKBOOK_CONFIG = {
  // "all" | "category" | "manual"
  selectionMode: "all",
  // "sale" | "sucre" — seulement utilisé quand selectionMode === "category"
  selectionCategory: "sale",
  // ids de recettes — seulement utilisé quand selectionMode === "manual"
  selectedIds: [],

  coverTitle: "Le Grimoire de Morgane",
  coverSubtitle: "Recueil de recettes",
  coverColor: DEFAULT_COVER_COLOR,
  coverLayout: DEFAULT_COVER_LAYOUT,

  photoSize: DEFAULT_PHOTO_SIZE,
  showIngredients: true,
  showSteps: true,
  showNotes: true,
  showNutrition: true,
  showTime: true,

  toc: true,
  pageNumbers: true,
  format: DEFAULT_PAGE_FORMAT,
  margin: DEFAULT_PAGE_MARGIN,
};
