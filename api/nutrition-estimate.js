/* ------------------------------------------------------------------ */
/*  POST /api/nutrition-estimate                                        */
/*  Body : { ingredients: [{name, qty, unit} | {isSection, title}],     */
/*           servings: number }                                        */
/*  Réponse : { calories, protein, carbs, fat } — arrondis, PAR PORTION */
/*                                                                        */
/*  Même principe que api/nutriscore.js (jamais interrogé depuis le       */
/*  navigateur — CORS/429 garantis sinon) : on somme le profil            */
/*  nutritionnel de chaque ingrédient (pondéré par son poids estimé en     */
/*  grammes), puis on divise le total par le nombre de portions. Fichier   */
/*  volontairement autonome (mêmes helpers OFF que nutriscore.js,          */
/*  dupliqués plutôt qu'importés) — chaque fonction Vercel est empaquetée  */
/*  indépendamment, pas de dépendance croisée entre fichiers api/*.js.     */
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
    .replace(/\p{Diacritic}/gu, "")
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

// Contrairement à nutriscore.js (qui n'a besoin que de sucres/graisses
// saturées/énergie/sodium pour le barème officiel), on récupère ici les 4
// macros affichées dans le formulaire : calories, protéines, glucides,
// lipides — tous "pour 100g" côté Open Food Facts.
function extractProfile(nutriments) {
  if (!nutriments) return null;
  const energy = Number(nutriments["energy-kcal_100g"]);
  const protein = Number(nutriments["proteins_100g"]);
  const carbs = Number(nutriments["carbohydrates_100g"]);
  const fat = Number(nutriments["fat_100g"]);
  if (![energy, protein, carbs, fat].every((v) => Number.isFinite(v) && v >= 0)) return null;
  return { energy, protein, carbs, fat };
}

/* ------------------------------------------------------------------ */
/*  TABLE D'URGENCE — basiques de cuisine/pâtisserie                    */
/*                                                                        */
/*  Open Food Facts est une base collaborative mondiale : sa recherche    */
/*  texte renvoie souvent, pour un mot aussi générique que "farine" ou     */
/*  "sucre", des produits de marque sans rapport plutôt que la valeur      */
/*  générique attendue — le match échoue alors pour des ingrédients pourtant */
/*  triviaux. Cette table (valeurs pour 100g, sources nutritionnelles       */
/*  usuelles) est vérifiée EN PREMIER, avant tout appel réseau : rapide,    */
/*  gratuite, et fiable pour les basiques les plus courants d'une recette   */
/*  française. Triée du plus long au plus court pour qu'une entrée précise  */
/*  ("sucre glace") ne soit jamais masquée par une plus générique           */
/*  ("sucre") testée avant elle.                                            */
/* ------------------------------------------------------------------ */
const LOCAL_NUTRITION_TABLE = [
  ["sucre glace", { energy: 389, protein: 0, carbs: 100, fat: 0 }],
  ["sucre roux", { energy: 380, protein: 0, carbs: 98, fat: 0 }],
  ["sucre vanille", { energy: 387, protein: 0, carbs: 100, fat: 0 }],
  ["sucre", { energy: 387, protein: 0, carbs: 100, fat: 0 }],
  ["farine", { energy: 364, protein: 10, carbs: 76, fat: 1 }],
  ["oeuf", { energy: 155, protein: 13, carbs: 1, fat: 11 }],
  ["beurre", { energy: 717, protein: 1, carbs: 0, fat: 81 }],
  ["nutella", { energy: 539, protein: 6, carbs: 57, fat: 30 }],
  ["pate a tartiner", { energy: 539, protein: 6, carbs: 57, fat: 30 }],
  ["lait concentre", { energy: 135, protein: 3.2, carbs: 10, fat: 8.6 }],
  ["lait", { energy: 42, protein: 3.4, carbs: 5, fat: 1 }],
  ["creme fraiche", { energy: 292, protein: 2.2, carbs: 3, fat: 30 }],
  ["creme liquide", { energy: 292, protein: 2.2, carbs: 3, fat: 30 }],
  ["creme fleurette", { energy: 292, protein: 2.2, carbs: 3, fat: 30 }],
  ["levure chimique", { energy: 53, protein: 0, carbs: 38, fat: 0 }],
  ["levure boulangere", { energy: 105, protein: 8, carbs: 33, fat: 2 }],
  ["levure", { energy: 105, protein: 8, carbs: 33, fat: 2 }],
  ["chocolat noir", { energy: 546, protein: 5, carbs: 46, fat: 31 }],
  ["chocolat au lait", { energy: 535, protein: 7, carbs: 59, fat: 30 }],
  ["chocolat blanc", { energy: 539, protein: 6, carbs: 59, fat: 30 }],
  ["chocolat", { energy: 546, protein: 5, carbs: 46, fat: 31 }],
  ["miel", { energy: 304, protein: 0.3, carbs: 82, fat: 0 }],
  ["vanille", { energy: 288, protein: 0.1, carbs: 13, fat: 0.1 }],
  ["sel", { energy: 0, protein: 0, carbs: 0, fat: 0 }],
  ["poivre", { energy: 251, protein: 10, carbs: 64, fat: 3.3 }],
  ["huile d'olive", { energy: 884, protein: 0, carbs: 0, fat: 100 }],
  ["huile", { energy: 884, protein: 0, carbs: 0, fat: 100 }],
  ["fromage rape", { energy: 393, protein: 26, carbs: 1, fat: 32 }],
  ["creme patissiere", { energy: 165, protein: 4, carbs: 22, fat: 6 }],
  ["pate feuilletee", { energy: 378, protein: 6, carbs: 34, fat: 24 }],
  ["pate brisee", { energy: 449, protein: 6, carbs: 44, fat: 27 }],
  ["riz", { energy: 130, protein: 2.7, carbs: 28, fat: 0.3 }],
  ["pates", { energy: 158, protein: 5.8, carbs: 31, fat: 0.9 }],
  ["pomme de terre", { energy: 77, protein: 2, carbs: 17, fat: 0.1 }],
];
// Fold "œ" -> "oe" pour cette table spécifiquement (indépendant du
// normalize() partagé plus bas, utilisé pour d'autres correspondances où
// ce repli n'est pas forcément souhaitable) : "œuf" et "oeuf" doivent
// tous deux atteindre l'entrée "oeuf" ci-dessus.
function normalizeForLocalTable(name) {
  return normalize(name).replace(/œ/g, "oe").replace(/æ/g, "ae");
}
function escapeRegExpLocal(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Correspondance par mot/expression entière (avec un simple "s" de
// pluriel toléré) plutôt que par sous-chaîne brute : "farine" doit
// matcher "farine" et "farines", mais jamais, par exemple, un ingrédient
// qui contiendrait la chaîne par hasard au milieu d'un autre mot.
function lookupLocalNutrition(rawName) {
  const key = normalizeForLocalTable(rawName);
  if (!key) return null;
  for (const [entryKey, profile] of LOCAL_NUTRITION_TABLE) {
    const re = new RegExp(`(?:^|\\s)${escapeRegExpLocal(entryKey)}s?(?:$|\\s)`, "u");
    if (re.test(` ${key} `)) return profile;
  }
  return null;
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
/*  POIDS ESTIMÉ (g) — même heuristique que nutriscore.js/nutriscore.js  */
/*  côté client, pour convertir qté + unité en grammes approximatifs.    */
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

const ONLINE_COVERAGE_THRESHOLD = 0.3;

// Retourne les totaux PAR PORTION, ou `null` si trop peu d'ingrédients ont
// pu être identifiés en ligne pour donner un résultat crédible (mieux vaut
// ne rien pré-remplir que d'afficher un chiffre fantaisiste).
async function estimateNutrition(ingredients, servings) {
  const items = (ingredients || []).filter((ing) => ing && !ing.isSection && ing.name);
  if (!items.length) return null;

  const grams = items.map(estimateGrams);
  const totalGrams = grams.reduce((a, b) => a + b, 0);
  // La table locale est vérifiée D'ABORD (instantanée, gratuite, fiable
  // pour les basiques) — Open Food Facts n'est interrogé que pour les
  // ingrédients qu'elle ne connaît pas.
  const profiles = await Promise.all(
    items.map((ing) => {
      const local = lookupLocalNutrition(ing.name);
      if (local) return local;
      return lookupIngredientOnline(ing.name);
    })
  );

  let coveredGrams = 0;
  let energy = 0, protein = 0, carbs = 0, fat = 0;

  items.forEach((ing, i) => {
    const profile = profiles[i];
    const w = grams[i];
    if (!profile || w <= 0) return;
    coveredGrams += w;
    energy += (profile.energy / 100) * w;
    protein += (profile.protein / 100) * w;
    carbs += (profile.carbs / 100) * w;
    fat += (profile.fat / 100) * w;
  });

  const coverage = totalGrams > 0 ? coveredGrams / totalGrams : 0;
  if (coverage < ONLINE_COVERAGE_THRESHOLD) return null;

  const portions = Math.max(1, Number(servings) || 1);
  return {
    calories: Math.round(energy / portions),
    protein: Math.round((protein / portions) * 10) / 10,
    carbs: Math.round((carbs / portions) * 10) / 10,
    fat: Math.round((fat / portions) * 10) / 10,
  };
}

/* ------------------------------------------------------------------ */
/*  HANDLER                                                             */
/* ------------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { ingredients, servings } = req.body || {};
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ error: "`ingredients` doit être un tableau" });
  }
  if (ingredients.length > 100) {
    return res.status(400).json({ error: "Trop d'ingrédients" });
  }

  try {
    const result = await estimateNutrition(ingredients, servings);
    if (!result) {
      return res.status(200).json({ error: "Pas assez d'ingrédients reconnus pour estimer la nutrition." });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Erreur d'estimation nutritionnelle :", error);
    return res.status(500).json({ error: "Estimation nutritionnelle impossible pour le moment." });
  }
}
