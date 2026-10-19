import { normalize } from "./helpers";

/* ------------------------------------------------------------------ */
/*  UNITÉS DES INGRÉDIENTS — liste du foyer (Réglages > Unités)          */
/*                                                                        */
/*  Données pures, sans React. La liste proposée dans le menu « unité »     */
/*  du formulaire de recette = les unités de base (DEFAULT_UNITS) que le     */
/*  foyer n'a pas masquées, puis celles qu'il a ajoutées (« sachet »,         */
/*  « gousse »...), « Sans unité » toujours en dernier. Le réglage est          */
/*  partagé par tout le foyer : colonne `app_state.units` (jsonb), de forme      */
/*  { custom: string[], hidden: string[] } — `null` = liste par défaut —          */
/*  synchronisée comme pantry/basics par hooks/useOfflineSync.ts (cache local,    */
/*  file hors-ligne, Realtime).                                                     */
/*                                                                                    */
/*  Masquer ou supprimer une unité ne touche JAMAIS aux recettes : une recette        */
/*  garde son unité telle quelle, et le menu continue de la proposer pour la           */
/*  ligne qui l'utilise (voir buildUnitOptions, `keep`).                                */
/* ------------------------------------------------------------------ */

export interface UnitSettings {
  custom: string[];
  hidden: string[];
}

export interface DefaultUnit {
  value: string;
  label: string;
}

// Valeurs ENREGISTRÉES avec les recettes (ne jamais les changer) ; `label`
// est le libellé français d'origine, retraduit à l'affichage via
// UNIT_LABEL_KEYS (components/recipe/form/recipeFormRows.ts).
export const DEFAULT_UNITS: DefaultUnit[] = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "cl", label: "cl" },
  { value: "l", label: "l" },
  { value: "pièce", label: "pièce(s)" },
  { value: "pincée", label: "pincée(s)" },
  { value: "c. à soupe", label: "c. à soupe" },
  { value: "c. à café", label: "c. à café" },
  { value: "", label: "Sans unité" },
];

/** « Sans unité » : jamais masquable, toujours proposée en dernier. */
export const NO_UNIT = "";

export const MAX_UNIT_LENGTH = 20;
export const MAX_CUSTOM_UNITS = 30;

// Proposées en un appui dans les Réglages (celles déjà présentes sont
// retirées de la liste affichée, voir availableSuggestions).
export const UNIT_SUGGESTIONS = ["sachet", "boîte", "gousse", "tranche", "verre", "bouquet", "feuille"];

/**
 * Clé de comparaison : sans accents ni majuscules, espaces doublés ignorés,
 * et au singulier (« (s) » ou « s » final retiré : « Sachets » = « sachet »).
 */
export function unitKey(unit: string): string {
  const key = normalize(unit).replace(/\s+/g, " ").replace(/\s*\(s\)$/, "").trim();
  return key.length > 2 && key.endsWith("s") && !key.endsWith("ss") ? key.slice(0, -1) : key;
}

/** Nettoie une saisie : espaces en trop retirés (début, fin, doublés). */
export function cleanUnitInput(input: string): string {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}

// Chaînes uniques d'une liste quelconque ; `clean` : saisie à nettoyer et à
// comparer par unitKey (unités ajoutées), sinon valeurs exactes (masquées).
function uniqueStrings(list: unknown, clean: boolean): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const value = clean ? cleanUnitInput(raw) : raw;
    const key = clean ? unitKey(value) : value;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

const DEFAULT_VALUES = new Set(DEFAULT_UNITS.map((u) => u.value));
const DEFAULT_KEYS = new Map<string, string>();
for (const u of DEFAULT_UNITS) {
  if (u.value === NO_UNIT) continue;
  DEFAULT_KEYS.set(unitKey(u.value), u.value);
  DEFAULT_KEYS.set(unitKey(u.label), u.value);
}
const NO_UNIT_KEY = unitKey(DEFAULT_UNITS[DEFAULT_UNITS.length - 1].label);

/**
 * Valeur lue en base / dans le cache local → réglage propre, ou `null`
 * (= liste par défaut) si rien d'exploitable. Une donnée abîmée ne doit
 * jamais casser le formulaire : on garde seulement ce qui est valide.
 */
export function normalizeUnitSettings(raw: unknown): UnitSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const custom = uniqueStrings(obj.custom, true).filter(
    (u) => u && u.length <= MAX_UNIT_LENGTH && !DEFAULT_KEYS.has(unitKey(u)) && unitKey(u) !== NO_UNIT_KEY
  ).slice(0, MAX_CUSTOM_UNITS);
  const hidden = uniqueStrings(obj.hidden, false).filter((u) => u !== NO_UNIT && DEFAULT_VALUES.has(u));
  if (!custom.length && !hidden.length) return null;
  return { custom, hidden };
}

function toStored(settings: UnitSettings): UnitSettings | null {
  return normalizeUnitSettings(settings);
}

export function customUnits(settings: UnitSettings | null): string[] {
  return settings ? settings.custom : [];
}

export function isDefaultUnitHidden(settings: UnitSettings | null, value: string): boolean {
  return value !== NO_UNIT && !!settings && settings.hidden.includes(value);
}

/** Unités de base visibles, hors « Sans unité ». */
export function visibleDefaultUnits(settings: UnitSettings | null): DefaultUnit[] {
  return DEFAULT_UNITS.filter((u) => u.value !== NO_UNIT && !isDefaultUnitHidden(settings, u.value));
}

/** Nombre d'unités « réelles » proposées (hors « Sans unité »). */
function realUnitCount(settings: UnitSettings | null): number {
  return visibleDefaultUnits(settings).length + customUnits(settings).length;
}

export type AddUnitError = "empty" | "tooLong" | "duplicate" | "tooMany";
export type AddUnitResult =
  | { ok: true; settings: UnitSettings | null; value: string; unhidden: boolean }
  | { ok: false; error: AddUnitError };

/**
 * Ajoute une unité au foyer. Doublon refusé (comparaison sans accents ni
 * majuscules, avec les unités de base comme avec celles déjà ajoutées) —
 * sauf une unité de base MASQUÉE : la retaper la réaffiche simplement.
 */
export function addCustomUnit(settings: UnitSettings | null, input: string): AddUnitResult {
  const value = cleanUnitInput(input);
  if (!value) return { ok: false, error: "empty" };
  if (value.length > MAX_UNIT_LENGTH) return { ok: false, error: "tooLong" };
  const key = unitKey(value);
  if (!key) return { ok: false, error: "empty" };
  if (key === NO_UNIT_KEY) return { ok: false, error: "duplicate" };
  const defaultValue = DEFAULT_KEYS.get(key);
  if (defaultValue !== undefined) {
    if (!isDefaultUnitHidden(settings, defaultValue)) return { ok: false, error: "duplicate" };
    const next = toStored({ custom: customUnits(settings), hidden: (settings?.hidden || []).filter((h) => h !== defaultValue) });
    return { ok: true, settings: next, value: defaultValue, unhidden: true };
  }
  const custom = customUnits(settings);
  if (custom.some((u) => unitKey(u) === key)) return { ok: false, error: "duplicate" };
  if (custom.length >= MAX_CUSTOM_UNITS) return { ok: false, error: "tooMany" };
  return { ok: true, settings: toStored({ custom: [...custom, value], hidden: settings?.hidden || [] }), value, unhidden: false };
}

export type UnitChangeResult = { ok: true; settings: UnitSettings | null } | { ok: false; error: "lastUnit" };

/** Retire une unité ajoutée (refusé si c'était la toute dernière unité proposée). */
export function removeCustomUnit(settings: UnitSettings | null, value: string): UnitChangeResult {
  const custom = customUnits(settings);
  if (!custom.includes(value)) return { ok: true, settings };
  if (realUnitCount(settings) <= 1) return { ok: false, error: "lastUnit" };
  return { ok: true, settings: toStored({ custom: custom.filter((u) => u !== value), hidden: settings?.hidden || [] }) };
}

/**
 * Masque/réaffiche une unité de base. « Sans unité » n'est jamais
 * masquable, et on garde toujours au moins une vraie unité proposée.
 */
export function setDefaultUnitHidden(settings: UnitSettings | null, value: string, hidden: boolean): UnitChangeResult {
  if (value === NO_UNIT || !DEFAULT_VALUES.has(value)) return { ok: true, settings };
  const current = settings?.hidden || [];
  if (hidden === current.includes(value)) return { ok: true, settings };
  if (hidden && realUnitCount(settings) <= 1) return { ok: false, error: "lastUnit" };
  const nextHidden = hidden ? [...current, value] : current.filter((h) => h !== value);
  return { ok: true, settings: toStored({ custom: customUnits(settings), hidden: nextHidden }) };
}

/** Suggestions pas encore présentes (ni ajoutées, ni unité de base visible). */
export function availableSuggestions(settings: UnitSettings | null): string[] {
  const taken = new Set([...visibleDefaultUnits(settings).map((u) => unitKey(u.value)), ...customUnits(settings).map(unitKey)]);
  return UNIT_SUGGESTIONS.filter((s) => !taken.has(unitKey(s)));
}

export interface UnitOption {
  value: string;
  /** Unité de base (libellé traduit à l'affichage) ou valeur affichée telle quelle. */
  isDefault: boolean;
}

/**
 * Menu « unité » d'une ligne d'ingrédient : unités de base visibles, puis
 * unités ajoutées, « Sans unité » en dernier. `keep` (l'unité actuelle de la
 * ligne) est TOUJOURS proposée, même masquée, supprimée ou venue d'un
 * import : sinon le <select> l'afficherait mal et l'enregistrement la
 * perdrait.
 */
export function buildUnitOptions(settings: UnitSettings | null, keep?: string | null): UnitOption[] {
  const options: UnitOption[] = [
    ...visibleDefaultUnits(settings).map((u) => ({ value: u.value, isDefault: true })),
    ...customUnits(settings).map((u) => ({ value: u, isDefault: false })),
  ];
  if (typeof keep === "string" && keep !== NO_UNIT && !options.some((o) => o.value === keep)) {
    options.push({ value: keep, isDefault: DEFAULT_VALUES.has(keep) });
  }
  options.push({ value: NO_UNIT, isDefault: true });
  return options;
}

/* --- Unité par défaut d'une nouvelle ligne d'ingrédient --- */

// Réglage actif, recopié ici par contexts/UnitsContext.tsx : permet à
// newIngredientRow (recipeFormRows.ts, données pures appelées aussi en
// dehors de tout composant) de ne pas pré-remplir une unité masquée.
let activeSettings: UnitSettings | null = null;
export function setActiveUnitSettings(settings: UnitSettings | null): void {
  activeSettings = settings;
}

/** « g » tant qu'il est proposé, sinon la première unité proposée. */
export function preferredDefaultUnit(settings: UnitSettings | null = activeSettings): string {
  if (!isDefaultUnitHidden(settings, "g")) return "g";
  const first = buildUnitOptions(settings)[0];
  return first ? first.value : NO_UNIT;
}

/* --- Saisie de quantité des courses (QuantitySheet.tsx) --- */

/**
 * Pastilles d'unité d'un article de courses : la liste propre aux courses
 * (`base` : « L » majuscule, « unité » générique utilisée par les raccourcis
 * 1/2...), moins les unités de base masquées par le foyer (comparées sans
 * accents/majuscules : masquer « l » masque aussi « L »), plus les unités
 * ajoutées par le foyer. « unité » reste toujours, et l'unité actuelle de
 * l'article (`keep`) aussi, pour ne jamais la perdre à l'enregistrement.
 */
export function shoppingUnitOptions(settings: UnitSettings | null, base: string[], keep?: string | null, alwaysKeep: string[] = []): string[] {
  const hiddenKeys = new Set((settings?.hidden || []).map(unitKey));
  const out = base.filter((u) => alwaysKeep.includes(u) || !hiddenKeys.has(unitKey(u)));
  const has = (u: string) => out.some((o) => unitKey(o) === unitKey(u));
  for (const u of customUnits(settings)) if (!has(u)) out.push(u);
  if (keep && !out.includes(keep)) out.push(keep);
  return out;
}
