import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { setActiveUnitSettings } from "../utils/units";
import type { UnitSettings } from "../utils/units";

/* ------------------------------------------------------------------ */
/*  CONTEXTE DES UNITÉS D'INGRÉDIENTS — redistribue la liste d'unités du   */
/*  foyer (Réglages > Unités des ingrédients, voir utils/units.ts) au       */
/*  menu « unité » du formulaire de recette, à la saisie de quantité des      */
/*  courses et à la sous-vue des Réglages, sans la faire descendre en prop      */
/*  à travers AppShell — même principe que IconStyleContext. L'état lui-même      */
/*  vit dans GrimoireDeMorgane.tsx (synchronisé par hooks/useOfflineSync.ts).     */
/* ------------------------------------------------------------------ */

interface UnitsContextValue {
  unitSettings: UnitSettings | null;
  setUnitSettings: Dispatch<SetStateAction<UnitSettings | null>>;
}

// Hors fournisseur (tests de composants isolés) : liste par défaut, lecture seule.
const UnitsContext = createContext<UnitsContextValue>({
  unitSettings: null,
  setUnitSettings: () => {},
});

interface UnitsProviderProps {
  unitSettings: UnitSettings | null;
  setUnitSettings: Dispatch<SetStateAction<UnitSettings | null>>;
  children: ReactNode;
}

export function UnitsProvider({ unitSettings, setUnitSettings, children }: UnitsProviderProps) {
  // Recopié pour newIngredientRow (données pures, voir preferredDefaultUnit).
  useLayoutEffect(() => {
    setActiveUnitSettings(unitSettings);
  }, [unitSettings]);
  const value = useMemo(() => ({ unitSettings, setUnitSettings }), [unitSettings, setUnitSettings]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  return useContext(UnitsContext);
}
