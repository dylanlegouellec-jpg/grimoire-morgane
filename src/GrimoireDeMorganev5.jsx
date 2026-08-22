import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Refrigerator,
  ShoppingBasket,
  Plus,
  X,
  Clock,
  Users,
  Wand2,
  Check,
  Minus,
  ChefHat,
  Heart,
  Share2,
  Download,
  Upload,
  Search,
  Copy,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DONNÉES                                                            */
/* ------------------------------------------------------------------ */

const AISLES = [
  { key: "fruits-legumes", label: "Fruits & Légumes", test: /oignon|ail|carotte|tomate|pomme|citron|herbe|persil|basilic|thym|laurier|échalote|poireau|courgette|champignon|salade|pêche|fraise|orange|banane|aubergine|poivron/i },
  { key: "boucherie", label: "Boucherie & Poissonnerie", test: /poulet|boeuf|bœuf|porc|veau|agneau|lardon|jambon|poisson|saumon|crevette|canard/i },
  { key: "cremerie", label: "Crémerie", test: /beurre|crème|lait|oeuf|œuf|fromage|yaourt|parmesan|gruyère|mascarpone/i },
  { key: "epicerie-salee", label: "Épicerie salée", test: /sel|poivre|huile|vinaigre|bouillon|farine|pâte(?! sucrée)|riz|moutarde|câpre/i },
  { key: "epicerie-sucree", label: "Épicerie sucrée", test: /sucre|chocolat|vanille|miel|levure|cannelle|amande|noisette|confiture/i },
  { key: "boulangerie", label: "Boulangerie", test: /pain|baguette|brioche|pâte feuilletée|pâte brisée/i },
];

function guessAisle(name) {
  const found = AISLES.find((a) => a.test.test(name));
  return found ? found.label : "Autre";
}

/* ------------------------------------------------------------------ */
/*  NUTRI-SCORE PONDÉRÉ (estimation — pas une base nutritionnelle       */
/*  officielle, mais une pondération par poids réel/estimé des          */
/*  ingrédients plutôt qu'un simple comptage de mots-clés)              */
/* ------------------------------------------------------------------ */

// Poids moyen (g) d'une unité "pièce" selon l'ingrédient, pour convertir
// les quantités sans unité de masse en grammes approximatifs.
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

// Convertit une quantité + unité (souvent imprécises ou absentes, comme
// dans une fiche saisie à la main) en grammes approximatifs, pour pouvoir
// pondérer chaque ingrédient par son poids réel dans la recette plutôt
// que de le compter comme une simple occurrence.
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
  // Toute autre unité (pièce, tranche, ...) : on se rabat sur le poids
  // moyen estimé de l'ingrédient lui-même.
  return qty * estimatePieceWeight(ing.name);
}

// Chaque catégorie porte un impact (positif = favorable, négatif =
// défavorable) par tranche de 10% du poids total de la recette qu'elle
// représente. Testées dans l'ordre : la première correspondance gagne,
// des motifs les plus spécifiques vers les plus génériques, pour éviter
// qu'un même ingrédient ne soit compté deux fois.
const NUTRI_CATEGORIES = [
  { test: /lardon|bacon|chorizo|saucisse|jambon|charcuterie|merguez|andouille/i, impact: -8, label: "charcuterie" },
  { test: /chocolat noir/i, impact: -1, label: "sucre modéré" },
  { test: /sucre|miel|confiture|sirop|caramel|chocolat|pâte à tartiner|nutella/i, impact: -4, label: "sucre ajouté" },
  { test: /huile d'olive|huile de colza|huile de noix/i, impact: -0.5, label: "graisse insaturée" },
  { test: /beurre|crème|creme|mayonnaise|friture|saindoux|huile de palme/i, impact: -5, label: "graisse saturée" },
  { test: /huile/i, impact: -2, label: "graisse" },
  { test: /fromage(?!\s*blanc)|comté|comte|gruyère|gruyere|parmesan|emmental/i, impact: -2.5, label: "fromage" },
  { test: /porc|boeuf|bœuf|agneau|veau/i, impact: -1.5, label: "viande grasse" },
  { test: /lentille|haricot|pois chiche|pois cass[ée]|l[ée]gumineuse|quinoa|avoine|son de/i, impact: 5, label: "fibre/légumineuse" },
  { test: /complet|int[ée]grale?/i, impact: 3, label: "céréale complète" },
  { test: /l[ée]gume|carotte|courgette|tomate|[ée]pinard|poireau|brocoli|salade|aubergine|poivron|champignon|oignon|échalote|echalote|ail\b|navet|betterave|c[ée]leri|endive|chou|radis|artichaut/i, impact: 4, label: "légume" },
  { test: /fruit|pomme|banane|orange|citron|fraise|framboise|poire|pêche|peche|abricot|myrtille|mangue|avocat/i, impact: 3.5, label: "fruit" },
  { test: /poulet|dinde|poisson|saumon|cabillaud|thon|tofu|oeuf|œuf/i, impact: 1, label: "protéine maigre" },
  { test: /lait(?!\s*de\s*coco)|yaourt/i, impact: 1, label: "laitage" },
  { test: /farine|p[aâ]te(?!.*complète)|pain(?!.*complet)|riz(?!.*complet)/i, impact: -0.5, label: "féculent raffiné" },
  { test: /\bsel\b/i, impact: -0.5, label: "sel" },
];

function estimateNutriscore(ingredients = []) {
  try {
    const items = (ingredients || []).filter((ing) => ing && !ing.isSection && ing.name);
    if (!items.length) return "C";

    const grams = items.map(estimateGrams);
    const totalGrams = grams.reduce((a, b) => a + b, 0);

    let score = 0;
    const positiveKinds = new Set();

    items.forEach((ing, i) => {
      const match = NUTRI_CATEGORIES.find((c) => c.test.test(ing.name));
      if (!match) return;

      let fraction;
      if (totalGrams > 0 && grams[i] > 0) {
        fraction = grams[i] / totalGrams;
      } else {
        // Ni quantité ni unité exploitables : on estime l'importance de
        // l'ingrédient par son rang dans la liste (les premiers cités
        // sont en général les plus significatifs dans une recette),
        // plutôt que de le traiter comme un simple mot isolé.
        fraction = 1 / (i + 2);
      }
      // On plafonne la contribution d'un seul ingrédient pour qu'une
      // grosse quantité d'un élément neutre (ex: beaucoup de liquide) ne
      // fasse pas basculer le score à elle seule.
      const capped = Math.min(fraction, 0.3);
      score += match.impact * capped * 10;
      if (match.impact > 0) positiveKinds.add(match.label);
    });

    // Petit bonus pour la diversité d'éléments bénéfiques (légumes,
    // fibres, protéines maigres...) présents dans la recette.
    score += positiveKinds.size * 1.5;

    if (score >= 10) return "A";
    if (score >= 3) return "B";
    if (score >= -4) return "C";
    if (score >= -12) return "D";
    return "E";
  } catch {
    return "C";
  }
}

/* ------------------------------------------------------------------ */
/*  SECTIONS STRUCTURANTES (ingrédients / étapes groupés par titre)     */
/* ------------------------------------------------------------------ */

function groupIngredients(ingredients = []) {
  const groups = [];
  let current = { title: null, items: [] };
  ingredients.forEach((ing) => {
    if (ing && ing.isSection) {
      if (current.items.length || current.title) groups.push(current);
      current = { title: ing.title, items: [] };
    } else if (ing) {
      current.items.push(ing);
    }
  });
  groups.push(current);
  return groups.filter((g) => g.items.length || g.title);
}

function groupSteps(steps = []) {
  const groups = [];
  let current = { title: null, steps: [] };
  steps.forEach((s) => {
    if (s && typeof s === "object" && s.isSection) {
      if (current.steps.length || current.title) groups.push(current);
      current = { title: s.title, steps: [] };
    } else if (typeof s === "string" && s.trim()) {
      current.steps.push(s);
    }
  });
  groups.push(current);
  return groups.filter((g) => g.steps.length || g.title);
}

function parseDurationMinutes(text = "") {
  try {
    const hMatch = text.match(/(\d+)\s*h\s*(\d{1,2})?/i);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
      return h * 60 + m;
    }
    const mMatch = text.match(/(\d+)\s*(minutes?|min)\b/i);
    if (mMatch) return parseInt(mMatch[1], 10);
    return null;
  } catch {
    return null;
  }
}

const NUTRI_COLORS = { A: "#2E7D32", B: "#8BA33F", C: "#C9A227", D: "#D4771C", E: "#B33A2E" };

// Générateur d'identifiants uniques et robuste : ne dépend d'aucun compteur
// remis à zéro à chaque rechargement de page (c'était la cause du bug
// d'écrasement — un compteur en mémoire qui repartait de 100 à chaque
// session finissait par régénérer des ids déjà utilisés dans Supabase).
let idFallbackCounter = 0;
function nextId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `r-${crypto.randomUUID()}`;
    }
  } catch {
    /* ignore et repli ci-dessous */
  }
  idFallbackCounter += 1;
  return `r-${Date.now().toString(36)}-${idFallbackCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function demoRecipes() {
  return [
    {
      id: "r1",
      title: "Kouign-amann",
      category: "Sucré",
      time: 70,
      servings: 8,
      carbs: 45,
      favorite: false,
      illustrationKey: "tarte",
      ingredients: [
        { name: "Farine", qty: 250, unit: "g" },
        { name: "Beurre", qty: 200, unit: "g" },
        { name: "Sucre", qty: 200, unit: "g" },
        { name: "Levure boulangère", qty: 5, unit: "g" },
        { name: "Sel", qty: 5, unit: "g" },
      ],
      steps: [
        "Pétrir la farine, l'eau, la levure et le sel en une pâte souple.",
        "Laisser lever 1 heure, puis étaler et incorporer le beurre en tourant comme une pâte feuilletée.",
        "Saupoudrer généreusement de sucre entre chaque tour.",
        "Façonner en cercle, laisser reposer 20 minutes puis cuire 35 min à 210°C.",
      ],
    },
    {
      id: "r2",
      title: "Poulet rôti aux herbes",
      category: "Salé",
      time: 90,
      servings: 4,
      carbs: 2,
      favorite: false,
      illustrationKey: "poulet",
      ingredients: [
        { name: "Poulet", qty: 1, unit: "pièce" },
        { name: "Ail", qty: 4, unit: "gousses" },
        { name: "Thym", qty: 1, unit: "botte" },
        { name: "Beurre", qty: 40, unit: "g" },
        { name: "Sel", qty: 1, unit: "pincée" },
      ],
      steps: [
        "Préchauffer le four à 200°C.",
        "Frotter le poulet de beurre, d'ail écrasé et de thym.",
        "Enfourner 1h15 en arrosant régulièrement.",
      ],
    },
    {
      id: "r3",
      title: "Fondant au chocolat",
      category: "Sucré",
      time: 35,
      servings: 6,
      carbs: 34,
      favorite: false,
      illustrationKey: "chocolat",
      ingredients: [
        { name: "Chocolat", qty: 200, unit: "g" },
        { name: "Beurre", qty: 150, unit: "g" },
        { name: "Sucre", qty: 150, unit: "g" },
        { name: "Oeuf", qty: 4, unit: "pièce" },
        { name: "Farine", qty: 70, unit: "g" },
      ],
      steps: [
        "Faire fondre le chocolat et le beurre ensemble.",
        "Fouetter les oeufs et le sucre, puis ajouter le chocolat fondu et la farine.",
        "Cuire 12 minutes à 200°C en gardant un coeur coulant.",
      ],
    },
    {
      id: "r4",
      title: "Ratatouille provençale",
      category: "Salé",
      time: 60,
      servings: 4,
      carbs: 12,
      favorite: false,
      illustrationKey: "ratatouille",
      ingredients: [
        { name: "Courgette", qty: 2, unit: "pièce" },
        { name: "Tomate", qty: 4, unit: "pièce" },
        { name: "Oignon", qty: 2, unit: "pièce" },
        { name: "Ail", qty: 2, unit: "gousses" },
        { name: "Huile d'olive", qty: 3, unit: "cuillère à soupe" },
      ],
      steps: [
        "Couper tous les légumes en dés.",
        "Faire revenir l'oignon et l'ail dans l'huile d'olive.",
        "Ajouter les légumes et laisser mijoter 45 minutes à feu doux.",
      ],
    },
    {
      id: "r5",
      title: "Crêpes bretonnes",
      category: "Sucré",
      time: 40,
      servings: 6,
      carbs: 30,
      favorite: false,
      illustrationKey: "crepe",
      ingredients: [
        { name: "Farine", qty: 300, unit: "g" },
        { name: "Oeuf", qty: 4, unit: "pièce" },
        { name: "Lait", qty: 600, unit: "ml" },
        { name: "Beurre", qty: 30, unit: "g" },
        { name: "Sel", qty: 1, unit: "pincée" },
      ],
      steps: [
        "Mélanger la farine et le sel, creuser un puits et ajouter les oeufs.",
        "Délayer progressivement avec le lait pour obtenir une pâte lisse.",
        "Laisser reposer 1 heure, puis cuire à la poêle bien chaude.",
      ],
    },
    {
      id: "r6",
      title: "Quiche lorraine",
      category: "Salé",
      time: 55,
      servings: 6,
      carbs: 22,
      favorite: false,
      illustrationKey: "quiche",
      ingredients: [
        { name: "Pâte brisée", qty: 1, unit: "pièce" },
        { name: "Lardon", qty: 200, unit: "g" },
        { name: "Crème", qty: 200, unit: "ml" },
        { name: "Oeuf", qty: 3, unit: "pièce" },
        { name: "Gruyère", qty: 100, unit: "g" },
      ],
      steps: [
        "Foncer un moule avec la pâte brisée.",
        "Répartir les lardons dorés sur le fond.",
        "Battre les oeufs avec la crème, verser sur la pâte, couvrir de fromage et cuire 35 min à 190°C.",
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  SUPABASE (REST / PostgREST — aucun SDK externe requis)             */
/* ------------------------------------------------------------------ */

// ⚠️ À compléter avec ton propre projet Supabase.
// Tant que ces valeurs sont vides, l'app fonctionne en mémoire avec les
// recettes de démonstration, sans planter.
const SUPABASE_URL = "https://mdvzdbbbueekrbzghetd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdnpkYmJidWVla3JiemdoZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODA2ODcsImV4cCI6MjEwMjI1NjY4N30.nv1eLh9PViCPUk0OZ5herFMJyIcZuUgyJgETQz6IMis";

const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/*
  Schéma SQL attendu (à exécuter dans l'éditeur SQL de Supabase) :

  create table recipes (
    id text primary key,
    title text not null,
    category text not null,        -- exactement "Salé" ou "Sucré"
    time int,
    servings int,
    carbs numeric,
    is_favorite boolean default false,
    notes text,
    illustration_key text,
    ingredients jsonb default '[]',
    steps jsonb default '[]',
    created_at timestamptz default now()
  );

  create table app_state (
    id int primary key,
    pantry jsonb default '[]',
    basics jsonb default '[]',
    press_duration int default 750
  );

  create table shopping_lists (
    id text primary key,
    name text not null,
    items jsonb default '[]',
    created_at timestamptz default now()
  );

  -- Active RLS + une policy adaptée à ton cas d'usage avant la mise en prod.
*/

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_READY) throw new Error("Supabase non configuré");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status} : ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchTable(table, query = "select=*") {
  return supabaseRequest(`${table}?${query}`, { method: "GET" });
}
async function insertRow(table, row) {
  const data = await supabaseRequest(table, { method: "POST", body: JSON.stringify([row]) });
  return data && data[0];
}
async function updateRow(table, id, patch) {
  const data = await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data && data[0];
}
async function deleteRow(table, id) {
  await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function loadAppState() {
  const rows = await fetchTable("app_state", "select=*&id=eq.1");
  return rows && rows[0];
}
async function saveAppState(patch) {
  try {
    await supabaseRequest("app_state?id=eq.1", { method: "PATCH", body: JSON.stringify(patch) });
  } catch {
    try {
      await supabaseRequest("app_state", { method: "POST", body: JSON.stringify({ id: 1, ...patch }) });
    } catch {
      /* silencieux : le grimoire continue de fonctionner en mémoire */
    }
  }
}

function mapRowToRecipe(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    time: row.time,
    servings: row.servings,
    carbs: row.carbs,
    notes: row.notes || null,
    illustrationKey: row.illustration_key || null,
    favorite: !!row.is_favorite,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
  };
}
function mapRecipeToRow(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    time: recipe.time,
    servings: recipe.servings,
    carbs: recipe.carbs,
    notes: recipe.notes || null,
    illustration_key: recipe.illustrationKey || null,
    is_favorite: !!recipe.favorite,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}
function mapRowToShoppingList(row) {
  return {
    id: row.id,
    name: row.name,
    items: Array.isArray(row.items) ? row.items : [],
  };
}
function mapShoppingListToRow(list) {
  return {
    id: list.id,
    name: list.name,
    items: list.items,
  };
}

/* ------------------------------------------------------------------ */
/*  PARTAGE, IMPORT / EXPORT, IMPRESSION                               */
/* ------------------------------------------------------------------ */

function encodeRecipeCode(recipe) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(recipe))));
  } catch {
    return "";
  }
}
function decodeRecipeCode(code) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (obj && typeof obj === "object" && obj.title) return obj;
    return null;
  } catch {
    return null;
  }
}
function buildImportLink(code) {
  try {
    return `${window.location.origin}${window.location.pathname}?import=${code}`;
  } catch {
    return code;
  }
}
function extractCodeFromInput(raw) {
  const trimmed = (raw || "").trim();
  try {
    const url = new URL(trimmed);
    const fromUrl = url.searchParams.get("import");
    if (fromUrl) return fromUrl;
  } catch {
    /* pas une URL, on considère que c'est le code brut */
  }
  return trimmed;
}

/* ------------------------------------------------------------------ */
/*  PARSEUR DE FICHE TEXTE ("Recette de : …", "Ingrédients : …", …)    */
/* ------------------------------------------------------------------ */

const TEMPLATE_SECTIONS = [
  { key: "title", test: /^recette\s*(de|:)?\s*:?\s*/i },
  { key: "servings", test: /^nombre\s*de\s*parts?\s*:?\s*/i },
  { key: "time", test: /^temps\s*de\s*pr[ée]paration\s*:?\s*/i },
  { key: "equipment", test: /^mat[ée]riel\s*(sp[ée]cifique)?\s*:?\s*/i },
  { key: "ingredients", test: /^ingr[ée]dients?\s*:?\s*/i },
  { key: "steps", test: /^pr[ée]paration\s*:?\s*/i },
  { key: "notes", test: /^remarques?\s*:?\s*/i },
];

function normalizeUnit(raw) {
  const u = normalize(raw);
  if (!u) return "";
  if (/^g(rammes?)?$/.test(u)) return "g";
  if (/^kgs?$/.test(u)) return "kg";
  if (/^mls?$/.test(u)) return "ml";
  if (/^cls?$/.test(u)) return "cl";
  if (/^l(itres?)?$/.test(u)) return "l";
  if (/^pi[e]?ces?$/.test(u)) return "pièce";
  if (/^pincees?$/.test(u)) return "pincée";
  if (/(c\s*a?\s*soupe|cuilleres?\s*a\s*soupe)/.test(u)) return "c. à soupe";
  if (/(c\s*a?\s*cafe|cuilleres?\s*a\s*cafe)/.test(u)) return "c. à café";
  return raw.trim();
}

function guessCategoryFromText(text) {
  const t = normalize(text);
  const sweet = /sucre|chocolat|vanille|dessert|gateau|tarte|patisserie|miel|confiture|biscuit|creme patissiere|caramel/.test(t);
  const savory = /poulet|boeuf|porc|poisson|legume|sel|poivre|fromage|viande|sauce|oignon|ail/.test(t);
  if (sweet && !savory) return "Sucré";
  return "Salé";
}

function parseRecipeTemplate(raw) {
  const lines = (raw || "").split("\n");
  const sections = {};
  let current = null;
  let buffer = [];
  const flush = () => {
    if (current) {
      const text = buffer.join("\n").trim();
      sections[current] = sections[current] ? `${sections[current]}\n${text}` : text;
    }
    buffer = [];
  };
  lines.forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line) {
      if (current) buffer.push("");
      return;
    }
    let matchedKey = null;
    let rest = "";
    for (const def of TEMPLATE_SECTIONS) {
      const m = line.match(def.test);
      if (m) {
        matchedKey = def.key;
        rest = line.slice(m[0].length).trim();
        break;
      }
    }
    if (matchedKey) {
      flush();
      current = matchedKey;
      if (rest) buffer.push(rest);
    } else if (current) {
      buffer.push(line);
    }
  });
  flush();

  const title = (sections.title || "").split("\n")[0].trim();
  if (!title) return null;

  const servingsMatch = (sections.servings || "").match(/\d+/);
  const servings = servingsMatch ? parseInt(servingsMatch[0], 10) : 4;

  const timeText = sections.time || "";
  const time = parseDurationMinutes(timeText) || (timeText.match(/\d+/) ? parseInt(timeText.match(/\d+/)[0], 10) : 30);

  const ingredientLines = (sections.ingredients || "")
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  const ingredients = ingredientLines.map((line) => {
    const m = line.match(/^([\d.,]+)\s*(g|kg|ml|cl|l|litres?|pi[e]?ces?|pincees?|c\.?\s*[aà]\s*soupe|c\.?\s*[aà]\s*caf[ée]|cuill[eè]res?\s*[aà]\s*soupe|cuill[eè]res?\s*[aà]\s*caf[ée])?\s*(?:de\s+|d')?(.+)$/i);
    if (m && m[3]) {
      return { qty: parseFloat(m[1].replace(",", ".")) || 0, unit: normalizeUnit(m[2] || ""), name: m[3].trim() };
    }
    return { qty: 1, unit: "", name: line };
  });

  const stepLines = (sections.steps || "")
    .split("\n")
    .map((l) => l.replace(/^(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);

  const equipment = (sections.equipment || "").trim();
  const notesText = (sections.notes || "").trim();
  const notes = equipment ? `Matériel : ${equipment}${notesText ? `\n\n${notesText}` : ""}` : notesText || null;

  return {
    title,
    category: guessCategoryFromText(`${title} ${ingredientLines.join(" ")}`),
    time: time || 30,
    servings: servings || 4,
    carbs: null,
    notes,
    ingredients: ingredients.length ? ingredients : [{ qty: 1, unit: "", name: "Ingrédient à préciser" }],
    steps: stepLines.length ? stepLines : ["Étape à préciser"],
  };
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
function triggerHaptic(pattern = 15) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function singularizeFr(word) {
  const w = (word || "").trim();
  if (/eaux$/i.test(w)) return w.replace(/eaux$/i, "eau");
  if (/aux$/i.test(w)) return w.replace(/aux$/i, "al");
  if (/s$/i.test(w) && w.length > 3) return w.replace(/s$/i, "");
  return w;
}
function ingredientKey(name) {
  return normalize(singularizeFr(name));
}
function isSucre(recipe) {
  return normalize(recipe && recipe.category) === "sucre";
}
function categoryLabel(recipe) {
  return isSucre(recipe) ? "Sucré" : "Salé";
}
function categoryClass(recipe) {
  return isSucre(recipe) ? "chip-sucre" : "chip-sale";
}
function slugify(s) {
  return (
    (s || "recette")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "recette"
  );
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function buildPrintHTML(recipe, servings, ingredients) {
  const ingredientsHtml = groupIngredients(ingredients)
    .map(
      (g) => `
    ${g.title ? `<h3 class="sub">${escapeHtml(g.title)}</h3>` : ""}
    <ul>${g.items.map((i) => `<li>${escapeHtml(i.qty)} ${escapeHtml(i.unit)} — ${escapeHtml(i.name)}</li>`).join("")}</ul>`
    )
    .join("");
  const stepsHtml = groupSteps(recipe.steps)
    .map(
      (g) => `
    ${g.title ? `<h3 class="sub">${escapeHtml(g.title)}</h3>` : ""}
    <ol>${g.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
    )
    .join("");
  const carbsLine = recipe.carbs ? `<span>${Math.round(recipe.carbs * servings)} g glucides (total)</span>` : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(recipe.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cinzel+Decorative:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
  body { font-family:'EB Garamond', Georgia, serif; background:#f1e6c8; color:#2a2013; margin:0; padding:40px; }
  .sheet { max-width:640px; margin:0 auto; border:2px solid #b3872a; border-radius:6px; padding:36px 40px; background:#f6ecd2; box-shadow:0 0 0 6px #f1e6c8 inset; }
  h1 { font-family:'Cinzel Decorative','Cinzel',serif; text-align:center; font-size:1.8rem; margin:0 0 6px; }
  .type { text-align:center; font-family:'Cinzel',serif; letter-spacing:2px; font-size:0.7rem; text-transform:uppercase; color:#b3872a; margin-bottom:18px; }
  .meta { display:flex; justify-content:center; gap:22px; font-size:0.9rem; color:#5c4a30; margin-bottom:20px; }
  .flourish { text-align:center; color:#b3872a; font-size:1.3rem; margin:14px 0; }
  h2 { font-family:'Cinzel',serif; font-size:1rem; letter-spacing:1px; color:#5c4a30; border-bottom:1px dashed rgba(179,135,42,0.35); padding-bottom:6px; }
  h3.sub { font-family:'Cinzel',serif; font-size:0.85rem; letter-spacing:0.5px; color:#b3872a; margin:14px 0 4px; }
  .notes { font-style: italic; color: #5c4a30; }
  ul, ol { padding-left:22px; }
  li { margin-bottom:6px; font-size:1.02rem; }
  @media print { body { padding:0; background:#f6ecd2; } .sheet { border:none; box-shadow:none; } }
</style></head>
<body>
  <div class="sheet">
    <h1>${escapeHtml(recipe.title)}</h1>
    <p class="type">${normalize(recipe.category) === "sucre" ? "Sucré" : "Salé"} · Le Grimoire de Morgane</p>
    <div class="meta"><span>⏱ ${recipe.time} min</span><span>👥 ${servings} pers.</span>${carbsLine}</div>
    <div class="flourish">❦</div>
    <h2>Ingrédients</h2>
    ${ingredientsHtml}
    <h2>Préparation</h2>
    ${stepsHtml}
    ${recipe.notes ? `<h2>Remarques &amp; astuces</h2><p class="notes">${escapeHtml(recipe.notes)}</p>` : ""}
  </div>
</body></html>`;
}

function openPrintFallback(html) {
  try {
    const win = window.open("", "_blank");
    if (!win) return false;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try { win.print(); } catch { /* ignore */ }
    }, 400);
    return true;
  } catch {
    return false;
  }
}

function triggerPrint(html) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // On n'attend pas un éventuel événement "load" (peu fiable après document.write
    // selon les navigateurs) : un court délai fixe suffit à laisser le contenu se
    // mettre en page avant de déclencher l'impression.
    setTimeout(() => {
      let printed = false;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        printed = true;
      } catch (err) {
        console.error("Impression iframe impossible :", err);
      }
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
      if (!printed) openPrintFallback(html);
    }, 300);
  } catch (err) {
    console.error("triggerPrint a échoué, repli sur un nouvel onglet :", err);
    openPrintFallback(html);
  }
}

/* ------------------------------------------------------------------ */
/*  DÉCLENCHEUR SECRET (triple-clic ou appui long 2s)                  */
/* ------------------------------------------------------------------ */

function useSecretTrigger(onTrigger) {
  const clicksRef = useRef({ count: 0, timer: null });
  const pressTimerRef = useRef(null);

  const registerClick = () => {
    clicksRef.current.count += 1;
    if (clicksRef.current.timer) clearTimeout(clicksRef.current.timer);
    if (clicksRef.current.count >= 3) {
      clicksRef.current.count = 0;
      onTrigger();
      return;
    }
    clicksRef.current.timer = setTimeout(() => { clicksRef.current.count = 0; }, 600);
  };

  const startPress = () => {
    pressTimerRef.current = setTimeout(onTrigger, 2000);
  };
  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return {
    onClick: registerClick,
    onMouseDown: startPress,
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    style: { cursor: "pointer", userSelect: "none" },
  };
}

/* ------------------------------------------------------------------ */
/*  RÉORDONNANCEMENT PAR GLISSER-DÉPOSER (poignée tactile, sans lib)   */
/* ------------------------------------------------------------------ */
/*
  Pas de librairie externe de drag-and-drop disponible dans cet environnement
  d'aperçu (seule une liste fermée de packages peut être importée ici — ni
  @dnd-kit ni SortableJS n'en font partie). Ce hook reproduit la même
  sensation — on maintient une poignée, on glisse verticalement, les lignes
  voisines se décalent en direct, l'ordre réel n'est validé qu'au relâché —
  entièrement en Pointer Events + transform CSS.
*/
function useDragReorder(items, setItems) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const startYRef = useRef(0);
  const startIndexRef = useRef(0);
  const rowHeightRef = useRef(60);
  const nodeRefs = useRef(new Map());

  const registerNode = (id) => (node) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  };

  const computeSteps = (dy, index) => {
    const raw = Math.round(dy / rowHeightRef.current);
    return Math.max(-index, Math.min(items.length - 1 - index, raw));
  };

  const onHandlePointerDown = (id, index) => (e) => {
    e.preventDefault();
    const node = nodeRefs.current.get(id);
    if (node) rowHeightRef.current = node.getBoundingClientRect().height + 8;
    startYRef.current = e.clientY;
    startIndexRef.current = index;
    setDraggingId(id);
    setDragDy(0);
    triggerHaptic(15);
    if (e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const onHandlePointerMove = (e) => {
    if (draggingId == null) return;
    setDragDy(e.clientY - startYRef.current);
  };
  const finishDrag = () => {
    if (draggingId == null) return;
    const steps = computeSteps(dragDy, startIndexRef.current);
    if (steps !== 0) {
      setItems((prev) => {
        const idx = prev.findIndex((r) => r.id === draggingId);
        if (idx === -1) return prev;
        const target = Math.max(0, Math.min(prev.length - 1, idx + steps));
        const copy = [...prev];
        const [moved] = copy.splice(idx, 1);
        copy.splice(target, 0, moved);
        return copy;
      });
      triggerHaptic(12);
    }
    setDraggingId(null);
    setDragDy(0);
  };

  const dragHandleProps = (id, index) => ({
    onPointerDown: onHandlePointerDown(id, index),
    onPointerMove: onHandlePointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
  });

  const getRowStyle = (id, index) => {
    if (draggingId === id) {
      return {
        transform: `translateY(${dragDy}px)`,
        transition: "none",
        position: "relative",
        zIndex: 30,
        boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
        borderRadius: 8,
        background: "var(--parchment)",
      };
    }
    if (draggingId != null) {
      const steps = computeSteps(dragDy, startIndexRef.current);
      const idx = startIndexRef.current;
      let shift = 0;
      if (steps > 0 && index > idx && index <= idx + steps) shift = -1;
      else if (steps < 0 && index < idx && index >= idx + steps) shift = 1;
      if (shift !== 0) {
        return { transform: `translateY(${shift * rowHeightRef.current}px)`, transition: "transform 0.15s ease", position: "relative", zIndex: 1 };
      }
      return { transition: "transform 0.15s ease" };
    }
    return {};
  };

  return { draggingId, dragHandleProps, getRowStyle, registerNode };
}

/* ------------------------------------------------------------------ */
/*  ILLUSTRATIONS SVG "AQUARELLE CULINAIRE" (aucune image externe)      */
/* ------------------------------------------------------------------ */

function TarteSVG({ uid }) {
  return (
    <>
      <circle cx="100" cy="82" r="52" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <circle cx="100" cy="82" r="42" fill="none" stroke="#00000022" strokeWidth="2.5" />
      <circle cx="100" cy="82" r="30" fill="none" stroke="#00000022" strokeWidth="2.5" />
      <circle cx="100" cy="82" r="18" fill="none" stroke="#00000022" strokeWidth="2.5" />
      <ellipse cx="80" cy="60" rx="20" ry="10" fill="#ffffff" opacity="0.22" transform="rotate(-25 80 60)" />
      <circle cx="70" cy="95" r="2.4" fill="#7c4a1e" opacity="0.6" />
      <circle cx="122" cy="70" r="2.2" fill="#7c4a1e" opacity="0.6" />
      <circle cx="110" cy="105" r="2" fill="#7c4a1e" opacity="0.6" />
    </>
  );
}

function ChocolatSVG({ uid }) {
  return (
    <>
      <rect x="55" y="42" width="90" height="68" rx="10" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <path d="M62 108 C60 118 58 124 54 130" stroke="#2e160c" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M84 110 C83 120 82 126 80 132" stroke="#2e160c" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M118 110 C119 120 121 126 124 132" stroke="#2e160c" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
      <rect x="60" y="46" width="80" height="10" rx="5" fill="#ffffff" opacity="0.12" />
      <circle cx="70" cy="55" r="1.6" fill="#fff" opacity="0.8" />
      <circle cx="90" cy="50" r="1.4" fill="#fff" opacity="0.8" />
      <circle cx="115" cy="56" r="1.6" fill="#fff" opacity="0.8" />
      <circle cx="130" cy="50" r="1.3" fill="#fff" opacity="0.8" />
    </>
  );
}

function CrepeSVG({ uid }) {
  return (
    <>
      <ellipse cx="100" cy="100" rx="58" ry="14" fill="#8a6a2e" opacity="0.55" />
      <ellipse cx="100" cy="88" rx="53" ry="13" fill={`url(#main-${uid})`} />
      <ellipse cx="100" cy="75" rx="48" ry="12" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <path d="M60 73 C80 65 120 65 140 73" stroke="#c9862c" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="88" cy="70" r="4" fill="#a63b3b" opacity="0.85" />
      <circle cx="108" cy="72" r="3.4" fill="#a63b3b" opacity="0.85" />
    </>
  );
}

function PouletSVG({ uid }) {
  return (
    <>
      <ellipse cx="100" cy="82" rx="50" ry="34" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <path d="M65 70 C85 62 115 62 135 70" stroke="#00000022" strokeWidth="3" fill="none" />
      <path d="M62 85 C85 79 115 79 138 85" stroke="#00000022" strokeWidth="3" fill="none" />
      <path d="M70 46 C64 56 62 66 66 74" stroke="#6b3d1c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M130 46 C136 56 138 66 134 74" stroke="#6b3d1c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <circle cx="68" cy="45" r="5" fill="#fff" opacity="0.9" />
      <circle cx="132" cy="45" r="5" fill="#fff" opacity="0.9" />
      <ellipse cx="35" cy="95" rx="10" ry="5" fill="#7a9a5e" opacity="0.85" transform="rotate(-20 35 95)" />
      <ellipse cx="30" cy="105" rx="9" ry="4.5" fill="#7a9a5e" opacity="0.85" transform="rotate(10 30 105)" />
    </>
  );
}

function RatatouilleSVG({ uid }) {
  const colors = ["#6f8f4a", "#b1462f", "#7a5a86", "#c98a2c"];
  const dots = [-42, -28, -14, 0, 14, 28, 42];
  return (
    <>
      <ellipse cx="100" cy="98" rx="66" ry="24" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      {dots.map((dx, i) => (
        <circle key={i} cx={100 + dx} cy={92 - Math.abs(dx) * 0.12} r="10" fill={colors[i % colors.length]} opacity="0.88" />
      ))}
      <ellipse cx="60" cy="55" rx="10" ry="5" fill="#5a7a3e" opacity="0.8" transform="rotate(-15 60 55)" />
    </>
  );
}

function QuicheSVG({ uid }) {
  return (
    <>
      <path d="M30 118 L100 30 L170 118 Z" fill="#8a6a2e" opacity="0.9" />
      <path d="M38 118 L100 42 L162 118 Z" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <ellipse cx="80" cy="90" rx="6" ry="3.5" fill="#4a2a18" opacity="0.6" />
      <ellipse cx="105" cy="100" rx="5" ry="3" fill="#4a2a18" opacity="0.6" />
      <ellipse cx="120" cy="80" rx="5" ry="3" fill="#4a2a18" opacity="0.6" />
      <circle cx="95" cy="70" r="1.6" fill="#7a9a5e" />
      <circle cx="112" cy="92" r="1.6" fill="#7a9a5e" />
      <circle cx="85" cy="105" r="1.6" fill="#7a9a5e" />
    </>
  );
}

function DessertDefaultSVG({ uid }) {
  return (
    <>
      <ellipse cx="100" cy="105" rx="46" ry="12" fill="#5a3a4a" opacity="0.3" />
      <path d="M56 100 C56 68 144 68 144 100 C144 118 56 118 56 100 Z" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <circle cx="100" cy="66" r="8" fill="#a8324f" />
      <ellipse cx="118" cy="58" rx="7" ry="4" fill="#5a8a4a" transform="rotate(30 118 58)" />
      <ellipse cx="80" cy="85" rx="16" ry="8" fill="#ffffff" opacity="0.18" />
    </>
  );
}

function PlatDefaultSVG({ uid }) {
  return (
    <>
      <ellipse cx="100" cy="100" rx="60" ry="22" fill={`url(#main-${uid})`} filter={`url(#shadow-${uid})`} />
      <path d="M78 65 C74 55 80 48 76 38" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M100 62 C96 52 102 45 98 35" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M122 65 C118 55 124 48 120 38" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
      <rect x="150" y="70" width="6" height="34" rx="3" fill="#6b4a2a" transform="rotate(18 150 70)" />
      <ellipse cx="158" cy="68" rx="8" ry="5" fill="#6b4a2a" transform="rotate(18 158 68)" />
    </>
  );
}

function EmpanadaSVG({ uid }) {
  const crimps = [46, 58, 70, 82, 94, 106, 118, 130, 142, 154];
  return (
    <>
      <path
        d="M40 96 C40 58 68 36 100 36 C132 36 160 58 160 96 C160 116 132 128 100 128 C68 128 40 116 40 96 Z"
        fill={`url(#main-${uid})`}
        filter={`url(#shadow-${uid})`}
      />
      {crimps.map((x, i) => (
        <circle key={i} cx={x} cy={124 - Math.abs(x - 100) * 0.18} r="4.2" fill="#00000020" />
      ))}
      <ellipse cx="76" cy="60" rx="20" ry="10" fill="#ffffff" opacity="0.22" transform="rotate(-18 76 60)" />
      <path d="M60 78 C80 70 120 70 140 78" stroke="#00000018" strokeWidth="2.5" fill="none" />
    </>
  );
}

const ILLUSTRATIONS = {
  tarte: { label: "Tarte dorée", palette: ["#f2c869", "#c9862c", "#7c4a1e"], render: TarteSVG },
  chocolat: { label: "Fondant au chocolat", palette: ["#8a5a3a", "#5a2f1e", "#2e160c"], render: ChocolatSVG },
  crepe: { label: "Crêpes", palette: ["#f6e9c2", "#e3c26a", "#8a6a2e"], render: CrepeSVG },
  poulet: { label: "Poulet rôti", palette: ["#e3ac66", "#b5722e", "#6b3d1c"], render: PouletSVG },
  ratatouille: { label: "Ratatouille", palette: ["#e0a83a", "#c1543a", "#6b8a45"], render: RatatouilleSVG },
  quiche: { label: "Quiche", palette: ["#f0dd8f", "#d9b45c", "#8a6a2e"], render: QuicheSVG },
  empanada: { label: "Empanada", palette: ["#e8b25a", "#c17f2c", "#7c4a1e"], render: EmpanadaSVG },
  dessert: { label: "Dessert gourmand", palette: ["#e6a8bb", "#b5637e", "#5a3a4a"], render: DessertDefaultSVG },
  plat: { label: "Plat mijoté", palette: ["#c9d3a8", "#8a9a5e", "#4a5c34"], render: PlatDefaultSVG },
};

const DISH_MATCH = [
  { test: /kouign|amann|tarte/i, key: "tarte" },
  { test: /chocolat|fondant|cacao/i, key: "chocolat" },
  { test: /cr[êe]pe|galette/i, key: "crepe" },
  { test: /poulet|rôti|roti|volaille/i, key: "poulet" },
  { test: /ratatouille|légume|legume|provenç/i, key: "ratatouille" },
  { test: /quiche/i, key: "quiche" },
  { test: /empanada/i, key: "empanada" },
];

function resolveIllustrationKey(recipe) {
  if (recipe.illustrationKey && ILLUSTRATIONS[recipe.illustrationKey]) return recipe.illustrationKey;
  const match = DISH_MATCH.find((d) => d.test.test(recipe.title || ""));
  if (match) return match.key;
  return isSucre(recipe) ? "dessert" : "plat";
}

let dishArtCounter = 0;
function DishArt({ recipe }) {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `dish-${dishArtCounter++}`;
  const artUid = idRef.current;
  const key = resolveIllustrationKey(recipe);
  const config = ILLUSTRATIONS[key];
  const Render = config.render;
  const [light, mid, dark] = config.palette;
  return (
    <div className="illus illus-art">
      <svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={`bg-${artUid}`} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor={light} stopOpacity="0.55" />
            <stop offset="100%" stopColor={dark} stopOpacity="0.35" />
          </radialGradient>
          <linearGradient id={`main-${artUid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={light} />
            <stop offset="60%" stopColor={mid} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
          <filter id={`shadow-${artUid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2a2013" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect width="200" height="150" fill="#f1e6c8" />
        <rect width="200" height="150" fill={`url(#bg-${artUid})`} />
        <Render uid={artUid} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS PARTAGÉS                                         */
/* ------------------------------------------------------------------ */

function Flourish() {
  return <div className="flourish" aria-hidden="true">❦</div>;
}

function Seal({ children, onClick, tone = "gold", disabled, type = "button", haptic = 15 }) {
  const handleClick = (e) => {
    if (disabled) return;
    triggerHaptic(haptic);
    if (onClick) onClick(e);
  };
  return (
    <button type={type} className={`seal seal-${tone}`} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  MODALES : PARTAGE, IMPORT, RÉGLAGES SECRETS                        */
/* ------------------------------------------------------------------ */

function TextShareModal({ title, text, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{title}</h2>
        <p className="hint" style={{ margin: "4px 0 12px" }}>Ton navigateur a bloqué la copie automatique — sélectionne et copie le texte ci-dessous.</p>
        <textarea ref={ref} className="share-textarea" readOnly value={text} rows={8} onClick={(e) => e.target.select()} />
        <Seal
          tone="gold"
          onClick={async () => {
            const ok = await copyText(text);
            if (ok) onClose();
          }}
        >
          <Copy size={16} /> Copier
        </Seal>
      </div>
    </div>
  );
}

function ImportConfirmModal({ recipe, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        <h2 className="dropcap-title">Nouvelle recette reçue</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Ajouter <strong>{recipe.title}</strong> à ton Grimoire ?
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm}>Ajouter</Seal>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ recipe, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        <h2 className="dropcap-title">Supprimer la recette ?</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Voulez-vous vraiment supprimer <strong>{recipe.title}</strong> de ton Grimoire ? Cette action est définitive.
        </p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onCancel}>Annuler</Seal>
          <Seal tone="gold" onClick={onConfirm} haptic={30}>Supprimer</Seal>
        </div>
      </div>
    </div>
  );
}

function QuantityWheelModal({ item, onChange, onClose }) {
  const [value, setValue] = useState(Math.max(0, Math.round(item.qty)));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page qty-wheel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">{item.name}</h2>
        <p className="hint" style={{ fontStyle: "normal" }}>Ajuste la quantité{item.unit ? ` (${item.unit})` : ""}.</p>
        <div className="qty-wheel-wrap">
          <PortionWheel value={value} onChange={setValue} min={0} max={99} dark={false} suffix={item.unit || ""} />
        </div>
        <Seal
          tone="gold"
          onClick={() => { onChange(value); onClose(); }}
        >
          <Check size={16} /> Valider
        </Seal>
      </div>
    </div>
  );
}

function ListsManagerModal({ lists, activeListId, onOpen, onCreate, onRename, onDelete, onClose }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (list) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
  };
  const commitRename = () => {
    if (renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Mes listes de courses</h2>
        <Flourish />
        {lists.length === 0 ? (
          <p className="hint">Aucune liste pour l'instant.</p>
        ) : (
          <div className="lists-manager">
            {lists.map((list) => (
              <div key={list.id} className={`lists-manager-row ${list.id === activeListId ? "active" : ""}`}>
                {renamingId === list.id ? (
                  <input
                    className="lists-manager-rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={commitRename}
                  />
                ) : (
                  <button type="button" className="lists-manager-name" onClick={() => { onOpen(list.id); onClose(); }}>
                    {list.name}
                    <span className="lists-manager-count">{list.items.length} article{list.items.length > 1 ? "s" : ""}</span>
                  </button>
                )}
                <button type="button" className="lists-manager-icon-btn" onClick={() => startRename(list)} aria-label="Renommer">✎</button>
                <button type="button" className="lists-manager-icon-btn lists-manager-delete" onClick={() => onDelete(list.id)} aria-label="Supprimer">✕</button>
              </div>
            ))}
          </div>
        )}
        <Seal tone="gold" onClick={() => { onCreate(); onClose(); }} style={{ marginTop: 16 }}>
          <Plus size={16} /> Nouvelle liste
        </Seal>
      </div>
    </div>
  );
}

const TEMPLATE_PLACEHOLDER = `Recette de : Kouign-amann
Nombre de parts : 8
Temps de préparation : 70 min
Matériel spécifique : moule rond
Ingrédients :
250 g farine
200 g beurre
200 g sucre
Préparation :
Pétrir la farine, l'eau, la levure et le sel.
Laisser lever 1 heure puis incorporer le beurre.
Remarques : encore meilleur tiède.`;

function TextTemplateImportModal({ onClose, onImport }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const parsed = parseRecipeTemplate(text);
    if (!parsed) {
      setError("Impossible de lire cette fiche — vérifie qu'elle commence bien par \"Recette de : …\".");
      return;
    }
    onImport(parsed);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page form-clean" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Importer ma fiche texte</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>
          Colle ta fiche telle quelle, avec les intitulés "Recette de", "Nombre de parts", "Temps de préparation",
          "Matériel spécifique", "Ingrédients", "Préparation" et "Remarques".
        </p>
        <textarea
          rows={12}
          className="template-textarea"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          placeholder={TEMPLATE_PLACEHOLDER}
        />
        {error && <p className="import-error">{error}</p>}
        <Seal tone="gold" onClick={submit}><Wand2 size={16} /> Analyser et importer</Seal>
      </div>
    </div>
  );
}

const PRESS_DURATION_OPTIONS = [
  { value: 500, label: "Court", sub: "0,5 s" },
  { value: 750, label: "Standard", sub: "0,75 s" },
  { value: 1000, label: "Long", sub: "1 s" },
];
function formatPressDuration(ms) {
  const s = ms / 1000;
  return Number.isInteger(s) ? `${s}s` : `${s.toString().replace(".", ",")}s`;
}

function SecretSettingsModal({ onClose, onExport, onImportFile, onImportTextRecipe, pressDuration, onSetPressDuration }) {
  const fileRef = useRef(null);
  const [showImportChoice, setShowImportChoice] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Réglages secrets du grimoire</h2>
        <Flourish />
        <p className="hint" style={{ fontStyle: "normal" }}>Sauvegarde ou fusionne l'intégralité de ton grimoire.</p>
        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <Seal tone="gold" onClick={onExport}>
            <Download size={16} /> Exporter mon grimoire
          </Seal>
          <Seal tone="gold" onClick={() => setShowImportChoice((v) => !v)}>
            <Upload size={16} /> Importer un grimoire
          </Seal>
        </div>
        {showImportChoice && (
          <div className="add-choice-list" style={{ marginTop: 14 }}>
            <Seal tone="gold" onClick={() => fileRef.current && fileRef.current.click()}>
              <FileText size={16} /> Fichier JSON complet
            </Seal>
            <Seal tone="gold" onClick={() => { onImportTextRecipe(); onClose(); }}>
              <Wand2 size={16} /> Fiche texte individuelle
            </Seal>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => { onImportFile(e); onClose(); }}
        />

        <h4 style={{ marginTop: 24 }}>Temps d'appui long</h4>
        <p className="hint" style={{ fontStyle: "normal", marginBottom: 10 }}>
          Durée à maintenir pour supprimer une carte ou ajouter un titre de section.
        </p>
        <div className="press-duration-options">
          {PRESS_DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`press-duration-pill ${pressDuration === opt.value ? "active" : ""}`}
              onClick={() => { triggerHaptic(15); onSetPressDuration(opt.value); }}
            >
              <span className="press-duration-label">{opt.label}</span>
              <span className="press-duration-sub">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareRecipeModal({ recipe, servings, ingredients, onClose, shareText, showToast }) {
  const doCopyCode = () => {
    const code = encodeRecipeCode(recipe);
    if (!code) { showToast("Impossible de générer le code."); return; }
    shareText(buildImportLink(code), "Lien de la recette");
  };

  const doDownloadFile = () => {
    try {
      const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(recipe.title)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Recette téléchargée !");
    } catch {
      showToast("Téléchargement impossible sur cet appareil.");
    }
  };

  const doExportPDF = () => {
    try {
      triggerPrint(buildPrintHTML(recipe, servings, ingredients));
    } catch {
      showToast("Export PDF impossible sur cet appareil.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Partager « {recipe.title} »</h2>
        <Flourish />
        <h4>Transférer vers un autre Grimoire</h4>
        <div className="share-option-row">
          <Seal tone="gold" onClick={doCopyCode}><Copy size={16} /> Copier le code</Seal>
          <Seal tone="gold" onClick={doDownloadFile}><Download size={16} /> Télécharger le fichier</Seal>
        </div>
        <h4 style={{ marginTop: 22 }}>Exporter en fiche</h4>
        <Seal tone="gold" onClick={doExportPDF}><FileText size={16} /> Fiche PDF / Parchemin</Seal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : RECETTES                                                     */
/* ------------------------------------------------------------------ */

function RecipeCard({ recipe, onOpen, onToggleFavorite, onRequestDelete, enterDelay = 0, pressDuration = 750 }) {
  const nutri = estimateNutriscore(recipe.ingredients);
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);

  const startPress = () => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      triggerHaptic(30);
      onRequestDelete(recipe);
    }, pressDuration);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onOpen(recipe);
  };

  return (
    <div
      className="card recipe-card card-enter"
      style={{ animationDelay: `${enterDelay}ms` }}
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="illus-wrap">
        <DishArt recipe={recipe} />
        <button
          type="button"
          className={`fav-btn ${recipe.favorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
            triggerHaptic(15);
          }}
        >
          <Heart size={16} fill={recipe.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-top-row">
          <span className={`chip ${categoryClass(recipe)}`}>{categoryLabel(recipe)}</span>
          <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
        </div>
        <h3>{recipe.title}</h3>
        <div className="card-meta">
          <span><Clock size={13} /> {recipe.time} min</span>
          <span><Users size={13} /> {recipe.servings}</span>
        </div>
      </div>
    </div>

  );
}

function RecipeDetail({ recipe, onClose, onCook, onEdit, shareText, showToast }) {
  const [servings, setServings] = useState(() => Number(recipe && recipe.servings) || 1);
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef(null);
  const overscrollRef = useRef(0);
  const touchYRef = useRef(null);
  const closeStartYRef = useRef(null);
  const [closeDragY, setCloseDragY] = useState(0);

  if (!recipe) return null;
  const nutri = estimateNutriscore(recipe.ingredients);
  const ratio = servings / recipe.servings;
  const scaledIngredients = recipe.ingredients.map((ing) =>
    ing.isSection ? ing : { ...ing, qty: Math.round(ing.qty * ratio * 100) / 100 }
  );

  const triggerEdit = () => {
    overscrollRef.current = 0;
    onEdit(recipe);
  };

  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    if (atBottom && e.deltaY > 0) {
      overscrollRef.current += e.deltaY;
      if (overscrollRef.current > 180) triggerEdit();
    } else {
      overscrollRef.current = 0;
    }
  };

  const handleTouchStart = (e) => {
    touchYRef.current = e.touches[0].clientY;
    closeStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const currentY = e.touches[0].clientY;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;

    // Glisser vers le bas depuis le haut de la fiche : la fermer, façon feuille mobile.
    if (atTop && closeStartYRef.current != null) {
      const totalDy = currentY - closeStartYRef.current;
      setCloseDragY(totalDy > 0 ? Math.min(totalDy, 240) : 0);
    } else if (closeDragY !== 0) {
      setCloseDragY(0);
    }

    // Scroll continu tout en bas : édition secrète (comportement existant).
    if (touchYRef.current == null) return;
    const dy = touchYRef.current - currentY;
    if (atBottom && dy > 0) {
      overscrollRef.current += dy;
      touchYRef.current = currentY;
      if (overscrollRef.current > 130) triggerEdit();
    } else {
      overscrollRef.current = 0;
      touchYRef.current = currentY;
    }
  };

  const handleTouchEnd = () => {
    if (closeDragY > 110) {
      onClose();
      return;
    }
    setCloseDragY(0);
    closeStartYRef.current = null;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal grimoire-page detail-scroll"
        onClick={(e) => e.stopPropagation()}
        ref={scrollRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: closeDragY ? `translateY(${closeDragY}px)` : undefined,
          transition: closeDragY ? "none" : "transform 0.2s ease",
          opacity: closeDragY ? Math.max(1 - closeDragY / 300, 0.4) : 1,
        }}
      >
        <div className="detail-drag-handle" aria-hidden="true" />
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="detail-hero">
          <DishArt recipe={recipe} />
          <div className="detail-hero-fade" />
        </div>
        <div className="card-top-row" style={{ marginTop: 4 }}>
          <span className={`chip ${categoryClass(recipe)}`}>{categoryLabel(recipe)}</span>
          <span className="nutri-badge" style={{ background: NUTRI_COLORS[nutri] }}>{nutri}</span>
        </div>
        <h2 className="dropcap-title">{recipe.title}</h2>
        <div className="card-meta" style={{ marginBottom: 10 }}>
          <span><Clock size={13} /> {recipe.time} min</span>
          {recipe.carbs ? (
            <span className="carbs-badge">🍞 {Math.round(recipe.carbs * servings)} g glucides</span>
          ) : null}
        </div>
        <div className="portions-adjuster">
          <span><Users size={14} /> Portions</span>
          <div className="portions-stepper">
            <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Math.max(1, Number(s) - 1)); }}><Minus size={14} /></button>
            <span>{servings}</span>
            <button type="button" onClick={() => { triggerHaptic(10); setServings((s) => Number(s) + 1); }}><Plus size={14} /></button>
          </div>
        </div>
        <div className="detail-actions">
          <Seal tone="gold" onClick={() => onCook(recipe)}>
            <ChefHat size={16} /> Lancer la préparation
          </Seal>
          <Seal tone="gold" onClick={() => setShowShare(true)}>
            <Share2 size={16} /> Partager la recette
          </Seal>
        </div>
        <Flourish />
        <h4>Ingrédients {ratio !== 1 && <span className="scaled-note">(ajustés pour {servings} pers.)</span>}</h4>
        <ul className="ingredient-list">
          {scaledIngredients.map((ing, i) =>
            ing.isSection ? (
              <li key={i} className="ingredient-section-title">{ing.title}</li>
            ) : (
              <li key={i}>{ing.qty} {ing.unit} — {ing.name}</li>
            )
          )}
        </ul>
        <h4>Préparation</h4>
        {groupSteps(recipe.steps).map((group, gi) => (
          <div key={gi} className="steps-group">
            {group.title && <h5 className="steps-group-title">{group.title}</h5>}
            <ol className="steps-list">
              {group.steps.map((s, si) => (<li key={si}>{s}</li>))}
            </ol>
          </div>
        ))}
        {recipe.notes && (
          <>
            <h4>Remarques &amp; astuces</h4>
            <p className="recipe-notes">{recipe.notes}</p>
          </>
        )}
        <div className="detail-scroll-hint">· · ·</div>
      </div>
      {showShare && (
        <ShareRecipeModal
          recipe={recipe}
          servings={servings}
          ingredients={scaledIngredients}
          onClose={() => setShowShare(false)}
          shareText={shareText}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function StepTimer({ minutes }) {
  const fullSeconds = minutes * 60;
  const [seconds, setSeconds] = useState(fullSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const label =
    seconds === 0
      ? "Terminé !"
      : running
      ? `⏸ ${fmt(seconds)}`
      : seconds === fullSeconds
      ? `Lancer (${minutes} min)`
      : `▶ Reprendre (${fmt(seconds)})`;

  return (
    <button
      type="button"
      className={`step-timer-btn ${running ? "running" : ""} ${seconds === 0 ? "done" : ""}`}
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
    >
      <Clock size={13} /> {label}
    </button>
  );
}

function PortionWheel({ value, onChange, min = 1, max = 24, dark = true, suffix = "pers.", onSettle }) {
  const listRef = useRef(null);
  const itemHeight = 40;
  const wheelHeight = 120;
  const padHeight = (wheelHeight - itemHeight) / 2;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const lastReported = useRef(value);
  const mountedAtRef = useRef(0);
  const settleTimerRef = useRef(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    if (listRef.current) {
      listRef.current.scrollTop = (value - min) * itemHeight;
    }
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
    // Positionne la molette sur la valeur initiale uniquement au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / itemHeight);
    const newValue = Math.min(max, Math.max(min, idx + min));
    if (newValue !== lastReported.current) {
      lastReported.current = newValue;
      triggerHaptic(8);
      onChange(newValue);
    }

    // Validation automatique : on réarme un délai de 500ms à chaque
    // mouvement de la molette. Le tout premier événement "scroll" au
    // montage vient du positionnement programmatique initial (pas d'un
    // vrai geste utilisateur) — on l'ignore pour ne pas refermer la
    // molette avant même que l'utilisateur n'y ait touché.
    if (onSettle && Date.now() - mountedAtRef.current > 120) {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onSettle();
      }, 500);
    }
  };

  return (
    <div className={`portion-wheel-wrap ${dark ? "" : "light"}`}>
      <div className="portion-wheel-highlight" aria-hidden="true" />
      <div className="portion-wheel" ref={listRef} onScroll={handleScroll}>
        <div style={{ height: padHeight }} />
        {numbers.map((n) => (
          <div key={n} className={`portion-wheel-item ${n === value ? "active" : ""}`}>{n}</div>
        ))}
        <div style={{ height: padHeight }} />
      </div>
      {suffix && <span className="portion-wheel-suffix">{suffix}</span>}
    </div>
  );
}

function PortionBadge({ value, onChange, pressDuration = 750 }) {
  const [pressPhase, setPressPhase] = useState("idle"); // idle | charging | open
  const timerRef = useRef(null);

  const startPress = () => {
    if (pressPhase === "open") return;
    setPressPhase("charging");
    timerRef.current = setTimeout(() => {
      triggerHaptic([15, 20, 15]);
      setPressPhase("open");
    }, pressDuration);
  };
  const cancelPress = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPressPhase((p) => (p === "charging" ? "idle" : p));
  };

  return (
    <div className="portion-badge-wrap">
      <button
        type="button"
        className={`portion-badge ${pressPhase === "charging" ? "charging" : ""} ${pressPhase === "open" ? "open" : ""}`}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Maintenir pour ajuster les portions"
      >
        {value}
      </button>
      {pressPhase === "open" && (
        <div className="portion-badge-popover">
          <PortionWheel value={value} onChange={onChange} min={1} max={24} onSettle={() => setPressPhase("idle")} />
        </div>
      )}
    </div>
  );
}

function CookMode({ recipe, onClose, pressDuration = 750 }) {
  const groups = groupSteps(recipe.steps);
  const [groupIndex, setGroupIndex] = useState(0);
  const [done, setDone] = useState(() => groups.map((g) => g.steps.map(() => false)));
  const [showIngredients, setShowIngredients] = useState(false);
  const [servings, setServings] = useState(() => Number(recipe.servings) || 1);

  const currentGroup = groups[groupIndex] || { title: null, steps: [] };
  const currentDone = done[groupIndex] || [];
  const toggleDone = (i) => {
    triggerHaptic(12);
    setDone((prev) => prev.map((g, gi) => (gi === groupIndex ? g.map((d, si) => (si === i ? !d : d)) : g)));
  };
  const totalSteps = groups.reduce((sum, g) => sum + g.steps.length, 0);
  const totalDone = done.reduce((sum, g) => sum + g.filter(Boolean).length, 0);

  const goPrevGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.max(0, i - 1)); };
  const goNextGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.min(groups.length - 1, i + 1)); };

  const baseServings = Number(recipe.servings) || 1;
  const ratio = servings / baseServings;
  const scaledIngredients = recipe.ingredients.map((ing) =>
    ing.isSection ? ing : { ...ing, qty: Math.round(ing.qty * ratio * 100) / 100 }
  );

  // Le mode cuisine est sombre et doit bloquer tout scroll de l'arrière-plan :
  // on applique la couleur de fond assortie au conteneur racine (html/body)
  // pour éviter que le crème de base de l'app n'apparaisse pendant le rebond
  // de scroll iOS, et on verrouille le body en position fixe (technique la
  // plus fiable sur iOS Safari, où un simple overflow:hidden ne suffit pas
  // toujours à bloquer le scroll/rebond en arrière-plan) tant que la
  // préparation est ouverte, en restaurant exactement la position au retour.
  useEffect(() => {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;

    document.documentElement.style.backgroundColor = "#2c221e";
    document.body.style.backgroundColor = "#2c221e";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="cookmode-backdrop">
      <div className="cookmode cookmode-list">
        <button className="modal-close" onClick={onClose}><X size={22} /></button>
        <div className="cookmode-progress">{totalDone} / {totalSteps} étapes terminées</div>
        <h2 className="dropcap-title">{recipe.title}</h2>

        <div className="cookmode-ingredients-header">
          <button
            type="button"
            className={`ingredients-toggle ${showIngredients ? "open" : ""}`}
            onClick={() => { triggerHaptic(10); setShowIngredients((v) => !v); }}
          >
            Ingrédients {showIngredients ? "▲" : "▼"}
          </button>
          <PortionBadge value={servings} onChange={setServings} pressDuration={pressDuration} />
        </div>
        {showIngredients && (
          <div className="cookmode-ingredients">
            <ul>
              {scaledIngredients.map((ing, i) =>
                ing.isSection ? (
                  <li key={i} className="ingredient-section-title">{ing.title}</li>
                ) : (
                  <li key={i}>{ing.qty} {ing.unit ? `${ing.unit} ` : ""}— {ing.name}</li>
                )
              )}
            </ul>
          </div>
        )}

        {groups.length > 1 && (
          <div className="group-nav">
            <button type="button" className="group-nav-btn" onClick={goPrevGroup} disabled={groupIndex === 0}>◀</button>
            <span className="group-nav-label">
              {currentGroup.title || `Groupe ${groupIndex + 1}`} <em>({groupIndex + 1}/{groups.length})</em>
            </span>
            <button type="button" className="group-nav-btn" onClick={goNextGroup} disabled={groupIndex === groups.length - 1}>▶</button>
          </div>
        )}
        {groups.length === 1 && currentGroup.title && (
          <h3 className="group-solo-title">{currentGroup.title}</h3>
        )}

        <div className="cookmode-steps">
          {currentGroup.steps.map((s, i) => {
            const duration = parseDurationMinutes(s);
            return (
              <div key={i} className={`cookmode-step-card ${currentDone[i] ? "done" : ""}`} onClick={() => toggleDone(i)}>
                <span className="step-check">{currentDone[i] && <Check size={14} />}</span>
                <div className="step-body">
                  <p className="cookmode-step-text">{s}</p>
                  {duration != null && <StepTimer minutes={duration} />}
                </div>
              </div>
            );
          })}
        </div>

        {groups.length > 1 && groupIndex < groups.length - 1 ? (
          <Seal tone="gold" onClick={goNextGroup}>Groupe suivant ▶</Seal>
        ) : (
          <Seal tone="gold" onClick={onClose}>Terminer la préparation</Seal>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FORMULAIRE RECETTE (ajout / édition)                               */
/* ------------------------------------------------------------------ */

const UNIT_OPTIONS = [
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

function RecipeForm({ onClose, onSave, onDelete, initialRecipe, pressDuration = 750 }) {
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState(initialRecipe ? initialRecipe.title : "");
  const [category, setCategory] = useState(initialRecipe ? initialRecipe.category : "Salé");
  const [time, setTime] = useState(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState(initialRecipe ? initialRecipe.servings : 4);
  const [carbs, setCarbs] = useState(initialRecipe && initialRecipe.carbs ? initialRecipe.carbs : "");
  const [notes, setNotes] = useState(initialRecipe && initialRecipe.notes ? initialRecipe.notes : "");
  const rowIdRef = useRef(0);
  const newRowId = () => `ing-${rowIdRef.current++}`;
  const [ingredientRows, setIngredientRows] = useState(() =>
    initialRecipe && initialRecipe.ingredients.length
      ? initialRecipe.ingredients.map((i) =>
          i.isSection
            ? { id: newRowId(), isSection: true, title: i.title }
            : { id: newRowId(), qty: i.qty, unit: i.unit, name: i.name }
        )
      : [{ id: newRowId(), qty: "", unit: "g", name: "" }]
  );
  const stepIdRef = useRef(0);
  const newStepId = () => `step-${stepIdRef.current++}`;
  const [stepRows, setStepRows] = useState(() =>
    initialRecipe && initialRecipe.steps.length
      ? initialRecipe.steps.map((s) =>
          s && typeof s === "object" && s.isSection
            ? { id: newStepId(), isSection: true, title: s.title }
            : { id: newStepId(), text: s }
        )
      : [{ id: newStepId(), text: "" }]
  );
  const [importUnlocked, setImportUnlocked] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [formError, setFormError] = useState("");

  const secretImport = useSecretTrigger(() => setImportUnlocked(true));

  const addIngredientRow = () => {
    triggerHaptic(15);
    setIngredientRows((prev) => [...prev, { id: newRowId(), qty: "", unit: "g", name: "" }]);
  };
  const addIngredientSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setIngredientRows((prev) => [...prev, { id: newRowId(), isSection: true, title: "" }]);
  };
  const removeIngredientRow = (id) => {
    triggerHaptic(15);
    setIngredientRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateIngredientRow = (id, field, value) => {
    setIngredientRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const ingredientDrag = useDragReorder(ingredientRows, setIngredientRows);

  const addStepRow = () => {
    triggerHaptic(15);
    setStepRows((prev) => [...prev, { id: newStepId(), text: "" }]);
  };
  const addStepSectionRow = () => {
    triggerHaptic([20, 30, 20]);
    setStepRows((prev) => [...prev, { id: newStepId(), isSection: true, title: "" }]);
  };
  const removeStepRow = (id) => {
    triggerHaptic(15);
    setStepRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };
  const updateStepRow = (id, field, value) => {
    setStepRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const stepDrag = useDragReorder(stepRows, setStepRows);

  // Maintenir "+ Ajouter…" pendant le temps d'appui configuré ajoute un titre de section.
  const useLongPressAdd = (onShortPress, onLongPress, duration) => {
    const timer = useRef(null);
    const fired = useRef(false);
    const start = () => {
      fired.current = false;
      timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, duration);
    };
    const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
    const click = () => { if (fired.current) { fired.current = false; return; } onShortPress(); };
    return {
      onClick: click,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e) => e.preventDefault(),
    };
  };
  const ingredientAddPress = useLongPressAdd(addIngredientRow, addIngredientSectionRow, pressDuration);
  const stepAddPress = useLongPressAdd(addStepRow, addStepSectionRow, pressDuration);

  const hasTitle = title.trim().length > 0;
  const hasIngredients = ingredientRows.some((r) => !r.isSection && r.name.trim().length > 0);
  const hasSteps = stepRows.some((r) => !r.isSection && r.text.trim().length > 0);
  const canSubmit = hasTitle && hasIngredients && hasSteps;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError("Il manque le nom, les ingrédients ou les étapes de la recette.");
      return;
    }
    const ingredients = ingredientRows
      .filter((r) => (r.isSection ? r.title.trim() : r.name.trim()))
      .map((r) =>
        r.isSection
          ? { isSection: true, title: r.title.trim() }
          : { qty: parseFloat(String(r.qty).replace(",", ".")) || 0, unit: r.unit, name: r.name.trim() }
      );
    const steps = stepRows
      .filter((r) => (r.isSection ? r.title.trim() : r.text.trim()))
      .map((r) => (r.isSection ? { isSection: true, title: r.title.trim() } : r.text.trim()));
    const carbsValue = carbs !== "" && !Number.isNaN(Number(carbs)) ? Number(carbs) : null;
    const titleChanged = isEdit && initialRecipe.title !== title.trim();
    const illustrationKey =
      isEdit && initialRecipe.illustrationKey && !titleChanged
        ? initialRecipe.illustrationKey
        : resolveIllustrationKey({ title: title.trim(), category });
    onSave({
      id: isEdit ? initialRecipe.id : nextId(),
      title: title.trim(),
      category,
      time: Number(time) || 30,
      servings: Number(servings) || 4,
      carbs: carbsValue,
      notes: notes.trim() || null,
      illustrationKey,
      favorite: isEdit ? !!initialRecipe.favorite : false,
      ingredients,
      steps,
    });
    onClose();
  };

  const submitImport = () => {
    const code = extractCodeFromInput(importText);
    const parsed = decodeRecipeCode(code);
    if (!parsed) {
      setImportError("Ce code ne semble pas valide.");
      return;
    }
    onSave({ ...parsed, id: nextId(), favorite: false });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal grimoire-page form-clean"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button type="button" className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title" {...(isEdit ? {} : secretImport)}>
          {isEdit ? "Modifier la recette" : "Invoquer une recette"}
        </h2>

        {!isEdit && importUnlocked && (
          <div className="import-panel">
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
              placeholder="Colle ici le lien ou le code de recette reçu…"
            />
            {importError && <p className="import-error">{importError}</p>}
            <div className="import-panel-actions">
              <button type="button" className="link-btn" onClick={() => { setImportUnlocked(false); setImportError(""); }}>Annuler</button>
              <Seal type="button" tone="gold" onClick={submitImport}>Importer</Seal>
            </div>
          </div>
        )}

        <Flourish />
        <label className="field">
          <span>Nom de la recette</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Galette des rois" required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Salé">Salé</option>
              <option value="Sucré">Sucré</option>
            </select>
          </label>
          <label className="field">
            <span>Temps (min)</span>
            <input type="number" min="1" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Portions</span>
            <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} />
          </label>
        </div>
        <label className="field field-discreet">
          <span>Glucides (g par portion) — facultatif</span>
          <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Ex. 30" />
        </label>

        <label className="field">
          <span>Ingrédients</span>
        </label>
        <div className="ingredient-rows">
          {ingredientRows.map((row, idx) =>
            row.isSection ? (
              <div
                className="ingredient-section-row"
                key={row.id}
                ref={ingredientDrag.registerNode(row.id)}
                style={ingredientDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...ingredientDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="text"
                  className="ing-section-title"
                  value={row.title}
                  onChange={(e) => updateIngredientRow(row.id, "title", e.target.value)}
                  placeholder="Titre de la section (ex. Crème diplomate)"
                />
                {ingredientRows.length > 1 && (
                  <button
                    type="button"
                    className="ing-remove"
                    onClick={() => removeIngredientRow(row.id)}
                    aria-label="Supprimer cette section"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div
                className="ingredient-row"
                key={row.id}
                ref={ingredientDrag.registerNode(row.id)}
                style={ingredientDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...ingredientDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="ing-qty"
                  value={row.qty}
                  onChange={(e) => updateIngredientRow(row.id, "qty", e.target.value)}
                  placeholder="Qté"
                />
                <select
                  className="ing-unit"
                  value={row.unit}
                  onChange={(e) => updateIngredientRow(row.id, "unit", e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.label} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="ing-name"
                  value={row.name}
                  onChange={(e) => updateIngredientRow(row.id, "name", e.target.value)}
                  placeholder="Nom de l'ingrédient"
                />
                {ingredientRows.length > 1 && (
                  <button
                    type="button"
                    className="ing-remove"
                    onClick={() => removeIngredientRow(row.id)}
                    aria-label="Supprimer cet ingrédient"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          )}
        </div>
        <button type="button" className="link-btn add-ingredient-btn" {...ingredientAddPress}>
          + Ajouter un ingrédient <span className="long-press-hint">(maintenir {formatPressDuration(pressDuration)} : titre de section)</span>
        </button>

        <label className="field">
          <span>Étapes de préparation</span>
        </label>
        <div className="step-rows">
          {stepRows.map((row, idx) =>
            row.isSection ? (
              <div
                className="step-section-row"
                key={row.id}
                ref={stepDrag.registerNode(row.id)}
                style={stepDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...stepDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <input
                  type="text"
                  className="step-section-title"
                  value={row.title}
                  onChange={(e) => updateStepRow(row.id, "title", e.target.value)}
                  placeholder="Titre de la section (ex. Garniture)"
                />
                {stepRows.length > 1 && (
                  <button
                    type="button"
                    className="step-remove"
                    onClick={() => removeStepRow(row.id)}
                    aria-label="Supprimer cette section"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div
                className="step-row"
                key={row.id}
                ref={stepDrag.registerNode(row.id)}
                style={stepDrag.getRowStyle(row.id, idx)}
              >
                <button type="button" className="row-drag-handle" {...stepDrag.dragHandleProps(row.id, idx)} aria-label="Glisser pour réordonner">⠿</button>
                <span className="step-row-num">{idx + 1}</span>
                <input
                  type="text"
                  className="step-text"
                  value={row.text}
                  onChange={(e) => updateStepRow(row.id, "text", e.target.value)}
                  placeholder={`Étape ${idx + 1}`}
                />
                {stepRows.length > 1 && (
                  <button
                    type="button"
                    className="step-remove"
                    onClick={() => removeStepRow(row.id)}
                    aria-label="Supprimer cette étape"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          )}
        </div>
        <button type="button" className="link-btn add-step-btn" {...stepAddPress}>
          + Ajouter une étape <span className="long-press-hint">(maintenir {formatPressDuration(pressDuration)} : titre de section)</span>
        </button>

        <label className="field">
          <span>Remarques / Astuces — facultatif</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. Peut se préparer la veille, remplacer le beurre par…"
          />
        </label>

        <div className="form-footer">
          {formError && <p className="import-error">{formError}</p>}
          <Seal type="submit" tone="gold" disabled={!canSubmit} haptic={[100, 50, 40, 50, 150]}>
            <Wand2 size={16} /> {isEdit ? "Enregistrer les modifications" : "Sceller la recette"}
          </Seal>
          {isEdit && (
            <button
              type="button"
              className="link-btn delete-recipe-btn"
              onClick={() => { triggerHaptic(30); onDelete(initialRecipe.id); onClose(); }}
            >
              Supprimer cette recette
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : RECETTES (liste + recherche + favoris)                       */
/* ------------------------------------------------------------------ */

function RecipesView({ recipes, filter, search, favoritesOnly, onToggleFavorite, onAddRequest, onOpen, onRequestDelete, pressDuration }) {
  const q = search.trim().toLowerCase();
  const filtered = recipes
    .filter((r) => {
      if (filter !== "tout" && normalize(r.category) !== filter) return false;
      if (favoritesOnly && !r.favorite) return false;
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q);
        const inIngredients = r.ingredients.some((ing) => !ing.isSection && ing.name.toLowerCase().includes(q));
        if (!inTitle && !inIngredients) return false;
      }
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  return (
    <div className="view">
      {filtered.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>Aucune recette ne correspond à ta recherche.</p>
      ) : (
        <div className="recipes-grid" key={`${filter}-${favoritesOnly}`}>
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onOpen={onOpen}
              onToggleFavorite={onToggleFavorite}
              onRequestDelete={onRequestDelete}
              enterDelay={Math.min(i, 10) * 45}
              pressDuration={pressDuration}
            />
          ))}
        </div>
      )}
      <button className="fab" onClick={() => { triggerHaptic(15); onAddRequest(); }}>
        <Plus size={22} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : MON FRIGO                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_BASICS = [
  "Sel", "Poivre", "Huile d'olive", "Vinaigre", "Farine", "Sucre en poudre",
  "Sucre vanillé", "Levure chimique", "Maïzena", "Cacao en poudre", "Miel",
];

function collectPantryOptions(recipes) {
  const seen = new Map();
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      if (ing.isSection) return;
      const key = ingredientKey(ing.name);
      if (key && !seen.has(key)) seen.set(key, ing.name.trim());
    });
  });
  return Array.from(seen.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function missingIngredients(recipe, ownedSet) {
  return recipe.ingredients.filter((ing) => !ing.isSection && !ownedSet.has(ingredientKey(ing.name)));
}

function FridgeView({ recipes, pantry, setPantry, basics, search, onMoveBasicToVariable, onRemoveBasic, onResetPantry, onOpen }) {
  const q = search.trim().toLowerCase();

  const basicKeys = basics.map(ingredientKey);
  const baseOptions = collectPantryOptions(recipes).filter((opt) => !basicKeys.includes(opt.key));
  const extraFromPantry = pantry
    .filter((key) => !baseOptions.some((o) => o.key === key) && !basicKeys.includes(key))
    .map((key) => ({ key, label: key }));
  const options = [...baseOptions, ...extraFromPantry].sort((a, b) => a.label.localeCompare(b.label));
  const filteredOptions = q ? options.filter((opt) => opt.label.toLowerCase().includes(q)) : options;

  const pantrySet = new Set(pantry);
  const ownedSet = new Set([...pantry, ...basicKeys]);

  const toggle = (key) => {
    triggerHaptic(12);
    setPantry((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const ranked = recipes
    .map((r) => ({ recipe: r, missing: missingIngredients(r, ownedSet) }))
    .sort((a, b) => a.missing.length - b.missing.length || a.recipe.title.localeCompare(b.recipe.title, "fr"));

  const sortedBasics = [...basics].sort((a, b) => a.localeCompare(b, "fr"));
  const filteredBasics = q ? sortedBasics.filter((name) => name.toLowerCase().includes(q)) : sortedBasics;

  return (
    <div className="view">
      <h4 className="basics-title">Basiques <span className="hint-inline">(toujours sous la main)</span></h4>
      <div className="basics-grid">
        {filteredBasics.map((name) => (
          <div className="basic-chip" key={name}>
            <span>{name}</span>
            <button
              type="button"
              className="basic-action"
              onClick={() => onMoveBasicToVariable(name)}
              aria-label={`Basculer ${name} vers les ingrédients variables`}
              title="Basculer vers les ingrédients variables"
            >
              ⇄
            </button>
            <button
              type="button"
              className="basic-action basic-action-remove"
              onClick={() => onRemoveBasic(name)}
              aria-label={`Retirer ${name} des basiques`}
              title="Retirer des basiques (ajouté à la liste de courses)"
            >
              ✕
            </button>
          </div>
        ))}
        {filteredBasics.length === 0 && (
          <p className="hint" style={{ margin: 0 }}>
            {q ? "Aucun basique ne correspond." : "Aucun basique pour l'instant."}
          </p>
        )}
      </div>

      <p className="hint">Coche ce que tu as sous la main…</p>
      {filteredOptions.length === 0 ? (
        <p className="hint">{q ? "Aucun ingrédient ne correspond." : "Ajoute des recettes pour remplir ton frigo virtuel."}</p>
      ) : (
        <div className="pantry-grid">
          {filteredOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`pantry-chip ${pantrySet.has(opt.key) ? "active" : ""}`}
              onClick={() => toggle(opt.key)}
            >
              {pantrySet.has(opt.key) && <Check size={12} />} {opt.label}
            </button>
          ))}
        </div>
      )}

      <SwipeFlourish onSwipeLeft={onResetPantry} onSwipeRight={() => {}} />
      <h4>Réalisable avec ton frigo</h4>
      <div className="fridge-results">
        {ranked.map(({ recipe, missing }, i) => (
          <div
            className="card fridge-row card-enter"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            key={recipe.id}
            onClick={() => onOpen(recipe)}
          >
            <div className="fridge-thumb"><DishArt recipe={recipe} /></div>
            <div className="fridge-row-body">
              <h5>{recipe.title}</h5>
              {missing.length === 0 ? (
                <span className="fridge-ready"><Check size={13} /> Prêt à cuisiner !</span>
              ) : (
                <span className="fridge-missing">Ingrédients manquants : {missing.length}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : COURSES (minimaliste)                                        */
/* ------------------------------------------------------------------ */

function SwipeFlourish({ onSwipeRight, onSwipeLeft }) {
  const startRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    startRef.current = e.clientX;
    setIsDragging(true);
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const handlePointerMove = (e) => {
    if (startRef.current == null) return;
    setDragX(e.clientX - startRef.current);
  };
  const endGesture = (e) => {
    if (startRef.current == null) { setIsDragging(false); setDragX(0); return; }
    const dx = e.clientX - startRef.current;
    startRef.current = null;
    setIsDragging(false);
    setDragX(0);
    if (Math.abs(dx) < 40) return;
    if (dx > 0) onSwipeRight();
    else onSwipeLeft();
  };
  const cancelGesture = () => {
    startRef.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  const hintClass = dragX > 24 ? "hint-right" : dragX < -24 ? "hint-left" : "";

  return (
    <div
      className={`flourish flourish-swipe ${hintClass}`}
      aria-hidden="true"
      style={{
        transform: `translateX(${dragX}px)`,
        // Aucune transition pendant le geste (suit le doigt au pixel près) ;
        // un rebond élastique uniquement au relâchement.
        transition: isDragging
          ? "none"
          : "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={cancelGesture}
      onPointerLeave={() => { if (isDragging) cancelGesture(); }}
    >
      ❦
    </div>
  );
}

function ShoppingItemRow({ item, checked, onToggle, onAdjust, onOpenWheel, pressDuration }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = () => {
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; triggerHaptic(25); onOpenWheel(item); }, pressDuration);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const handleClick = () => {
    if (fired.current) { fired.current = false; return; }
    onToggle(item.id);
  };
  return (
    <li className={checked ? "checked" : ""}>
      <span
        className="checkbox-row"
        onClick={handleClick}
        onTouchStart={start}
        onTouchEnd={cancel}
        onTouchMove={cancel}
        onMouseDown={start}
        onMouseUp={cancel}
        onMouseLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="checkbox">{checked && <Check size={11} />}</span>
        <span>{item.qty > 0 ? `${Math.round(item.qty * 100) / 100}${item.unit ? ` ${item.unit}` : ""} — ` : ""}{item.name}</span>
      </span>
      {!checked && onAdjust && (
        <span className="qty-stepper">
          <button type="button" onClick={(e) => { e.stopPropagation(); onAdjust(item.id, -1); }}><Minus size={11} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onAdjust(item.id, 1); }}><Plus size={11} /></button>
        </span>
      )}
    </li>
  );
}

function ShoppingView({
  recipes,
  activeList,
  onAddManualItem,
  onToggleItem,
  onAdjustQty,
  onSetItemQty,
  onGenerateFromRecipes,
  onResetActiveList,
  onCreateList,
  onOpenManager,
  showToast,
  pressDuration,
}) {
  const [manualInput, setManualInput] = useState("");
  const [selected, setSelected] = useState([]);
  const [wheelItem, setWheelItem] = useState(null);

  useEffect(() => {
    setSelected([]);
  }, [activeList && activeList.id]);

  const items = activeList ? activeList.items : [];

  const toggleRecipe = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAll = () => setSelected(recipes.map((r) => r.id));
  const selectNone = () => setSelected([]);

  const addManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    onAddManualItem(name);
    setManualInput("");
  };

  const unchecked = items.filter((i) => !i.checked);
  const bought = [...items.filter((i) => i.checked)].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const grouped = unchecked.reduce((acc, item) => {
    acc[item.aisle] = acc[item.aisle] || [];
    acc[item.aisle].push(item);
    return acc;
  }, {});
  Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, "fr")));
  const aisleCount = new Set(items.map((i) => i.aisle)).size;

  const buildListText = () => {
    const lines = [`🛒 ${activeList ? activeList.name : "Liste de courses"} — Le Grimoire de Morgane`, ""];
    Object.entries(grouped).forEach(([aisle, list]) => {
      lines.push(`${aisle} :`);
      list.forEach((it) => lines.push(`- ${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} ${it.name}`));
      lines.push("");
    });
    if (bought.length) {
      lines.push("Déjà achetés :");
      bought.forEach((it) => lines.push(`- ${it.name}`));
    }
    return lines.join("\n").trim();
  };

  const handleAppleCopy = async () => {
    await copyText(buildListText());
    showToast("Liste copiée !");
    triggerHaptic(40);
  };
  const handleAppleReset = () => {
    onResetActiveList();
    setSelected([]);
  };

  return (
    <div className="view">
      {activeList && (
        <div className="active-list-header">
          <button type="button" className="active-list-name" onClick={onOpenManager}>
            {activeList.name} <span className="active-list-switch">changer ▾</span>
          </button>
        </div>
      )}

      <div className="manual-add-row">
        <input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          placeholder="+ Ajouter un article (ex: Lait, Sopalin…)"
        />
        <button type="button" onClick={addManual}><Plus size={16} /></button>
      </div>

      <p className="hint">Ou sélectionne des recettes pour convoquer leurs ingrédients.</p>
      <div className="shopping-actions">
        <button type="button" className="link-btn" onClick={selectAll}><CheckSquare size={14} /> Tout cocher</button>
        <button type="button" className="link-btn" onClick={selectNone}><Square size={14} /> Tout décocher</button>
      </div>
      <div className="recipe-select-list">
        {[...recipes].sort((a, b) => a.title.localeCompare(b.title, "fr")).map((r) => (
          <label className="recipe-select-row card" key={r.id}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleRecipe(r.id)} />
            <span>{r.title}</span>
            <span className={`chip ${categoryClass(r)}`}>{categoryLabel(r)}</span>
          </label>
        ))}
      </div>

      {items.length > 0 && (
        <div className="shopping-result">
          <div className="parchment-recap">
            {bought.length}/{items.length} article{items.length > 1 ? "s" : ""} · {aisleCount} rayon{aisleCount > 1 ? "s" : ""}
          </div>
          <div className="apple-bar">
            <button type="button" className="apple-bar-btn" onClick={handleAppleReset} aria-label="Réinitialiser la liste">↺</button>
            <SwipeFlourish onSwipeRight={handleAppleCopy} onSwipeLeft={handleAppleReset} />
            <button type="button" className="apple-bar-btn" onClick={handleAppleCopy} aria-label="Copier la liste"><Copy size={14} /></button>
          </div>
          {Object.entries(grouped).map(([aisle, list]) => (
            <div key={aisle} className="aisle-block">
              <h4>{aisle}</h4>
              <ul className="shopping-list">
                {list.map((it) => (
                  <ShoppingItemRow
                    key={it.id}
                    item={it}
                    checked={false}
                    onToggle={onToggleItem}
                    onAdjust={onAdjustQty}
                    onOpenWheel={setWheelItem}
                    pressDuration={pressDuration}
                  />
                ))}
              </ul>
            </div>
          ))}
          {bought.length > 0 && (
            <div className="aisle-block bought-block">
              <h4>Articles achetés</h4>
              <ul className="shopping-list bought-list">
                {bought.map((it) => (
                  <ShoppingItemRow
                    key={it.id}
                    item={it}
                    checked
                    onToggle={onToggleItem}
                    onOpenWheel={setWheelItem}
                    pressDuration={pressDuration}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 ? (
        <div
          className="generate-popup"
          onClick={() => { onGenerateFromRecipes(selected); setSelected([]); }}
        >
          <span><ShoppingBasket size={16} /> Générer la liste de courses ({selected.length})</span>
          <button
            type="button"
            className="generate-popup-close"
            onClick={(e) => { e.stopPropagation(); setSelected([]); }}
            aria-label="Annuler la sélection"
          >
            ✕
          </button>
        </div>
      ) : (
        <button className="fab" onClick={() => { triggerHaptic(15); onCreateList(); }} aria-label="Nouvelle liste">
          <Plus size={22} />
        </button>
      )}

      {wheelItem && (
        <QuantityWheelModal
          item={wheelItem}
          onChange={(value) => onSetItemQty(wheelItem.id, value)}
          onClose={() => setWheelItem(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NAVIGATION                                                         */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "recettes", label: "Recettes", icon: BookOpen },
  { key: "frigo", label: "Mon Frigo", icon: Refrigerator },
  { key: "courses", label: "Courses", icon: ShoppingBasket },
];
const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "sale", label: "Salé" },
  { key: "sucre", label: "Sucré" },
];

function NavButton({ tabKey, label, Icon, active, onSelect, onLongPress, pressDuration = 750 }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = () => {
    if (!onLongPress) return;
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; triggerHaptic(20); onLongPress(); }, pressDuration);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const handleClick = () => {
    if (fired.current) { fired.current = false; return; }
    triggerHaptic(10);
    onSelect();
  };
  return (
    <button
      className={`nav-btn ${active ? "active" : ""}`}
      onClick={handleClick}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault(); }}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  APP PRINCIPALE                                                     */
/* ------------------------------------------------------------------ */

export default function GrimoireDeMorgane() {
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [basics, setBasics] = useState(DEFAULT_BASICS);
  const [pressDuration, setPressDuration] = useState(750);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [showListsManager, setShowListsManager] = useState(false);

  const [tab, setTab] = useState("recettes");
  const [filter, setFilter] = useState("tout");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [formTarget, setFormTarget] = useState(null); // null | 'new' | recipe object
  const [openRecipe, setOpenRecipe] = useState(null);
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [textModal, setTextModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showTemplateImport, setShowTemplateImport] = useState(false);
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const touchStart = useRef(null);
  const axisLock = useRef(null);
  const secretHeader = useSecretTrigger(() => setShowSecretSettings(true));

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const shareText = async (text, label) => {
    const ok = await copyText(text);
    if (ok) showToast(`${label} copié(e) !`);
    else setTextModal({ title: label, text });
  };

  useEffect(() => {
    (async () => {
      if (!SUPABASE_READY) {
        setRecipes(demoRecipes());
        setPantry([]);
        setBasics(DEFAULT_BASICS);
        setPressDuration(750);
        setShoppingLists([]);
        setActiveListId(null);
        setReady(true);
        showToast("Supabase non configuré — mode démo en mémoire.");
        return;
      }
      try {
        const [rows, state, listRows] = await Promise.all([
          fetchTable("recipes", "select=*&order=created_at.desc"),
          loadAppState(),
          fetchTable("shopping_lists", "select=*&order=created_at.asc"),
        ]);
        const mapped = (rows || []).map(mapRowToRecipe);
        setRecipes(mapped);
        setPantry((state && state.pantry) || []);
        setBasics((state && state.basics) || DEFAULT_BASICS);
        setPressDuration((state && state.press_duration) || 750);
        const mappedLists = (listRows || []).map(mapRowToShoppingList);
        setShoppingLists(mappedLists);
        setActiveListId(mappedLists.length ? mappedLists[mappedLists.length - 1].id : null);
      } catch (err) {
        console.error(err);
        showToast("Connexion Supabase impossible — mode démo en mémoire.");
        setRecipes(demoRecipes());
      } finally {
        setReady(true);
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("import");
        if (code) {
          const parsed = decodeRecipeCode(code);
          if (parsed) setPendingImport(parsed);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {
        /* pas d'URL exploitable, tant pis */
      }
    })();
  }, []);

  useEffect(() => { if (ready && SUPABASE_READY) saveAppState({ pantry }); }, [pantry, ready]);
  useEffect(() => { if (ready && SUPABASE_READY) saveAppState({ basics }); }, [basics, ready]);
  useEffect(() => { if (ready && SUPABASE_READY) saveAppState({ press_duration: pressDuration }); }, [pressDuration, ready]);

  const nextListName = () => {
    const nums = shoppingLists.map((l) => {
      const m = l.name.match(/^Liste (\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    return `Liste ${max + 1}`;
  };

  const createShoppingList = async () => {
    const id = nextId();
    const name = nextListName();
    const newList = { id, name, items: [] };
    setShoppingLists((prev) => [...prev, newList]);
    setActiveListId(id);
    triggerHaptic(15);
    if (SUPABASE_READY) {
      try {
        await insertRow("shopping_lists", mapShoppingListToRow(newList));
      } catch (err) {
        console.error(err);
        showToast("Échec de la création de la liste.");
      }
    }
    return id;
  };

  const renameShoppingList = async (id, name) => {
    setShoppingLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    if (SUPABASE_READY) {
      try {
        await updateRow("shopping_lists", id, { name });
      } catch (err) {
        console.error(err);
        showToast("Échec du renommage.");
      }
    }
  };

  const deleteShoppingList = async (id) => {
    setShoppingLists((prev) => prev.filter((l) => l.id !== id));
    setActiveListId((cur) => (cur === id ? null : cur));
    triggerHaptic(30);
    if (SUPABASE_READY) {
      try {
        await deleteRow("shopping_lists", id);
      } catch (err) {
        console.error(err);
        showToast("Échec de la suppression.");
      }
    }
  };

  const withActiveList = async (mutateFn) => {
    let listId = activeListId;
    if (!listId) listId = await createShoppingList();
    setShoppingLists((prev) => {
      const next = prev.map((l) => (l.id === listId ? { ...l, items: mutateFn(l.items) } : l));
      const target = next.find((l) => l.id === listId);
      if (target && SUPABASE_READY) {
        updateRow("shopping_lists", listId, { items: target.items }).catch((err) => console.error(err));
      }
      return next;
    });
  };

  const addManualItem = (name) => {
    withActiveList((items) => [{ id: nextId(), name, qty: 1, unit: "", checked: false, aisle: guessAisle(name) }, ...items]);
  };
  const toggleShoppingItem = (id) => {
    triggerHaptic(12);
    withActiveList((items) => items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  };
  const adjustShoppingQty = (id, delta) => {
    triggerHaptic(10);
    withActiveList((items) => items.map((it) => (it.id === id ? { ...it, qty: Math.max(0, Math.round((it.qty + delta) * 100) / 100) } : it)));
  };
  const setShoppingItemQty = (id, value) => {
    withActiveList((items) => items.map((it) => (it.id === id ? { ...it, qty: Math.max(0, value) } : it)));
  };
  const generateShoppingList = (recipeIds) => {
    const selectedRecipes = recipes.filter((r) => recipeIds.includes(r.id));
    withActiveList((items) => {
      const map = new Map(items.map((it) => [`${it.name.toLowerCase()}__${it.unit}`, { ...it }]));
      selectedRecipes.forEach((r) => {
        r.ingredients.forEach((ing) => {
          if (ing.isSection) return;
          const key = `${ing.name.toLowerCase()}__${ing.unit}`;
          if (map.has(key)) {
            map.get(key).qty += Number(ing.qty) || 0;
          } else {
            map.set(key, { id: nextId(), name: ing.name, unit: ing.unit, qty: Number(ing.qty) || 0, checked: false, aisle: guessAisle(ing.name) });
          }
        });
      });
      return Array.from(map.values());
    });
    showToast("Liste de courses générée !");
    triggerHaptic(15);
  };
  const resetActiveList = () => {
    if (!activeListId) return;
    withActiveList(() => []);
    showToast("Liste réinitialisée !");
    triggerHaptic([60, 30, 60]);
  };

  const moveBasicToVariable = (name) => {
    const key = ingredientKey(name);
    setBasics((prev) => prev.filter((b) => b !== name));
    setPantry((prev) => (prev.includes(key) ? prev : [...prev, key]));
    showToast(`${name} déplacé vers les ingrédients variables.`);
    triggerHaptic(15);
  };

  const removeBasic = async (name) => {
    setBasics((prev) => prev.filter((b) => b !== name));
    await withActiveList((items) => [{ id: nextId(), name, qty: 1, unit: "", checked: false, aisle: guessAisle(name) }, ...items]);
    showToast(`${name} retiré des basiques et ajouté à la liste de courses.`);
    triggerHaptic(20);
  };

  const resetPantry = () => {
    setPantry([]);
    showToast("Frigo réinitialisé !");
    triggerHaptic([60, 30, 60]);
  };

  const saveRecipe = async (recipe) => {
    const exists = recipes.some((r) => r.id === recipe.id);
    // Mise à jour optimiste de l'état local
    setRecipes((prev) => (exists ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev]));
    if (!SUPABASE_READY) return;
    try {
      const row = mapRecipeToRow(recipe);
      if (exists) {
        await updateRow("recipes", recipe.id, row);
      } else {
        await insertRow("recipes", row);
      }
    } catch (err) {
      console.error(err);
      showToast("Échec de la sauvegarde en base Supabase.");
    }
  };

  const importRecipe = (parsed, successMessage) => {
    const category = parsed.category === "Sucré" ? "Sucré" : "Salé";
    const title = parsed.title;
    saveRecipe({
      id: nextId(),
      title,
      category,
      time: Number(parsed.time) || 30,
      servings: Number(parsed.servings) || 4,
      carbs: parsed.carbs != null && !Number.isNaN(Number(parsed.carbs)) ? Number(parsed.carbs) : null,
      notes: parsed.notes || null,
      illustrationKey: resolveIllustrationKey({ title, category, illustrationKey: parsed.illustrationKey }),
      favorite: false,
      ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length
        ? parsed.ingredients.map((i) =>
            i && i.isSection
              ? { isSection: true, title: String(i.title || "").trim() }
              : { qty: Number(i.qty) || 0, unit: i.unit || "", name: String(i.name || "").trim() }
          )
        : [{ qty: 1, unit: "", name: "Ingrédient à préciser" }],
      steps: Array.isArray(parsed.steps) && parsed.steps.length
        ? parsed.steps
            .map((s) => (s && typeof s === "object" && s.isSection) ? { isSection: true, title: String(s.title || "").trim() } : String(s).trim())
            .filter((s) => (typeof s === "object" ? true : s))
        : ["Étape à préciser"],
    });
    showToast(successMessage);
  };

  const deleteRecipe = async (id) => {
    const previous = recipes;
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (!SUPABASE_READY) return;
    try {
      await deleteRow("recipes", id);
    } catch (err) {
      console.error(err);
      setRecipes(previous);
      showToast("Suppression impossible en base Supabase.");
    }
  };

  const toggleFavorite = async (id) => {
    const target = recipes.find((r) => r.id === id);
    if (!target) return;
    const nextFav = !target.favorite;
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: nextFav } : r)));
    if (!SUPABASE_READY) return;
    try {
      await updateRow("recipes", id, { is_favorite: nextFav });
    } catch (err) {
      console.error(err);
      setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !nextFav } : r)));
      showToast("Échec de la mise à jour du favori.");
    }
  };

  const exportGrimoire = () => {
    try {
      const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grimoire-de-morgane.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Grimoire exporté !");
    } catch {
      showToast("Export impossible sur cet appareil.");
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [data];
        const imported = list.filter((r) => r && r.title).map((r) => ({ ...r, id: nextId(), favorite: false }));
        setRecipes((prev) => [...imported, ...prev]);
        if (SUPABASE_READY) {
          for (const r of imported) {
            try { await insertRow("recipes", mapRecipeToRow(r)); } catch { /* on continue les autres */ }
          }
        }
        showToast(`${imported.length} recette(s) importée(s) !`);
      } catch {
        showToast("Fichier de grimoire illisible.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmPendingImport = () => {
    if (!pendingImport) return;
    saveRecipe({ ...pendingImport, id: nextId(), favorite: false });
    setPendingImport(null);
    showToast("Recette ajoutée !");
  };

  const filterIndex = FILTERS.findIndex((f) => f.key === filter);

  // Le swipe ne fait basculer que les filtres Recettes ("Tout" / "Salé" / "Sucré").
  // La navigation principale du bas (Recettes / Mon Frigo / Courses) reste fixe.
  // Verrouillage d'axe : dès que la direction dominante du geste est détectée
  // (verticale ou horizontale), elle est figée pour tout le reste du geste —
  // un léger décalage horizontal pendant un scroll vertical ne peut donc plus
  // déclencher un changement de catégorie par erreur, et inversement.
  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axisLock.current = null;
  };
  const onTouchMove = (e) => {
    if (touchStart.current == null || axisLock.current != null) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  };
  const onTouchEnd = (e) => {
    if (touchStart.current == null || tab !== "recettes" || axisLock.current !== "x") {
      touchStart.current = null;
      axisLock.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    touchStart.current = null;
    axisLock.current = null;
    if (Math.abs(dx) < 55) return;
    const next = dx < 0 ? Math.min(filterIndex + 1, FILTERS.length - 1) : Math.max(filterIndex - 1, 0);
    setFilter(FILTERS[next].key);
  };

  if (!ready) {
    return (
      <div className="loading-screen">
        <style>{CSS}</style>
        <Wand2 className="spin-wand" size={28} />
        <p>Ouverture du grimoire…</p>
      </div>
    );
  }

  return (
    <div className="grimoire-app">
      <style>{CSS}</style>

      <header className="app-header">
        <h1 {...secretHeader}>Le Grimoire de Morgane</h1>
        <p className="subtitle">LIVRE DE MORGANE · SALÉ &amp; SUCRÉ</p>
      </header>

      {tab === "recettes" && (
        <>
          <div className="search-bar">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher une recette ou un ingrédient…"
            />
          </div>
          <div className="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-pill ${filter === f.key ? "active" : ""}`}
                onClick={() => { triggerHaptic(10); setFilter(f.key); }}
              >
                {f.label}
              </button>
            ))}
            <button
              className={`filter-pill heart-pill ${favoritesOnly ? "active" : ""}`}
              onClick={() => { triggerHaptic(10); setFavoritesOnly((v) => !v); }}
              title="Afficher uniquement les favoris"
            >
              <Heart size={13} fill={favoritesOnly ? "currentColor" : "none"} /> Favoris
            </button>
          </div>
        </>
      )}
      {tab === "frigo" && (
        <div className="search-bar">
          <Search size={15} />
          <input
            value={fridgeSearch}
            onChange={(e) => setFridgeSearch(e.target.value)}
            placeholder="Chercher un ingrédient…"
          />
        </div>
      )}

      <main className="app-content" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {tab === "recettes" && (
          <RecipesView
            recipes={recipes}
            filter={filter}
            search={search}
            favoritesOnly={favoritesOnly}
            onToggleFavorite={toggleFavorite}
            onAddRequest={() => setFormTarget("new")}
            onOpen={setOpenRecipe}
            onRequestDelete={(r) => setDeleteTarget(r)}
            pressDuration={pressDuration}
          />
        )}
        {tab === "frigo" && (
          <FridgeView
            recipes={recipes}
            pantry={pantry}
            setPantry={setPantry}
            basics={basics}
            search={fridgeSearch}
            onMoveBasicToVariable={moveBasicToVariable}
            onRemoveBasic={removeBasic}
            onResetPantry={resetPantry}
            onOpen={setOpenRecipe}
          />
        )}
        {tab === "courses" && (
          <ShoppingView
            recipes={recipes}
            activeList={shoppingLists.find((l) => l.id === activeListId) || null}
            onAddManualItem={addManualItem}
            onToggleItem={toggleShoppingItem}
            onAdjustQty={adjustShoppingQty}
            onSetItemQty={setShoppingItemQty}
            onGenerateFromRecipes={generateShoppingList}
            onResetActiveList={resetActiveList}
            onCreateList={createShoppingList}
            onOpenManager={() => setShowListsManager(true)}
            showToast={showToast}
            pressDuration={pressDuration}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map(({ key, label, icon: Icon }) => (
          <NavButton
            key={key}
            tabKey={key}
            label={label}
            Icon={Icon}
            active={tab === key}
            onSelect={() => setTab(key)}
            onLongPress={key === "courses" && shoppingLists.length > 0 ? () => setShowListsManager(true) : null}
            pressDuration={pressDuration}
          />
        ))}
      </nav>

      {formTarget && (
        <RecipeForm
          onClose={() => setFormTarget(null)}
          onSave={saveRecipe}
          onDelete={deleteRecipe}
          initialRecipe={formTarget === "new" ? null : formTarget}
          pressDuration={pressDuration}
        />
      )}
      {openRecipe && (
        <RecipeDetail
          key={openRecipe.id}
          recipe={recipes.find((r) => r.id === openRecipe.id) || openRecipe}
          onClose={() => setOpenRecipe(null)}
          onCook={(r) => setCookingRecipe(r)}
          onEdit={(r) => { setOpenRecipe(null); setFormTarget(r); }}
          shareText={shareText}
          showToast={showToast}
        />
      )}
      {cookingRecipe && (
        <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} pressDuration={pressDuration} />
      )}
      {textModal && (
        <TextShareModal title={textModal.title} text={textModal.text} onClose={() => setTextModal(null)} />
      )}
      {pendingImport && (
        <ImportConfirmModal
          recipe={pendingImport}
          onConfirm={confirmPendingImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          recipe={deleteTarget}
          onConfirm={() => {
            deleteRecipe(deleteTarget.id);
            showToast("Recette supprimée !");
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showTemplateImport && (
        <TextTemplateImportModal
          onClose={() => setShowTemplateImport(false)}
          onImport={(parsed) => importRecipe(parsed, "Fiche importée !")}
        />
      )}
      {showSecretSettings && (
        <SecretSettingsModal
          onClose={() => setShowSecretSettings(false)}
          onExport={exportGrimoire}
          onImportFile={handleImportFile}
          onImportTextRecipe={() => setShowTemplateImport(true)}
          pressDuration={pressDuration}
          onSetPressDuration={setPressDuration}
        />
      )}
      {showListsManager && (
        <ListsManagerModal
          lists={shoppingLists}
          activeListId={activeListId}
          onOpen={(id) => setActiveListId(id)}
          onCreate={createShoppingList}
          onRename={renameShoppingList}
          onDelete={deleteShoppingList}
          onClose={() => setShowListsManager(false)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS                                                                 */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cinzel+Decorative:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');

:root {
  --parchment: #f1e6c8;
  --parchment-deep: #e6d5a8;
  --ink: #2a2013;
  --ink-soft: #5c4a30;
  --gold: #b3872a;
  --gold-light: #d9b45c;
  --wine: #7c3232;
  --plum: #5a3a63;
  --line: rgba(42,32,19,0.18);
}

html, body {
  margin: 0;
  padding: 0;
  background: #fcf8f2;
}

.grimoire-app, .loading-screen {
  font-family: 'EB Garamond', Georgia, serif;
  color: var(--ink);
  background:
    radial-gradient(ellipse at top left, rgba(255,255,255,0.35), transparent 60%),
    var(--parchment);
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  padding-top: env(safe-area-inset-top);
  padding-bottom: 84px;
  box-shadow: 0 0 40px rgba(0,0,0,0.15);
  overflow-x: hidden;
}

.loading-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 100vh; color: var(--gold);
}
.loading-screen p { color: var(--ink-soft); font-style: italic; }

* { box-sizing: border-box; }

.app-header {
  text-align: center;
  padding: 28px 20px 16px;
  border-bottom: 2px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,0.25), transparent);
}
.app-header h1 {
  font-family: 'Cinzel Decorative', 'Cinzel', serif;
  font-size: 1.55rem;
  margin: 0;
  color: var(--ink);
  letter-spacing: 0.5px;
}
.subtitle {
  margin: 6px 0 0;
  font-family: 'Cinzel', serif;
  font-size: 0.62rem;
  letter-spacing: 3px;
  color: var(--gold);
  text-transform: uppercase;
}

.search-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 14px 16px 0; padding: 9px 12px;
  background: rgba(255,255,255,0.4); border: 1px solid var(--line); border-radius: 999px;
  color: var(--ink-soft);
}
.search-bar input {
  border: none; background: transparent; outline: none; flex: 1;
  font-family: 'EB Garamond', serif; font-size: 0.95rem; color: var(--ink);
}

.filter-bar {
  display: flex; gap: 8px; padding: 14px 16px 4px; overflow-x: auto;
}
.filter-pill {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  letter-spacing: 1px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.35);
  color: var(--ink-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.filter-pill.active { background: var(--ink); color: var(--parchment); border-color: var(--ink); }
.heart-pill { display: inline-flex; align-items: center; gap: 5px; }
.heart-pill.active { color: #e8607a; border-color: #e8607a; background: rgba(232,96,122,0.12); }

.app-content { padding: 16px; min-height: 50vh; overflow-x: hidden; }
.view { animation: fadeIn 0.35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }

.hint { color: var(--ink-soft); font-style: italic; font-size: 0.92rem; margin: 4px 0 14px; }

/* --- Cartes --- */
.card {
  background: rgba(255,255,255,0.4);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 2px 0 rgba(42,32,19,0.06), 0 6px 14px rgba(42,32,19,0.07);
}

.recipes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 110px; }
.card-enter { animation: cardEnter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
.recipe-card { overflow: hidden; cursor: pointer; transition: transform 0.15s ease; }
.recipe-card:active { transform: scale(0.97); }
.card-body { padding: 10px 12px 14px; }
.card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.recipe-card h3 { font-family: 'Cinzel', serif; font-size: 0.92rem; margin: 4px 0; line-height: 1.25; }
.card-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.72rem; color: var(--ink-soft); align-items: center; }
.card-meta span { display: inline-flex; align-items: center; gap: 3px; }
.carbs-badge {
  font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.4px;
  background: rgba(179,135,42,0.15); color: var(--gold); border: 1px solid rgba(179,135,42,0.4);
  padding: 3px 8px; border-radius: 999px;
}

.chip {
  font-family: 'Cinzel', serif;
  font-size: 0.58rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
}
.chip-sale { background: var(--wine); }
.chip-sucre { background: var(--plum); }

.nutri-badge {
  width: 20px; height: 20px; border-radius: 50%;
  color: #fff; font-weight: 700; font-size: 0.68rem;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cinzel', serif;
}

.illus {
  width: 100%; aspect-ratio: 4/3;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.illus-wrap { position: relative; }
.illus-art svg { display: block; }
.fav-btn {
  position: absolute; top: 8px; right: 8px;
  width: 30px; height: 30px; border-radius: 50%; border: none;
  background: rgba(20,14,4,0.4); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(2px);
}
.fav-btn.active { color: #e8607a; background: rgba(20,14,4,0.55); }
.spin-wand { animation: spin 1.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Fiche recette --- */
.detail-drag-handle {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 4px; border-radius: 999px; background: rgba(42,32,19,0.25); z-index: 4;
}
.detail-hero { position: relative; margin: -22px -20px 0; width: calc(100% + 40px); aspect-ratio: 16/10; overflow: hidden; }
.detail-hero .illus { aspect-ratio: auto; height: 100%; }
.detail-hero-fade {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 55%, var(--parchment) 100%);
  pointer-events: none;
}
.detail-scroll { position: relative; }
.detail-scroll-hint { text-align: center; color: var(--line); font-size: 1.2rem; margin-top: 18px; letter-spacing: 4px; }
.portions-adjuster {
  display: flex; align-items: center; justify-content: space-between;
  margin: 6px 0 14px; font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--ink-soft);
}
.portions-adjuster > span:first-child { display: inline-flex; align-items: center; gap: 6px; }
.portions-stepper { display: flex; align-items: center; gap: 10px; }
.portions-stepper button {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--gold);
  background: rgba(255,255,255,0.4); color: var(--ink); display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.portions-stepper span { min-width: 18px; text-align: center; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink); }
.scaled-note { font-style: italic; font-weight: normal; text-transform: none; letter-spacing: 0; font-size: 0.78rem; color: var(--ink-soft); }
.detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.detail-actions .seal { flex: 1; justify-content: center; }

/* --- Sceaux / boutons --- */
.seal {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1px solid var(--gold);
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  color: #2a1c07;
  cursor: pointer;
  box-shadow: 0 3px 0 #8a651c, 0 6px 12px rgba(0,0,0,0.15);
  transition: transform 0.08s ease;
}
.seal:active { transform: translateY(2px); box-shadow: 0 1px 0 #8a651c; }
.seal:disabled { opacity: 0.45; cursor: not-allowed; }

.fab {
  position: fixed;
  right: calc(50% - 240px + 18px);
  bottom: 96px;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--ink); color: var(--gold-light);
  border: 2px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 14px rgba(0,0,0,0.3);
  cursor: pointer;
}
@media (max-width: 520px) { .fab { right: 18px; } }

.generate-popup {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 448px; box-sizing: border-box;
  background: var(--ink); color: var(--gold-light);
  border: 2px solid var(--gold); border-radius: 999px;
  padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.35); z-index: 40; cursor: pointer;
}
.generate-popup span { display: inline-flex; align-items: center; gap: 8px; font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.5px; text-transform: uppercase; }
.generate-popup-close { flex-shrink: 0; background: none; border: none; color: var(--gold-light); opacity: 0.7; font-size: 0.85rem; cursor: pointer; }

/* --- Mon Frigo --- */
.basics-title {
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; color: var(--gold);
  margin: 4px 0 8px; display: flex; align-items: baseline; gap: 8px;
}
.hint-inline { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.75rem; letter-spacing: 0; text-transform: none; color: var(--ink-soft); }
.basics-grid {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
  padding: 12px; border-radius: 10px;
  background: rgba(179,135,42,0.12); border: 1px solid rgba(179,135,42,0.3);
}
.basic-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'EB Garamond', serif; font-size: 0.86rem; color: var(--ink);
  background: rgba(255,255,255,0.55); border: 1px solid rgba(179,135,42,0.4);
  border-radius: 999px; padding: 6px 6px 6px 13px;
}
.basic-action {
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: rgba(179,135,42,0.2); color: var(--gold); font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}
.basic-action-remove { background: rgba(124,50,50,0.15); color: var(--wine); }
.pantry-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.pantry-chip {
  font-family: 'EB Garamond', serif; font-size: 0.86rem;
  padding: 7px 13px; border-radius: 999px; border: 1px solid var(--line);
  background: rgba(255,255,255,0.4); color: var(--ink-soft); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
}
.pantry-chip.active { background: var(--ink); color: var(--gold-light); border-color: var(--ink); }
.fridge-results { display: flex; flex-direction: column; gap: 10px; }
.fridge-row { display: flex; align-items: center; gap: 12px; padding: 8px; cursor: pointer; }
.fridge-thumb { width: 60px; height: 46px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.fridge-row-body h5 { margin: 0 0 4px; font-family: 'Cinzel', serif; font-size: 0.85rem; }
.fridge-ready { color: #3E7A3E; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
.fridge-missing { color: var(--wine); font-size: 0.78rem; }

/* --- Courses --- */
.active-list-header { margin-bottom: 12px; }
.active-list-name {
  background: none; border: none; cursor: pointer; padding: 0;
  font-family: 'Cinzel', serif; font-size: 1rem; color: var(--ink);
  display: flex; align-items: baseline; gap: 8px;
}
.active-list-switch { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.78rem; color: var(--gold); }
.manual-add-row {
  display: flex; gap: 8px; margin-bottom: 16px;
  background: rgba(255,255,255,0.4); border: 1px solid var(--line); border-radius: 999px; padding: 4px 4px 4px 14px;
}
.manual-add-row input {
  flex: 1; border: none; background: transparent; outline: none;
  font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
}
.manual-add-row button {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: var(--gold); color: #2a1c07; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.shopping-actions { display: flex; gap: 18px; margin-bottom: 10px; }
.recipe-select-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.recipe-select-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
.recipe-select-row span:nth-child(2) { flex: 1; }
.shopping-result { margin-top: 20px; }
.parchment-recap {
  text-align: center; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--ink-soft); background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.3);
  border-radius: 999px; padding: 8px 14px; margin-bottom: 10px;
}
.apple-bar {
  display: flex; align-items: center; justify-content: center; gap: 22px;
  margin-bottom: 14px;
}
.apple-bar-btn {
  width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--line);
  background: rgba(255,255,255,0.4); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem;
}
.aisle-block { margin-bottom: 16px; }
.aisle-block h4 { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 1px; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px dashed var(--line); padding-bottom: 4px; }
.shopping-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.shopping-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.92rem; }
.checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; }
.shopping-list li.checked { opacity: 0.45; text-decoration: line-through; }
.checkbox {
  width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--gold);
  display: flex; align-items: center; justify-content: center; color: var(--gold); flex-shrink: 0;
}
.qty-stepper { display: flex; gap: 4px; opacity: 0.45; flex-shrink: 0; }
.qty-stepper button {
  width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--line);
  background: rgba(255,255,255,0.5); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.bought-block h4 { color: var(--ink-soft); }

/* --- Navigation basse --- */
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  display: flex; justify-content: space-around;
  background: var(--ink);
  border-top: 2px solid var(--gold);
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
}
.nav-btn {
  background: none; border: none; color: #b6a884;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.5px;
  cursor: pointer; padding: 4px 10px;
}
.nav-btn.active { color: var(--gold-light); }

/* --- Modales / page de grimoire --- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(20,14,4,0.55);
  display: flex; align-items: flex-end; justify-content: center; z-index: 50;
  padding: 0;
}
.modal, .grimoire-page {
  background: var(--parchment);
  width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; overflow-x: hidden;
  border-radius: 18px 18px 0 0;
  padding: 22px 20px 30px;
  position: relative;
  border-top: 3px solid var(--gold);
  animation: slideUp 0.28s ease;
}
.form-clean { max-width: 100%; overflow-x: hidden; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-close {
  position: absolute; top: 14px; right: 14px; z-index: 5;
  background: rgba(0,0,0,0.06); border: none; border-radius: 50%;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  color: var(--ink-soft); cursor: pointer;
}
.dropcap-title { font-family: 'Cinzel', serif; font-size: 1.3rem; margin: 10px 0 4px; }
.flourish { text-align: center; color: var(--gold); font-size: 1.1rem; margin: 12px 0; }
.modal h4 { font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.5px; margin: 16px 0 8px; color: var(--ink-soft); }
.ingredient-list, .steps-list { padding-left: 20px; margin: 0 0 12px; }
.ingredient-list li, .steps-list li { margin-bottom: 5px; font-size: 0.95rem; }
.recipe-notes { font-style: italic; color: var(--ink-soft); font-size: 0.92rem; line-height: 1.5; margin: 0 0 12px; }

.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 0.82rem; color: var(--ink-soft); font-family: 'Cinzel', serif; letter-spacing: 0.3px; max-width: 100%; }
.field input, .field select, .field textarea {
  font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px;
  padding: 9px 10px; resize: vertical; width: 100%; max-width: 100%;
}
.field-row { display: flex; gap: 10px; max-width: 100%; }
.field-row .field { flex: 1; min-width: 0; }
.field-discreet { opacity: 0.8; }
.field-discreet span { font-size: 0.72rem; }
.field-discreet input { font-size: 0.9rem; padding: 7px 9px; }

/* --- Ingrédients structurés (formulaire) --- */
.ingredient-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.row-drag-handle {
  flex-shrink: 0; width: 26px; height: 30px; border: none; border-radius: 6px;
  background: rgba(179,135,42,0.15); color: var(--gold); font-size: 15px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none; user-select: none;
}
.row-drag-handle:active { cursor: grabbing; background: rgba(179,135,42,0.3); }
.ingredient-row { display: flex; gap: 6px; align-items: center; max-width: 100%; }
.ing-qty {
  width: 56px; flex-shrink: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px; padding: 8px 6px;
}
.ing-unit {
  width: 92px; flex-shrink: 0; font-family: 'EB Garamond', serif; font-size: 0.82rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px; padding: 8px 4px;
}
.ing-name {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px; padding: 8px 9px;
}
.ing-remove {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: rgba(255,255,255,0.4); color: var(--wine); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.ingredient-section-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.ing-section-title {
  flex: 1; min-width: 0; font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.3px; color: var(--gold);
  background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.4); border-radius: 8px; padding: 8px 10px;
}
.add-ingredient-btn { display: block; margin: 2px 0 18px; }
.long-press-hint { font-family: 'EB Garamond', serif; text-transform: none; letter-spacing: 0; font-style: italic; opacity: 0.65; font-size: 0.7rem; }

/* --- Étapes structurées (formulaire) --- */
.step-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.step-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.step-row-num {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  background: var(--gold); color: #2a1c07; font-family: 'Cinzel', serif; font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center;
}
.step-text {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 0.92rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px; padding: 8px 9px;
}
.step-remove {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: rgba(255,255,255,0.4); color: var(--wine); display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 0.8rem; line-height: 1;
}
.step-section-row { display: flex; gap: 8px; align-items: center; max-width: 100%; }
.step-section-title {
  flex: 1; min-width: 0; font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.3px; color: var(--gold);
  background: rgba(179,135,42,0.1); border: 1px solid rgba(179,135,42,0.4); border-radius: 8px; padding: 8px 10px;
}
.add-step-btn { display: block; margin: 2px 0 18px; }
.delete-recipe-btn { display: block; margin: 6px auto 0; color: var(--wine); text-align: center; }
.form-footer { margin-top: 22px; padding-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.form-footer .seal { width: 100%; justify-content: center; }

/* --- Flourish glissant (onglet Courses) --- */
.flourish-swipe {
  cursor: grab; touch-action: pan-y; user-select: none;
}
.flourish-swipe.hint-right { color: #3E7A3E; }
.flourish-swipe.hint-left { color: var(--wine); }

/* --- Petits liens texte --- */
.link-btn {
  background: none; border: none; color: var(--gold);
  font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 0.5px;
  display: inline-flex; align-items: center; gap: 5px;
  cursor: pointer; padding: 4px 0; text-transform: uppercase;
}

/* --- Import / partage --- */
.import-panel { margin: 10px 0 6px; display: flex; flex-direction: column; gap: 8px; }
.import-panel textarea {
  font-family: 'EB Garamond', serif; font-size: 0.9rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px;
  width: 100%; max-width: 100%;
}
.import-panel-actions { display: flex; justify-content: space-between; align-items: center; }
.import-error { color: var(--wine); font-size: 0.8rem; margin: 0; }
.share-textarea {
  width: 100%; font-family: monospace; font-size: 0.78rem; color: var(--ink-soft);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px;
  padding: 10px; margin-bottom: 14px; resize: vertical;
}
.share-option-row { display: flex; gap: 10px; flex-wrap: wrap; }
.share-option-row .seal { flex: 1; justify-content: center; }

/* --- Choix d'ajout / import de recette --- */
.add-choice-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.add-choice-list .seal { justify-content: center; }
.template-textarea {
  width: 100%; font-family: 'EB Garamond', serif; font-size: 0.88rem; color: var(--ink);
  background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: 8px;
  padding: 10px; margin: 4px 0 12px; resize: vertical; line-height: 1.5;
}

/* --- Temps d'appui long (réglages) --- */
.press-duration-options { display: flex; gap: 8px; }
.press-duration-pill {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; border-radius: 10px; border: 1px solid var(--line);
  background: rgba(255,255,255,0.4); cursor: pointer;
}
.press-duration-pill.active { background: var(--ink); border-color: var(--ink); }
.press-duration-label { font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.5px; color: var(--ink); text-transform: uppercase; }
.press-duration-pill.active .press-duration-label { color: var(--gold-light); }
.press-duration-sub { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.72rem; color: var(--ink-soft); }
.press-duration-pill.active .press-duration-sub { color: var(--parchment); opacity: 0.8; }

/* --- Toast --- */
.toast {
  position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%);
  background: var(--ink); color: var(--gold-light);
  font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.5px;
  padding: 10px 18px; border-radius: 999px; border: 1px solid var(--gold);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3); z-index: 70; text-align: center;
  animation: fadeIn 0.25s ease;
}

/* --- Mode cuisine --- */
.cookmode-backdrop {
  position: fixed; inset: 0; z-index: 60; background: #2c221e;
  display: flex; align-items: center; justify-content: center;
}
.cookmode {
  width: 100%; max-width: 480px; height: 100%;
  padding: calc(30px + env(safe-area-inset-top)) 20px 30px;
  color: var(--parchment); position: relative;
  display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
}
.cookmode .modal-close { top: calc(14px + env(safe-area-inset-top)); background: rgba(255,255,255,0.12); color: var(--parchment); }
.cookmode-progress { flex-shrink: 0; font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 2px; color: var(--gold-light); text-transform: uppercase; }
.cookmode .dropcap-title { flex-shrink: 0; color: var(--parchment); margin: 0; }
.cookmode-steps { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.cookmode-step-card {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(217,180,92,0.3); border-radius: 12px;
  padding: 14px; display: flex; gap: 12px; cursor: pointer;
}
.cookmode-step-card.done { opacity: 0.5; }
.cookmode-step-card.done .cookmode-step-text { text-decoration: line-through; }
.step-check {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--gold-light);
  display: flex; align-items: center; justify-content: center; color: var(--gold-light); flex-shrink: 0; margin-top: 2px;
}
.step-body { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cookmode-step-text { font-size: 1.12rem; line-height: 1.5; margin: 0; }
.step-timer-btn {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid rgba(217,180,92,0.5);
  background: rgba(217,180,92,0.12);
  color: var(--gold-light);
  cursor: pointer;
}
.step-timer-btn.running { background: rgba(255,255,255,0.16); color: #fff; border-color: rgba(255,255,255,0.35); }
.step-timer-btn.done { background: rgba(95,154,74,0.25); color: #8fbf7a; border-color: #5f9a4a; }

/* --- Indicateur de portions compact (mode cuisine) --- */
.cookmode-ingredients-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-shrink: 0; position: relative;
}
.portion-badge-wrap { position: relative; flex-shrink: 0; }
.portion-badge {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(217,180,92,0.5);
  background: rgba(217,180,92,0.15); color: var(--gold-light);
  font-family: 'Cinzel', serif; font-size: 0.92rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}
.portion-badge.charging { animation: portionShake 0.4s ease forwards; background: rgba(217,180,92,0.3); }
.portion-badge.open { transform: scale(1.15); background: rgba(217,180,92,0.35); }
@keyframes portionShake {
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.05) rotate(-6deg); }
  40% { transform: scale(1.08) rotate(5deg); }
  60% { transform: scale(1.12) rotate(-3deg); }
  80% { transform: scale(1.14) rotate(2deg); }
  100% { transform: scale(1.15) rotate(0deg); }
}
.portion-badge-popover {
  position: absolute; top: 42px; right: 0; z-index: 20;
  background: #241a14; border: 1px solid rgba(217,180,92,0.4); border-radius: 14px;
  padding: 8px 10px 4px; box-shadow: 0 10px 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  animation: wheelPopIn 0.22s ease;
}
@keyframes wheelPopIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.92); }
  to { opacity: 1; transform: none; }
}
.portion-wheel-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  height: 120px;
}
.portion-wheel {
  height: 120px; width: 66px; overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.portion-wheel::-webkit-scrollbar { display: none; }
.portion-wheel-item {
  height: 40px; display: flex; align-items: center; justify-content: center;
  scroll-snap-align: center;
  font-family: 'Cinzel', serif; font-size: 1.05rem; color: rgba(252,248,242,0.32);
  transition: color 0.15s ease, font-size 0.15s ease;
}
.portion-wheel-item.active { color: var(--gold-light); font-size: 1.55rem; font-weight: 600; }
.portion-wheel-highlight {
  position: absolute; top: 50%; left: 0; right: 0; height: 40px; transform: translateY(-50%);
  border-top: 1px solid rgba(217,180,92,0.4); border-bottom: 1px solid rgba(217,180,92,0.4);
  pointer-events: none;
}
.portion-wheel-suffix {
  font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--parchment); opacity: 0.6;
}
.portion-wheel-wrap.light .portion-wheel-item { color: rgba(42,32,19,0.32); }
.portion-wheel-wrap.light .portion-wheel-item.active { color: var(--gold); }
.portion-wheel-wrap.light .portion-wheel-highlight { border-color: rgba(179,135,42,0.5); }
.portion-wheel-wrap.light .portion-wheel-suffix { color: var(--ink-soft); }

/* --- Molette de quantité (courses) --- */
.qty-wheel-modal { text-align: center; }
.qty-wheel-wrap { display: flex; justify-content: center; margin: 10px 0 18px; }

/* --- Gestion des listes de courses --- */
.lists-manager { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.lists-manager-row {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.35);
}
.lists-manager-row.active { border-color: var(--gold); background: rgba(179,135,42,0.12); }
.lists-manager-name {
  flex: 1; min-width: 0; text-align: left; background: none; border: none; cursor: pointer;
  display: flex; flex-direction: column; gap: 2px; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
}
.lists-manager-count { font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.5px; color: var(--ink-soft); text-transform: uppercase; }
.lists-manager-rename-input {
  flex: 1; min-width: 0; font-family: 'EB Garamond', serif; font-size: 1rem; color: var(--ink);
  background: rgba(255,255,255,0.6); border: 1px solid var(--gold); border-radius: 6px; padding: 6px 8px;
}
.lists-manager-icon-btn {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line);
  background: rgba(255,255,255,0.5); color: var(--ink-soft); font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.lists-manager-delete { color: var(--wine); }

/* --- Rappel ingrédients (mode cuisine) --- */
.ingredients-toggle {
  flex-shrink: 0;
  align-self: flex-start;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(217,180,92,0.4);
  color: var(--gold-light); font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 1px;
  text-transform: uppercase; padding: 8px 14px; border-radius: 999px; cursor: pointer;
}
.cookmode-ingredients {
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(217,180,92,0.25); border-radius: 10px;
  padding: 12px 16px; max-height: 160px; overflow-y: auto;
}
.cookmode-ingredients ul { margin: 0; padding-left: 18px; list-style: disc; }
.cookmode-ingredients li { font-size: 0.9rem; margin-bottom: 5px; color: var(--parchment); }
.cookmode-ingredients li.ingredient-section-title,
.ingredient-list li.ingredient-section-title {
  list-style: none; margin-left: -18px; margin-top: 8px;
  font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase;
  color: var(--gold);
}
.cookmode-ingredients li.ingredient-section-title { color: var(--gold-light); }
.steps-group-title {
  font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.5px; color: var(--gold);
  margin: 14px 0 6px;
}
.group-nav {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 4px; flex-shrink: 0;
}
.group-nav-btn {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(217,180,92,0.4);
  background: rgba(255,255,255,0.08); color: var(--gold-light); cursor: pointer;
}
.group-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.group-nav-label { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.5px; color: var(--parchment); text-align: center; flex: 1; }
.group-nav-label em { font-style: normal; color: var(--gold-light); font-size: 0.7rem; }
.group-solo-title { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold-light); margin: 4px 0 0; flex-shrink: 0; }
.steps-group { margin-bottom: 6px; }
.steps-group-title:first-child { margin-top: 0; }
.cookmode-nav { display: flex; gap: 12px; justify-content: space-between; margin-top: auto; }
.cookmode-nav .seal { flex: 1; justify-content: center; }
`;
