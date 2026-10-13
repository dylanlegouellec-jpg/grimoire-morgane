import { translations } from "../constants/translations";
import { getStoredLanguage } from "./localSettings";
import type { TranslationTree } from "../constants/translations";

/* ------------------------------------------------------------------ */
/*  Résolution des traductions, partagée par le contexte de langue        */
/*  (contexts/LanguageContext.tsx, pour les composants) et par            */
/*  translateCurrent ci-dessous (pour le code hors composants : hooks de  */
/*  données, utilitaires, ErrorBoundary...).                               */
/* ------------------------------------------------------------------ */

type TranslationNode = string | TranslationTree | undefined;

function resolve(dict: TranslationTree, key: string): TranslationNode {
  return key.split(".").reduce((node: TranslationNode, part) => (node && typeof node === "object" ? node[part] : undefined), dict);
}

function interpolate(str: string, vars?: Record<string, unknown>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));
}

// Tout dernier filet — une clé qui manque à la fois dans la langue active
// ET en français (faute de frappe dans le dictionnaire, jamais censé
// arriver en usage normal). Plutôt que d'afficher la clé technique brute
// ("settings.appearanceLanguage") à l'écran, on reconstitue un texte
// lisible depuis son dernier segment ("appearanceLanguage" -> "Appearance
// language").
function humanizeKey(key: string): string {
  const last = key.split(".").pop() || key;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : key;
}

// Résolution partagée par le contexte réel (LanguageProvider) ET par sa
// valeur par défaut (utilisée si useTranslation() est jamais appelé hors
// d'un <LanguageProvider> — ne devrait pas arriver, mais ne doit alors
// jamais non plus afficher de clé brute) : même logique de repli partout,
// un seul endroit à corriger si le comportement doit changer.
export function translate(dict: TranslationTree, key: string, vars?: Record<string, unknown>): string {
  const found = resolve(dict, key);
  const fallback = resolve(translations.fr, key);
  const raw = typeof found === "string" ? found : (typeof fallback === "string" ? fallback : humanizeKey(key));
  return interpolate(raw, vars);
}


/**
 * Traduit dans la langue choisie dans les Réglages, hors d'un composant
 * (messages des hooks de données, de la synchronisation...). Les composants,
 * eux, utilisent useTranslation().
 */
export function translateCurrent(key: string, vars?: Record<string, unknown>): string {
  const dict = translations[getStoredLanguage()] || translations.fr;
  return translate(dict, key, vars);
}
