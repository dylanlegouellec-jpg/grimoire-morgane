/* ------------------------------------------------------------------ */
/*  POST /api/nutriscore                                                */
/*  Body : { ingredients: [{name, qty, unit} | {isSection, title}],     */
/*           category: "Salé" | "Sucré" }                               */
/*  Réponse : { grade: "A".."E" }                                       */
/*                                                                        */
/*  Calcule le Nutri-Score réel d'une recette en interrogeant Open Food  */
/*  Facts UNE FOIS, côté serveur (jamais depuis le navigateur — c'est     */
/*  précisément ce qui évite les erreurs CORS que la grille de recettes   */
/*  générait auparavant en tapant l'API directement depuis chaque carte). */
/*  N'est appelé qu'à la création/édition d'une recette (voir             */
/*  src/utils/nutriscoreClient.js) — jamais à l'affichage.                */
/*                                                                        */
/*  Cache + disjoncteur en mémoire (best-effort, vidé à chaque cold        */
/*  start de la fonction — Vercel réutilise l'instance tant qu'elle est   */
/*  "chaude", ce qui suffit à absorber les recherches répétées du même     */
/*  ingrédient dans une même session de rédaction).                       */
/* ------------------------------------------------------------------ */

const OFF_SEARCH_URL = process.env.OFF_PROXY_URL || "https://world.openfoodfacts.org/cgi/search.pl";
const FETCH_TIMEOUT_MS = 2500;
const STOPWORDS = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "et", "au", "aux", "en", "à"]);

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 2 * 60 * 1000;
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const memoryCache = new Map(); // nom normalisé -> profil nutritionnel | null

function isCircuitOpen() {
  return Date.now() < circuitOpenUntil;
}
function recordFetchSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}
function recordFetchFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function significantTokens(name) {
  return normalize(name)
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}
function isRelevantMatch(ingredientName, productName) {
  const tokens = significantTokens(ingredientName);
  if (!tokens.length) return false;
  const prodNorm = normalize(productName || "");
  if (!prodNorm) return false;
  return tokens.some((t) => prodNorm.includes(t));
}

function extractProfile(nutriments) {
  if (!nutriments) return null;
  const sugars = Number(nutriments["sugars_100g"]);
  const satFat = Number(nutriments["saturated-fat_100g"]);
  const energy = Number(nutriments["energy-kcal_100g"]);
  let sodiumMg = Number(nutriments["sodium_100g"]);
  if (!Number.isFinite(sodiumMg)) {
    const salt = Number(nutriments["salt_100g"]);
    sodiumMg = Number.isFinite(salt) ? (salt * 1000) / 2.5 : NaN;
  } else {
    sodiumMg *= 1000;
  }
  if (![sugars, satFat, energy, sodiumMg].every((v) => Number.isFinite(v) && v >= 0)) return null;

  const fiber = Number(nutriments["fiber_100g"]);
  const protein = Number(nutriments["proteins_100g"]);
  return {
    sugars,
    satFat,
    energy,
    sodiumMg,
    fiber: Number.isFinite(fiber) && fiber >= 0 ? fiber : 0,
    protein: Number.isFinite(protein) && protein >= 0 ? protein : 0,
  };
}

async function lookupIngredientOnline(name) {
  const key = normalize(name);
  if (!key) return null;
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (isCircuitOpen()) return null;

  let res;
  try {
    const params = new URLSearchParams({
      search_terms: name,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "8",
      fields: "product_name,nutriments",
    });
    res = await fetchWithTimeout(`${OFF_SEARCH_URL}?${params.toString()}`, FETCH_TIMEOUT_MS);
  } catch {
    recordFetchFailure();
    return null;
  }

  try {
    if (!res || !res.ok) throw new Error(`réponse HTTP invalide (${res ? res.status : "?"})`);
    const data = await res.json();
    const products = Array.isArray(data && data.products) ? data.products : [];

    let profile = null;
    for (const product of products) {
      if (!isRelevantMatch(name, product.product_name)) continue;
      const candidate = extractProfile(product.nutriments);
      if (candidate) {
        profile = candidate;
        break;
      }
    }
    recordFetchSuccess();
    memoryCache.set(key, profile);
    return profile;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  BARÈME OFFICIEL + HEURISTIQUE LOCALE (repli)                       */
/* ------------------------------------------------------------------ */
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
  return qty * estimatePieceWeight(ing.name);
}

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
const FRUIT_VEG_LABELS = new Set(["légume", "fruit", "fibre/légumineuse"]);
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
    const fraction = totalGrams > 0 && grams[i] > 0 ? grams[i] / totalGrams : 1 / (i + 2);
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
function estimateNutriscoreLocal(ingredients, category) {
  const items = (ingredients || []).filter((ing) => ing && !ing.isSection && ing.name);
  if (!items.length) return "C";
  const grams = items.map(estimateGrams);
  const grade = computeLocalGrade(items, grams);
  return applyDessertSafetyNet(grade, items, category);
}

function pointsFromThresholds(value, thresholds) {
  let pts = 0;
  for (const t of thresholds) {
    if (value > t) pts += 1;
    else break;
  }
  return pts;
}
const ENERGY_KCAL_THRESHOLDS = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800];
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SATFAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SODIUM_MG_THRESHOLDS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
const FIBER_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7];
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0];
function fruitVegPoints(pct) {
  if (pct >= 80) return 5;
  if (pct >= 60) return 2;
  if (pct >= 40) return 1;
  return 0;
}
function scoreToGradeOfficial(score) {
  if (score <= -1) return "A";
  if (score <= 2) return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}
function gradeFromProfile(profile, fruitVegPct) {
  const energyPts = pointsFromThresholds(profile.energy, ENERGY_KCAL_THRESHOLDS);
  const sugarsPts = pointsFromThresholds(profile.sugars, SUGARS_THRESHOLDS);
  const satFatPts = pointsFromThresholds(profile.satFat, SATFAT_THRESHOLDS);
  const sodiumPts = pointsFromThresholds(profile.sodiumMg, SODIUM_MG_THRESHOLDS);
  const negativePoints = energyPts + sugarsPts + satFatPts + sodiumPts;
  const fiberPts = pointsFromThresholds(profile.fiber, FIBER_THRESHOLDS);
  const proteinPts = pointsFromThresholds(profile.protein, PROTEIN_THRESHOLDS);
  const fvPts = negativePoints >= 11 ? 0 : fruitVegPoints(fruitVegPct);
  const positivePoints = fiberPts + proteinPts + fvPts;
  return scoreToGradeOfficial(negativePoints - positivePoints);
}

const ONLINE_COVERAGE_THRESHOLD = 0.4;

async function estimateNutriscore(ingredients, category) {
  const items = (ingredients || []).filter((ing) => ing && !ing.isSection && ing.name);
  if (!items.length) return "C";

  const grams = items.map(estimateGrams);
  const totalGrams = grams.reduce((a, b) => a + b, 0);
  const profiles = await Promise.all(items.map((ing) => lookupIngredientOnline(ing.name)));

  let coveredGrams = 0;
  let sugars = 0, satFat = 0, energy = 0, sodiumMg = 0, fiber = 0, protein = 0;
  let fruitVegGrams = 0;

  items.forEach((ing, i) => {
    const profile = profiles[i];
    const w = grams[i];
    if (!profile || w <= 0) return;
    coveredGrams += w;
    sugars += (profile.sugars / 100) * w;
    satFat += (profile.satFat / 100) * w;
    energy += (profile.energy / 100) * w;
    sodiumMg += (profile.sodiumMg / 100) * w;
    fiber += (profile.fiber / 100) * w;
    protein += (profile.protein / 100) * w;
    const localTag = localImpactFor(ing);
    if (localTag && FRUIT_VEG_LABELS.has(localTag.label)) fruitVegGrams += w;
  });

  const coverage = totalGrams > 0 ? coveredGrams / totalGrams : 0;
  if (coverage < ONLINE_COVERAGE_THRESHOLD) {
    return estimateNutriscoreLocal(ingredients, category);
  }

  const profile100g = {
    sugars: (sugars / coveredGrams) * 100,
    satFat: (satFat / coveredGrams) * 100,
    energy: (energy / coveredGrams) * 100,
    sodiumMg: (sodiumMg / coveredGrams) * 100,
    fiber: (fiber / coveredGrams) * 100,
    protein: (protein / coveredGrams) * 100,
  };
  const fruitVegPct = totalGrams > 0 ? (fruitVegGrams / totalGrams) * 100 : 0;
  const grade = gradeFromProfile(profile100g, fruitVegPct);
  return applyDessertSafetyNet(grade, items, category);
}

/* ------------------------------------------------------------------ */
/*  HANDLER                                                             */
/* ------------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { ingredients, category } = req.body || {};
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ error: "`ingredients` doit être un tableau" });
  }
  // Garde-fou basique contre un abus de l'endpoint (payload démesuré).
  if (ingredients.length > 100) {
    return res.status(400).json({ error: "Trop d'ingrédients" });
  }

  try {
    const grade = await estimateNutriscore(ingredients, category);
    return res.status(200).json({ grade });
  } catch (error) {
    console.error("Erreur de calcul Nutri-Score :", error);
    // Ne jamais renvoyer d'erreur bloquante : un repli local existe déjà
    // côté client (nutriscoreClient.js) si cet endpoint échoue, mais on
    // tente quand même de renvoyer une heuristique plutôt qu'un 500 sec.
    try {
      return res.status(200).json({ grade: estimateNutriscoreLocal(ingredients, category) });
    } catch {
      return res.status(500).json({ error: "Calcul Nutri-Score impossible" });
    }
  }
}
