import { describe, it, expect } from "vitest";
import { SHELL_CSS } from "../shell.css";

/* ------------------------------------------------------------------ */
/*  GARDE-FOUS du changement d'onglet (shell.css.ts) — du CSS pur, qu'on    */
/*  ne peut pas vraiment "jouer" dans jsdom : on vérifie donc le texte       */
/*  des règles. Retour utilisateur : au toucher, la page partait sur le        */
/*  côté. La sortie d'un onglet doit rester un fondu sur place, et la           */
/*  recherche/les filtres (hors de .app-content) ne doivent jamais glisser.      */
/* ------------------------------------------------------------------ */

function rule(selector: string): string {
  const start = SHELL_CSS.indexOf(`${selector} {`);
  expect(start, `règle ${selector} introuvable`).toBeGreaterThan(-1);
  return SHELL_CSS.slice(start, SHELL_CSS.indexOf("}", start));
}

describe("changement d'onglet (CSS)", () => {
  it("la sortie d'un onglet est un fondu seul : aucun mouvement latéral", () => {
    const exit = rule(".tab-transition.tab-exit");
    expect(exit).toContain("opacity: 0");
    expect(exit).not.toMatch(/\bleft\b|\bright\b|translate|transform/);
  });

  it("le fondu d'un onglet ne fait transiter que l'opacité (jamais de position)", () => {
    expect(rule(".tab-transition")).toMatch(/transition: opacity [\d.]+s ease-out;/);
    expect(rule(".tab-transition")).not.toMatch(/transition:[^;]*left/);
  });

  it("la recherche et les filtres entrent par un fondu, sans glisser hors de l'écran", () => {
    expect(SHELL_CSS).toContain(".tab-bars.tab-transition { animation-name: tabFade; }");
    const fade = SHELL_CSS.slice(SHELL_CSS.indexOf("@keyframes tabFade"));
    expect(fade.slice(0, fade.indexOf("\n"))).not.toMatch(/\bleft\b|translate|transform/);
  });

  it("le contenu de l'onglet garde son glissement d'entrée, en 'left' (jamais 'transform' : .fab est en position: fixed)", () => {
    const slide = SHELL_CSS.slice(SHELL_CSS.indexOf("@keyframes tabSlide"));
    const line = slide.slice(0, slide.indexOf("\n"));
    expect(line).toContain("left:");
    expect(line).not.toMatch(/translate|transform/);
  });
});
