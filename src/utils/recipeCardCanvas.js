import { groupIngredients, groupSteps, categoryLabel } from "./helpers";
import { NUTRI_COLORS, estimateNutriscoreLocal } from "./nutriscore";

/* ------------------------------------------------------------------ */
/*  CARTE DE RECETTE — GÉNÉRATEUR CANVAS NATIF (aucune dépendance)      */
/*                                                                        */
/*  Produit un PNG "page de grimoire" en Canvas 2D pur (pas de           */
/*  html2canvas/jsPDF disponibles dans ce projet). Le contenu (titre,     */
/*  badges, photo, ingrédients, étapes, remarques) est d'abord            */
/*  MESURÉ (measureBlocks, avec un canvas jetable) pour calculer la       */
/*  hauteur totale nécessaire, puis DESSINÉ (drawBlocks) sur le canvas    */
/*  final aux dimensions exactes — les deux passages partagent la même    */
/*  logique de mise en page pour ne jamais se désynchroniser.             */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 1080;
const MARGIN = 72;
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2;
const PHOTO_HEIGHT = Math.round(CONTENT_WIDTH * 0.62);
const BULLET_INDENT = 36;
const NUMBER_INDENT = 46;

const PALETTES = {
  light: {
    bg: "#f6ecd2",
    bgDeep: "#e6d5a8",
    ink: "#2a2013",
    inkSoft: "#5c4a30",
    gold: "#b3872a",
    goldLight: "#d9b45c",
    wine: "#7c3232",
    plum: "#5a3a63",
    line: "rgba(179,135,42,0.4)",
  },
  dark: {
    bg: "#1c1917",
    bgDeep: "#2b2621",
    ink: "#f1e6c8",
    inkSoft: "#c9b993",
    gold: "#d97706",
    goldLight: "#f3ad4b",
    wine: "#c1666b",
    plum: "#a884b8",
    line: "rgba(217,180,92,0.35)",
  },
};

const FONT_TITLE = (size) => `700 ${size}px 'Cinzel Decorative', 'Cinzel', Georgia, serif`;
const FONT_LABEL = (size) => `600 ${size}px 'Cinzel', Georgia, serif`;
const FONT_BODY = (size) => `400 ${size}px 'EB Garamond', Georgia, serif`;
const FONT_BODY_ITALIC = (size) => `italic 400 ${size}px 'EB Garamond', Georgia, serif`;

// Charge les polices maison avant de mesurer/dessiner — sans ça, le tout
// premier rendu (avant que le navigateur ait fini de charger les
// webfonts importées dans styles.css.js) mesurerait avec une police de
// repli puis dessinerait avec la vraie, décalant tout le texte.
async function ensureFonts() {
  try {
    if (typeof document === "undefined" || !document.fonts || !document.fonts.load) return;
    await Promise.all([
      document.fonts.load(FONT_TITLE(48)),
      document.fonts.load(FONT_LABEL(26)),
      document.fonts.load(FONT_BODY(28)),
      document.fonts.load(FONT_BODY_ITALIC(26)),
    ]);
    await document.fonts.ready;
  } catch {
    /* tant pis, on dessine avec la police de repli (serif) */
  }
}

// Charge une image cross-origin de façon "safe" pour le canvas.
//
// Vérifié : Pollinations.ai et le bucket Supabase Storage de ce projet
// envoient tous deux `Access-Control-Allow-Origin: *`, donc la méthode
// directe ci-dessous (crossOrigin="anonymous") suffit déjà dans l'immense
// majorité des cas. On tente quand même D'ABORD un fetch() + URL blob:
// locale : un objet ainsi créé n'est JAMAIS considéré "cross-origin" par
// le canvas, quels que soient les en-têtes CORS de la réponse d'origine
// (elle a déjà été récupérée avec succès pour qu'on en arrive là) — un
// filet de sécurité pour tout hébergeur d'image qui n'enverrait pas ces
// en-têtes, sans coût perceptible quand ils sont déjà présents.
async function loadImageViaBlob(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

function loadImageDirect(url) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function loadImage(url) {
  const viaBlob = await loadImageViaBlob(url);
  if (viaBlob) return viaBlob;
  return loadImageDirect(url);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverImage(ctx, img, dx, dy, dw, dh) {
  const srcRatio = img.width / img.height;
  const dstRatio = dw / dh;
  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = img.height;
    sw = sh * dstRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / dstRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// Prépare une liste d'items (ingrédients ou étapes, avec ou sans
// sous-sections) en blocs de mise en page : titres de groupe + lignes de
// texte pré-enroulées (avec indentation en drapeau pour la puce/le
// numéro), sans rien dessiner — sert à la fois à mesurer et à dessiner.
function layoutItemGroups(ctx, groups, { indent, itemLineHeight, subHeaderLineHeight, numbered }) {
  const blocks = [];
  groups.forEach((g) => {
    if (g.title) {
      blocks.push({ type: "subHeader", text: g.title, height: subHeaderLineHeight });
    }
    const rawItems = g.items || g.steps || [];
    rawItems.forEach((raw, idx) => {
      const text = typeof raw === "string" ? raw : [raw.qty, raw.unit].filter(Boolean).join(" ") + (raw.name ? ` ${raw.name}` : "");
      ctx.font = FONT_BODY(27);
      const lines = wrapText(ctx, text.trim(), CONTENT_WIDTH - indent);
      if (!lines.length) return;
      blocks.push({
        type: "item",
        marker: numbered ? `${idx + 1}.` : "•",
        lines,
        indent,
        height: lines.length * itemLineHeight,
      });
    });
  });
  return blocks;
}

function buildBlocks(ctx, { recipe, servings, ingredients, nutriGrade, photoImg, includeNotes }) {
  const blocks = [];
  let totalHeight = 0;
  const push = (block) => { blocks.push(block); totalHeight += block.height; };

  push({ type: "topPad", height: MARGIN * 0.7 });

  if (photoImg) {
    push({ type: "photo", height: PHOTO_HEIGHT });
    push({ type: "spacer", height: 32 });
  }

  push({ type: "badgeRow", height: 64, nutriGrade });
  push({ type: "spacer", height: 22 });

  ctx.font = FONT_TITLE(52);
  const titleLines = wrapText(ctx, recipe.title || "", CONTENT_WIDTH * 0.9);
  push({ type: "title", lines: titleLines.length ? titleLines : [recipe.title || ""], height: (titleLines.length || 1) * 62 });
  push({ type: "spacer", height: 14 });

  const metaText = `⏱ ${recipe.time || 0} min     👥 ${servings} pers.`;
  push({ type: "meta", text: metaText, height: 42 });
  push({ type: "spacer", height: 20 });
  push({ type: "flourish", height: 46 });
  push({ type: "spacer", height: 18 });

  push({ type: "sectionHeader", text: "Ingrédients", height: 50 });
  push({ type: "spacer", height: 8 });
  const ingredientGroups = groupIngredients(ingredients);
  layoutItemGroups(ctx, ingredientGroups, {
    indent: BULLET_INDENT,
    itemLineHeight: 40,
    subHeaderLineHeight: 46,
    numbered: false,
  }).forEach(push);

  push({ type: "spacer", height: 34 });
  push({ type: "sectionHeader", text: "Préparation", height: 50 });
  push({ type: "spacer", height: 8 });
  const stepGroups = groupSteps(recipe.steps).map((g) => ({ title: g.title, items: g.steps.map((s) => (typeof s === "string" ? s : s.text || s.title || "")) }));
  layoutItemGroups(ctx, stepGroups, {
    indent: NUMBER_INDENT,
    itemLineHeight: 40,
    subHeaderLineHeight: 46,
    numbered: true,
  }).forEach(push);

  if (includeNotes && recipe.notes) {
    push({ type: "spacer", height: 34 });
    push({ type: "sectionHeader", text: "Remarques & astuces", height: 50 });
    push({ type: "spacer", height: 8 });
    ctx.font = FONT_BODY_ITALIC(26);
    const noteLines = wrapText(ctx, recipe.notes, CONTENT_WIDTH);
    push({ type: "notes", lines: noteLines, height: noteLines.length * 38 });
  }

  push({ type: "spacer", height: 44 });
  push({ type: "footer", height: 70 });
  push({ type: "bottomPad", height: MARGIN * 0.7 });

  return { blocks, totalHeight };
}

function drawBlocks(ctx, blocks, palette, canvasWidth, canvasHeight, { photoImg, recipe }) {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.textBaseline = "alphabetic";

  const centerX = canvasWidth / 2;
  const catLabel = categoryLabel(recipe);
  const catColor = catLabel === "Sucré" ? palette.plum : palette.wine;

  let y = 0;
  blocks.forEach((block) => {
    switch (block.type) {
      case "topPad":
      case "spacer":
      case "bottomPad":
        break;

      case "photo": {
        const x = MARGIN;
        ctx.save();
        ctx.shadowColor = "rgba(20,14,4,0.4)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;
        roundRectPath(ctx, x, y, CONTENT_WIDTH, block.height, 26);
        ctx.fillStyle = palette.bgDeep;
        ctx.fill();
        ctx.restore();
        if (photoImg) {
          ctx.save();
          roundRectPath(ctx, x, y, CONTENT_WIDTH, block.height, 26);
          ctx.clip();
          drawCoverImage(ctx, photoImg, x, y, CONTENT_WIDTH, block.height);
          ctx.restore();
        }
        break;
      }

      case "badgeRow": {
        const pillFont = FONT_LABEL(24);
        ctx.font = pillFont;
        const pillPaddingX = 26;
        const pillWidth = ctx.measureText(catLabel.toUpperCase()).width + pillPaddingX * 2;
        const pillHeight = 46;
        const circleDiameter = block.nutriGrade ? 52 : 0;
        const gap = block.nutriGrade ? 18 : 0;
        const totalWidth = pillWidth + gap + circleDiameter;
        const bx = centerX - totalWidth / 2;
        const midY = y + block.height / 2;

        roundRectPath(ctx, bx, midY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
        ctx.fillStyle = catColor;
        ctx.fill();
        ctx.fillStyle = "#f6ecd2";
        ctx.textAlign = "center";
        ctx.fillText(catLabel.toUpperCase(), bx + pillWidth / 2, midY + 8);

        if (block.nutriGrade) {
          const cx = bx + pillWidth + gap + circleDiameter / 2;
          ctx.beginPath();
          ctx.arc(cx, midY, circleDiameter / 2, 0, Math.PI * 2);
          ctx.fillStyle = NUTRI_COLORS[block.nutriGrade] || palette.gold;
          ctx.fill();
          ctx.font = FONT_LABEL(26);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(block.nutriGrade, cx, midY + 9);
        }
        ctx.textAlign = "left";
        break;
      }

      case "title": {
        ctx.font = FONT_TITLE(52);
        ctx.fillStyle = palette.ink;
        ctx.textAlign = "center";
        block.lines.forEach((line, i) => {
          ctx.fillText(line, centerX, y + 46 + i * 62);
        });
        ctx.textAlign = "left";
        break;
      }

      case "meta": {
        ctx.font = FONT_LABEL(28);
        ctx.fillStyle = palette.gold;
        ctx.textAlign = "center";
        ctx.fillText(block.text, centerX, y + 30);
        ctx.textAlign = "left";
        break;
      }

      case "flourish": {
        ctx.font = FONT_LABEL(34);
        ctx.fillStyle = palette.gold;
        ctx.textAlign = "center";
        ctx.fillText("❦", centerX, y + 32);
        ctx.textAlign = "left";
        break;
      }

      case "sectionHeader": {
        ctx.font = FONT_LABEL(30);
        ctx.fillStyle = palette.inkSoft;
        ctx.textAlign = "left";
        ctx.fillText(block.text.toUpperCase(), MARGIN, y + 32);
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(MARGIN, y + 44);
        ctx.lineTo(CARD_WIDTH - MARGIN, y + 44);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case "subHeader": {
        ctx.font = FONT_LABEL(26);
        ctx.fillStyle = palette.gold;
        ctx.textAlign = "left";
        ctx.fillText(block.text, MARGIN, y + 30);
        break;
      }

      case "item": {
        ctx.font = FONT_BODY(27);
        ctx.fillStyle = palette.ink;
        ctx.textAlign = "left";
        ctx.fillText(block.marker, MARGIN, y + 28);
        block.lines.forEach((line, i) => {
          ctx.fillText(line, MARGIN + block.indent, y + 28 + i * 40);
        });
        break;
      }

      case "notes": {
        ctx.font = FONT_BODY_ITALIC(26);
        ctx.fillStyle = palette.inkSoft;
        ctx.textAlign = "left";
        block.lines.forEach((line, i) => {
          ctx.fillText(line, MARGIN, y + 26 + i * 38);
        });
        break;
      }

      case "footer": {
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(MARGIN, y + 10);
        ctx.lineTo(CARD_WIDTH - MARGIN, y + 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = FONT_LABEL(24);
        ctx.fillStyle = palette.gold;
        ctx.textAlign = "center";
        ctx.fillText("Le Grimoire de Morgane 📜", centerX, y + 50);
        ctx.textAlign = "left";
        break;
      }

      default:
        break;
    }
    y += block.height;
  });
}

/* ------------------------------------------------------------------ */
/*  API PUBLIQUE                                                        */
/* ------------------------------------------------------------------ */

// Génère le PNG de la carte de recette. Retourne { blob, photoIncluded } :
// si la photo (souvent hébergée par Pollinations.ai) ne renvoie pas les
// en-têtes CORS nécessaires, le canvas est "souillé" (tainted) et
// toBlob() échoue silencieusement (blob null) ou lève une erreur selon
// les navigateurs — dans ce cas on régénère automatiquement SANS la
// photo plutôt que d'échouer complètement, et on le signale à l'appelant
// via photoIncluded pour qu'il prévienne l'utilisateur.
export async function generateRecipeCardPng(recipe, servings, ingredients, options = {}) {
  const { includePhoto = true, includeNutriscore = true, includeNotes = true, theme = "light" } = options;
  const palette = PALETTES[theme] || PALETTES.light;

  await ensureFonts();

  const nutriGrade = includeNutriscore
    ? (recipe.nutriscoreGrade || estimateNutriscoreLocal(ingredients, recipe.category))
    : null;

  const renderOnce = async (withPhoto) => {
    let photoImg = null;
    if (withPhoto && recipe.imageUrl) {
      photoImg = await loadImage(recipe.imageUrl);
    }

    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = CARD_WIDTH;
    measureCanvas.height = 10;
    const measureCtx = measureCanvas.getContext("2d");
    const { blocks, totalHeight } = buildBlocks(measureCtx, {
      recipe, servings, ingredients, nutriGrade, photoImg, includeNotes,
    });

    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = Math.max(1, Math.ceil(totalHeight));
    const ctx = canvas.getContext("2d");
    drawBlocks(ctx, blocks, palette, canvas.width, canvas.height, { photoImg, recipe });

    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), "image/png", 0.95);
      } catch {
        resolve(null);
      }
    });
    return { blob, photoImg };
  };

  try {
    const first = await renderOnce(includePhoto);
    if (first.blob) return { blob: first.blob, photoIncluded: Boolean(first.photoImg) };
  } catch {
    /* canvas souillé par la photo : on retente sans elle ci-dessous */
  }

  const fallback = await renderOnce(false);
  return { blob: fallback.blob, photoIncluded: false };
}

// Partage natif (menu iOS/Android : Messages, Mail, Enregistrer dans
// Photos...) si le partage de FICHIERS est supporté ; sinon, repli en
// téléchargement direct du PNG — fonctionne partout, y compris desktop.
// Retourne "shared" | "downloaded" | "cancelled" | false (échec), pour que
// l'appelant puisse afficher le bon message (pas de toast "téléchargée !"
// après un partage réussi, par exemple).
export async function shareOrDownloadPng(blob, filename, shareTitle) {
  if (!blob) return false;
  try {
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: shareTitle });
      return "shared";
    }
  } catch (err) {
    if (err && err.name === "AbortError") return "cancelled";
    // toute autre erreur : on bascule sur le téléchargement direct ci-dessous
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return false;
  }
}
