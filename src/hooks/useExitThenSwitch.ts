import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  SORTIE PUIS BASCULE — retarde l'affichage d'une nouvelle valeur le    */
/*  temps qu'une animation de SORTIE joue sur l'ancienne.                  */
/*                                                                           */
/*  `target` est la valeur demandée (ex. l'onglet sur lequel on vient de       */
/*  taper), `shown` celle réellement affichée. Quand `target` change :          */
/*   1. `exiting` passe à vrai — l'appelant joue sa sortie (ex. un fondu) ;       */
/*   2. après `exitMs`, `shown` prend la valeur de `target`, `exiting` retombe      */
/*      à faux, et le contenu de la nouvelle valeur entre.                           */
/*  Même principe que la bascule en deux temps des filtres de recettes                  */
/*  (RecipesView.tsx) ; ici sous forme de hook, pour les onglets (AppShell.tsx).         */
/*                                                                                        */
/*  - Plusieurs changements pendant la sortie : le délai repart vers la dernière            */
/*    valeur demandée.                                                                        */
/*  - Retour sur la valeur déjà affichée avant la fin : la sortie est annulée                  */
/*    (`exiting` retombe à faux, `shown` ne change jamais).                                      */
/*  - `skipExit` (ex. « Réduire les animations ») : la bascule est immédiate.                     */
/* ------------------------------------------------------------------ */
export default function useExitThenSwitch<T>(
  target: T,
  exitMs: number,
  skipExit = false
): { shown: T; exiting: boolean } {
  const [shown, setShown] = useState(target);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (target === shown) {
      setExiting(false);
      return undefined;
    }
    if (skipExit) {
      setShown(target);
      return undefined;
    }
    setExiting(true);
    const timer = setTimeout(() => {
      setShown(target);
      setExiting(false);
    }, exitMs);
    return () => clearTimeout(timer);
  }, [target, shown, exitMs, skipExit]);

  return { shown, exiting };
}
