import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import UnitsSettingsModal from "../UnitsSettingsModal";
import { UnitsProvider } from "../../../contexts/UnitsContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { UnitSettings } from "../../../utils/units";

afterEach(cleanup);

// Sélecteurs volontairement indépendants des textes (les clés
// unitsSettings.* sont ajoutées au dictionnaire à part).
let lastSettings: UnitSettings | null = null;
function Harness({ initial = null }: { initial?: UnitSettings | null }) {
  const [settings, setSettings] = useState<UnitSettings | null>(initial);
  // Harnais de test : expose l'état au test, hors de React (volontaire).
  // eslint-disable-next-line react-hooks/globals
  lastSettings = settings;
  return (
    <LanguageProvider language="fr">
      <UnitsProvider unitSettings={settings} setUnitSettings={setSettings}>
        <UnitsSettingsModal />
      </UnitsProvider>
    </LanguageProvider>
  );
}

const input = (c: HTMLElement) => c.querySelector(".units-settings-input") as HTMLInputElement;
const submit = (c: HTMLElement) => fireEvent.submit(c.querySelector(".units-settings-add") as HTMLFormElement);
const customNames = (c: HTMLElement) => [...c.querySelectorAll(".units-settings-custom-name")].map((n) => n.textContent);

describe("Réglages > Unités des ingrédients", () => {
  it("ajoute « sachet », puis refuse « Sachet » en doublon", () => {
    const { container } = render(<Harness />);
    fireEvent.change(input(container), { target: { value: "  sachet " } });
    submit(container);
    expect(customNames(container)).toEqual(["sachet"]);
    expect(lastSettings).toEqual({ custom: ["sachet"], hidden: [] });
    expect(input(container).value).toBe("");

    fireEvent.change(input(container), { target: { value: "Sachet" } });
    submit(container);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(customNames(container)).toEqual(["sachet"]);
    expect(input(container).value).toBe("Sachet");
  });

  it("ajoute une suggestion en un appui et la retire de la liste des suggestions", () => {
    const { container } = render(<Harness />);
    const chip = [...container.querySelectorAll(".units-settings-chip")].find((b) => b.textContent === "gousse")!;
    fireEvent.click(chip);
    expect(customNames(container)).toEqual(["gousse"]);
    expect([...container.querySelectorAll(".units-settings-chip")].map((b) => b.textContent)).not.toContain("gousse");
  });

  it("supprime une unité ajoutée", () => {
    const { container } = render(<Harness initial={{ custom: ["sachet", "verre"], hidden: [] }} />);
    fireEvent.click(container.querySelectorAll(".units-settings-remove")[0]);
    expect(customNames(container)).toEqual(["verre"]);
    expect(lastSettings).toEqual({ custom: ["verre"], hidden: [] });
  });

  it("masque « cl » ; « Sans unité » n'a pas d'interrupteur", () => {
    const { container } = render(<Harness />);
    const rows = [...container.querySelectorAll(".units-settings-row")];
    const clRow = rows.find((r) => r.querySelector(".settings-row-title")?.textContent === "cl")!;
    fireEvent.click(within(clRow as HTMLElement).getByRole("switch"));
    expect(lastSettings).toEqual({ custom: [], hidden: ["cl"] });
    expect(within(clRow as HTMLElement).getByRole("switch")).toHaveAttribute("aria-checked", "false");
    // 10 unités de base, 9 interrupteurs : « Sans unité » reste toujours proposée.
    expect(rows).toHaveLength(10);
    expect(screen.getAllByRole("switch")).toHaveLength(9);
    expect(rows.at(-1)!.textContent).toContain("Sans unité");
  });

  it("refuse de masquer la dernière unité restante", () => {
    const hidden = ["kg", "ml", "cl", "l", "pièce", "pincée", "c. à soupe", "c. à café"];
    const { container } = render(<Harness initial={{ custom: [], hidden }} />);
    const gRow = [...container.querySelectorAll(".units-settings-row")].find((r) => r.querySelector(".settings-row-title")?.textContent === "g")!;
    fireEvent.click(within(gRow as HTMLElement).getByRole("switch"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(lastSettings).toEqual({ custom: [], hidden });
  });
});
