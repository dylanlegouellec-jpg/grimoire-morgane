import { createContext, useContext, useMemo } from "react";
import { translations } from "../constants/translations";

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

function resolve(dict, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dict);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ""));
}

// Tout dernier filet — une clé qui manque à la fois dans la langue active
// ET en français (faute de frappe dans le dictionnaire, jamais censé
// arriver en usage normal). Plutôt que d'afficher la clé technique brute
// ("settings.appearanceLanguage") à l'écran, on reconstitue un texte
// lisible depuis son dernier segment ("appearanceLanguage" -> "Appearance
// language").
function humanizeKey(key) {
  const last = key.split(".").pop() || key;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : key;
}

// Résolution partagée par le contexte réel (LanguageProvider) ET par sa
// valeur par défaut (utilisée si useTranslation() est jamais appelé hors
// d'un <LanguageProvider> — ne devrait pas arriver, mais ne doit alors
// jamais non plus afficher de clé brute) : même logique de repli partout,
// un seul endroit à corriger si le comportement doit changer.
function translate(dict, key, vars) {
  const found = resolve(dict, key);
  const fallback = resolve(translations.fr, key);
  const raw = typeof found === "string" ? found : (typeof fallback === "string" ? fallback : humanizeKey(key));
  return interpolate(raw, vars);
}

const LanguageContext = createContext({
  language: "fr",
  t: (key, vars) => translate(translations.fr, key, vars),
  dict: translations.fr,
});

export function LanguageProvider({ language, children }) {
  const value = useMemo(() => {
    const dict = translations[language] || translations.fr;
    const t = (key, vars) => translate(dict, key, vars);
    return { language, t, dict };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
