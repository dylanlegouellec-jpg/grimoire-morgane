import { describe, it, expect } from "vitest";
import { computeBreakpoints } from "../cookbookPdf";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : signalé par l'utilisateur, une recette dont la section     */
/*  "Préparation" ne tenait pas entièrement sur une page se voyait coupée     */
/*  net au milieu d'une étape plutôt que de basculer proprement sur la         */
/*  suivante. computeBreakpoints ne doit jamais poser une coupure à           */
/*  l'intérieur d'un <li> (ingrédient/étape) — elle doit reculer jusqu'à        */
/*  son sommet, le renvoyant entièrement à la page suivante.                     */
/* ------------------------------------------------------------------ */

function mockRect(el: HTMLElement, top: number, bottom: number) {
  el.getBoundingClientRect = () =>
    ({ top, bottom, height: bottom - top, left: 0, right: 100, width: 100 }) as DOMRect;
}

describe("computeBreakpoints", () => {
  it("recule la coupure au sommet d'un <li> qu'elle traverserait", () => {
    const container = document.createElement("div");
    mockRect(container, 0, 1000);
    const li1 = document.createElement("li");
    mockRect(li1, 380, 420); // chevauche la coupure "naïve" à 400
    container.appendChild(li1);
    const li2 = document.createElement("li");
    mockRect(li2, 420, 900);
    container.appendChild(li2);

    const breakpoints = computeBreakpoints(container, 400);
    expect(breakpoints[1]).toBe(380);
  });

  it("coupe normalement quand aucun <li> n'est traversé", () => {
    const container = document.createElement("div");
    mockRect(container, 0, 1000);
    const li = document.createElement("li");
    mockRect(li, 0, 100); // loin de la coupure à 400, ne la gêne pas
    container.appendChild(li);

    const breakpoints = computeBreakpoints(container, 400);
    expect(breakpoints[1]).toBe(400);
  });

  it("ne découpe pas du tout un contenu qui tient sur une seule page", () => {
    const container = document.createElement("div");
    mockRect(container, 0, 300);
    expect(computeBreakpoints(container, 400)).toEqual([0, 300]);
  });

  it("laisse passer une coupure à travers un <li> plus haut qu'une page entière (impossible à éviter)", () => {
    const container = document.createElement("div");
    mockRect(container, 0, 1000);
    const giant = document.createElement("li");
    mockRect(giant, 0, 900); // plus haut que pageHeightPx (400) : ne peut pas être protégé
    container.appendChild(giant);

    const breakpoints = computeBreakpoints(container, 400);
    expect(breakpoints[1]).toBe(400);
  });

  /* ---------------------------------------------------------------- */
  /*  RÉGRESSION : un sous-titre de groupe (ex. "Montage") se retrouvait   */
  /*  seul en bas d'une page, sa liste basculant sur la suivante — un        */
  /*  <h4.cookbook-sub> seul n'aurait rien protégé : rien n'empêchait          */
  /*  alors une coupure de tomber juste APRÈS lui plutôt qu'en son milieu.       */
  /*  Le wrapper ".cookbook-recipe-group" (titre + liste) doit donc reculer      */
  /*  la coupure jusqu'à SON sommet, pas seulement celui du titre.                 */
  /* ---------------------------------------------------------------- */
  it("recule la coupure au sommet d'un .cookbook-recipe-group entier (sous-titre + liste), pas seulement du sous-titre", () => {
    const container = document.createElement("div");
    mockRect(container, 0, 1000);
    const group = document.createElement("div");
    group.className = "cookbook-recipe-group";
    mockRect(group, 350, 500); // le sous-titre tiendrait seul avant 400, mais pas le groupe entier
    container.appendChild(group);

    const breakpoints = computeBreakpoints(container, 400);
    expect(breakpoints[1]).toBe(350);
  });
});
