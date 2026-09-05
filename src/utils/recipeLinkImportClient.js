/* ------------------------------------------------------------------ */
/*  IMPORT DE RECETTE DEPUIS UN LIEN (Instagram/TikTok) — appel serveur  */
/*  Relaie vers /api/extract-recipe-from-link (voir ce fichier pour le    */
/*  détail des limites : lecture Instagram peu fiable, clé OPENAI_API_KEY */
/*  requise côté Vercel). Contrairement à fetchNutriscoreGrade, il n'y a    */
/*  PAS de repli local possible ici (extraire une recette d'un texte libre  */
/*  demande un vrai LLM) — un échec doit donc remonter clairement à          */
/*  l'utilisateur plutôt que d'être avalé silencieusement.                    */
/* ------------------------------------------------------------------ */

const ENDPOINT = "/api/extract-recipe-from-link";
// Le scraping de la page ET l'appel au LLM se font l'un après l'autre côté
// serveur : plus long qu'un simple aller-retour API, d'où un budget généreux.
const TIMEOUT_MS = 35000;

async function fetchWithTimeout(url, options, ms) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function extractRecipeFromLink(url) {
  let res;
  try {
    res = await fetchWithTimeout(
      ENDPOINT,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) },
      TIMEOUT_MS
    );
  } catch {
    throw new Error("Impossible de contacter le serveur — vérifie ta connexion et réessaie.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur serveur (${res.status})`);
  }
  if (!data || !data.recipe) {
    throw new Error("Réponse invalide du serveur.");
  }
  return data.recipe;
}
