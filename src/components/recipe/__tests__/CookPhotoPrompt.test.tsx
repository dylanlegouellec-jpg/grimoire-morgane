import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("../../../hooks/useWakeLock", () => ({ default: () => {} }));
vi.mock("../../../utils/imageUpload", () => ({ uploadRecipeImage: vi.fn() }));

import CookMode from "../CookMode";
import CookPhotoPrompt from "../CookPhotoPrompt";
import { uploadRecipeImage } from "../../../utils/imageUpload";
import { resetCookTimersForTests } from "../../../utils/cookTimers";
import type { Recipe } from "../../../hooks/useRecipes";

/* Photo du plat en fin de mode cuisine : envoi via uploadRecipeImage (simulé),
   demande avant de remplacer une photo personnelle, recette inchangée en cas
   d'échec. Sélecteurs par classes / data-testid : indépendants des textes. */

const BASE = {
  id: "r1",
  title: "Tarte",
  servings: 2,
  ingredients: [],
  steps: ["Étaler la pâte", "Cuire"],
} as unknown as Recipe;

const photo = () => new File(["x"], "plat.jpg", { type: "image/jpeg" });
const pick = (testId: string, file: File = photo()) =>
  fireEvent.change(screen.getByTestId(testId), { target: { files: [file] } });

const upload = vi.mocked(uploadRecipeImage);

beforeEach(() => {
  upload.mockReset();
  resetCookTimersForTests();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  resetCookTimersForTests();
});

describe("CookPhotoPrompt", () => {
  it("sans photo : envoie, met à jour la recette et affiche un toast", async () => {
    let resolve!: (url: string) => void;
    upload.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const onUpdate = vi.fn();
    const toast = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} householdId="h1" showToast={toast} />);

    pick("cook-photo-camera");
    // Pendant l'envoi : boutons désactivés.
    const buttons = document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn");
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(upload).toHaveBeenCalledWith(expect.any(File), "h1");

    resolve("https://x/photo.webp");
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ ...BASE, imageUrl: "https://x/photo.webp", imageSource: "photo" }));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".cookmode-photo-saved")).toBeInTheDocument();
    document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn").forEach((b) => expect(b).not.toBeDisabled());
  });

  it("le champ appareil photo vise la caméra arrière, la galerie non", () => {
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={vi.fn()} />);
    expect(screen.getByTestId("cook-photo-camera")).toHaveAttribute("capture", "environment");
    expect(screen.getByTestId("cook-photo-gallery")).not.toHaveAttribute("capture");
  });

  it("une illustration IA est remplacée sans question (mode invité : sans foyer)", async () => {
    upload.mockResolvedValue("https://x/new.webp");
    const onUpdate = vi.fn();
    render(<CookPhotoPrompt recipe={{ ...BASE, imageUrl: "https://x/ia.png", imageSource: "ia" }} onUpdateRecipe={onUpdate} />);
    pick("cook-photo-gallery");
    expect(upload).toHaveBeenCalledWith(expect.any(File), null);
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ imageUrl: "https://x/new.webp", imageSource: "photo" });
  });

  it("photo personnelle existante : demande avant de remplacer, « garder » ne change rien", async () => {
    upload.mockResolvedValue("https://x/new.webp");
    const onUpdate = vi.fn();
    const recipe = { ...BASE, imageUrl: "https://x/old.webp", imageSource: "photo" };
    render(<CookPhotoPrompt recipe={recipe} onUpdateRecipe={onUpdate} />);

    pick("cook-photo-camera");
    expect(upload).not.toHaveBeenCalled();
    expect(document.querySelector(".cookmode-photo-compare")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".cookmode-photo-link")!);
    expect(document.querySelector(".cookmode-photo-compare")).not.toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    pick("cook-photo-camera");
    fireEvent.click(document.querySelector(".cookmode-photo .seal")!);
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ ...recipe, imageUrl: "https://x/new.webp", imageSource: "photo" }));
  });

  it("ancienne recette (photo sans imageSource) : considérée comme personnelle", () => {
    render(<CookPhotoPrompt recipe={{ ...BASE, imageUrl: "https://x/old.jpg" }} onUpdateRecipe={vi.fn()} />);
    pick("cook-photo-camera");
    expect(upload).not.toHaveBeenCalled();
    expect(document.querySelector(".cookmode-photo-compare")).toBeInTheDocument();
  });

  it("échec de l'envoi : message d'erreur, recette non modifiée", async () => {
    upload.mockRejectedValue(new Error("réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onUpdate = vi.fn();
    const toast = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} showToast={toast} />);
    pick("cook-photo-camera");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn").forEach((b) => expect(b).not.toBeDisabled());
  });

  it("hors-ligne : aucun envoi tenté, message d'erreur", () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const onUpdate = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} />);
    pick("cook-photo-camera");
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("refuse un fichier qui n'est pas une image", () => {
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={vi.fn()} />);
    pick("cook-photo-gallery", new File(["x"], "a.txt", { type: "text/plain" }));
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("CookMode — photo du plat", () => {
  it("visible en fin de liste, mise en avant quand toutes les étapes sont cochées", () => {
    render(<CookMode recipe={BASE} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    const section = document.querySelector(".cookmode-photo") as HTMLElement;
    expect(section).toBeInTheDocument();
    expect(section).not.toHaveClass("ready");
    document.querySelectorAll<HTMLElement>(".cookmode-step-card").forEach((c) => fireEvent.click(c));
    expect(document.querySelector(".cookmode-photo")).toHaveClass("ready");
  });

  it("absente si le mode cuisine n'a pas de quoi enregistrer la recette", () => {
    render(<CookMode recipe={BASE} onClose={() => {}} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
  });

  it("seulement sur le dernier groupe d'étapes", () => {
    const grouped = {
      ...BASE,
      steps: [{ isSection: true, title: "A" }, "un", { isSection: true, title: "B" }, "deux"],
    } as unknown as Recipe;
    render(<CookMode recipe={grouped} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
    fireEvent.click(document.querySelectorAll(".group-nav-btn")[1]);
    expect(document.querySelector(".cookmode-photo")).toBeInTheDocument();
  });
});
