/* ------------------------------------------------------------------ */
/*  JOURNAL DE DEBUG EN MÉMOIRE — pour la console de logs du Panneau de */
/*  Diagnostics (voir DiagnosticsPanelModal.jsx) : "les derniers          */
/*  événements, erreurs réseau et logs de l'application, sans avoir       */
/*  besoin d'un ordinateur" — impossible d'ouvrir les DevTools sur un       */
/*  téléphone, donc l'app doit garder son propre journal.                    */
/*                                                                              */
/*  Patché une seule fois, au chargement du module (voir l'import à effet       */
/*  de bord dans main.jsx) : les événements sont ainsi capturés dès le           */
/*  démarrage de l'app, bien avant qu'un utilisateur n'ouvre le panneau,          */
/*  plutôt que de ne commencer à écouter qu'à l'ouverture du modal (on             */
/*  perdrait alors tout ce qui a précédé son ouverture, souvent le plus            */
/*  utile pour diagnostiquer un souci déjà survenu).                                */
/* ------------------------------------------------------------------ */

const MAX_ENTRIES = 200;
const entries = [];
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(entries));
}

// Garde-fou anti-réentrance : un abonné notifié ci-dessous peut, en cascade,
// déclencher lui-même un nouveau console.error/warn AVANT que cet appel-ci
// ne soit terminé (observé en test : une mise à jour React déclenchée par
// un abonné hors d'un act() fait elle-même émettre un console.error("...not
// wrapped in act..."), qui repasse par ce même push() pendant qu'il tourne
// encore) — sans garde, chaque niveau rappelle le suivant indéfiniment
// jusqu'à un dépassement de pile.
let isPushing = false;
function push(level, message) {
  if (isPushing) return;
  isPushing = true;
  try {
    entries.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, level, message, ts: Date.now() });
    if (entries.length > MAX_ENTRIES) entries.shift();
    notify();
  } finally {
    isPushing = false;
  }
}

function stringifyArg(arg) {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

let patched = false;

export function installDevLog() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args) => { original.log(...args); push("log", args.map(stringifyArg).join(" ")); };
  console.warn = (...args) => { original.warn(...args); push("warn", args.map(stringifyArg).join(" ")); };
  console.error = (...args) => { original.error(...args); push("error", args.map(stringifyArg).join(" ")); };

  window.addEventListener("error", (e) => {
    push("error", `${e.message} (${e.filename}:${e.lineno})`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    push("error", `Promise rejetée : ${stringifyArg(e.reason)}`);
  });

  if (typeof window.fetch === "function") {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
      try {
        const res = await originalFetch(...args);
        if (!res.ok) push("network", `${res.status} ${url}`);
        return res;
      } catch (err) {
        push("network", `Échec réseau : ${url} — ${stringifyArg(err)}`);
        throw err;
      }
    };
  }
}

export function getDevLogEntries() {
  return entries.slice();
}

export function clearDevLog() {
  entries.length = 0;
  notify();
}

export function subscribeDevLog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
