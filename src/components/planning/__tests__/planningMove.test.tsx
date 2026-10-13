import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  DROP_ACTIVE_CLASS,
  DROP_DATE_ATTR,
  DROP_MEAL_ATTR,
  DRAGGING_BODY_CLASS,
  buildMoveUpdates,
  clientPointOf,
  findDropTargetAt,
  parseISODateLocal,
  readDropTarget,
  resolveMoveTarget,
  setDragActive,
  setDropHighlight,
} from "../planningMove";
import MoveMealModal from "../MoveMealModal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("resolveMoveTarget — où atterrit un plat lâché", () => {
  const source = { date: "2026-10-13", mealType: "dejeuner" };

  it("ne déplace rien sans cible", () => {
    expect(resolveMoveTarget(source, null)).toBeNull();
  });

  it("ne déplace rien lâché sur son propre jour + moment (simple réordonnancement)", () => {
    expect(resolveMoveTarget(source, { date: "2026-10-13", mealType: "dejeuner" })).toBeNull();
    // Carte du même jour sans moment précis : garde le moment -> rien ne change.
    expect(resolveMoveTarget(source, { date: "2026-10-13", mealType: null })).toBeNull();
  });

  it("change de jour en gardant le moment quand on vise la carte d'un jour", () => {
    expect(resolveMoveTarget(source, { date: "2026-10-15", mealType: null })).toEqual({ date: "2026-10-15", mealType: "dejeuner" });
  });

  it("change de moment le même jour", () => {
    expect(resolveMoveTarget(source, { date: "2026-10-13", mealType: "diner" })).toEqual({ date: "2026-10-13", mealType: "diner" });
  });

  it("change de jour ET de moment", () => {
    expect(resolveMoveTarget(source, { date: "2026-10-16", mealType: "encas" })).toEqual({ date: "2026-10-16", mealType: "encas" });
  });
});

describe("buildMoveUpdates — type de plat ajusté au moment d'arrivée", () => {
  it("garde le type de plat entre deux moments qui en ont un", () => {
    expect(buildMoveUpdates({ courseType: "dessert" }, { date: "2026-10-14", mealType: "diner" }))
      .toEqual({ date: "2026-10-14", mealType: "diner", courseType: "dessert" });
  });

  it("met « plat » par défaut en arrivant d'un moment sans type de plat", () => {
    expect(buildMoveUpdates({ courseType: null }, { date: "2026-10-14", mealType: "dejeuner" }).courseType).toBe("plat");
  });

  it("efface le type de plat vers petit-déjeuner/en-cas", () => {
    expect(buildMoveUpdates({ courseType: "entree" }, { date: "2026-10-14", mealType: "petit-dejeuner" }).courseType).toBeNull();
  });
});

describe("parseISODateLocal", () => {
  it("lit la date en heure locale (pas de décalage d'un jour)", () => {
    const d = parseISODateLocal("2026-03-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 1]);
  });
});

describe("zones de dépôt dans le DOM", () => {
  function buildDom() {
    document.body.innerHTML = `
      <div id="day" ${DROP_DATE_ATTR}="2026-10-14">
        <div id="group" ${DROP_DATE_ATTR}="2026-10-14" ${DROP_MEAL_ATTR}="diner">
          <span id="inner">x</span>
        </div>
        <span id="dayText">y</span>
      </div>
      <li id="dragged"><span id="draggedInner">z</span></li>`;
    return (id: string) => document.getElementById(id) as Element;
  }

  it("préfère le bloc de moment le plus proche à la carte du jour", () => {
    const $ = buildDom();
    expect(readDropTarget($("inner"))?.target).toEqual({ date: "2026-10-14", mealType: "diner" });
    expect(readDropTarget($("dayText"))?.target).toEqual({ date: "2026-10-14", mealType: null });
    expect(readDropTarget($("draggedInner"))).toBeNull();
  });

  it("ignore l'élément glissé lui-même sous le doigt", () => {
    const $ = buildDom();
    const original = document.elementsFromPoint;
    document.elementsFromPoint = vi.fn(() => [$("draggedInner"), $("dragged"), $("inner"), $("group"), $("day")]);
    try {
      expect(findDropTargetAt(10, 10, $("dragged"))?.element).toBe($("group"));
    } finally {
      document.elementsFromPoint = original;
    }
  });

  it("regarde sous une bannière/barre fixe posée par-dessus un jour", () => {
    const $ = buildDom();
    const banner = document.createElement("div");
    document.body.appendChild(banner);
    const original = document.elementsFromPoint;
    document.elementsFromPoint = vi.fn(() => [banner, $("dayText"), $("day"), document.body]);
    try {
      expect(findDropTargetAt(10, 10, $("dragged"))?.target).toEqual({ date: "2026-10-14", mealType: null });
      document.elementsFromPoint = vi.fn(() => [banner, document.body]);
      expect(findDropTargetAt(10, 10, $("dragged"))).toBeNull();
    } finally {
      document.elementsFromPoint = original;
    }
  });

  it("signale le glissement en cours sur <body>", () => {
    setDragActive(true);
    expect(document.body.classList.contains(DRAGGING_BODY_CLASS)).toBe(true);
    setDragActive(false);
    expect(document.body.classList.contains(DRAGGING_BODY_CLASS)).toBe(false);
  });

  it("ne met en évidence qu'une zone à la fois", () => {
    const $ = buildDom();
    expect(setDropHighlight($("group"))).toBe(true);
    expect(setDropHighlight($("group"))).toBe(false);
    expect($("group").classList.contains(DROP_ACTIVE_CLASS)).toBe(true);
    setDropHighlight($("day"));
    expect($("group").classList.contains(DROP_ACTIVE_CLASS)).toBe(false);
    expect($("day").classList.contains(DROP_ACTIVE_CLASS)).toBe(true);
    setDropHighlight(null);
    expect($("day").classList.contains(DROP_ACTIVE_CLASS)).toBe(false);
  });

  it("lit le point écran d'un événement pointeur, tactile ou à défaut de la page", () => {
    expect(clientPointOf({ clientX: 3, clientY: 4 })).toEqual({ x: 3, y: 4 });
    expect(clientPointOf({ changedTouches: [{ clientX: 5, clientY: 6 }] })).toEqual({ x: 5, y: 6 });
    expect(clientPointOf({}, { x: 7, y: 8 })).toEqual({ x: 7 - window.scrollX, y: 8 - window.scrollY });
    expect(clientPointOf({})).toBeNull();
  });
});

describe("MoveMealModal — « Déplacer… »", () => {
  // Le bouton de validation (Seal) — repéré par sa classe pour ne pas dépendre
  // du texte traduit.
  const confirmButton = () => document.querySelector(".planning-move-actions .seal") as HTMLButtonElement;

  it("reste désactivé tant que rien n'a changé, puis renvoie le nouvel emplacement", () => {
    const onConfirm = vi.fn();
    render(<MoveMealModal label="Ratatouille" current={{ date: "2026-10-13", mealType: "dejeuner" }} onClose={vi.fn()} onConfirm={onConfirm} />);

    const radios = screen.getAllByRole("radio");
    expect(radios.filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(confirmButton().disabled).toBe(true);

    // Changer de moment seul (même jour).
    fireEvent.click(radios[2]);
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
    expect(confirmButton().disabled).toBe(false);

    // Puis de jour, via le calendrier (préréglé sur octobre 2026).
    fireEvent.click(screen.getByRole("button", { name: "20" }));
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const slot = onConfirm.mock.calls[0][0];
    expect(slot.date).toBe("2026-10-20");
    expect(slot.mealType).not.toBe("dejeuner");
  });
});
