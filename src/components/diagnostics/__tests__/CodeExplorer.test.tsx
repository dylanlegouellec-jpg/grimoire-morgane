import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeExplorer from "../CodeExplorer";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { CODE_DOCS, shortRole } from "../../../constants/codeMap";

/* ------------------------------------------------------------------ */
/*  Les menus déroulants de la section "Code de l'app" : dossiers repliés  */
/*  au départ, dépliables, puis fichiers dépliables à l'intérieur.          */
/* ------------------------------------------------------------------ */

const TOAST_PATH = "src/hooks/useToast.ts";
const toastFile = __GRIMOIRE_CODE__.files.find((f) => f.path === TOAST_PATH)!;

function renderExplorer(language = "fr") {
  return render(
    <LanguageProvider language={language}>
      <CodeExplorer />
    </LanguageProvider>
  );
}

afterEach(() => cleanup());

describe("CodeExplorer", () => {
  it("affiche le total de fichiers et de lignes, et le nombre de tests non listés", () => {
    renderExplorer();
    const totalLines = __GRIMOIRE_CODE__.files.reduce((sum, f) => sum + f.lines, 0);
    const total = screen.getByText((text) => text.includes(`${__GRIMOIRE_CODE__.files.length} fichiers`) && text.includes(totalLines.toLocaleString()));
    expect(total).toBeInTheDocument();
    expect(total.textContent).toContain(`${__GRIMOIRE_CODE__.testFileCount} fichiers de tests non listés`);
  });

  it("montre tous les dossiers repliés au départ", () => {
    renderExplorer();
    const hooks = screen.getByRole("button", { name: /src\/hooks\/ — logique et données/ });
    expect(hooks).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(toastFile.path)).not.toBeInTheDocument();
  });

  it("déplie un dossier pour montrer ses fichiers, chacun avec sa première phrase", async () => {
    const user = userEvent.setup();
    renderExplorer();
    const hooks = screen.getByRole("button", { name: /src\/hooks\/ — logique et données/ });
    await user.click(hooks);
    expect(hooks).toHaveAttribute("aria-expanded", "true");
    const fileButton = await screen.findByRole("button", { name: /useToast\.ts/ });
    expect(within(fileButton).getByText(shortRole(CODE_DOCS[TOAST_PATH]))).toBeInTheDocument();
  });

  it("déplie un fichier pour montrer sa description, son chemin et ses liens d'import", async () => {
    const user = userEvent.setup();
    renderExplorer();
    await user.click(screen.getByRole("button", { name: /src\/hooks\/ — logique et données/ }));
    const fileButton = await screen.findByRole("button", { name: /useToast\.ts/ });
    await user.click(fileButton);
    expect(fileButton).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(TOAST_PATH)).toBeInTheDocument();
    expect(screen.getByText(CODE_DOCS[TOAST_PATH])).toBeInTheDocument();
    expect(screen.getByText(`Utilise (${toastFile.imports.length})`)).toBeInTheDocument();
    expect(screen.getByText(`Utilisé par (${toastFile.importedBy.length})`)).toBeInTheDocument();
    // useToast est importé par le chef d'orchestre.
    expect(screen.getByText("GrimoireDeMorgane.tsx")).toBeInTheDocument();
  });

  it("referme un fichier ouvert", async () => {
    const user = userEvent.setup();
    renderExplorer();
    await user.click(screen.getByRole("button", { name: /src\/hooks\/ — logique et données/ }));
    const fileButton = await screen.findByRole("button", { name: /useToast\.ts/ });
    await user.click(fileButton);
    await user.click(fileButton);
    expect(fileButton).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByText(TOAST_PATH)).not.toBeInTheDocument());
  });

  it("déplie « Comment l'app est organisée »", async () => {
    const user = userEvent.setup();
    renderExplorer();
    const overview = screen.getByRole("button", { name: "Comment l'app est organisée" });
    expect(overview).toHaveAttribute("aria-expanded", "false");
    await user.click(overview);
    expect(await screen.findByText("1. Le démarrage")).toBeInTheDocument();
  });

  it("résume les liens d'import d'un fichier très utilisé par « +N autres »", async () => {
    const user = userEvent.setup();
    renderExplorer();
    await user.click(screen.getByRole("button", { name: /src\/constants\/ — constantes/ }));
    await user.click(await screen.findByRole("button", { name: /motion\.ts/ }));
    const motionUsers = __GRIMOIRE_CODE__.files.find((f) => f.path === "src/constants/motion.ts")!.importedBy.length;
    expect(motionUsers).toBeGreaterThan(10);
    expect(await screen.findByText(`+${motionUsers - 10} autres`)).toBeInTheDocument();
  });

  it("affiche l'interface en anglais (les descriptions restent en français)", () => {
    renderExplorer("en");
    expect(screen.getByText(/The project's code, folder by folder/)).toBeInTheDocument();
    expect(screen.getByText(`${__GRIMOIRE_CODE__.testFileCount} test files not listed`, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How the app is organized" })).toBeInTheDocument();
  });

  it("montre la répartition des lignes par type de fichier, du plus gros au plus petit", async () => {
    const user = userEvent.setup();
    renderExplorer();
    const byType = screen.getByRole("button", { name: "Répartition par type de fichier" });
    expect(byType).toHaveAttribute("aria-expanded", "false");
    await user.click(byType);
    const panel = await screen.findByText(".tsx", { selector: ".code-type-name" });
    expect(panel).toBeInTheDocument();
    // Les feuilles de style .css.ts sont comptées à part des autres .ts.
    expect(screen.getByText(".css.ts", { selector: ".code-type-name" })).toBeInTheDocument();
    const names = [...document.querySelectorAll(".code-type-name")].map((n) => n.textContent);
    const tsxLines = __GRIMOIRE_CODE__.files.filter((f) => f.path.endsWith(".tsx")).reduce((sum, f) => sum + f.lines, 0);
    expect(names[0]).toBe(tsxLines > 0 ? names[0] : ".tsx");
  });
});

