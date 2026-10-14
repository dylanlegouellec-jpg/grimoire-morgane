import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import RecipeDetail from "../RecipeDetail";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Recipe } from "../../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  « Vue livre » de la fiche recette : glisser horizontalement tourne  */
/*  la page (recette suivante/précédente de la grille), jamais au-delà   */
/*  des bouts ; un glissement vertical reste un défilement.              */
/* ------------------------------------------------------------------ */

// jsdom n'a ni IntersectionObserver (fondu des lignes, useInView) ni
// ResizeObserver (parallaxe, useScroll) : de simples coquilles suffisent.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal("IntersectionObserver", NoopObserver);
vi.stubGlobal("ResizeObserver", NoopObserver);

const makeRecipe = (id: string, title: string) =>
  ({ id, title, category: "Sucré", time: 20, servings: 4, favorite: false, ingredients: [{ qty: 1, unit: "", name: "Farine" }], steps: ["Mélanger"] }) as unknown as Recipe;
const PAGES = [makeRecipe("a", "Abricots"), makeRecipe("b", "Brioche"), makeRecipe("c", "Crêpes")];
const noop = () => {};

function renderDetail(recipe: Recipe, onNavigate = vi.fn()) {
  render(
    <LanguageProvider language="fr">
      <RecipeDetail recipe={recipe} pages={PAGES} onNavigate={onNavigate} onClose={noop} shareText={noop} showToast={noop} showNutriscore={false} />
    </LanguageProvider>
  );
  return { onNavigate, sheet: screen.getByRole("dialog") };
}

// Geste tactile complet (début, quelques mouvements, fin) sur la feuille.
function drag(el: Element, from: [number, number], to: [number, number], steps = 6) {
  const pt = (x: number, y: number) => ({ clientX: x, clientY: y, identifier: 1, target: el });
  fireEvent.touchStart(el, { touches: [pt(...from)], changedTouches: [pt(...from)] });
  for (let i = 1; i <= steps; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    fireEvent.touchMove(el, { touches: [pt(x, y)], changedTouches: [pt(x, y)] });
  }
  fireEvent.touchEnd(el, { touches: [], changedTouches: [pt(...to)] });
}

const settle = () => act(() => new Promise((r) => setTimeout(r, 700)));

afterEach(cleanup);

describe("RecipeDetail — vue livre", () => {
  it("glisser vers la gauche ouvre la recette suivante de la grille, vers la droite la précédente", async () => {
    const { onNavigate, sheet } = renderDetail(PAGES[1]);
    drag(sheet, [300, 400], [80, 405]);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(PAGES[2]));
    cleanup();
    const second = renderDetail(PAGES[1]);
    drag(second.sheet, [100, 400], [320, 405]);
    await waitFor(() => expect(second.onNavigate).toHaveBeenCalledWith(PAGES[0]));
  });

  it("ne va pas au-delà de la première ni de la dernière page", async () => {
    const first = renderDetail(PAGES[0]);
    drag(first.sheet, [100, 400], [340, 405]);
    await settle();
    expect(first.onNavigate).not.toHaveBeenCalled();
    cleanup();
    const last = renderDetail(PAGES[2]);
    drag(last.sheet, [340, 400], [60, 405]);
    await settle();
    expect(last.onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /pas de recette suivante|next none/i })).toBeDisabled();
  });

  it("un glissement surtout vertical ne change pas de page", async () => {
    const { onNavigate, sheet } = renderDetail(PAGES[1]);
    drag(sheet, [200, 600], [230, 250]);
    await settle();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("ignore un geste parti du bord gauche de l'écran (retour système iOS)", async () => {
    const { onNavigate, sheet } = renderDetail(PAGES[1]);
    drag(sheet, [10, 400], [320, 405]);
    await settle();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("boutons et flèches du clavier tournent aussi la page", async () => {
    const { onNavigate, sheet } = renderDetail(PAGES[1]);
    const buttons = screen.getAllByRole("button").filter((b) => b.classList.contains("recipe-pager-arrow"));
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(PAGES[2]));
    await settle();
    fireEvent.keyDown(sheet, { key: "ArrowLeft" });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(PAGES[0]));
  });

  it("sans pages (fiche ouverte hors de la grille) : ni folio ni changement", async () => {
    const onNavigate = vi.fn();
    render(
      <LanguageProvider language="fr">
        <RecipeDetail recipe={PAGES[1]} onNavigate={onNavigate} onClose={noop} shareText={noop} showToast={noop} showNutriscore={false} />
      </LanguageProvider>
    );
    expect(document.querySelector(".recipe-pager-folio")).toBeNull();
    drag(screen.getByRole("dialog"), [300, 400], [60, 405]);
    await settle();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
