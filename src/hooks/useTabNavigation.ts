import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { TABS } from "../constants";
import { TAB_EXIT_MS } from "../constants/motion";
import useExitThenSwitch from "./useExitThenSwitch";

/* ------------------------------------------------------------------ */
/*  Navigation entre les onglets de l'écran principal (AppShell) :       */
/*  onglet demandé et onglet affiché (sortie en fondu puis entrée), sens  */
/*  du glissement, retour en haut de page à la bascule, et préchargement   */
/*  des onglets chargés à la demande. Sorti d'AppShell.tsx tel quel.        */
/* ------------------------------------------------------------------ */
export default function useTabNavigation(appContentRef: RefObject<HTMLElement | null>) {
  // `tab` : l'onglet DEMANDÉ (la pastille de la barre du bas glisse tout de
  // suite). `shownTab` : l'onglet réellement affiché, en retard de TAB_EXIT_MS
  // pour laisser le contenu actuel se fondre avant que le nouveau n'entre
  // (voir hooks/useExitThenSwitch.ts, et .tab-exit dans shell.css) — même
  // bascule en deux temps que les filtres de recettes. Tout ce qui s'affiche
  // DANS la page (barre de recherche, filtres, contenu de l'onglet) suit
  // `shownTab` ; seuls la barre de navigation, le tutoriel et le geste de
  // balayage restent sur `tab`.
  const [tab, setTab] = useState("recettes");
  const prefersReducedMotion = useReducedMotion();
  const { shown: shownTab, exiting: tabExiting } = useExitThenSwitch(tab, TAB_EXIT_MS, Boolean(prefersReducedMotion));
  // Remet la page en haut À LA BASCULE (le contenu est alors déjà fondu, donc
  // le saut ne se voit pas) : sinon, depuis un onglet défilé vers un onglet
  // plus court, le navigateur recale lui-même le défilement d'un coup, en
  // plein milieu de la transition (mesuré : 600 -> 203 px). En paysage, c'est
  // .app-content qui défile, pas la page. Pas au premier montage.
  const tabScrollMountedRef = useRef(false);
  useLayoutEffect(() => {
    if (!tabScrollMountedRef.current) {
      tabScrollMountedRef.current = true;
      return;
    }
    window.scrollTo(0, 0);
    if (appContentRef.current) appContentRef.current.scrollTop = 0;
  }, [shownTab, appContentRef]);
  // Précharge les trois onglets chargés à la demande (Plan, Frigo, Courses)
  // peu après le lancement, hors du chemin critique : sans ça, le premier
  // changement d'onglet montrait la baguette de chargement entre la sortie du
  // contenu actuel et l'entrée du nouveau, le temps de récupérer son chunk. Un
  // chunk déjà importé ici est servi tout de suite à React.lazy. Aucun octet
  // de plus à télécharger au final : la PWA précache déjà tous les chunks.
  useEffect(() => {
    const timer = setTimeout(() => {
      void import("../components/planning/PlanningView");
      void import("../components/fridge/FridgeView");
      void import("../components/shopping/ShoppingView");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  // Sens du glissement entre onglets (voir .tab-transition et --tab-slide, shell.css) —
  // "avant" quand on va vers un onglet plus à droite dans la nav (Recettes
  // -> Plan -> Mon Frigo -> Courses), "arrière" sinon. Recalculé à CHAQUE
  // changement d'onglet (bouton de nav ou redirection programmatique comme
  // "Envoyer vers la liste de courses" depuis Planification), jamais figé
  // une fois pour toutes : `changeTab` est le seul point d'entrée qui
  // touche `tab`, pour que ce calcul ne puisse pas être oublié à un
  // endroit et pas un autre.
  const [tabDirection, setTabDirection] = useState<"forward" | "backward">("forward");
  // Décalage de départ de l'entrée (voir --tab-slide, shell.css), commun au
  // contenu de l'onglet ET à ses barres de recherche/filtres.
  const tabSlideStyle = { "--tab-slide": tabDirection === "forward" ? "18px" : "-18px" } as CSSProperties;
  const changeTab = useCallback((nextKey: string) => {
    setTab((prevKey) => {
      if (nextKey === prevKey) return prevKey;
      const prevIndex = TABS.findIndex((tb) => tb.key === prevKey);
      const nextIndex = TABS.findIndex((tb) => tb.key === nextKey);
      setTabDirection(nextIndex >= prevIndex ? "forward" : "backward");
      return nextKey;
    });
  }, []);

  return { tab, shownTab, tabExiting, tabSlideStyle, changeTab };
}
