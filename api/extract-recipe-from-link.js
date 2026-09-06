/* ------------------------------------------------------------------ */
/*  POST /api/extract-recipe-from-link                                  */
/*  Body : { url }                                                       */
/*  Réponse : { recipe: { title, category, time, servings, ingredients,   */
/*              steps, notes }, sourceImage, sourceCaption }               */
/*                                                                          */
/*  Deux étapes, chacune capable d'échouer indépendamment :                 */
/*  1) Récupérer la légende publique du post :                               */
/*     - TikTok : via son API oEmbed publique et gratuite (voir                */
/*       fetchCaptionViaTikTokOEmbed) — fiable, aucun blocage rencontré.         */
/*     - Instagram : via les balises Open Graph de la page HTML (voir            */
/*       fetchCaptionViaScraping), faute de mieux — Instagram n'a plus            */
/*       d'oEmbed public utilisable sans jeton d'app Meta, et bloque              */
/*       agressivement les requêtes non authentifiées/sans JS depuis               */
/*       plusieurs années. Un échec y est fréquent et attendu, pas un bug.          */
/*     Dans les deux cas, en cas d'échec, l'utilisateur est invité à coller           */
/*     la légende à la main via l'import texte déjà existant (voir                    */
/*     TextTemplateImportModal.jsx).                                                   */
/*  2) Faire lire cette légende par un modèle de langage (OpenAI) pour            */
/*     en extraire une recette structurée. Nécessite la variable                    */
/*     d'environnement OPENAI_API_KEY (Vercel > Settings > Environment               */
/*     Variables) — jamais exposée au navigateur, utilisée uniquement ici.            */
/* ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 8000;
const OPENAI_TIMEOUT_MS = 25000;
const OPENAI_MODEL = "gpt-4o-mini";

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

// TikTok expose une vraie API publique gratuite et sans clé pour ça —
// testée manuellement (curl) le 2026-09-06 sur un post public : renvoie du
// JSON propre avec la légende complète (`title`, hashtags inclus) et une
// vignette, sans aucun blocage. Bien plus fiable qu'un scraping de balises
// Open Graph, qu'on garde uniquement pour Instagram (qui n'a plus d'oEmbed
// public utilisable sans jeton d'app Meta depuis plusieurs années — testé
// le même jour : la page d'un post renvoie un simple mur de connexion,
// sans aucune balise og:description, quel que soit le User-Agent envoyé).
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

const SYSTEM_PROMPT = `Tu extrais une recette de cuisine à partir de la légende d'un post Instagram ou TikTok (qui peut être dans n'importe quelle langue — traduis toujours le résultat en français).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "title": string,
  "category": "Salé" ou "Sucré",
  "time": nombre (durée totale en minutes, prépa + cuisson ; estime raisonnablement si non précisé),
  "servings": nombre (nombre de parts, 4 par défaut si non précisé),
  "ingredients": [{ "qty": nombre, "unit": string (ex: "g", "ml", "pièce", ou "" si sans unité), "name": string }],
  "steps": [string, ...],
  "notes": string ou null
}

Si le texte ne décrit pas une vraie recette de cuisine (légende sans rapport, publicité, etc.), réponds avec exactement { "error": "no_recipe_found" }.`;

async function extractRecipeWithAI(caption) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante côté serveur (Vercel > Environment Variables).");

  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: caption },
        ],
      }),
    },
    OPENAI_TIMEOUT_MS
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status} : ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error("Réponse OpenAI vide");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Réponse OpenAI illisible (JSON invalide)");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== "string" || !isAllowedUrl(url)) {
    return res.status(400).json({ error: "Lien Instagram ou TikTok invalide." });
  }

  let caption;
  let sourceImage = null;
  try {
    const meta = await fetchCaption(url);
    caption = [meta.title, meta.description].filter(Boolean).join("\n\n").trim();
    sourceImage = meta.image || null;
    if (!caption) throw new Error("Aucune légende trouvée dans la page.");
  } catch (err) {
    console.error("Récupération du post impossible :", err);
    return res.status(422).json({
      error:
        "Impossible de lire ce post automatiquement (compte privé, contenu chargé en JavaScript, ou blocage de la plateforme — fréquent sur Instagram). Colle plutôt la légende à la main via \"Importer ma fiche texte\" dans Sauvegarde & Importation.",
    });
  }

  try {
    const recipe = await extractRecipeWithAI(caption);
    if (recipe && recipe.error === "no_recipe_found") {
      return res.status(422).json({ error: "Ce post ne semble pas contenir de recette de cuisine." });
    }
    return res.status(200).json({ recipe, sourceImage, sourceCaption: caption });
  } catch (err) {
    console.error("Extraction IA impossible :", err);
    return res.status(500).json({ error: "L'extraction par IA a échoué. Réessaie, ou importe la légende manuellement." });
  }
}
