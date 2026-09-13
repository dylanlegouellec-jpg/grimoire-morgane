import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import useFocusTrap from "../useFocusTrap";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : 3 modales empilées (ex. Réglages -> Gestion des         */
/*  foyers -> options d'un foyer précis) partagent le même mécanisme      */
/*  history.pushState/popstate pour que le bouton/geste "retour" Android   */
/*  ne referme que la plus récente. Fermer la plus interne "normalement"    */
/*  (croix, pas le bouton retour) déclenche un history.back() dont le        */
/*  popstate qui en résulte est livré à TOUS les écouteurs encore montés —     */
/*  ici ceux des DEUX modales restantes. Sans le correctif (voir              */
/*  useFocusTrap.js, `suppressNextPopstate`), la modale du milieu se               */
/*  refermait aussi à tort, juste parce que son écouteur s'exécutait               */
/*  APRÈS que celui de la modale la plus externe ait déjà consommé le               */
/*  drapeau de suppression partagé.                                                  */
/* ------------------------------------------------------------------ */
function Modal({ onClose, children }) {
  const ref = useFocusTrap(onClose);
  return <div ref={ref} tabIndex={-1}>{children}</div>;
}

function Stack({ innerOpen, onOuterClose, onMiddleClose, onInnerClose }) {
  return (
    <Modal onClose={onOuterClose}>
      <Modal onClose={onMiddleClose}>
        {innerOpen && <Modal onClose={onInnerClose} />}
      </Modal>
    </Modal>
  );
}

describe("useFocusTrap — pile de modales imbriquées", () => {
  it("fermer la modale la plus interne ne referme pas celle du milieu", async () => {
    const onOuterClose = vi.fn();
    const onMiddleClose = vi.fn();
    const onInnerClose = vi.fn();

    const { rerender } = render(
      <Stack innerOpen onOuterClose={onOuterClose} onMiddleClose={onMiddleClose} onInnerClose={onInnerClose} />
    );

    // Simule la fermeture "normale" de la modale la plus interne (croix,
    // comme HouseholdOptionsModal) : elle se démonte suite à un setState
    // du parent, PAS suite à son propre popstate — son effet de nettoyage
    // appelle donc history.back() pour retirer sa propre entrée d'historique.
    rerender(
      <Stack innerOpen={false} onOuterClose={onOuterClose} onMiddleClose={onMiddleClose} onInnerClose={onInnerClose} />
    );

    // Laisse le popstate déclenché par ce history.back() atteindre les
    // écouteurs encore montés (outer + middle).
    await new Promise((r) => setTimeout(r, 20));

    expect(onMiddleClose).not.toHaveBeenCalled();
    expect(onOuterClose).not.toHaveBeenCalled();
  });
});
