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

// Applique le thème résolu sur <html data-theme="..."> pour que styles.css.js
// puisse cibler [data-theme="dark"] partout où c'est nécessaire.
export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-theme", resolved);
  }
  return resolved;
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
