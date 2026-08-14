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

function estimateNutriscore(ingredients = []) {
  try {
    let score = 0;
    ingredients.forEach(({ name }) => {
      if (/légume|poisson|poulet|salade|carotte|courgette|tomate/i.test(name)) score += 2;
      if (/beurre|crème|sucre|chocolat|lardon|friture|huile/i.test(name)) score -= 1.5;
    });
    if (score >= 4) return "A";
    if (score >= 2) return "B";
    if (score >= 0) return "C";
    if (score >= -3) return "D";
    return "E";
  } catch {
    return "C";
  }
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

const NUTRI_COLORS = { A: "#3E7A3E", B: "#7A9A3E", C: "#C9A227", D: "#B8722B", E: "#A6432E" };

let uid = 100;
const nextId = () => `r${++uid}`;

function demoRecipes() {
  return [
    {
      id: "r1",
      title: "Kouign-amann",
      type: "sucre",
      time: 70,
      servings: 8,
      carbs: 45,
      favorite: false,
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
      type: "sale",
      time: 90,
      servings: 4,
      carbs: 2,
      favorite: false,
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
      type: "sucre",
      time: 35,
      servings: 6,
      carbs: 34,
      favorite: false,
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
      type: "sale",
      time: 60,
      servings: 4,
      carbs: 12,
      favorite: false,
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
      type: "sucre",
      time: 40,
      servings: 6,
      carbs: 30,
      favorite: false,
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
      type: "sale",
      time: 55,
      servings: 6,
      carbs: 22,
      favorite: false,
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
/*  STOCKAGE PERSISTANT                                                */
/* ------------------------------------------------------------------ */

// Remplace window.storage par le localStorage standard
const storage = {
  get: async (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error("Erreur lecture storage", e);
      return null;
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Erreur écriture storage", e);
    }
  }
};

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
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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
  const ingredientsHtml = ingredients.map((i) => `<li>${escapeHtml(i.qty)} ${escapeHtml(i.unit)} — ${escapeHtml(i.name)}</li>`).join("");
  const stepsHtml = recipe.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
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
  ul, ol { padding-left:22px; }
  li { margin-bottom:6px; font-size:1.02rem; }
  @media print { body { padding:0; background:#f6ecd2; } .sheet { border:none; box-shadow:none; } }
</style></head>
<body>
  <div class="sheet">
    <h1>${escapeHtml(recipe.title)}</h1>
    <p class="type">${recipe.type === "sucre" ? "Sucré" : "Salé"} · Le Grimoire de Morgane</p>
    <div class="meta"><span>⏱ ${recipe.time} min</span><span>👥 ${servings} pers.</span>${carbsLine}</div>
    <div class="flourish">❦</div>
    <h2>Ingrédients</h2>
    <ul>${ingredientsHtml}</ul>
    <h2>Préparation</h2>
    <ol>${stepsHtml}</ol>
  </div>
</body></html>`;
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

const ILLUSTRATIONS = {
  tarte: { label: "Tarte dorée", palette: ["#f2c869", "#c9862c", "#7c4a1e"], render: TarteSVG },
  chocolat: { label: "Fondant au chocolat", palette: ["#8a5a3a", "#5a2f1e", "#2e160c"], render: ChocolatSVG },
  crepe: { label: "Crêpes", palette: ["#f6e9c2", "#e3c26a", "#8a6a2e"], render: CrepeSVG },
  poulet: { label: "Poulet rôti", palette: ["#e3ac66", "#b5722e", "#6b3d1c"], render: PouletSVG },
  ratatouille: { label: "Ratatouille", palette: ["#e0a83a", "#c1543a", "#6b8a45"], render: RatatouilleSVG },
  quiche: { label: "Quiche", palette: ["#f0dd8f", "#d9b45c", "#8a6a2e"], render: QuicheSVG },
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
];

function resolveIllustrationKey(recipe) {
  if (recipe.illustrationKey && ILLUSTRATIONS[recipe.illustrationKey]) return recipe.illustrationKey;
  const match = DISH_MATCH.find((d) => d.test.test(recipe.title || ""));
  if (match) return match.key;
  return recipe.type === "sucre" ? "dessert" : "plat";
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

function Seal({ children, onClick, tone = "gold", disabled, type = "button" }) {
  return (
    <button type={type} className={`seal seal-${tone}`} onClick={onClick} disabled={disabled}>
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

function SecretSettingsModal({ onClose, onExport, onImportFile }) {
  const fileRef = useRef(null);
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
          <Seal tone="gold" onClick={() => fileRef.current && fileRef.current.click()}>
            <Upload size={16} /> Importer un grimoire (.json)
          </Seal>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => { onImportFile(e); onClose(); }}
        />
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
      const win = window.open("", "_blank");
      if (!win) {
        showToast("Autorise les fenêtres pop-up pour exporter.");
        return;
      }
      win.document.write(buildPrintHTML(recipe, servings, ingredients));
      win.document.close();
      win.focus();
      setTimeout(() => {
        try { win.print(); } catch { /* ignore */ }
      }, 350);
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

function RecipeCard({ recipe, onOpen, onToggleFavorite }) {
  const nutri = estimateNutriscore(recipe.ingredients);
  return (
    <div className="card recipe-card" onClick={() => onOpen(recipe)}>
      <div className="illus-wrap">
        <DishArt recipe={recipe} />
        <button
          type="button"
          className={`fav-btn ${recipe.favorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
        >
          <Heart size={16} fill={recipe.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-top-row">
          <span className={`chip chip-${recipe.type}`}>{recipe.type === "sucre" ? "Sucré" : "Salé"}</span>
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
  const [servings, setServings] = useState(recipe ? recipe.servings : 1);
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef(null);
  const overscrollRef = useRef(0);
  const touchYRef = useRef(null);

  useEffect(() => {
    if (recipe) setServings(recipe.servings);
  }, [recipe && recipe.id]);

  if (!recipe) return null;
  const nutri = estimateNutriscore(recipe.ingredients);
  const ratio = servings / recipe.servings;
  const scaledIngredients = recipe.ingredients.map((ing) => ({
    ...ing,
    qty: Math.round(ing.qty * ratio * 100) / 100,
  }));

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
  const handleTouchStart = (e) => { touchYRef.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    const el = scrollRef.current;
    if (!el || touchYRef.current == null) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    const dy = touchYRef.current - e.touches[0].clientY;
    if (atBottom && dy > 0) {
      overscrollRef.current += dy;
      touchYRef.current = e.touches[0].clientY;
      if (overscrollRef.current > 130) triggerEdit();
    } else {
      overscrollRef.current = 0;
      touchYRef.current = e.touches[0].clientY;
    }
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
      >
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="detail-hero">
          <DishArt recipe={recipe} />
          <div className="detail-hero-fade" />
        </div>
        <div className="card-top-row" style={{ marginTop: 4 }}>
          <span className={`chip chip-${recipe.type}`}>{recipe.type === "sucre" ? "Sucré" : "Salé"}</span>
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
            <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))}><Minus size={14} /></button>
            <span>{servings}</span>
            <button type="button" onClick={() => setServings((s) => s + 1)}><Plus size={14} /></button>
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
          {scaledIngredients.map((ing, i) => (
            <li key={i}>{ing.qty} {ing.unit} — {ing.name}</li>
          ))}
        </ul>
        <h4>Préparation</h4>
        <ol className="steps-list">
          {recipe.steps.map((s, i) => (<li key={i}>{s}</li>))}
        </ol>
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
      className={`timer-btn ${running ? "running" : ""} ${seconds === 0 ? "done" : ""}`}
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
    >
      <Clock size={14} /> {label}
    </button>
  );
}

function CookMode({ recipe, onClose }) {
  const [done, setDone] = useState(() => recipe.steps.map(() => false));
  const toggleDone = (i) => setDone((prev) => prev.map((d, idx) => (idx === i ? !d : d)));
  const completedCount = done.filter(Boolean).length;

  return (
    <div className="cookmode-backdrop">
      <div className="cookmode cookmode-list">
        <button className="modal-close" onClick={onClose}><X size={22} /></button>
        <div className="cookmode-progress">{completedCount} / {recipe.steps.length} étapes terminées</div>
        <h2 className="dropcap-title">{recipe.title}</h2>
        <div className="cookmode-steps">
          {recipe.steps.map((s, i) => {
            const duration = parseDurationMinutes(s);
            return (
              <div key={i} className={`cookmode-step-card ${done[i] ? "done" : ""}`} onClick={() => toggleDone(i)}>
                <span className="step-check">{done[i] && <Check size={14} />}</span>
                <div className="step-body">
                  <p className="cookmode-step-text">{s}</p>
                  {duration != null && <StepTimer minutes={duration} />}
                </div>
              </div>
            );
          })}
        </div>
        <Seal tone="gold" onClick={onClose}>Terminer la préparation</Seal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FORMULAIRE RECETTE (ajout / édition)                               */
/* ------------------------------------------------------------------ */

function RecipeForm({ onClose, onSave, initialRecipe }) {
  const isEdit = !!initialRecipe;
  const [title, setTitle] = useState(initialRecipe ? initialRecipe.title : "");
  const [type, setType] = useState(initialRecipe ? initialRecipe.type : "sale");
  const [time, setTime] = useState(initialRecipe ? initialRecipe.time : 30);
  const [servings, setServings] = useState(initialRecipe ? initialRecipe.servings : 4);
  const [carbs, setCarbs] = useState(initialRecipe && initialRecipe.carbs ? initialRecipe.carbs : "");
  const [ingredientsText, setIngredientsText] = useState(
    initialRecipe ? initialRecipe.ingredients.map((i) => `${i.qty} ${i.unit} ${i.name}`).join("\n") : ""
  );
  const [stepsText, setStepsText] = useState(initialRecipe ? initialRecipe.steps.join("\n") : "");
  const [importUnlocked, setImportUnlocked] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [formError, setFormError] = useState("");

  const secretImport = useSecretTrigger(() => setImportUnlocked(true));

  const hasTitle = title.trim().length > 0;
  const hasIngredients = ingredientsText.trim().length > 0;
  const hasSteps = stepsText.trim().length > 0;
  const canSubmit = hasTitle && hasIngredients && hasSteps;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError("Il manque le nom, les ingrédients ou les étapes de la recette.");
      return;
    }
    const ingredients = ingredientsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^([\d.,]+)\s*(\S+)\s+(.+)$/);
        if (m) return { qty: parseFloat(m[1].replace(",", ".")), unit: m[2], name: m[3] };
        return { qty: 1, unit: "pièce", name: line };
      });
    const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const carbsValue = carbs !== "" && !Number.isNaN(Number(carbs)) ? Number(carbs) : null;
    onSave({
      id: isEdit ? initialRecipe.id : nextId(),
      title: title.trim(),
      type,
      time: Number(time) || 30,
      servings: Number(servings) || 4,
      carbs: carbsValue,
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
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="sale">Salé</option>
              <option value="sucre">Sucré</option>
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
          <span>Ingrédients (un par ligne, ex. "200 g farine")</span>
          <textarea rows={4} value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} placeholder={"200 g farine\n3 pièce oeuf\n1 pincée sel"} />
        </label>
        <label className="field">
          <span>Étapes (une par ligne)</span>
          <textarea rows={4} value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={"Mélanger les ingrédients…\nEnfourner 20 minutes…"} />
        </label>
        {formError && <p className="import-error" style={{ marginBottom: 10 }}>{formError}</p>}
        <Seal type="submit" tone="gold" disabled={!canSubmit}>
          <Wand2 size={16} /> {isEdit ? "Enregistrer les modifications" : "Sceller la recette"}
        </Seal>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : RECETTES (liste + recherche + favoris)                       */
/* ------------------------------------------------------------------ */

function RecipesView({ recipes, filter, search, favoritesOnly, onToggleFavorite, onAddRequest, onOpen }) {
  const q = search.trim().toLowerCase();
  const filtered = recipes.filter((r) => {
    if (filter !== "tout" && r.type !== filter) return false;
    if (favoritesOnly && !r.favorite) return false;
    if (q) {
      const inTitle = r.title.toLowerCase().includes(q);
      const inIngredients = r.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
      if (!inTitle && !inIngredients) return false;
    }
    return true;
  });
  return (
    <div className="view">
      {filtered.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", marginTop: 30 }}>Aucune recette ne correspond à ta recherche.</p>
      ) : (
        <div className="recipes-grid">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
          ))}
        </div>
      )}
      <button className="fab" onClick={onAddRequest}>
        <Plus size={22} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE : MON FRIGO                                                    */
/* ------------------------------------------------------------------ */

function collectPantryOptions(recipes) {
  const seen = new Map();
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      const key = ing.name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, ing.name.trim());
    });
  });
  return Array.from(seen.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function missingIngredients(recipe, pantrySet) {
  return recipe.ingredients.filter((ing) => !pantrySet.has(ing.name.trim().toLowerCase()));
}

function FridgeView({ recipes, pantry, setPantry, onOpen }) {
  const options = collectPantryOptions(recipes);
  const pantrySet = new Set(pantry);

  const toggle = (key) => {
    setPantry((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const ranked = recipes
    .map((r) => ({ recipe: r, missing: missingIngredients(r, pantrySet) }))
    .sort((a, b) => a.missing.length - b.missing.length);

  return (
    <div className="view">
      <p className="hint">Coche ce que tu as sous la main…</p>
      {options.length === 0 ? (
        <p className="hint">Ajoute des recettes pour remplir ton frigo virtuel.</p>
      ) : (
        <div className="pantry-grid">
          {options.map((opt) => (
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

      <Flourish />
      <h4>Réalisable avec ton frigo</h4>
      <div className="fridge-results">
        {ranked.map(({ recipe, missing }) => (
          <div className="card fridge-row" key={recipe.id} onClick={() => onOpen(recipe)}>
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

function ShoppingView({ recipes, selected, setSelected, list, setList, onShareText }) {
  const [manualInput, setManualInput] = useState("");

  const toggleRecipe = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAll = () => setSelected(recipes.map((r) => r.id));
  const selectNone = () => setSelected([]);

  const generateList = () => {
    setList((prevList) => {
      const map = new Map(prevList.map((it) => [`${it.name.toLowerCase()}__${it.unit}`, { ...it }]));
      recipes
        .filter((r) => selected.includes(r.id))
        .forEach((r) => {
          r.ingredients.forEach(({ name, qty, unit }) => {
            const key = `${name.toLowerCase()}__${unit}`;
            if (map.has(key)) {
              map.get(key).qty += Number(qty) || 0;
            } else {
              map.set(key, { id: nextId(), name, unit, qty: Number(qty) || 0, checked: false, aisle: guessAisle(name) });
            }
          });
        });
      return Array.from(map.values());
    });
  };

  const addManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    setList((prev) => [{ id: nextId(), name, qty: 1, unit: "", checked: false, aisle: guessAisle(name) }, ...prev]);
    setManualInput("");
  };

  const toggleItem = (id) => {
    setList((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  };
  const adjustQty = (id, delta) => {
    setList((prev) => prev.map((it) => (it.id === id ? { ...it, qty: Math.max(0, Math.round((it.qty + delta) * 100) / 100) } : it)));
  };

  const unchecked = list.filter((i) => !i.checked);
  const bought = list.filter((i) => i.checked);
  const grouped = unchecked.reduce((acc, item) => {
    acc[item.aisle] = acc[item.aisle] || [];
    acc[item.aisle].push(item);
    return acc;
  }, {});

  const copyList = () => {
    const lines = ["🛒 Liste de courses — Le Grimoire de Morgane", ""];
    Object.entries(grouped).forEach(([aisle, items]) => {
      lines.push(`${aisle} :`);
      items.forEach((it) => lines.push(`- ${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} ${it.name}`));
      lines.push("");
    });
    if (bought.length) {
      lines.push("Déjà achetés :");
      bought.forEach((it) => lines.push(`- ${it.name}`));
    }
    onShareText(lines.join("\n").trim(), "Liste de courses");
  };

  return (
    <div className="view">
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
        {recipes.map((r) => (
          <label className="recipe-select-row card" key={r.id}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleRecipe(r.id)} />
            <span>{r.title}</span>
            <span className={`chip chip-${r.type}`}>{r.type === "sucre" ? "Sucré" : "Salé"}</span>
          </label>
        ))}
      </div>
      <Seal tone="gold" onClick={generateList} disabled={selected.length === 0}>
        <ShoppingBasket size={16} /> Générer la liste de courses
      </Seal>

      {(list.length > 0) && (
        <div className="shopping-result">
          <Flourish />
          <Seal tone="gold" onClick={copyList}>
            <Copy size={16} /> Copier la liste
          </Seal>
          {Object.entries(grouped).map(([aisle, items]) => (
            <div key={aisle} className="aisle-block">
              <h4>{aisle}</h4>
              <ul className="shopping-list">
                {items.map((it) => (
                  <li key={it.id}>
                    <span className="checkbox-row" onClick={() => toggleItem(it.id)}>
                      <span className="checkbox" />
                      <span>{it.qty > 0 ? `${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} — ` : ""}{it.name}</span>
                    </span>
                    <span className="qty-stepper">
                      <button type="button" onClick={(e) => { e.stopPropagation(); adjustQty(it.id, -1); }}><Minus size={11} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); adjustQty(it.id, 1); }}><Plus size={11} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {bought.length > 0 && (
            <div className="aisle-block bought-block">
              <h4>Articles achetés</h4>
              <ul className="shopping-list bought-list">
                {bought.map((it) => (
                  <li key={it.id} className="checked" onClick={() => toggleItem(it.id)}>
                    <span className="checkbox-row">
                      <span className="checkbox"><Check size={11} /></span>
                      <span>{it.qty > 0 ? `${Math.round(it.qty * 100) / 100}${it.unit ? ` ${it.unit}` : ""} — ` : ""}{it.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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

/* ------------------------------------------------------------------ */
/*  APP PRINCIPALE                                                     */
/* ------------------------------------------------------------------ */

export default function GrimoireDeMorgane() {
const [ready, setReady] = useState(true);

  const [recipes, setRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem('grimoire_recipes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [pantry, setPantry] = useState(() => {
    try {
      const saved = localStorage.getItem('grimoire_pantry');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [shoppingSelected, setShoppingSelected] = useState([]);

  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const saved = localStorage.getItem('grimoire_shopping');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [tab, setTab] = useState("recettes");
  const [filter, setFilter] = useState("tout");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [formTarget, setFormTarget] = useState(null); // null | 'new' | recipe object
  const [openRecipe, setOpenRecipe] = useState(null);
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [textModal, setTextModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [showSecretSettings, setShowSecretSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
  localStorage.setItem('grimoire_recipes', JSON.stringify(recipes));
}, [recipes]);

useEffect(() => {
  localStorage.setItem('grimoire_pantry', JSON.stringify(pantry));
}, [pantry]);

useEffect(() => {
  localStorage.setItem('grimoire_shopping', JSON.stringify(shoppingList));
}, [shoppingList]);
  
  const touchStart = useRef(null);
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

  useEffect(() => { if (ready) saveKey("grimoire:recipes", recipes); }, [recipes, ready]);
  useEffect(() => { if (ready) saveKey("grimoire:pantry", pantry); }, [pantry, ready]);
  useEffect(() => { if (ready) saveKey("grimoire:shoppingSelected", shoppingSelected); }, [shoppingSelected, ready]);
  useEffect(() => { if (ready) saveKey("grimoire:shoppingList", shoppingList); }, [shoppingList, ready]);

  const saveRecipe = (recipe) => {
    setRecipes((prev) => (prev.some((r) => r.id === recipe.id) ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev]));
  };

  const toggleFavorite = (id) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)));
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
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [data];
        const imported = list.filter((r) => r && r.title).map((r) => ({ ...r, id: nextId(), favorite: false }));
        setRecipes((prev) => [...imported, ...prev]);
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
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current == null || tab !== "recettes") { touchStart.current = null; return; }
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
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
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
            <button
              className={`filter-pill heart-pill ${favoritesOnly ? "active" : ""}`}
              onClick={() => setFavoritesOnly((v) => !v)}
              title="Afficher uniquement les favoris"
            >
              <Heart size={13} fill={favoritesOnly ? "currentColor" : "none"} /> Favoris
            </button>
          </div>
        </>
      )}

      <main className="app-content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {tab === "recettes" && (
          <RecipesView
            recipes={recipes}
            filter={filter}
            search={search}
            favoritesOnly={favoritesOnly}
            onToggleFavorite={toggleFavorite}
            onAddRequest={() => setFormTarget("new")}
            onOpen={setOpenRecipe}
          />
        )}
        {tab === "frigo" && (
          <FridgeView recipes={recipes} pantry={pantry} setPantry={setPantry} onOpen={setOpenRecipe} />
        )}
        {tab === "courses" && (
          <ShoppingView
            recipes={recipes}
            selected={shoppingSelected}
            setSelected={setShoppingSelected}
            list={shoppingList}
            setList={setShoppingList}
            onShareText={shareText}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-btn ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {formTarget && (
        <RecipeForm
          onClose={() => setFormTarget(null)}
          onSave={saveRecipe}
          initialRecipe={formTarget === "new" ? null : formTarget}
        />
      )}
      {openRecipe && (
        <RecipeDetail
          recipe={recipes.find((r) => r.id === openRecipe.id) || openRecipe}
          onClose={() => setOpenRecipe(null)}
          onCook={(r) => setCookingRecipe(r)}
          onEdit={(r) => { setOpenRecipe(null); setFormTarget(r); }}
          shareText={shareText}
          showToast={showToast}
        />
      )}
      {cookingRecipe && (
        <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} />
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
      {showSecretSettings && (
        <SecretSettingsModal
          onClose={() => setShowSecretSettings(false)}
          onExport={exportGrimoire}
          onImportFile={handleImportFile}
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

/* --- Mon Frigo --- */
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
  position: fixed; inset: 0; z-index: 60; background: var(--ink);
  display: flex; align-items: center; justify-content: center;
}
.cookmode {
  width: 100%; max-width: 480px; height: 100%; padding: 30px 20px;
  color: var(--parchment); position: relative;
  display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
}
.cookmode .modal-close { background: rgba(255,255,255,0.12); color: var(--parchment); }
.cookmode-progress { font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 2px; color: var(--gold-light); text-transform: uppercase; }
.cookmode .dropcap-title { color: var(--parchment); margin: 0; }
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
.step-body { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.cookmode-step-text { font-size: 1.12rem; line-height: 1.5; margin: 0; }
.timer-btn.running { background: linear-gradient(180deg, #e0e0e0, #b8b8b8); }
.timer-btn.done { background: linear-gradient(180deg, #8fbf7a, #5f9a4a); border-color: #5f9a4a; }
.cookmode-nav { display: flex; gap: 12px; justify-content: space-between; margin-top: auto; }
.cookmode-nav .seal { flex: 1; justify-content: center; }
`;
