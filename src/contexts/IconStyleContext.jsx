import { createContext, useContext } from "react";

/* ------------------------------------------------------------------ */
/*  CONTEXTE DE STYLE D'ICÔNES — redistribue la préférence `iconStyle`    */
/*  ("emoji" | "vector", déjà gérée par GrimoireDeMorgane.jsx /            */
/*  utils/localSettings.js, voir Réglages > Apparence) à tous les            */
/*  composants qui affichent une icône de catégorie (rayons de courses,       */
/*  moments/types de repas du Plan, catégories du Frigo...), sans avoir à       */
/*  faire redescendre `iconStyle` en prop dans chaque composant                    */
/*  intermédiaire — même principe que LanguageContext (useTranslation()).            */
/* ------------------------------------------------------------------ */

const IconStyleContext = createContext("emoji");

export function IconStyleProvider({ iconStyle, children }) {
  return <IconStyleContext.Provider value={iconStyle || "emoji"}>{children}</IconStyleContext.Provider>;
}

export function useIconStyle() {
  return useContext(IconStyleContext);
}
