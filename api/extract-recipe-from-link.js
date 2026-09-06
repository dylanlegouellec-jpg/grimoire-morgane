/* ------------------------------------------------------------------ */
/*  POST /api/extract-recipe-from-link                                  */
/*  Body : { url }                                                       */
/*  Réponse : { caption, sourceImage }                                    */
/*                                                                          */
/*  Récupère juste la légende publique d'un post Instagram/TikTok — AUCUNE  */
/*  IA ici (pas de clé OpenAI à payer, sur demande explicite) : la légende    */
/*  brute est renvoyée telle quelle, à l'utilisateur de la recopier dans       */
/*  une recette (voir RecipeLinkImportModal.jsx, bouton "Créer une nouvelle     */
/*  recette" pré-rempli avec le texte copié dans le presse-papiers).             */
/*                                                                                  */
/*  - TikTok : via son API oEmbed publique et gratuite (voir                        */
/*    fetchCaptionViaTikTokOEmbed) — testée manuellement (curl) le 2026-09-06         */
/*    sur un post public : JSON propre, légende complète, aucun blocage.               */
/*  - Instagram : via les balises Open Graph de la page HTML (voir                      */
/*    fetchCaptionViaScraping), faute de mieux — Instagram n'a plus d'oEmbed              */
/*    public utilisable sans jeton d'app Meta depuis plusieurs années, et                  */
/*    bloque agressivement les requêtes non authentifiées/sans JS. Un échec                 */
/*    y est fréquent et attendu (testé le même jour : mur de connexion, aucune                */
/*    balise og:description), pas un bug — l'utilisateur est alors invité à                    */
/*    coller la légende à la main via l'import texte déjà existant (voir                        */
/*    TextTemplateImportModal.jsx).                                                              */
/* ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 8000;

const ALLOWED_HOSTS = [/(^|\.)instagram\.com$/i, /(^|\.)tiktok\.com$/i, /(^|\.)vm\.tiktok\.com$/i];

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return "";
}

async function fetchCaptionViaTikTokOEmbed(url) {
  const res = await fetchWithTimeout(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    {},
    FETCH_TIMEOUT_MS
  );
  if (!res.ok) throw new Error(`oEmbed TikTok inaccessible (${res.status})`);
  const data = await res.json();
  if (!data || !data.title) throw new Error("oEmbed TikTok : légende introuvable");
  return { description: data.title, title: "", image: data.thumbnail_url || "" };
}

async function fetchCaptionViaScraping(url) {
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        // User-Agent "mobile Safari" : un UA générique de script reçoit
        // souvent une page vide ou un mur de connexion sur ces plateformes.
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    },
    FETCH_TIMEOUT_MS
  );
  if (!res.ok) throw new Error(`Page inaccessible (${res.status})`);
  const html = await res.text();
  return {
    description: extractMeta(html, "og:description"),
    title: extractMeta(html, "og:title"),
    image: extractMeta(html, "og:image"),
  };
}

function isTikTokUrl(raw) {
  try {
    return /(^|\.)tiktok\.com$/i.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

async function fetchCaption(url) {
  return isTikTokUrl(url) ? fetchCaptionViaTikTokOEmbed(url) : fetchCaptionViaScraping(url);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== "string" || !isAllowedUrl(url)) {
    return res.status(400).json({ error: "Lien Instagram ou TikTok invalide." });
  }

  try {
    const meta = await fetchCaption(url);
    const caption = [meta.title, meta.description].filter(Boolean).join("\n\n").trim();
    if (!caption) throw new Error("Aucune légende trouvée dans la page.");
    return res.status(200).json({ caption, sourceImage: meta.image || null });
  } catch (err) {
    console.error("Récupération du post impossible :", err);
    return res.status(422).json({
      error:
        "Impossible de lire ce post automatiquement (compte privé, contenu chargé en JavaScript, ou blocage de la plateforme — fréquent sur Instagram). Colle plutôt la légende à la main via \"Importer ma fiche texte\" dans Sauvegarde & Importation.",
    });
  }
}
