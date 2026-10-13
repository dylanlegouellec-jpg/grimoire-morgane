/* ------------------------------------------------------------------ */
/*  NORMALISATION DES INGRÉDIENTS                                      */
/*  Garantit, à chaque point d'entrée des données dans l'application   */
/*  (parseur de fiche texte, formulaire, lecture Supabase, import      */
/*  fichier/code), que chaque ingrédient est bien un objet structuré   */
/*  { qty: number|null, unit: string, name: string } — ou              */
/*  { isSection: true, title: string } pour un titre de section —      */
/*  jamais du texte brut. C'est cette forme qui circule ensuite         */
/*  partout : PortionWheel.jsx, utils/nutriscore.js, la génération de  */
/*  liste de courses, et la ligne Supabase (colonne jsonb).             */
/* ------------------------------------------------------------------ */

export interface Ingredient {
  qty: number | null;
  unit: string;
  name: string;
}

export interface IngredientSectionTitle {
  isSection: true;
  title: string;
}

export type NormalizedIngredient = Ingredient | IngredientSectionTitle;

// Convertit une valeur quelconque (déjà un nombre, une chaîne "1,5", une
// chaîne vide, undefined...) en nombre exploitable, ou `null` si elle ne
// représente vraiment aucune quantité.
function toQty(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// `raw` reste `unknown` en entrée (comme avant : cette fonction est le
// point d'entrée qui valide des données qui peuvent venir de n'importe où
// — texte collé, JSON Supabase, fichier importé) plutôt que de prétendre à
// un type d'entrée déjà fiable.
export function normalizeIngredient(raw: unknown): NormalizedIngredient | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (obj.isSection) {
    const title = String(obj.title || "").trim();
    return title ? { isSection: true, title } : null;
  }

  const name = String(obj.name || "").trim();
  if (!name) return null;

  return {
    qty: toQty(obj.qty),
    unit: typeof obj.unit === "string" ? obj.unit.trim() : "",
    name,
  };
}

export function normalizeIngredientList(list: unknown): NormalizedIngredient[] {
  return (Array.isArray(list) ? list : [])
    .map(normalizeIngredient)
    .filter((ing): ing is NormalizedIngredient => Boolean(ing));
}

/**
 * Quantité saisie à la main → nombre. Accepte la virgule (« 0,5 », clavier
 * français), le point, une fraction (« 1/2 ») ou un nombre mixte (« 1 1/2 »).
 * Renvoie 0 pour une saisie vide ou illisible.
 */
export function parseQuantity(input: unknown): number {
  const text = String(input ?? "").trim().replace(",", ".");
  if (!text) return 0;
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    return den ? Number(mixed[1]) + Number(mixed[2]) / den : 0;
  }
  const fraction = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const den = Number(fraction[2]);
    return den ? Number(fraction[1]) / den : 0;
  }
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
