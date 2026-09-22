import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { IconStyle } from "../utils/localSettings";

/* ------------------------------------------------------------------ */
/*  CONTEXTE DE STYLE D'ICÔNES — redistribue la préférence `iconStyle`    */
/*  ("emoji" | "vector", déjà gérée par GrimoireDeMorgane.jsx /            */
/*  utils/localSettings.js, voir Réglages > Apparence) à tous les            */
/*  composants qui affichent une icône de catégorie (rayons de courses,       */
/*  moments/types de repas du Plan, catégories du Frigo...), sans avoir à       */
/*  faire redescendre `iconStyle` en prop dans chaque composant                    */
/*  intermédiaire — même principe que LanguageContext (useTranslation()).            */
/* ------------------------------------------------------------------ */

const IconStyleContext = createContext<IconStyle>("emoji");

interface IconStyleProviderProps {
  iconStyle?: IconStyle;
  children: ReactNode;
}

export function IconStyleProvider({ iconStyle, children }: IconStyleProviderProps) {
  return <IconStyleContext.Provider value={iconStyle || "emoji"}>{children}</IconStyleContext.Provider>;
}

export function useIconStyle(): IconStyle {
  return useContext(IconStyleContext);
}
