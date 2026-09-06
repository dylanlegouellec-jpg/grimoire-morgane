/* ------------------------------------------------------------------ */
/*  RÉCUPÉRATION DE LÉGENDE DEPUIS UN LIEN (Instagram/TikTok)            */
/*  Relaie vers /api/extract-recipe-from-link (voir ce fichier pour le    */
/*  détail : lecture Instagram peu fiable, aucune IA — sur demande          */
/*  explicite, pas de clé OpenAI payante). Renvoie la légende BRUTE, à       */
/*  recopier soi-même dans une recette (voir RecipeLinkImportModal.jsx).      */
/* ------------------------------------------------------------------ */

const ENDPOINT = "/api/extract-recipe-from-link";
const TIMEOUT_MS = 12000;

async function fetchWithTimeout(url, options, ms) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchCaptionFromLink(url) {
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
  if (!data || !data.caption) {
    throw new Error("Réponse invalide du serveur.");
  }
  return data;
}
