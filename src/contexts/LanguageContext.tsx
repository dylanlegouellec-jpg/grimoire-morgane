import { createContext, useContext, useMemo } from "react";
import { translations } from "../constants/translations";
import type { ReactNode } from "react";
import type { TranslationTree } from "../constants/translations";

/* ------------------------------------------------------------------ */
/*  CONTEXTE DE LANGUE — redistribue la préférence `language` (déjà       */
/*  gérée par GrimoireDeMorgane.jsx / utils/localSettings.js) à toute      */
/*  l'app via useTranslation(), sans avoir à faire redescendre `language`  */
/*  en prop dans chaque composant intermédiaire.                            */
/*                                                                          */
/*  t("nav.recettes") résout une clé à chemin pointé dans le dictionnaire   */
/*  de la langue active ; si la clé manque en anglais, on retombe sur le    */
/*  français plutôt que d'afficher un texte vide — jamais sur la clé brute  */
/*  sauf si elle manque aussi en français (bug de frappe dans le            */
/*  dictionnaire, jamais silencieux).                                       */
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
function translate(dict: TranslationTree, key: string, vars?: Record<string, unknown>): string {
  const found = resolve(dict, key);
  const fallback = resolve(translations.fr, key);
  const raw = typeof found === "string" ? found : (typeof fallback === "string" ? fallback : humanizeKey(key));
  return interpolate(raw, vars);
}

interface LanguageContextValue {
  language: string;
  t: (key: string, vars?: Record<string, unknown>) => string;
  dict: TranslationTree;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "fr",
  t: (key, vars) => translate(translations.fr, key, vars),
  dict: translations.fr,
});

interface LanguageProviderProps {
  language: string;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const value = useMemo<LanguageContextValue>(() => {
    const dict = translations[language as keyof typeof translations] || translations.fr;
    const t = (key: string, vars?: Record<string, unknown>) => translate(dict, key, vars);
    return { language, t, dict };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  return useContext(LanguageContext);
}
