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

// Convertit une valeur quelconque (déjà un nombre, une chaîne "1,5", une
// chaîne vide, undefined...) en nombre exploitable, ou `null` si elle ne
// représente vraiment aucune quantité.
function toQty(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function normalizeIngredient(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (raw.isSection) {
    const title = String(raw.title || "").trim();
    return title ? { isSection: true, title } : null;
  }

  const name = String(raw.name || "").trim();
  if (!name) return null;

  return {
    qty: toQty(raw.qty),
    unit: typeof raw.unit === "string" ? raw.unit.trim() : "",
    name,
  };
}

export function normalizeIngredientList(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeIngredient)
    .filter(Boolean);
}
