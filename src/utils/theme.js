/* ------------------------------------------------------------------ */
/*  THÈME (Clair / Sombre / Système)                                   */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = "grimoire_theme"; // "light" | "dark" | "system"

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage indisponible (navigation privée...) : on repart sur "system" */
  }
  return "system";
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* rien à faire si le stockage échoue, le thème reste actif en mémoire */
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Résout "light" / "dark" / "system" vers la valeur effective "light" | "dark".
export function resolveTheme(theme) {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemPrefersDark() ? "dark" : "light";
}

// Même couleurs que --parchment (theme.css.js) pour chaque thème — copiées
// ici plutôt que lues depuis une variable CSS : au tout premier appel (au
// démarrage), la feuille de style vient à peine d'être posée et une lecture
// via getComputedStyle serait fragile (dépend de l'ordre de chargement),
// alors qu'une balise <meta> HTML, elle, doit être correcte immédiatement.
const THEME_COLOR_META = { light: "#f1e6c8", dark: "#1c1917" };

// REGRESSION (2e round) : muter juste `content` sur la balise <meta>
// EXISTANTE (comportement d'origine de cette fonction) ne suffit pas
// toujours à faire recolorer la barre d'état par iOS une fois l'app
// installée en PWA — signalé par l'utilisateur : la barre reste bloquée
// sur une teinte sombre après un changement clair/sombre (ex. en quittant
// les Réglages, une fois le thème "Système" réévalué), et ne se corrige
// qu'en quittant/relançant l'app. iOS semble ne recolorer la barre native
// qu'à la CRÉATION d'une balise <meta name="theme-color">, pas à la
// simple mise à jour de son attribut sur un nœud déjà présent depuis le
// chargement de la page — on force donc iOS à la revoir "neuve" en
// remplaçant intégralement le nœud (clone + valeur, puis substitution)
// plutôt qu'en modifiant l'existant en place.
function replaceThemeColorMeta(color) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const fresh = meta.cloneNode(true);
  fresh.setAttribute("content", color);
  meta.replaceWith(fresh);
}

// Applique le thème résolu sur <html data-theme="..."> pour que styles.css.js
// puisse cibler [data-theme="dark"] partout où c'est nécessaire — et sur la
// balise <meta name="theme-color"> (voir index.html), pour que la barre
// d'état d'une PWA installée (iOS/Android) affiche la même teinte que le
// fond de l'app plutôt qu'une couleur figée à la construction de la page,
// qui décroche dès que l'utilisateur choisit un thème différent de celui
// de son système.
export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-theme", resolved);
    replaceThemeColorMeta(THEME_COLOR_META[resolved]);
  }
  return resolved;
}

// Pour les écrans qui peignent eux-mêmes html/body dans une couleur qui
// diffère du thème choisi (ex. CookMode.jsx, toujours sombre quel que soit
// le thème de l'app) : la balise <meta name="theme-color"> ne suit sinon
// que le thème réel (clair/sombre/système), jamais ces exceptions locales,
// et la barre d'état d'une PWA installée affiche alors une couleur qui ne
// correspond à rien de visible à l'écran. Prend directement une couleur
// hexadécimale plutôt qu'un thème — à l'appelant de restaurer ensuite le
// thème réel (voir applyTheme) une fois son propre fond retiré.
export function overrideStatusBarColor(color) {
  replaceThemeColorMeta(color);
}

// N'a d'effet que lorsque le thème choisi est "system" : réapplique le
// thème à chaque bascule clair/sombre du système d'exploitation.
export function watchSystemTheme(onChange) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange(mq.matches ? "dark" : "light");
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else if (mq.addListener) mq.addListener(handler); // anciens navigateurs (vieux Safari)
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    else if (mq.removeListener) mq.removeListener(handler);
  };
}
