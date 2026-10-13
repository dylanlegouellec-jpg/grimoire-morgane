/* ------------------------------------------------------------------ */
/*  RÉCUPÉRATION DE LÉGENDE DEPUIS UN LIEN (Instagram/TikTok)            */
/*  Relaie vers /api/extract-recipe-from-link (voir ce fichier pour le    */
/*  détail : lecture Instagram peu fiable, aucune IA — sur demande          */
/*  explicite, pas de clé OpenAI payante). Renvoie la légende BRUTE, à       */
/*  recopier soi-même dans une recette (voir RecipeLinkImportModal.jsx).      */
/* ------------------------------------------------------------------ */

import { translateCurrent } from "./i18n";

const ENDPOINT = "/api/extract-recipe-from-link";
const TIMEOUT_MS = 12000;

interface ExtractedCaption {
  caption: string;
  [key: string]: unknown;
}

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchCaptionFromLink(url: string): Promise<ExtractedCaption> {
  let res;
  try {
    res = await fetchWithTimeout(
      ENDPOINT,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) },
      TIMEOUT_MS
    );
  } catch {
    throw new Error(translateCurrent("messages.linkImport.unreachable"));
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || translateCurrent("messages.linkImport.serverError", { status: res.status }));
  }
  if (!data || !data.caption) {
    throw new Error(translateCurrent("messages.linkImport.invalidResponse"));
  }
  return data;
}
