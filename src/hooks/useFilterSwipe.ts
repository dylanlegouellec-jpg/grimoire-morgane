import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { FILTERS } from "../constants";

/* ------------------------------------------------------------------ */
/*  Balayage horizontal sur l'onglet Recettes : passe au filtre voisin    */
/*  (Tout / Salé / Sucré). Sorti d'AppShell.tsx tel quel.                  */
/* ------------------------------------------------------------------ */
export default function useFilterSwipe(
  appContentRef: RefObject<HTMLElement | null>,
  tab: string,
  filterIndex: number,
  setFilter: (key: string) => void
): void {
  const touchStart = useRef<{ x: number; y: number; scrollY: number } | null>(null);
  // Swipe horizontal : bascule les filtres Recettes ("Tout"/"Salé"/"Sucré").
  //
  // Avant : l'axe était verrouillé DÉFINITIVEMENT dès les 10 premiers
  // pixels de mouvement, sur un simple `dx > dy` — sans marge, et sans
  // jamais être reconsidéré ensuite. Un balayage vertical (scroll) qui
  // commence avec ne serait-ce qu'un tout petit bruit horizontal (courant
  // avec un pavé tactile Windows à deux doigts, ou un vrai doigt qui n'est
  // jamais parfaitement vertical) se retrouvait alors verrouillé "x" pour
  // toute la suite du geste, même s'il devenait ensuite clairement
  // vertical. En fin de geste, `Math.abs(dx) >= 55` pouvait alors être
  // atteint par la seule dérive horizontale accumulée sur un long
  // défilement, déclenchant setFilter() — qui remet le défilement à zéro
  // (voir RecipesView.jsx, l'effet sur [filter, favoritesOnly]). Posé sur
  // .app-content (voir plus bas), donc uniquement quand le geste commence
  // au-dessus de la grille elle-même — confirmé : le défilement au geste
  // fonctionnait normalement dès que le pointeur était en dehors de cette
  // zone. En paysage, ce même faux positif passait inaperçu : .app-content
  // y est un vrai conteneur de scroll (voir responsive.css), donc
  // window.scrollTo(0,0) n'y avait aucun effet visible, contrairement au
  // mode portrait où c'est le document entier qui défile.
  //
  // Plus de verrouillage précoce : la décision ne se prend qu'à la fin du
  // geste, sur le déplacement cumulé RÉEL depuis le début (pas un
  // échantillon des 10 premiers pixels), avec une marge nette (pas juste
  // "plus horizontal que vertical", mais NETTEMENT plus). Filet de sécurité
  // supplémentaire : si le défilement a par ailleurs réellement bougé
  // pendant ce geste, ce n'était de toute façon pas une intention de
  // changer de filtre, quel que soit le dx mesuré (même principe déjà
  // appliqué à l'appui long, voir hooks/useLongPress.js).
  // Toujours les dernières valeurs, sans jamais réattacher les écouteurs
  // natifs ci-dessous (même principe que useFocusTrap.js/useLongPress.js).
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const filterIndexRef = useRef(filterIndex);
  filterIndexRef.current = filterIndex;

  // Attachés nativement en { passive: true } plutôt que via les props JSX
  // onTouchStart/onTouchEnd — repéré dans Chrome DevTools (Rendering >
  // "Scrolling performance issues") : ce geste était posé sur .app-content,
  // le conteneur COMMUN à tous les onglets (Recettes, Frigo...), et
  // apparaissait comme cause potentielle de "main thread scroll repaint" /
  // "touch event listener" sur chacun d'eux, pas seulement la grille de
  // recettes. Ce hook n'appelle jamais preventDefault() sur un événement
  // tactile, donc { passive: true } est toujours sûr ici — voir
  // hooks/useLongPress.js, qui a reçu le même traitement.
  useEffect(() => {
    const node = appContentRef.current;
    if (!node) return undefined;
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, scrollY: window.scrollY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (start == null || tabRef.current !== "recettes") return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 55) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (Math.abs(window.scrollY - start.scrollY) > 5) return;
      const next = dx < 0
        ? Math.min(filterIndexRef.current + 1, FILTERS.length - 1)
        : Math.max(filterIndexRef.current - 1, 0);
      setFilter(FILTERS[next].key);
    };
    const opts = { passive: true };
    node.addEventListener("touchstart", handleTouchStart, opts);
    node.addEventListener("touchend", handleTouchEnd, opts);
    // Le DOM du 3e argument de removeEventListener (EventListenerOptions)
    // est plus strict que celui d'addEventListener (AddEventListenerOptions,
    // qui seul déclare `passive`) — même repli que useLongPress.ts.
    const removeOpts = opts as unknown as EventListenerOptions;
    return () => {
      node.removeEventListener("touchstart", handleTouchStart, removeOpts);
      node.removeEventListener("touchend", handleTouchEnd, removeOpts);
    };
  }, [setFilter, appContentRef]);
}
