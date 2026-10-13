import { createContext, useContext, useEffect, useMemo } from "react";
import { translations } from "../constants/translations";
import { translate } from "../utils/i18n";
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

  // Langue de la page pour les lecteurs d'écran (sinon un texte anglais était
  // lu avec une voix française, <html lang="fr"> restant figé).
  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "fr";
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  return useContext(LanguageContext);
}
