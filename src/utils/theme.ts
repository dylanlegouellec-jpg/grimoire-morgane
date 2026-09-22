/* ------------------------------------------------------------------ */
/*  THÈME (Clair / Sombre / Système)                                   */
/* ------------------------------------------------------------------ */
export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "grimoire_theme"; // "light" | "dark" | "system"

export function getStoredTheme(): ThemeSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage indisponible (navigation privée...) : on repart sur "system" */
  }
  return "system";
}

export function storeTheme(theme: ThemeSetting): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* rien à faire si le stockage échoue, le thème reste actif en mémoire */
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Résout "light" / "dark" / "system" vers la valeur effective "light" | "dark".
export function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemPrefersDark() ? "dark" : "light";
}

// Même couleurs que --parchment (theme.css.js) pour chaque thème — copiées
// ici plutôt que lues depuis une variable CSS : au tout premier appel (au
// démarrage), la feuille de style vient à peine d'être posée et une lecture
// via getComputedStyle serait fragile (dépend de l'ordre de chargement),
// alors qu'une balise <meta> HTML, elle, doit être correcte immédiatement.
const THEME_COLOR_META: Record<ResolvedTheme, string> = { light: "#f1e6c8", dark: "#1c1917" };

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
function replaceThemeColorMeta(color: string): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const fresh = meta.cloneNode(true) as Element;
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
export function applyTheme(theme: ThemeSetting): ResolvedTheme {
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
export function overrideStatusBarColor(color: string): void {
  replaceThemeColorMeta(color);
}

// REGRESSION (4e round) : mesuré précisément par capture vidéo — dès
// qu'UNE modale standard s'ouvre (le simple voile semi-transparent
// derrière elle, PAS une couleur qu'on demande nous-mêmes), la barre
// d'état se met à refléter ce voile (crème assombri), puis reste figée
// sur cette teinte pour le reste de la session : ni la fermeture de la
// modale, ni un changement de thème, ni overrideStatusBarColor() (mode
// cuisine) ne la font plus bouger ensuite. iOS semble "geler" le rendu
// de la barre après ce premier changement visuel, sourd à toute
// nouvelle valeur de <meta theme-color> tant qu'on ne lui redonne pas
// un nœud <meta> entièrement neuf — pas une nouvelle VALEUR (le thème
// réel, lui, n'a pas changé), donc on ne recalcule rien ici : on
// réaffirme juste la couleur déjà déclarée, pour forcer iOS à la
// redessiner. Contrairement à la tentative précédente (réappliquer le
// thème réel à la fermeture de toute modale, revertée : elle entrait en
// conflit avec la couleur du mode cuisine, elle-même indépendante de ce
// thème), ceci ne change jamais la valeur logique — donc rien à
// réconcilier avec CookMode.jsx.
export function refreshStatusBarColor(): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  // Cette balise porte toujours un attribut "content" (posé par index.html
  // puis jamais retiré, seulement remplacé — voir replaceThemeColorMeta) :
  // le cast reflète cette garantie déjà implicite dans le code d'origine,
  // pas une nouvelle hypothèse.
  replaceThemeColorMeta(meta.getAttribute("content") as string);
}

// N'a d'effet que lorsque le thème choisi est "system" : réapplique le
// thème à chaque bascule clair/sombre du système d'exploitation.
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange(mq.matches ? "dark" : "light");
  // addListener/removeListener : API dépréciée mais seule disponible sur le
  // vieux Safari (voir le commentaire d'origine) — non typée dans
  // lib.dom.d.ts moderne, d'où le cast.
  type LegacyMediaQueryList = MediaQueryList & {
    addListener?: (fn: () => void) => void;
    removeListener?: (fn: () => void) => void;
  };
  const legacyMq = mq as LegacyMediaQueryList;
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else if (legacyMq.addListener) legacyMq.addListener(handler);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    else if (legacyMq.removeListener) legacyMq.removeListener(handler);
  };
}
