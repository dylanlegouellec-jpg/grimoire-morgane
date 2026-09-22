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
export interface CoverColor {
  id: string;
  value: string;
}

export const COVER_COLORS: CoverColor[] = [
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

export type PageFormat = "A4" | "A5";
export const PAGE_FORMATS: PageFormat[] = ["A4", "A5"];
export const DEFAULT_PAGE_FORMAT: PageFormat = "A4";

interface PageDimensionsMm {
  width: number;
  height: number;
}

// A4 et A5 partagent le même ratio ISO 216 (1:√2), mais on garde les deux
// jeux de dimensions explicites plutôt que de s'appuyer sur cette égalité :
// plus lisible, et robuste si un format non-ISO (Letter...) s'ajoute un jour.
export const PAGE_DIMENSIONS_MM: Record<PageFormat, PageDimensionsMm> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

export type PageMarginId = "fin" | "normal" | "large";

interface PageMargin {
  id: PageMarginId;
  mm: number;
}

// mm de marge réelle @page — un intitulé "fin/normal/large" est plus
// lisible dans un contrôle segmenté qu'un champ numérique libre sur
// mobile.
export const PAGE_MARGINS: PageMargin[] = [
  { id: "fin", mm: 10 },
  { id: "normal", mm: 16 },
  { id: "large", mm: 22 },
];
export const DEFAULT_PAGE_MARGIN: PageMarginId = "normal";

// Partagé entre CookbookDocument.jsx (règle CSS @page) et
// utils/cookbookPdf.ts (marges réelles du document jsPDF généré) — un
// seul endroit qui sait résoudre un identifiant "fin/normal/large" en mm.
export function marginMm(id: PageMarginId): number {
  return (PAGE_MARGINS.find((m) => m.id === id) || PAGE_MARGINS[1]).mm;
}

export type PageOrientation = "portrait" | "paysage";
export const PAGE_ORIENTATIONS: PageOrientation[] = ["portrait", "paysage"];
export const DEFAULT_PAGE_ORIENTATION: PageOrientation = "portrait";

// Dimensions RÉELLES d'une page (mm), format ET orientation déjà combinés —
// un seul endroit qui sait inverser largeur/hauteur en paysage, partagé
// entre CookbookDocument.jsx (aspect-ratio CSS, règle @page) et
// utils/cookbookPdf.ts (calcul de la hauteur de page en px, orientation
// jsPDF).
export function pageDimensionsMm(config: { format: PageFormat; orientation: PageOrientation }): PageDimensionsMm {
  const base = PAGE_DIMENSIONS_MM[config.format] || PAGE_DIMENSIONS_MM.A4;
  return config.orientation === "paysage"
    ? { width: base.height, height: base.width }
    : base;
}

export type PhotoSize = "aucune" | "moyenne" | "grande";
export const PHOTO_SIZES: PhotoSize[] = ["aucune", "moyenne", "grande"];
export const DEFAULT_PHOTO_SIZE: PhotoSize = "moyenne";

export type CoverLayout = "classique" | "epure";
export const COVER_LAYOUTS: CoverLayout[] = ["classique", "epure"];
export const DEFAULT_COVER_LAYOUT: CoverLayout = "classique";

// "chapitresEtRecettes" : table des matières groupée par catégorie (Salé/
// Sucré), chaque recette listée sous son chapitre — le comportement
// d'origine, désormais groupé plutôt qu'à plat.
// "chapitresSeuls" : uniquement les deux chapitres, avec la page où
// commence chacun (pas le détail recette par recette).
// "aucune" : pas de table des matières du tout.
export type TocMode = "chapitresEtRecettes" | "chapitresSeuls" | "aucune";
export const TOC_MODES: TocMode[] = ["chapitresEtRecettes", "chapitresSeuls", "aucune"];
export const DEFAULT_TOC_MODE: TocMode = "chapitresEtRecettes";

export interface CookbookBuilderConfig {
  selectionMode: "all" | "category" | "manual";
  // seulement utilisé quand selectionMode === "category"
  selectionCategory: "sale" | "sucre";
  // ids de recettes — seulement utilisé quand selectionMode === "manual"
  selectedIds: string[];

  coverTitle: string;
  coverSubtitle: string;
  coverColor: string;
  coverLayout: CoverLayout;

  photoSize: PhotoSize;
  showIngredients: boolean;
  showSteps: boolean;
  showNotes: boolean;
  showNutrition: boolean;
  showTime: boolean;

  tocMode: TocMode;
  pageNumbers: boolean;
  format: PageFormat;
  orientation: PageOrientation;
  margin: PageMarginId;
}

export const DEFAULT_COOKBOOK_CONFIG: CookbookBuilderConfig = {
  selectionMode: "all",
  selectionCategory: "sale",
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
