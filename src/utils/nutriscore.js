import { normalize } from "./helpers";

/* ------------------------------------------------------------------ */
/*  NUTRI-SCORE — HEURISTIQUE LOCALE (client)                          */
/*                                                                      */
/*  Ce module ne fait plus AUCUN appel réseau. L'estimation "en ligne"  */
/*  précise (interrogation d'Open Food Facts, agrégation par barème     */
/*  officiel) est désormais calculée UNE SEULE FOIS, côté serveur, au   */
/*  moment où une recette est créée ou modifiée — voir api/nutriscore.js */
/*  et src/utils/nutriscoreClient.js — puis stockée dans la colonne     */
/*  `nutriscore_grade` de la recette.                                   */
/*                                                                      */
/*  Ancien anti-pattern corrigé ici : la grille de recettes appelait     */
/*  Open Food Facts pour CHAQUE ingrédient de CHAQUE carte affichée,     */
/*  à chaque rendu — inondant la console d'erreurs CORS/429 et gaspillant */
/*  du réseau pour un résultat qui, de toute façon, ne change jamais     */
/*  entre deux affichages de la même recette.                           */
/*                                                                      */
/*  Ce qui reste ici — l'heuristique locale, synchrone, sans réseau —    */
/*  sert de repli : recette créée hors-ligne, recette de démo, ou toute  */
/*  recette existante qui n'a pas encore de nutriscore_grade stocké.    */
/* ------------------------------------------------------------------ */

// Poids moyen (g) d'une unité "pièce" selon l'ingrédient, pour convertir
// les quantités sans unité de masse en grammes approximatifs.
const PIECE_WEIGHTS = [
  { test: /poulet(?!.*(cuisse|blanc|escalope|filet))/i, grams: 1200 },
  { test: /p[aâ]te (bris[ée]e|feuillet[ée]e|sabl[ée]e)/i, grams: 230 },
  { test: /oeuf|œuf/i, grams: 50 },
  { test: /oignon/i, grams: 100 },
  { test: /échalote|echalote/i, grams: 25 },
  { test: /tomate/i, grams: 120 },
  { test: /citron vert|lime/i, grams: 60 },
  { test: /citron/i, grams: 100 },
  { test: /pomme de terre|patate/i, grams: 150 },
  { test: /pomme(?!\s*de\s*terre)/i, grams: 150 },
  { test: /carotte/i, grams: 80 },
  { test: /courgette/i, grams: 200 },
  { test: /poivron/i, grams: 150 },
  { test: /banane/i, grams: 120 },
  { test: /poireau/i, grams: 150 },
  { test: /avocat/i, grams: 170 },
];
const DEFAULT_PIECE_GRAMS = 60;

function estimatePieceWeight(name) {
  const found = PIECE_WEIGHTS.find((p) => p.test.test(name));
  return found ? found.grams : DEFAULT_PIECE_GRAMS;
}

// Convertit une quantité + unité (souvent imprécises ou absentes, comme
// dans une fiche saisie à la main) en grammes approximatifs, pour pouvoir
// pondérer chaque ingrédient par son poids réel dans la recette plutôt
// que de le compter comme une simple occurrence.
function estimateGrams(ing) {
  const qty = Number(ing.qty) || 0;
  if (qty <= 0) return 0;
  const u = normalize(ing.unit || "");
  if (!u) return qty * estimatePieceWeight(ing.name);
  if (/^kgs?$/.test(u)) return qty * 1000;
  if (/^g$|^grammes?$/.test(u)) return qty;
  if (/^l$|^litres?$/.test(u)) return qty * 1000;
  if (/^cls?$/.test(u)) return qty * 10;
  if (/^mls?$/.test(u)) return qty;
  if (/pince/.test(u)) return qty * 1;
  if (/soupe/.test(u)) return qty * 15;
  if (/cafe/.test(u)) return qty * 5;
  if (/botte/.test(u)) return qty * 30;
  if (/gousse/.test(u)) return qty * 5;
  // Toute autre unité (pièce, tranche, ...) : on se rabat sur le poids
  // moyen estimé de l'ingrédient lui-même.
  return qty * estimatePieceWeight(ing.name);
}

// Chaque catégorie porte un impact (positif = favorable, négatif =
// défavorable) par tranche de 10% du poids total de la recette qu'elle
// représente. Testées dans l'ordre : la première correspondance gagne,
// des motifs les plus spécifiques vers les plus génériques, pour éviter
// qu'un même ingrédient ne soit compté deux fois.
const NUTRI_CATEGORIES = [
  { test: /lardon|bacon|chorizo|saucisse|jambon|charcuterie|merguez|andouille/i, impact: -8, label: "charcuterie" },
  { test: /chocolat noir/i, impact: -1, label: "sucre modéré" },
  { test: /sucre|miel|confiture|sirop|caramel|chocolat|pâte à tartiner|nutella/i, impact: -4, label: "sucre ajouté" },
  { test: /huile d'olive|huile de colza|huile de noix/i, impact: -0.5, label: "graisse insaturée" },
  { test: /beurre|crème|creme|mayonnaise|friture|saindoux|huile de palme/i, impact: -5, label: "graisse saturée" },
  { test: /huile/i, impact: -2, label: "graisse" },
  { test: /fromage(?!\s*blanc)|comté|comte|gruyère|gruyere|parmesan|emmental/i, impact: -2.5, label: "fromage" },
  { test: /porc|boeuf|bœuf|agneau|veau/i, impact: -1.5, label: "viande grasse" },
  { test: /lentille|haricot|pois chiche|pois cass[ée]|l[ée]gumineuse|quinoa|avoine|son de/i, impact: 5, label: "fibre/légumineuse" },
  { test: /complet|int[ée]grale?/i, impact: 3, label: "céréale complète" },
  { test: /l[ée]gume|carotte|courgette|tomate|[ée]pinard|poireau|brocoli|salade|aubergine|poivron|champignon|oignon|échalote|echalote|ail\b|navet|betterave|c[ée]leri|endive|chou|radis|artichaut/i, impact: 4, label: "légume" },
  { test: /fruit|pomme|banane|orange|citron|fraise|framboise|poire|pêche|peche|abricot|myrtille|mangue|avocat/i, impact: 3.5, label: "fruit" },
  { test: /poulet|dinde|poisson|saumon|cabillaud|thon|tofu|oeuf|œuf/i, impact: 1, label: "protéine maigre" },
  { test: /lait(?!\s*de\s*coco)|yaourt/i, impact: 1, label: "laitage" },
  { test: /farine|p[aâ]te(?!.*complète)|pain(?!.*complet)|riz(?!.*complet)/i, impact: -0.5, label: "féculent raffiné" },
  { test: /\bsel\b/i, impact: -0.5, label: "sel" },
];

// Ingrédients qui, dans une recette sucrée, garantissent une note riche —
// filet de sécurité final : jamais de A/B pour un dessert au beurre/sucre/
// crème, quelle que soit la source (en ligne ou locale) du calcul.
const RICH_DESSERT_MARKERS = /beurre|crème|creme|sucre|miel|chocolat|caramel|mascarpone|confiture|p[aâ]te à tartiner|nutella|lait concentré|sirop|cr[eè]me fra[iî]che/i;

function isDessertCategory(category) {
  return normalize(category || "").startsWith("sucr");
}

function localImpactFor(ing) {
  const match = NUTRI_CATEGORIES.find((c) => c.test.test(ing.name));
  return match ? { impact: match.impact, label: match.label } : null;
}

function scoreToGradeLocal(score) {
  if (score >= 10) return "A";
  if (score >= 3) return "B";
  if (score >= -4) return "C";
  if (score >= -12) return "D";
  return "E";
}

function computeLocalGrade(items, grams) {
  const totalGrams = grams.reduce((a, b) => a + b, 0);
  let score = 0;
  const positiveKinds = new Set();

  items.forEach((ing, i) => {
    const info = localImpactFor(ing);
    if (!info) return;

    let fraction;
    if (totalGrams > 0 && grams[i] > 0) {
      fraction = grams[i] / totalGrams;
    } else {
      fraction = 1 / (i + 2);
    }
    const capped = Math.min(fraction, 0.3);
    score += info.impact * capped * 10;
    if (info.impact > 0) positiveKinds.add(info.label);
  });

  score += positiveKinds.size * 1.5;
  return scoreToGradeLocal(score);
}

function applyDessertSafetyNet(grade, items, category) {
  if (!isDessertCategory(category)) return grade;
  if (grade !== "A" && grade !== "B") return grade;
  const hasRichMarker = items.some((ing) => RICH_DESSERT_MARKERS.test(ing.name));
  return hasRichMarker ? "C" : grade;
}

/* ------------------------------------------------------------------ */
/*  API PUBLIQUE (client)                                               */
/* ------------------------------------------------------------------ */

// Estimation 100% locale, synchrone, immédiate, sans réseau. Utilisée
// comme repli par nutriscoreClient.js quand l'API serveur est injoignable
// (création hors-ligne, timeout), et comme valeur par défaut pour toute
// recette qui n'a pas encore de nutriscore_grade stocké en base (recettes
// de démo, recettes créées avant l'introduction de cette colonne).
export function estimateNutriscoreLocal(ingredients = [], category) {
  try {
    const items = (ingredients || []).filter((ing) => ing && !ing.isSection && ing.name);
    if (!items.length) return "C";
    const grams = items.map(estimateGrams);
    const grade = computeLocalGrade(items, grams);
    return applyDessertSafetyNet(grade, items, category);
  } catch {
    return "C";
  }
}

/* ------------------------------------------------------------------ */
/*  COULEURS NUTRI-SCORE                                               */
/* ------------------------------------------------------------------ */

export const NUTRI_COLORS = { A: "#2E7D32", B: "#8BA33F", C: "#C9A227", D: "#D4771C", E: "#B33A2E" };
