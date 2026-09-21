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

// Les 5 premières reprennent les teintes des chips catégorie / de
// l'habillage "Cadre doré" — le reste étend cette même palette chaude et
// patinée (jamais une couleur vive/saturée qui jurerait avec le fond
// parchemin) pour un vrai choix, comme dans les captures de référence de
// l'utilisateur, sans pour autant sortir de l'identité visuelle de l'app.
export const COVER_COLORS = [
  { id: "gold", value: "#b3872a" },
  { id: "bordeaux", value: "#7c3232" },
  { id: "plum", value: "#5a3a63" },
  { id: "forest", value: "#3c5a3a" },
  { id: "ink", value: "#2a2013" },
  { id: "wine", value: "#6b2737" },
  { id: "terracotta", value: "#a8562e" },
  { id: "mustard", value: "#c99a2e" },
  { id: "olive", value: "#6b7a3a" },
  { id: "teal", value: "#2f6b63" },
  { id: "sage", value: "#7a9070" },
  { id: "slate", value: "#45586b" },
  { id: "indigo", value: "#3a4a7c" },
  { id: "rose", value: "#b5657a" },
  { id: "mauve", value: "#8a6b8a" },
  { id: "charcoal", value: "#3a3a3a" },
  { id: "cream", value: "#c9b384" },
  { id: "rust", value: "#8f3a1f" },
  { id: "copper", value: "#b06a3a" },
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

// Dimensions RÉELLES d'une page (mm), format ET orientation déjà combinés —
// un seul endroit qui sait inverser largeur/hauteur en paysage, partagé
// entre CookbookDocument.jsx (aspect-ratio CSS, règle @page) et
// utils/cookbookPdf.js (calcul de la hauteur de page en px, orientation
// jsPDF).
export function pageDimensionsMm(config) {
  const base = PAGE_DIMENSIONS_MM[config.format] || PAGE_DIMENSIONS_MM.A4;
  return config.orientation === "paysage"
    ? { width: base.height, height: base.width }
    : base;
}

export const PHOTO_SIZES = ["aucune", "moyenne", "grande"];
export const DEFAULT_PHOTO_SIZE = "moyenne";

export const COVER_LAYOUTS = ["classique", "epure"];
export const DEFAULT_COVER_LAYOUT = "classique";

export const PAGE_ORIENTATIONS = ["portrait", "paysage"];
export const DEFAULT_PAGE_ORIENTATION = "portrait";

// "chapitresEtRecettes" : table des matières groupée par catégorie (Salé/
// Sucré), chaque recette listée sous son chapitre — le comportement
// d'origine, désormais groupé plutôt qu'à plat.
// "chapitresSeuls" : uniquement les deux chapitres, avec la page où
// commence chacun (pas le détail recette par recette).
// "aucune" : pas de table des matières du tout.
export const TOC_MODES = ["chapitresEtRecettes", "chapitresSeuls", "aucune"];
export const DEFAULT_TOC_MODE = "chapitresEtRecettes";

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

  tocMode: DEFAULT_TOC_MODE,
  pageNumbers: true,
  format: DEFAULT_PAGE_FORMAT,
  orientation: DEFAULT_PAGE_ORIENTATION,
  margin: DEFAULT_PAGE_MARGIN,
};
