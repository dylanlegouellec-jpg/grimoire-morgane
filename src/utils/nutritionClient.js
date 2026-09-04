/* ------------------------------------------------------------------ */
/*  ESTIMATION NUTRITIONNELLE — APPEL SERVEUR (bouton "Estimer la        */
/*  nutrition" dans RecipeForm)                                          */
/*                                                                        */
/*  Même flux que utils/nutriscoreClient.js : relaie la requête vers      */
/*  /api/nutrition-estimate (fonction serverless Vercel, voir              */
/*  api/nutrition-estimate.js), qui interroge Open Food Facts côté         */
/*  serveur — jamais de CORS côté client. Contrairement au Nutri-Score,    */
/*  il n'existe pas de repli local pertinent pour des macros précises      */
/*  (calories/protéines/glucides/lipides) : en cas d'échec, on ne pré-     */
/*  remplit rien plutôt que d'inventer des chiffres. L'utilisateur garde   */
/*  de toute façon la main pour saisir/corriger chaque champ librement.    */
/* ------------------------------------------------------------------ */

const ENDPOINT = import.meta.env.VITE_NUTRITION_ENDPOINT || "/api/nutrition-estimate";
const TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options, ms) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Retourne { calories, protein, carbs, fat } (arrondis, par portion), ou
// `null` si l'estimation est indisponible (hors-ligne, timeout, pas assez
// d'ingrédients reconnus par Open Food Facts) — ne lève jamais d'exception.
export async function estimateNutritionOnline(ingredients, servings) {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
    const res = await fetchWithTimeout(
      ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, servings }),
      },
      TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`nutrition-estimate API ${res.status}`);
    const data = await res.json();
    if (!data || data.error || typeof data.calories !== "number") return null;
    return { calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat };
  } catch (err) {
    console.error("Estimation nutritionnelle en ligne indisponible :", err);
    return null;
  }
}
