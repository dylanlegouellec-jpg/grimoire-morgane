import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Partagé par TOUTES les instances de ce hook (comme lockCount dans
// useBodyScrollLock.js) : quand une modale se ferme normalement (croix,
// Échap, fond, tirage), son nettoyage appelle history.back() pour retirer
// SA PROPRE entrée — mais popstate est un événement GLOBAL, reçu par
// TOUTE autre modale encore montée à ce moment-là (ex. le panneau
// principal des Réglages, resté ouvert derrière un sous-panneau qui vient
// de se fermer). Sans ce drapeau, cette dernière prenait ce popstate pour
// un vrai retour utilisateur et se refermait elle aussi — repéré quand
// fermer un sous-panneau des Réglages (par tirage) refermait tout le
// module au lieu de retomber sur son panneau principal. Posé juste avant
// NOTRE PROPRE history.back(), consommé par le tout prochain popstate
// (forcément le nôtre : rien d'autre n'a pu s'intercaler entre les deux,
// JS étant single-threadé) — les popstate suivants, eux, sont bien de
// vrais retours.
let suppressNextPopstate = false;

// Pile partagée des modales actuellement montées (leur id, dans l'ordre
// d'ouverture) : popstate est un événement UNIQUE reçu par TOUTES à la
// fois (ex. panneau principal + sous-panneau des Réglages empilés) — sans
// ceci, un seul vrai retour Android refermait les DEUX d'un coup au lieu
// de seulement la plus récente. Seule l'instance dont l'id est au sommet
// de la pile au moment du popstate est autorisée à réagir ; les autres
// l'ignorent, laissant la plus récente se refermer normalement (et donc
// se retirer de cette pile) avant qu'un retour suivant n'atteigne la
// suivante.
const modalStack = [];
let nextModalId = 1;

/* ------------------------------------------------------------------ */
/*  PIÈGE À FOCUS — pour les modales (role="dialog"/aria-modal)         */
/*                                                                      */
/*  Sans lui, Tab pouvait faire sortir le focus clavier d'une modale     */
/*  ouverte vers la page derrière (invisible mais toujours atteignable    */
/*  au clavier), et rien ne fermait la modale au clavier sans viser         */
/*  précisément le bouton "Fermer" à la souris/au toucher. Comportement    */
/*  standard attendu de tout role="dialog" par un lecteur d'écran ou un     */
/*  utilisateur clavier : focus posé sur la modale à l'ouverture, Tab/       */
/*  Shift+Tab qui bouclent SEULEMENT parmi ses éléments, Échap qui ferme,    */
/*  focus restitué à l'élément qui l'avait avant l'ouverture.                */
/*                                                                        */
/*  Usage : const modalRef = useFocusTrap(onClose);                        */
/*          <div ref={modalRef} role="dialog" aria-modal="true" ...>        */
/* ------------------------------------------------------------------ */
export default function useFocusTrap(onClose) {
  const containerRef = useRef(null);
  // Toujours la dernière fonction reçue, sans jamais faire redémarrer
  // l'effet ci-dessous (deps `[]` volontaire) : un `onClose` recréé à
  // chaque rendu du parent (cas courant, fonction fléchée inline) ne doit
  // ni reposer le focus sur le premier champ ni recréer les écouteurs à
  // chaque frappe.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement;

    // Empile une entrée d'historique par modale ouverte : sans ça, le
    // bouton/geste "retour" Android (qui n'a rien à voir avec le clavier —
    // Échap ci-dessous ne le couvre pas) navigue directement en arrière
    // dans l'historique du navigateur, donc quitte l'onglet/l'app au lieu
    // de simplement refermer la modale ouverte. iOS n'a pas d'équivalent
    // matériel, donc rien à couvrir de ce côté. `closedByBack` distingue
    // un "retour" déclenché PAR l'utilisateur (doit fermer la modale) d'un
    // history.back() déclenché PAR NOUS à la fermeture normale ci-dessous
    // (ne doit pas refermer une deuxième fois une modale déjà en train de
    // se démonter).
    let closedByBack = false;
    const modalId = nextModalId++;
    modalStack.push(modalId);
    window.history.pushState({ grimoireModal: true }, "");
    const handlePopState = () => {
      if (suppressNextPopstate) {
        suppressNextPopstate = false;
        return;
      }
      // Seule la modale la plus récemment ouverte (sommet de la pile) doit
      // répondre à ce retour — voir la déclaration de modalStack plus haut.
      if (modalStack[modalStack.length - 1] !== modalId) return;
      closedByBack = true;
      if (onCloseRef.current) onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);

    // Ne vole pas le focus s'il est déjà posé quelque part dans la modale —
    // certaines (ex. HouseholdOptionsModal) posent un autoFocus sur un
    // champ précis, pas sur le premier élément focusable du DOM (souvent le
    // bouton "Fermer") : le réécraser aurait cassé cet autoFocus existant.
    if (!container.contains(document.activeElement)) {
      const first = getFocusable()[0];
      (first || container).focus({ preventScroll: true });
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (onCloseRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Empêche une modale imbriquée dans une autre (ex. ProfileEditor,
      // rendu comme descendant DOM de SecretSettingsModal) de laisser
      // remonter Tab jusqu'au piège de la modale englobante — seule la
      // plus interne doit boucler le focus tant qu'elle est ouverte.
      e.stopPropagation();
      const els = getFocusable();
      if (!els.length) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      const idx = modalStack.indexOf(modalId);
      if (idx !== -1) modalStack.splice(idx, 1);
      // Fermeture "normale" (croix, Échap, backdrop, tirer pour fermer) :
      // on retire notre propre entrée d'historique pour ne pas la laisser
      // trainer — sans rejouer onClose, déjà en cours via le chemin qui a
      // causé ce démontage. suppressNextPopstate évite qu'une AUTRE modale
      // encore montée (voir sa déclaration plus haut) ne prenne CE
      // history.back() pour un vrai retour utilisateur et se referme aussi.
      if (!closedByBack) {
        suppressNextPopstate = true;
        window.history.back();
        // Filet de sécurité : si AUCUNE autre modale n'est montée pour
        // consommer ce drapeau (ex. on ferme la toute dernière modale
        // ouverte), rien ne le repasserait jamais à false — un vrai retour
        // utilisateur bien plus tard serait alors ignoré à tort. popstate
        // se déclenche largement avant 50ms pour un history.back() du même
        // document ; ce délai ne fait que nettoyer le cas où personne
        // n'écoutait.
        setTimeout(() => { suppressNextPopstate = false; }, 50);
      }
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return containerRef;
}
