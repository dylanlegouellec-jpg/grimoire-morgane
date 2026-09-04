import { isSucre } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  ILLUSTRATIONS SVG "AQUARELLE CULINAIRE" (aucune image externe)     */
/* ------------------------------------------------------------------ */

export function TarteSVG({ uid }) {
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

export function ChocolatSVG({ uid }) {
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

export function CrepeSVG({ uid }) {
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

export function PouletSVG({ uid }) {
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

export function RatatouilleSVG({ uid }) {
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

export function QuicheSVG({ uid }) {
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

export function DessertDefaultSVG({ uid }) {
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

export function PlatDefaultSVG({ uid }) {
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

export function EmpanadaSVG({ uid }) {
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


/* ------------------------------------------------------------------ */
/*  CATALOGUE DES ILLUSTRATIONS & DÉTECTION DU PLAT                    */
/* ------------------------------------------------------------------ */

export const ILLUSTRATIONS = {
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

export const DISH_MATCH = [
  { test: /kouign|amann|tarte/i, key: "tarte" },
  { test: /chocolat|fondant|cacao/i, key: "chocolat" },
  { test: /cr[êe]pe|galette/i, key: "crepe" },
  { test: /poulet|rôti|roti|volaille/i, key: "poulet" },
  { test: /ratatouille|légume|legume|provenç/i, key: "ratatouille" },
  { test: /quiche/i, key: "quiche" },
  { test: /empanada/i, key: "empanada" },
];

export function resolveIllustrationKey(recipe) {
  if (recipe.illustrationKey && ILLUSTRATIONS[recipe.illustrationKey]) return recipe.illustrationKey;
  const match = DISH_MATCH.find((d) => d.test.test(recipe.title || ""));
  if (match) return match.key;
  return isSucre(recipe) ? "dessert" : "plat";
}
